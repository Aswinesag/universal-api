import { BaseAdapter } from "./BaseAdapter";
import { OpenAIAdapter } from "./OpenAIAdapter";
import { GeminiAdapter } from "./GeminiAdapter";

export class AdapterFactory {
  private static instances: Map<string, BaseAdapter> = new Map();

  static getAdapter(provider: string): BaseAdapter {
    const normalized = provider.toLowerCase().trim();

    if (this.instances.has(normalized)) {
      return this.instances.get(normalized)!;
    }

    let adapter: BaseAdapter;

    switch (normalized) {
      case "groq":
      case "openai":
        adapter = new OpenAIAdapter();
        break;
      case "gemini":
      case "google":
        adapter = new GeminiAdapter();
        break;
      default:
        throw new Error(
          `Unsupported AI provider: "${provider}". Supported providers are "openai" and "gemini".`
        );
    }

    this.instances.set(normalized, adapter);
    return adapter;
  }
}
