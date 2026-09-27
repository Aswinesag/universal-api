import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding initial AI connectors...");

  // 1. Card Scanner (Vision AI)
  const cardScanner = await prisma.apiConnector.upsert({
    where: { slug: "card-scanner" },
    update: {},
    create: {
      name: "Card Scanner (Vision AI)",
      slug: "card-scanner",
      description:
        "Extract structured contact and company details from business card images using Vision AI.",
      provider: "openai",
      model: "gpt-4o-mini",
      systemPrompt:
        "You are a business card extraction system. Extract name, company, designation, phone, email, and website from the image.",
      inputParameters: JSON.stringify([
        {
          name: "image",
          type: "Image",
          required: true,
          description: "Base64 data URI or public image URL of the business card",
        },
      ]),
      outputSchema: JSON.stringify(
        {
          name: "string",
          company: "string",
          designation: "string",
          phone: "string",
          email: "string",
          website: "string",
        },
        null,
        2
      ),
      apiKey: "uapi_card_scanner_sec_demo123",
      isActive: true,
    },
  });

  // 2. Article Writer (Text AI)
  const articleWriter = await prisma.apiConnector.upsert({
    where: { slug: "article-writer" },
    update: {},
    create: {
      name: "Article Writer (Text AI)",
      slug: "article-writer",
      description:
        "Generate well-structured articles with title, summary, and markdown content based on topic and word count.",
      provider: "gemini",
      model: "gemini-1.5-flash",
      systemPrompt:
        "You are an expert article writer. Generate structured articles based on topic and word count.",
      inputParameters: JSON.stringify([
        {
          name: "topic",
          type: "Text",
          required: true,
          description: "Topic or subject for the article",
        },
        {
          name: "wordCount",
          type: "Number",
          required: false,
          description: "Target word count (e.g. 500)",
        },
      ]),
      outputSchema: JSON.stringify(
        {
          title: "string",
          summary: "string",
          content: "string",
        },
        null,
        2
      ),
      apiKey: "uapi_article_writer_sec_demo456",
      isActive: true,
    },
  });

  // Seed sample logs if none exist for card scanner
  const cardScannerLogCount = await prisma.apiRequestLog.count({
    where: { connectorId: cardScanner.id },
  });

  if (cardScannerLogCount === 0) {
    await prisma.apiRequestLog.createMany({
      data: [
        {
          connectorId: cardScanner.id,
          status: "SUCCESS",
          statusCode: 200,
          responseTimeMs: 842,
          promptTokens: 412,
          completionTokens: 85,
          totalTokens: 497,
          estimatedCost: 0.000112,
          requestPayload: JSON.stringify({
            image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          }),
          responsePayload: JSON.stringify({
            name: "Alexander Wright",
            company: "Apex Global Dynamics",
            designation: "Chief Technology Officer",
            phone: "+1 (555) 438-9210",
            email: "alexander.wright@apex dynamics.io",
            website: "https://apexdynamics.io",
          }),
          createdAt: new Date(Date.now() - 3600000 * 4),
        },
      ],
    });
  }

  // Seed sample logs if none exist for article writer
  const articleWriterLogCount = await prisma.apiRequestLog.count({
    where: { connectorId: articleWriter.id },
  });

  if (articleWriterLogCount === 0) {
    await prisma.apiRequestLog.createMany({
      data: [
        {
          connectorId: articleWriter.id,
          status: "SUCCESS",
          statusCode: 200,
          responseTimeMs: 654,
          promptTokens: 245,
          completionTokens: 380,
          totalTokens: 625,
          estimatedCost: 0.000132,
          requestPayload: JSON.stringify({
            topic: "The Future of Edge AI and Microcontrollers",
            wordCount: 400,
          }),
          responsePayload: JSON.stringify({
            title: "The Future of Edge AI and Microcontrollers",
            summary: "An exploration of neural acceleration on ultra-low-power silicon.",
            content: "Edge AI is undergoing a radical paradigm shift as sub-milliwatt microcontrollers gain hardware tensor cores...",
          }),
          createdAt: new Date(Date.now() - 3600000 * 2),
        },
      ],
    });
  }

  console.log("Database seeded successfully with Card Scanner and Article Writer connectors.");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
