# Universal AI API Connector & API Hub

A production-ready, full-stack AI endpoint gateway and management hub built with **Next.js 14+ (App Router)**, **TypeScript**, **Tailwind CSS**, and **SQLite with Prisma ORM**.

Standardize, secure, and expose multi-provider AI models behind predictable, schema-enforced REST endpoints with real-time token telemetry, latency measurement, cost calculation, and persistent SQLite audit logs.

---

## Key Features

- **Multi-Provider AI Engine (Factory Pattern)**:
  - **Groq LPU**: Ultra-fast inference with `openai/gpt-oss-120b`, `llama-3.3-70b-versatile`, etc.
  - **OpenAI**: Native `openai` SDK with strict JSON mode enforcement (`response_format: { type: "json_object" }`).
  - **Google Gemini**: `@google/generative-ai` SDK supporting `gemini-2.5-flash`, `gemini-1.5-pro`, with structured JSON (`responseMimeType: "application/json"`) and inline multimodal image data (`inlineData`).
- **Dynamic Endpoint Router (`POST /api/v1/run/[slug]`)**:
  - Exposes any configured AI task under its own dedicated URL.
  - Granular API key authentication (`Authorization: Bearer <key>`).
  - Instant enable/disable switch per endpoint.
  - Validates request body against dynamic input parameter schema (returns explicit `400 Bad Request` if required fields are missing).
  - Guarantees predictable response contract: `{ "success": boolean, "data": object | null, "error": string | null }`.
- **Persistent SQLite Telemetry & Audit Logs**:
  - Automatically records duration in milliseconds (`responseTimeMs`), prompt tokens, completion tokens, total tokens, calculated estimated cost ($), status code, raw request payload, and AI response JSON in SQLite (`dev.db`).
- **Interactive Web Interface**:
  - **Dashboard (`/dashboard`)**: Metric overview cards, filterable connectors table, status toggles, total request counters, and last used timestamps.
  - **Connector Builder (`/connectors/new` & `[id]/edit`)**: Dynamic parameter builder (Text, Number, Boolean, Image, File, JSON), dual-mode Output Schema editor (presets + formatted JSON editor), and API key generator.
  - **Testing Playground (`/connectors/[id]/test`)**: Dynamically rendered inputs, file upload with automatic Base64 conversion and image preview, real-time progress spinner, latency/token/cost telemetry pills, and syntax-highlighted response viewer.
  - **Auto-Generated Documentation (`/connectors/[id]/docs`)**: Interactive reference with header requirements, parameters specification, status code guide, and ready-to-copy code snippets (**cURL**, **JavaScript `fetch`**, and **Python `requests`**).

---

## Architecture Diagram

```
Client Application / Webhook / cURL
              │
              │  POST /api/v1/run/[slug]
              │  Authorization: Bearer <endpoint_key>
              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Dynamic Runner Gateway                      │
├─────────────────────────────────────────────────────────────┤
│ 1. Slug Lookup in SQLite (404 Not Found)                    │
│ 2. Active Status Verification (403 Forbidden)               │
│ 3. Bearer Token Authentication (401 Unauthorized)           │
│ 4. Request Body & Parameter Schema Validation (400)         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                    AdapterFactory.getAdapter()
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
┌───────────────────────┐ ┌──────────────┐ ┌───────────────────┐
│     Groq Adapter      │ │OpenAI Adapter│ │  Gemini Adapter   │
│ (OpenAI-compatible)   │ │  (JSON Mode) │ │(responseMimeType: │
│  openai/gpt-oss-120b  │ │ gpt-4o-mini  │ │"application/json")│
└───────────┬───────────┘ └──────┬───────┘ └─────────┬─────────┘
            │                    │                   │
            └────────────────────┼───────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                Persistent Telemetry Pipeline                │
├─────────────────────────────────────────────────────────────┤
│ • Calculate latency: responseTimeMs                         │
│ • Extract tokens: promptTokens, completionTokens            │
│ • Compute estimated cost ($) using model pricing table      │
│ • Write audit log row to ApiRequestLog (SQLite)             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
            Predictable JSON Envelope Output:
     { "success": true, "data": { ... }, "error": null }
```

---

## Database Schema (`prisma/schema.prisma`)

