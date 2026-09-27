"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Plus,
  Trash2,
  Key,
  RefreshCw,
  Copy,
  Check,
  Code2,
  HelpCircle,
  ArrowLeft,
  Save,
} from "lucide-react";
import Link from "next/link";
import { InputParameter, ParameterType } from "@/lib/types";

interface SchemaField {
  key: string;
  type: string;
}

interface ConnectorFormProps {
  initialData?: {
    id?: string;
    name: string;
    slug: string;
    description: string;
    provider: string;
    model: string;
    systemPrompt: string;
    inputParameters: string;
    outputSchema: string;
    apiKey: string;
    isActive?: boolean;
  };
  isEditing?: boolean;
}

const PROVIDER_PRESETS: Record<string, string[]> = {
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama-3.2-11b-vision-preview", "mixtral-8x7b-32768"],
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "o3-mini"],
  gemini: ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"],
};

export function ConnectorForm({ initialData, isEditing = false }: ConnectorFormProps) {
  const router = useRouter();

  // Basic Details
  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [provider, setProvider] = useState(initialData?.provider || "openai");
  const [model, setModel] = useState(initialData?.model || "gpt-4o-mini");
  const [systemPrompt, setSystemPrompt] = useState(
    initialData?.systemPrompt ||
      "You are a structured AI extraction assistant. Process the given inputs and return strictly valid JSON according to the schema."
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  // API Key
  const generateApiKey = () => {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `uapi_${randomHex}`;
  };

  const [apiKey, setApiKey] = useState(
    initialData?.apiKey || (typeof window !== "undefined" ? generateApiKey() : "uapi_default_key")
  );
  const [copiedKey, setCopiedKey] = useState(false);

  // Input Parameters Builder
  const parseInitialParams = (): InputParameter[] => {
    if (!initialData?.inputParameters) {
      return [{ name: "input", type: "Text", required: true, description: "Main input text" }];
    }
    try {
      return JSON.parse(initialData.inputParameters);
    } catch {
      return [{ name: "input", type: "Text", required: true, description: "" }];
    }
  };

  const [parameters, setParameters] = useState<InputParameter[]>(parseInitialParams);

  // Output Schema Builder (Dual Mode: Visual vs Raw JSON)
  const [schemaMode, setSchemaMode] = useState<"visual" | "json">("json");
  const [rawSchema, setRawSchema] = useState(
    initialData?.outputSchema
      ? typeof initialData.outputSchema === "string"
        ? initialData.outputSchema
        : JSON.stringify(initialData.outputSchema, null, 2)
      : JSON.stringify(
          {
            title: "string",
            summary: "string",
            tags: ["string"],
          },
          null,
          2
        )
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name if creating
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generatedSlug);
    }
  };

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const presets = PROVIDER_PRESETS[newProvider];
    if (presets && presets.length > 0) {
      setModel(presets[0]);
    }
  };

  // Parameter manipulations
  const addParameter = () => {
    setParameters([
      ...parameters,
      { name: `param_${parameters.length + 1}`, type: "Text", required: true, description: "" },
    ]);
  };

  const updateParameter = (index: number, field: keyof InputParameter, value: any) => {
    setParameters((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeParameter = (index: number) => {
    setParameters((prev) => prev.filter((_, i) => i !== index));
  };

  // Schema formatting & presets
  const formatJsonSchema = () => {
    try {
      const parsed = JSON.parse(rawSchema);
      setRawSchema(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch {
      setError("Invalid JSON format in output schema.");
    }
  };

  const applySchemaPreset = (presetName: string) => {
    if (presetName === "extraction") {
      setRawSchema(
        JSON.stringify(
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
        )
      );
    } else if (presetName === "article") {
      setRawSchema(
        JSON.stringify(
          {
            title: "string",
            summary: "string",
            content: "string",
          },
          null,
          2
        )
      );
    } else if (presetName === "analysis") {
      setRawSchema(
        JSON.stringify(
          {
            sentiment: "positive | neutral | negative",
            score: 0.95,
            keyPoints: ["string"],
            actionRequired: false,
          },
          null,
          2
        )
      );
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please provide a connector name.");
      return;
    }
    if (!slug.trim()) {
      setError("Please provide an endpoint slug.");
      return;
    }
    if (!systemPrompt.trim()) {
      setError("System prompt cannot be empty.");
      return;
    }

    // Validate JSON schema
    let parsedSchema: any;
    try {
      parsedSchema = JSON.parse(rawSchema);
    } catch {
      setError("Output Schema must be valid JSON.");
      return;
    }

    // Validate parameters
    for (const p of parameters) {
      if (!p.name.trim()) {
        setError("All input parameters must have a field name.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name,
        slug,
        description,
        provider,
        model,
        systemPrompt,
        inputParameters: parameters,
        outputSchema: parsedSchema,
        apiKey,
        isActive,
      };

      const url = isEditing && initialData?.id ? `/api/connectors/${initialData.id}` : "/api/connectors";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to save connector");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong saving the connector.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Top back navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition disabled:opacity-50 active:scale-95"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEditing ? "Save Changes" : "Deploy Connector"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          <p className="font-semibold">Validation Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Card 1: Basic Information */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400" />
          General Configuration
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Define the identity, endpoint slug, and human-readable description for this connector.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-300">
              Connector Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Card Scanner or Article Writer"
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300">
              Endpoint Slug <span className="text-red-400">*</span>
            </label>
            <div className="mt-1.5 flex rounded-lg border border-zinc-800 bg-zinc-950 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500">
              <span className="inline-flex items-center px-3 text-xs font-mono text-zinc-500 border-r border-zinc-800 select-none">
                /api/v1/run/
              </span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-"))}
                placeholder="my-custom-endpoint"
                className="w-full bg-transparent px-3 py-2 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Used in the public URL. Only lowercase letters, numbers, and hyphens.
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-300">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the purpose, capabilities, or business logic of this connector..."
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Card 2: AI Provider & Engine Settings */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Code2 className="h-4 w-4 text-sky-400" />
          AI Provider & Model Engine
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Select which underlying AI provider model executes the requests.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-300">
              Provider Engine <span className="text-red-400">*</span>
            </label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="groq">Groq (Llama 3.3 70B, Llama 3.1 8B, Vision)</option>
              <option value="openai">OpenAI (GPT-4o, GPT-4o-mini, o3-mini)</option>
              <option value="gemini">Google Gemini (2.5 Flash, 1.5 Flash/Pro)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300">
              Model Identifier <span className="text-red-400">*</span>
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. gpt-4o-mini or gemini-1.5-flash"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-sm font-mono text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
              <span>Quick select:</span>
              {(PROVIDER_PRESETS[provider] || []).map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setModel(preset)}
                  className={`rounded border px-2 py-0.5 text-[11px] font-mono transition ${
                    model === preset
                      ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-white"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-zinc-300">
                System Instructions / Prompt <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] text-zinc-500">
                Injected into the provider engine before schema constraints
              </span>
            </div>
            <textarea
              rows={4}
              required
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Define instructions, role, rules, and extraction directives for the model..."
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 font-mono text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Card 3: Dynamic Input Parameter Builder */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-400" />
              Dynamic Input Parameters
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              Specify the arguments callers can or must provide in the JSON request body.
            </p>
          </div>
          <button
            type="button"
            onClick={addParameter}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Parameter
          </button>
        </div>

        <div className="mt-6 space-y-3">
          {parameters.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-500">
              No input parameters defined. Click "Add Parameter" to configure required arguments.
            </div>
          ) : (
            parameters.map((param, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950/80 p-3 sm:flex-row sm:items-center"
              >
                {/* Field Name */}
                <div className="flex-1">
                  <span className="block text-[10px] uppercase font-semibold text-zinc-500 mb-1">
                    Field Name
                  </span>
                  <input
                    type="text"
                    required
                    value={param.name}
                    onChange={(e) => updateParameter(index, "name", e.target.value)}
                    placeholder="e.g. topic, image, query"
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Type Dropdown */}
                <div className="w-full sm:w-36">
                  <span className="block text-[10px] uppercase font-semibold text-zinc-500 mb-1">
                    Type
                  </span>
                  <select
                    value={param.type}
                    onChange={(e) => updateParameter(index, "type", e.target.value as ParameterType)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Text">Text</option>
                    <option value="Number">Number</option>
                    <option value="Boolean">Boolean</option>
                    <option value="Image">Image (Base64/URL)</option>
                    <option value="File">File</option>
                    <option value="JSON">JSON</option>
                  </select>
                </div>

                {/* Description */}
                <div className="flex-1">
                  <span className="block text-[10px] uppercase font-semibold text-zinc-500 mb-1">
                    Description (Optional)
                  </span>
                  <input
                    type="text"
                    value={param.description || ""}
                    onChange={(e) => updateParameter(index, "description", e.target.value)}
                    placeholder="Short description for callers"
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Required Checkbox */}
                <div className="flex items-center gap-2 pt-4 sm:pt-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={param.required}
                      onChange={(e) => updateParameter(index, "required", e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Required</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => removeParameter(index)}
                    className="rounded p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition"
                    title="Remove parameter"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Card 4: Output Schema Builder */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Code2 className="h-4 w-4 text-violet-400" />
              Output JSON Schema
            </h2>
            <p className="mt-1 text-xs text-zinc-400">
              The AI model will be strictly constrained to respond in this exact JSON format.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Presets:</span>
            <button
              type="button"
              onClick={() => applySchemaPreset("extraction")}
              className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
            >
              Extraction
            </button>
            <button
              type="button"
              onClick={() => applySchemaPreset("article")}
              className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
            >
              Article
            </button>
            <button
              type="button"
              onClick={() => applySchemaPreset("analysis")}
              className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 hover:bg-zinc-700"
            >
              Analysis
            </button>
            <button
              type="button"
              onClick={formatJsonSchema}
              className="rounded border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-[11px] font-medium text-zinc-200 hover:bg-zinc-700"
              title="Prettify JSON"
            >
              Format JSON
            </button>
          </div>
        </div>

        <div className="mt-4">
          <textarea
            rows={8}
            required
            value={rawSchema}
            onChange={(e) => setRawSchema(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-emerald-400 placeholder-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            placeholder={`{\n  "result": "string",\n  "confidence": 0.99\n}`}
          />
        </div>
      </div>

      {/* Card 5: Endpoint Security & Custom API Key */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Key className="h-4 w-4 text-amber-400" />
          Endpoint Security (API Key Authentication)
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Incoming requests must include this key in the <code className="text-zinc-300 font-mono">Authorization: Bearer &lt;key&gt;</code> header.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2 font-mono text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setApiKey(generateApiKey());
              }}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Generate New Key
            </button>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(apiKey);
                setCopiedKey(true);
                setTimeout(() => setCopiedKey(false), 2000);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
            >
              {copiedKey ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="isActiveToggle"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="isActiveToggle" className="text-xs text-zinc-300 cursor-pointer">
            Endpoint Active (accept incoming execution requests)
          </label>
        </div>
      </div>

      {/* Bottom Save Action */}
      <div className="flex justify-end gap-3 pt-4">
        <Link
          href="/dashboard"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition disabled:opacity-50 active:scale-95"
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEditing ? "Save Changes" : "Deploy Connector"}
        </button>
      </div>
    </form>
  );
}
