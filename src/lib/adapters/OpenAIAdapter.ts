import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { BaseAdapter } from "./BaseAdapter";
import { AdapterExecutionPayload, AdapterExecutionResult } from "../types";

export class OpenAIAdapter extends BaseAdapter {
  private client: OpenAI | null = null;
  private isGroq: boolean = false;

  private readEnvKey(keyName: string): string | null {
    // Check process.env first if not a placeholder
    const envVal = process.env[keyName]?.trim();
    if (envVal && !envVal.includes("your_api_key")) {
      return envVal;
    }

    // Fallback: parse .env directly
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        const match = content.match(new RegExp(`^${keyName}=["']?([^"'\\r\\n]+)["']?`, "m"));
        if (match && match[1] && !match[1].includes("your_api_key")) {
          return match[1].trim();
        }
      }
    } catch {
      // ignore
    }

    return null;
  }

  private getClient(): OpenAI {
    const groqKey = this.readEnvKey("GROQ_API_KEY");
    const openaiKey = this.readEnvKey("OPENAI_API_KEY");

    // Prefer Groq when GROQ_API_KEY is configured
    if (groqKey) {
      if (!this.client || !this.isGroq) {
        this.client = new OpenAI({
          apiKey: groqKey,
          baseURL: "https://api.groq.com/openai/v1",
        });
        this.isGroq = true;
      }
      return this.client;
    }

    if (openaiKey) {
      if (!this.client || this.isGroq) {
        this.client = new OpenAI({ apiKey: openaiKey });
        this.isGroq = false;
      }
      return this.client;
    }

    throw new Error(
      "No AI API Key configured. Please set GROQ_API_KEY or OPENAI_API_KEY in your .env file."
    );
  }

  async execute(
    payload: AdapterExecutionPayload,
    modelNameOverride?: string
  ): Promise<AdapterExecutionResult> {
    const client = this.getClient();
    let requestedModel = modelNameOverride || payload.modelName || "gpt-4o-mini";

    const schemaString =
      typeof payload.outputSchema === "string"
        ? payload.outputSchema
        : JSON.stringify(payload.outputSchema, null, 2);

    const systemInstruction = `${payload.systemPrompt || "You are a helpful structured JSON extraction assistant."}

CRITICAL: You must return only a valid JSON object matching the following output schema:
${schemaString}
Ensure your output is strictly valid JSON without markdown fences.`;

    const contentParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    const textParameters: string[] = [];

    const paramMap = new Map(
      (payload.inputParameters || []).map((p) => [p.name, p])
    );

    // Process all values from userValues
    for (const [key, rawValue] of Object.entries(payload.userValues || {})) {
      if (rawValue === undefined || rawValue === null) continue;

      const paramDef = paramMap.get(key);
      const isImageType =
        paramDef?.type?.toLowerCase() === "image" ||
        (typeof rawValue === "string" &&
          (rawValue.startsWith("data:image/") ||
            /\.(png|jpe?g|webp|gif)$/i.test(rawValue)));

      if (isImageType && typeof rawValue === "string") {
        if (!this.isGroq) {
          contentParts.push({
            type: "image_url",
            image_url: {
              url: rawValue,
              detail: "auto",
            },
          });
        }
        textParameters.push(`Field "${key}": [Image input provided]`);
      } else {
        const formattedVal =
          typeof rawValue === "object"
            ? JSON.stringify(rawValue)
            : String(rawValue);
        textParameters.push(`Field "${key}": ${formattedVal}`);
      }
    }

    // Auto-map model if running on Groq
    let targetModel = requestedModel;
    if (this.isGroq) {
      if (
        requestedModel.startsWith("gpt-") ||
        requestedModel.startsWith("o1") ||
        requestedModel.startsWith("o3")
      ) {
        targetModel = "openai/gpt-oss-120b";
      }
    }

    const promptText = `Process the following request inputs according to the system instructions and output schema:
${textParameters.length > 0 ? textParameters.join("\n") : "No text parameters provided."}

Return a valid JSON object response adhering to the required schema. Ensure the response is valid JSON.`;

    const userMessageContent: any =
      contentParts.length > 0
        ? [{ type: "text", text: promptText }, ...contentParts]
        : promptText;

    const completion = await client.chat.completions.create({
      model: targetModel,
      messages: [
        {
          role: "system",
          content: systemInstruction,
        },
        {
          role: "user",
          content: userMessageContent,
        },
      ],
      response_format: { type: "json_object" },
    });

    const rawResponseText = completion.choices[0]?.message?.content || "{}";
    let parsedData: any;
    try {
      parsedData = JSON.parse(rawResponseText);
    } catch {
      const cleaned = rawResponseText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsedData = JSON.parse(cleaned);
    }

    const usage = completion.usage;
    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;
    const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens;

    return {
      data: parsedData,
      promptTokens,
      completionTokens,
      totalTokens,
      rawResponse: completion,
    };
  }
}