SQLite database with two relational models managed by Prisma ORM:

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model ApiConnector {
  id              String          @id @default(uuid())
  slug            String          @unique // Endpoint slug: /api/v1/run/[slug]
  name            String
  description     String
  provider        String          // "groq", "openai", "gemini"
  model           String          // "openai/gpt-oss-120b", "gpt-4o-mini", "gemini-2.5-flash"
  systemPrompt    String
  inputParameters String          // Stored as JSON: [{ name, type, required, description }]
  outputSchema    String          // Stored as JSON: Expected structured output contract
  apiKey          String          // Custom authentication Bearer key
  isActive        Boolean         @default(true)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  logs            ApiRequestLog[]
}

model ApiRequestLog {
  id               String       @id @default(uuid())
  connectorId      String
  connector        ApiConnector @relation(fields: [connectorId], references: [id], onDelete: Cascade)
  status           String       // "SUCCESS" | "FAILED"
  statusCode       Int          // 200, 400, 401, 403, 500
  responseTimeMs   Int
  promptTokens     Int?
  completionTokens Int?
  totalTokens      Int?
  estimatedCost    Float?
  errorMessage     String?
  requestPayload   String?      // Stringified JSON
  responsePayload  String?      // Stringified JSON
  createdAt        DateTime     @default(now())
}
```

---

## Getting Started

### Prerequisites

- **Node.js**: v18.17+ or v20+
- **npm** or **pnpm** / **yarn**

### 1. Installation

Clone or open the repository directory and install dependencies:

```bash
npm install
```

### 2. Configure Environment Variables

Create or update `.env` in the root directory:

```env
DATABASE_URL="file:./dev.db"

# AI Provider API Keys
GROQ_API_KEY="gsk_..."
GEMINI_API_KEY="AQ...."
OPENAI_API_KEY="sk-..."
```

*(Note: Groq and Gemini keys can be used independently; the system automatically routes to the appropriate provider).*

### 3. Initialize SQLite Database & Seed Data

Run database sync and seed pre-configured connectors:

```bash
# Push schema to SQLite
npx prisma db push

# Seed initial demonstration connectors
npm run db:seed
```

### 4. Start the Application

```bash
# Development mode (with Turbopack)
npm run dev

# Or Production build and start
npm run build
npm run start
```

Open [http://localhost:3000](http://localhost:3000) in your browser. It automatically redirects to `/dashboard`.

---

## API Documentation

### 1. Dynamic Runner (`POST /api/v1/run/[slug]`)

Executes the configured AI connector matching the given `slug`.

- **Method**: `POST`
- **Path**: `/api/v1/run/:slug`
- **Headers**:
  - `Authorization`: `Bearer <connector_api_key>`
  - `Content-Type`: `application/json`
- **Body**: JSON object matching the connector's configured `inputParameters`.

#### Response Contract:
```json
{
  "success": true,
  "data": {
    /* Fields strictly conforming to connector.outputSchema */
  },
  "error": null
}
```

#### Status Codes:
| Code | Reason |
| :--- | :--- |
| `200 OK` | AI executed successfully and output conforms to schema. |
| `400 Bad Request` | Missing required input parameter or malformed JSON body. |
| `401 Unauthorized` | Missing or invalid `Bearer <key>` in `Authorization` header. |
| `403 Forbidden` | Connector exists but has been marked disabled (`isActive: false`). |
| `404 Not Found` | Connector slug does not exist in registry. |
| `500 Internal Error` | Provider API error or execution exception (logged to database). |

---

### 2. Connector Management API (`/api/connectors`)

Standard CRUD REST endpoints for programmatic connector management:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/connectors` | List all connectors with request count & last used timestamp |
| `POST` | `/api/connectors` | Create a new AI connector |
| `GET` | `/api/connectors/:id` | Fetch connector details and recent execution logs |
| `PUT` | `/api/connectors/:id` | Update connector configurations, prompt, schema, or status |
| `DELETE` | `/api/connectors/:id` | Delete connector and cascade delete associated logs |

---

## Ready-to-Test Demos

### Demo 1: Lead Extractor (Groq LPU)
- **Slug**: `lead-extractor`
- **Auth Key**: `Bearer uapi_lead_extractor_demo_key`

```bash
curl -X POST "http://localhost:3000/api/v1/run/lead-extractor" \
  -H "Authorization: Bearer uapi_lead_extractor_demo_key" \
  -H "Content-Type: application/json" \
  -d '{
    "inquiry": "Hi, this is Marcus Vance, Head of Infrastructure at CloudScale Labs. We are experiencing major latency bottlenecks and urgently need a 100-node GPU cluster quoted by tomorrow afternoon. Contact me at marcus.vance@cloudscalelabs.com."
  }'
```

