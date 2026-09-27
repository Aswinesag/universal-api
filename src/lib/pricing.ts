interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  "gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.60 },
  "gpt-4o": { inputPerMillion: 2.50, outputPerMillion: 10.00 },
  "gpt-4-turbo": { inputPerMillion: 10.00, outputPerMillion: 30.00 },
  "gpt-3.5-turbo": { inputPerMillion: 0.50, outputPerMillion: 1.50 },
  "o1": { inputPerMillion: 15.00, outputPerMillion: 60.00 },
  "o3-mini": { inputPerMillion: 1.10, outputPerMillion: 4.40 },

  // Groq Models
  "llama-3.3-70b-versatile": { inputPerMillion: 0.59, outputPerMillion: 0.79 },
  "llama-3.1-8b-instant": { inputPerMillion: 0.05, outputPerMillion: 0.08 },
  "llama-3.2-11b-vision-preview": { inputPerMillion: 0.16, outputPerMillion: 0.16 },
  "llama-3.2-90b-vision-preview": { inputPerMillion: 0.89, outputPerMillion: 0.89 },
  "mixtral-8x7b-32768": { inputPerMillion: 0.24, outputPerMillion: 0.24 },

  // Gemini
  "gemini-1.5-flash": { inputPerMillion: 0.075, outputPerMillion: 0.30 },
  "gemini-1.5-flash-latest": { inputPerMillion: 0.075, outputPerMillion: 0.30 },
  "gemini-1.5-pro": { inputPerMillion: 1.25, outputPerMillion: 5.00 },
  "gemini-1.5-pro-latest": { inputPerMillion: 1.25, outputPerMillion: 5.00 },
  "gemini-2.0-flash": { inputPerMillion: 0.10, outputPerMillion: 0.40 },
  "gemini-2.0-flash-exp": { inputPerMillion: 0.10, outputPerMillion: 0.40 },
};

export function calculateEstimatedCost(
  model: string,
  promptTokens: number = 0,
  completionTokens: number = 0
): number {
  const normalizedModel = model.toLowerCase().trim();
  const pricing =
    MODEL_PRICING[normalizedModel] ||
    Object.entries(MODEL_PRICING).find(([key]) => normalizedModel.includes(key))?.[1] ||
    { inputPerMillion: 0.15, outputPerMillion: 0.60 };

  const inputCost = (promptTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPerMillion;

  // Round to 6 decimal places for precision
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}
