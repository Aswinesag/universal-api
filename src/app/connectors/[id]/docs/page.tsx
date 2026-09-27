"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  FileCode,
  ArrowLeft,
  Play,
  Copy,
  Check,
  Edit,
  Terminal,
  Key,
  Layers,
  Sparkles,
  RefreshCw,
  Code2,
} from "lucide-react";
import { InputParameter } from "@/lib/types";

interface ConnectorDocs {
  id: string;
  name: string;
  slug: string;
  description: string;
  provider: string;
  model: string;
  systemPrompt: string;
  inputParameters: string;
  outputSchema: string;
  apiKey: string;
  isActive: boolean;
}

export default function ConnectorDocsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [connector, setConnector] = useState<ConnectorDocs | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSnippetTab, setActiveSnippetTab] = useState<"curl" | "javascript" | "python">("curl");
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    const loadConnector = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/connectors/${id}`);
        const json = await res.json();
        if (json.success && json.data) {
          setConnector(json.data);
        }
      } catch (err) {
        console.error("Failed to load connector for docs:", err);
      } finally {
        setLoading(false);
      }
    };
    loadConnector();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  if (!connector) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-zinc-400">
        <p className="text-lg font-semibold text-white">Connector Not Found</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-flex items-center gap-2 text-sm text-indigo-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  let inputParameters: InputParameter[] = [];
  try {
    inputParameters = JSON.parse(connector.inputParameters || "[]");
  } catch {
    inputParameters = [];
  }

  let parsedOutputSchema: any = {};
  try {
    parsedOutputSchema = JSON.parse(connector.outputSchema || "{}");
  } catch {
    parsedOutputSchema = connector.outputSchema;
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const endpointUrl = `${origin}/api/v1/run/${connector.slug}`;

  // Generate sample payload based on input parameters
  const samplePayload: Record<string, any> = {};
  for (const p of inputParameters) {
    if (p.type === "Image") {
      samplePayload[p.name] = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    } else if (p.type === "Number") {
      samplePayload[p.name] = 500;
    } else if (p.type === "Boolean") {
      samplePayload[p.name] = true;
    } else if (p.type === "JSON") {
      samplePayload[p.name] = { sampleKey: "sampleValue" };
    } else {
      samplePayload[p.name] = p.name === "topic" ? "Artificial General Intelligence Trends" : `Sample ${p.name} input`;
    }
  }

  const curlSnippet = `curl -X POST "${endpointUrl}" \\
  -H "Authorization: Bearer ${connector.apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(samplePayload, null, 2)}'`;

  const jsSnippet = `const response = await fetch("${endpointUrl}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${connector.apiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${JSON.stringify(samplePayload, null, 4)})
});

const data = await response.json();
console.log(data);`;

  const pythonSnippet = `import requests

url = "${endpointUrl}"
headers = {
    "Authorization": "Bearer ${connector.apiKey}",
    "Content-Type": "application/json"
}
payload = ${JSON.stringify(samplePayload, null, 4)}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;

  const activeSnippet =
    activeSnippetTab === "curl"
      ? curlSnippet
      : activeSnippetTab === "javascript"
      ? jsSnippet
      : pythonSnippet;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
            <Link href="/dashboard" className="hover:text-zinc-200 transition">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-zinc-200">{connector.name}</span>
            <span>/</span>
            <span className="text-indigo-400 font-medium">Documentation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <FileCode className="h-6 w-6 text-indigo-400" />
            API Reference: {connector.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-400 max-w-3xl">
            {connector.description || "Self-documenting, schema-enforced AI API endpoint documentation."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/connectors/${connector.id}/test`}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition active:scale-95"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Open Playground
          </Link>
          <Link
            href={`/connectors/${connector.id}/edit`}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Link>
        </div>
      </div>

      {/* Endpoint URL and Method Banner */}
      <div className="my-8 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
          HTTP Endpoint Route
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
          <div className="flex items-center gap-3 font-mono text-sm overflow-x-auto">
            <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 font-bold text-emerald-400 text-xs">
              POST
            </span>
            <span className="text-zinc-200">{endpointUrl}</span>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(endpointUrl);
              setCopiedUrl(true);
              setTimeout(() => setCopiedUrl(false), 2000);
            }}
            className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition whitespace-nowrap self-start sm:self-auto"
          >
            {copiedUrl ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy URL</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Requirements & Schema Tables */}
        <div className="space-y-8 lg:col-span-6">
          {/* Header Requirements */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
              <Key className="h-4 w-4 text-amber-400" />
              HTTP Headers
            </h2>

            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 uppercase font-mono">
                  <tr>
                    <th className="px-4 py-2.5">Header</th>
                    <th className="px-4 py-2.5">Value / Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 font-mono">
                  <tr>
                    <td className="px-4 py-2.5 font-semibold text-indigo-300">Authorization</td>
                    <td className="px-4 py-2.5 text-zinc-300">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500">Bearer</span>
                        <span className="rounded bg-zinc-900 px-2 py-0.5 text-zinc-300">
                          {connector.apiKey}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(connector.apiKey);
                            setCopiedKey(true);
                            setTimeout(() => setCopiedKey(false), 2000);
                          }}
                          className="text-zinc-500 hover:text-zinc-200"
                          title="Copy API Key"
                        >
                          {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 font-semibold text-indigo-300">Content-Type</td>
                    <td className="px-4 py-2.5 text-zinc-400">application/json</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Table of Input Parameters */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-sky-400" />
              Request Body Parameters
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              Pass as JSON keys in the HTTP request payload.
            </p>

            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-zinc-400 uppercase font-mono">
                  <tr>
                    <th className="px-4 py-2.5">Field Name</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Required</th>
                    <th className="px-4 py-2.5">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {inputParameters.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-zinc-500 italic">
                        No parameters defined. Accepts empty object <code className="font-mono">&#123;&#125;</code>.
                      </td>
                    </tr>
                  ) : (
                    inputParameters.map((p, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/30">
                        <td className="px-4 py-2.5 font-mono font-semibold text-white">
                          {p.name}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-zinc-400">
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px]">
                            {p.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {p.required ? (
                            <span className="font-semibold text-red-400">Yes</span>
                          ) : (
                            <span className="text-zinc-500">No</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-zinc-400">
                          {p.description || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expected Response Format Specification */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
              <Code2 className="h-4 w-4 text-violet-400" />
              Standard Response Envelope
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              All responses follow a predictable JSON contract:
            </p>

            <pre className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
{`{
  "success": true,
  "data": { ... }, // Conforms to configured output schema
  "error": null
}`}
            </pre>

            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mt-4 mb-2">
              Expected Inner &quot;data&quot; Schema
            </h3>
            <pre className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-emerald-400 overflow-x-auto">
              {JSON.stringify(parsedOutputSchema, null, 2)}
            </pre>
          </div>
        </div>

        {/* Right Column: Code Snippets & Examples */}
        <div className="space-y-6 lg:col-span-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 shadow-sm overflow-hidden">
            {/* Snippet Language Tabs */}
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-zinc-400" />
                <span className="text-xs font-semibold text-white">Ready-to-Run Code Snippets</span>
              </div>
              <div className="flex items-center gap-1">
                {(["curl", "javascript", "python"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveSnippetTab(tab)}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                      activeSnippetTab === tab
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    {tab === "curl" ? "cURL" : tab === "javascript" ? "JavaScript" : "Python"}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Block with Copy Button */}
            <div className="relative bg-zinc-950 p-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeSnippet);
                  setCopiedSnippet(true);
                  setTimeout(() => setCopiedSnippet(false), 2000);
                }}
                className="absolute right-4 top-4 flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
              >
                {copiedSnippet ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <pre className="font-mono text-xs text-zinc-300 overflow-x-auto pt-6 leading-relaxed">
                {activeSnippet}
              </pre>
            </div>
          </div>

          {/* Example Output Simulation Card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Example Successful Response (200 OK)
            </h2>
            <p className="text-xs text-zinc-400 mb-4">
              Simulated response payload generated with {connector.model}:
            </p>

            <pre className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-emerald-400 overflow-x-auto leading-relaxed">
{JSON.stringify(
  {
    success: true,
    data: parsedOutputSchema,
    error: null,
  },
  null,
  2
)}
            </pre>
          </div>

          {/* HTTP Status Reference */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
              HTTP Error Reference
            </h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="w-16 rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-400 font-bold">200 OK</span>
                <span className="text-zinc-400 font-sans">Successful execution and schema validation</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-16 rounded bg-amber-500/10 px-2 py-0.5 text-amber-400 font-bold">400</span>
                <span className="text-zinc-400 font-sans">Missing required parameter or malformed JSON body</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-16 rounded bg-red-500/10 px-2 py-0.5 text-red-400 font-bold">401</span>
                <span className="text-zinc-400 font-sans">Invalid or missing Bearer API key</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-16 rounded bg-red-500/10 px-2 py-0.5 text-red-400 font-bold">403</span>
                <span className="text-zinc-400 font-sans">Connector is currently marked as disabled</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-16 rounded bg-red-500/10 px-2 py-0.5 text-red-400 font-bold">404</span>
                <span className="text-zinc-400 font-sans">Connector slug not found in registry</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-16 rounded bg-red-500/10 px-2 py-0.5 text-red-400 font-bold">500</span>
                <span className="text-zinc-400 font-sans">AI provider execution failure (logged in database)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