**Output:**
```json
{
  "success": true,
  "data": {
    "fullName": "Marcus Vance",
    "company": "CloudScale Labs",
    "email": "marcus.vance@cloudscalelabs.com",
    "jobTitle": "Head of Infrastructure",
    "urgency": "high"
  },
  "error": null
}
```

---

### Demo 2: Article Writer (Google Gemini)
- **Slug**: `article-writer`
- **Auth Key**: `Bearer uapi_article_writer_sec_demo456`

```bash
curl -X POST "http://localhost:3000/api/v1/run/article-writer" \
  -H "Authorization: Bearer uapi_article_writer_sec_demo456" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Neuromorphic Computing and Event-Based Vision Sensors",
    "wordCount": 120
  }'
```

**Output:**
```json
{
  "success": true,
  "data": {
    "title": "Neuromorphic Computing and the Rise of Event-Based Vision Sensors",
    "summary": "This article explores how neuromorphic computing combined with event-based sensors mimics human biology to process visual data with ultra-low latency.",
    "content": "Traditional cameras capture entire frames at rigid intervals, creating redundant data and high power consumption. Event-based vision sensors operate asynchronously..."
  },
  "error": null
}
```

---

### Demo 3: Card Scanner (Vision AI)
- **Slug**: `card-scanner`
- **Auth Key**: `Bearer uapi_card_scanner_sec_demo123`

```bash
curl -X POST "http://localhost:3000/api/v1/run/card-scanner" \
  -H "Authorization: Bearer uapi_card_scanner_sec_demo123" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Business_card_sample.jpg/640px-Business_card_sample.jpg"
  }'
```

---

## Token Pricing & Cost Calculation

The application includes an internal pricing matrix ([`src/lib/pricing.ts`](src/lib/pricing.ts)) calculating estimated costs per request:

| Provider | Model | Input Cost (per 1M) | Output Cost (per 1M) |
| :--- | :--- | :--- | :--- |
| **Groq** | `llama-3.3-70b-versatile` | \$0.59 | \$0.79 |
| **Groq** | `llama-3.1-8b-instant` | \$0.05 | \$0.08 |
| **Groq** | `openai/gpt-oss-120b` | \$0.15 | \$0.60 |
| **OpenAI** | `gpt-4o-mini` | \$0.15 | \$0.60 |
| **OpenAI** | `gpt-4o` | \$2.50 | \$10.00 |
| **Gemini** | `gemini-2.5-flash` / `1.5-flash` | \$0.075 | \$0.30 |
| **Gemini** | `gemini-1.5-pro` | \$1.25 | \$5.00 |

Costs are saved in SQLite with 6 decimal places of precision (`estimatedCost`).

---

## Project Structure & File Map

```
universal-api/
├── prisma/
│   ├── dev.db                      # SQLite database file
│   ├── schema.prisma               # Prisma schema definition
│   └── seed.ts                     # Database seed configuration
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── connectors/         # Management API (GET, POST, PUT, DELETE)
│   │   │   └── v1/run/[slug]/      # Dynamic AI execution runner
│   │   ├── connectors/
│   │   │   ├── new/                # New connector creation page
│   │   │   └── [id]/
│   │   │       ├── docs/           # Auto-generated API documentation
│   │   │       ├── edit/           # Edit connector configuration
│   │   │       └── test/           # Interactive testing playground
│   │   ├── dashboard/              # Main API Hub dashboard
│   │   ├── globals.css             # Tailwind CSS styles
│   │   ├── layout.tsx              # Root layout & Navbar
│   │   └── page.tsx                # Home redirect
│   ├── components/
│   │   ├── ConnectorForm.tsx       # Reusable connector builder form
│   │   └── Navbar.tsx              # Navigation bar
│   └── lib/
│       ├── adapters/
│       │   ├── AdapterFactory.ts   # Provider adapter factory
│       │   ├── BaseAdapter.ts      # Base adapter contract
│       │   ├── GeminiAdapter.ts    # Google Generative AI implementation
│       │   └── OpenAIAdapter.ts    # OpenAI & Groq implementation
│       ├── pricing.ts              # Model cost calculation
│       ├── prisma.ts               # Prisma singleton client
│       ├── types.ts                # TypeScript interfaces
│       └── utils.ts                # Helper utilities
├── .env.example                    # Sample environment variables
└── README.md                       # Complete project documentation
```

---

## License

This project is licensed under the MIT License.
