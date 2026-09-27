import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { BaseAdapter } from "./BaseAdapter";
import { AdapterExecutionPayload, AdapterExecutionResult } from "../types";

import fs from "fs";
import path from "path";

export class GeminiAdapter extends BaseAdapter {
  private client: GoogleGenerativeAI | null = null;

  private readEnvKey(keyName: string): string | null {
    const envVal = process.env[keyName]?.trim();
    if (envVal && !envVal.includes("your_api_key")) {
      return envVal;
    }
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

  private getClient(): GoogleGenerativeAI {
    const apiKey =
      this.readEnvKey("GEMINI_API_KEY") ||
      this.readEnvKey("GOOGLE_API_KEY") ||
      this.readEnvKey("GOOGLE_GENERATIVE_AI_API_KEY");

    if (!apiKey) {
      throw new Error(
        "Gemini API Key is not configured. Please set GEMINI_API_KEY or GOOGLE_API_KEY in your environment variables."
      );
    }

    if (!this.client) {
      this.client = new GoogleGenerativeAI(apiKey);
    }
    return this.client;
  }

  private async parseImageToPart(value: string): Promise<Part | null> {
    try {
      // Check for base64 data URL
      const dataUrlMatch = value.match(/^data:([^;]+);base64,(.+)$/);
      if (dataUrlMatch) {
        return {
          inlineData: {
            mimeType: dataUrlMatch[1],
            data: dataUrlMatch[2],
          },
        };
      }

      // Check for raw base64 or remote URL
      if (value.startsWith("http://") || value.startsWith("https://")) {
        const response = await fetch(value);
        if (response.ok) {
          const contentType = response.headers.get("content-type") || "image/jpeg";
          const arrayBuffer = await response.arrayBuffer();
          const base64Data = Buffer.from(arrayBuffer).toString("base64");
          return {
            inlineData: {
              mimeType: contentType,
              data: base64Data,
            },
          };
        }
      }
    } catch (e) {
      console.warn("Failed to parse image for Gemini:", e);
    }
    return null;
  }

  async execute(
    payload: AdapterExecutionPayload,
    modelNameOverride?: string
  ): Promise<AdapterExecutionResult> {
    const client = this.getClient();
    let modelName = modelNameOverride || payload.modelName || "gemini-2.5-flash";

    // Strip "models/" prefix if present
    if (modelName.startsWith("models/")) {
      modelName = modelName.replace("models/", "");
    }

    // Map deprecated legacy identifiers to latest active flash model
    if (modelName === "gemini-1.5-flash" || modelName === "gemini-1.5-flash-latest") {
      modelName = "gemini-2.5-flash";
    }

    const schemaString =
      typeof payload.outputSchema === "string"
        ? payload.outputSchema
        : JSON.stringify(payload.outputSchema, null, 2);

    const systemInstruction = `${payload.systemPrompt || "You are a helpful structured JSON extraction assistant."}

CRITICAL REQUIREMENT:
You must respond ONLY with a valid JSON object matching the following output schema:
${schemaString}
Do not include any Markdown wrapping (e.g. \`\`\`json) or extra commentary.`;

    const model = client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
      },
      systemInstruction,
    });

    const parts: Part[] = [];
    const textParameters: string[] = [];

    const paramMap = new Map(
      (payload.inputParameters || []).map((p) => [p.name, p])
    );

    for (const [key, rawValue] of Object.entries(payload.userValues || {})) {
      if (rawValue === undefined || rawValue === null) continue;

      const paramDef = paramMap.get(key);
      const isImageType =
        paramDef?.type?.toLowerCase() === "image" ||
        (typeof rawValue === "string" &&
          (rawValue.startsWith("data:image/") ||
            /\.(png|jpe?g|webp|gif)$/i.test(rawValue)));

      if (isImageType && typeof rawValue === "string") {
        const imagePart = await this.parseImageToPart(rawValue);
        if (imagePart) {
          parts.push(imagePart);
          textParameters.push(`Field "${key}": [Image input attached]`);
        } else {
          textParameters.push(`Field "${key}": ${rawValue}`);
        }
      } else {
        const formattedVal =
          typeof rawValue === "object"
            ? JSON.stringify(rawValue)
            : String(rawValue);
        textParameters.push(`Field "${key}": ${formattedVal}`);
      }
    }

    const promptText = `Process the following request inputs:
${textParameters.length > 0 ? textParameters.join("\n") : "No text parameters provided."}

Return a valid JSON object matching the schema.`;

    parts.push({
      text: promptText,
    });

    const result = await model.generateContent(parts);
    const response = await result.response;
    const rawText = response.text();

    let parsedData: any;
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsedData = JSON.parse(cleaned);
    }

    const usage = response.usageMetadata;
    const promptTokens = usage?.promptTokenCount ?? 0;
    const completionTokens = usage?.candidatesTokenCount ?? 0;
    const totalTokens = usage?.totalTokenCount ?? promptTokens + completionTokens;

    return {
      data: parsedData,
      promptTokens,
      completionTokens,
      totalTokens,
      rawResponse: {
        text: rawText,
        usageMetadata: usage,
      },
    };
  }
}
