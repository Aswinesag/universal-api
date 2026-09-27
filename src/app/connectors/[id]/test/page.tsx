"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Play,
  ArrowLeft,
  FileCode,
  Edit,
  Clock,
  Coins,
  Cpu,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Upload,
  RefreshCw,
  Image as ImageIcon,
  Key,
  Terminal,
} from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { InputParameter } from "@/lib/types";

interface ConnectorDetails {
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
  logs: Array<{
    id: string;
    status: string;
    statusCode: number;
    responseTimeMs: number;
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
    estimatedCost: number | null;
    errorMessage: string | null;
    requestPayload: string | null;
    responsePayload: string | null;
    createdAt: string;
  }>;
}

export default function TestPlaygroundPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [connector, setConnector] = useState<ConnectorDetails | null>(null);
  const [loadingConnector, setLoadingConnector] = useState(true);

  // Playground state
  const [authKey, setAuthKey] = useState("");
  const [paramValues, setParamValues] = useState<Record<string, any>>({});
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});

  // Execution state
  const [executing, setExecuting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: number;
    ok: boolean;
    data: any;
    error: string | null;
    durationMs: number;
    timestamp: Date;
  } | null>(null);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const fetchConnector = async () => {
    try {
      setLoadingConnector(true);
      const res = await fetch(`/api/connectors/${id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setConnector(json.data);
        setAuthKey(json.data.apiKey);

        // Initialize default input values
        let paramsList: InputParameter[] = [];
        try {
          paramsList = JSON.parse(json.data.inputParameters || "[]");
        } catch {
          paramsList = [];
        }

        const initialVals: Record<string, any> = {};
        for (const p of paramsList) {
          if (p.type === "Number") initialVals[p.name] = 500;
          else if (p.type === "Boolean") initialVals[p.name] = false;
          else if (p.type === "JSON") initialVals[p.name] = "{}";
          else if (p.name === "topic") initialVals[p.name] = "Modern Serverless AI Architectures";
          else initialVals[p.name] = "";
        }
        setParamValues(initialVals);
      }
    } catch (err) {
      console.error("Failed to load connector details:", err);
    } finally {
      setLoadingConnector(false);
    }
  };

  useEffect(() => {
    fetchConnector();
  }, [id]);

  const handleInputChange = (name: string, value: any) => {
    setParamValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = (name: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      handleInputChange(name, base64);
      setImagePreviews((prev) => ({ ...prev, [name]: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleExecute = async () => {
    if (!connector) return;

    setExecuting(true);
    setTestResult(null);
    const start = performance.now();

    try {
      // Process payload values
      const payload: Record<string, any> = {};
      let paramsList: InputParameter[] = [];
      try {
        paramsList = JSON.parse(connector.inputParameters || "[]");
      } catch {
        paramsList = [];
      }

      for (const p of paramsList) {
        const val = paramValues[p.name];
        if (p.type === "Number") {
          payload[p.name] = val !== "" && val !== undefined ? Number(val) : undefined;
        } else if (p.type === "Boolean") {
          payload[p.name] = Boolean(val);
        } else if (p.type === "JSON" && typeof val === "string") {
          try {
            payload[p.name] = JSON.parse(val);
          } catch {
            payload[p.name] = val;
          }
        } else {
          payload[p.name] = val;
        }
      }

      const res = await fetch(`/api/v1/run/${connector.slug}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authKey.trim()}`,
        },
        body: JSON.stringify(payload),
      });

      const durationMs = Math.round(performance.now() - start);
      const json = await res.json();

      setTestResult({
        status: res.status,
        ok: res.ok && json.success,
        data: json.data,
        error: json.error || (!res.ok ? `HTTP ${res.status} Error` : null),
        durationMs,
        timestamp: new Date(),
      });

      // Refresh connector logs in background
      fetchConnector();
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      setTestResult({
        status: 500,
        ok: false,
        data: null,
        error: err.message || "Network or execution error",
        durationMs,
        timestamp: new Date(),
      });
    } finally {
      setExecuting(false);
    }
  };

  if (loadingConnector) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm">Loading test playground...</p>
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header and Breadcrumb */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
            <Link href="/dashboard" className="hover:text-zinc-200 transition">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-zinc-200">{connector.name}</span>
            <span>/</span>
            <span className="text-indigo-400 font-medium">Test Playground</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Play className="h-6 w-6 text-indigo-400 fill-indigo-400/20" />
            Testing Playground: {connector.name}
          </h1>
          <p className="mt-1 text-xs text-zinc-400 font-mono">
            POST /api/v1/run/{connector.slug} • Model: {connector.provider.toUpperCase()} ({connector.model})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/connectors/${connector.id}/docs`}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
          >
            <FileCode className="h-3.5 w-3.5" />
            API Docs
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

      {/* Main 2-Column Playground Grid */}
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Request Configuration & Inputs */}
        <div className="space-y-6 lg:col-span-5">
          {/* Auth Header Card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-amber-400" />
                Authorization: Bearer Token
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">Pre-filled with API Key</span>
            </div>
            <input
              type="text"
              value={authKey}
              onChange={(e) => setAuthKey(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
              placeholder="uapi_..."
            />
          </div>

          {/* Dynamic Input Parameter Fields */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-white mb-4">
              Configured Input Parameters ({inputParameters.length})
            </h2>

            {inputParameters.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No parameters required. Endpoint accepts empty payload.</p>
            ) : (
              <div className="space-y-4">
                {inputParameters.map((param) => {
                  const val = paramValues[param.name] ?? "";

                  return (
                    <div key={param.name} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                          <span className="font-mono text-indigo-300">{param.name}</span>
                          {param.required && <span className="text-red-400">*</span>}
                        </label>
                        <span className="text-[10px] uppercase font-mono text-zinc-500 rounded bg-zinc-800 px-1.5 py-0.5">
                          {param.type}
                        </span>
                      </div>

                      {param.description && (
                        <p className="text-[11px] text-zinc-500">{param.description}</p>
                      )}

                      {/* Type: Image */}
                      {param.type === "Image" ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700 bg-zinc-950/70 py-3 text-xs text-zinc-400 hover:border-indigo-500 hover:text-indigo-300 transition">
                              <Upload className="h-4 w-4" />
                              <span>Select Image File (Converts to Base64)</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(param.name, file);
                                }}
                              />
                            </label>
                          </div>

                          {imagePreviews[param.name] && (
                            <div className="relative rounded-lg border border-zinc-800 bg-zinc-950 p-2">
                              <img
                                src={imagePreviews[param.name]}
                                alt="Preview"
                                className="max-h-36 rounded object-contain mx-auto"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  handleInputChange(param.name, "");
                                  setImagePreviews((prev) => {
                                    const copy = { ...prev };
                                    delete copy[param.name];
                                    return copy;
                                  });
                                }}
                                className="mt-1 text-[10px] text-red-400 hover:underline block text-center"
                              >
                                Remove Image
                              </button>
                            </div>
                          )}

                          <input
                            type="text"
                            value={val}
                            onChange={(e) => {
                              handleInputChange(param.name, e.target.value);
                              if (e.target.value.startsWith("data:image/") || e.target.value.startsWith("http")) {
                                setImagePreviews((prev) => ({ ...prev, [param.name]: e.target.value }));
                              }
                            }}
                            placeholder="Or paste Base64 Data URL or public image URL"
                            className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      ) : param.type === "Number" ? (
                        /* Type: Number */
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => handleInputChange(param.name, e.target.value)}
                          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
                        />
                      ) : param.type === "Boolean" ? (
                        /* Type: Boolean */
                        <label className="flex items-center gap-2 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={Boolean(val)}
                            onChange={(e) => handleInputChange(param.name, e.target.checked)}
                            className="rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-zinc-300">True / Enabled</span>
                        </label>
                      ) : param.type === "JSON" ? (
                        /* Type: JSON */
                        <textarea
                          rows={3}
                          value={val}
                          onChange={(e) => handleInputChange(param.name, e.target.value)}
                          placeholder="{}"
                          className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 font-mono text-xs text-emerald-400 focus:border-indigo-500 focus:outline-none"
                        />
                      ) : (
                        /* Type: Text / Default */
                        <textarea
                          rows={param.name === "topic" || param.name === "prompt" ? 3 : 2}
                          value={val}
                          onChange={(e) => handleInputChange(param.name, e.target.value)}
                          placeholder={`Enter ${param.name}...`}
                          className="w-full rounded-md border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Execute Button */}
            <div className="mt-6 pt-4 border-t border-zinc-800">
              <button
                type="button"
                onClick={handleExecute}
                disabled={executing || !connector.isActive}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition disabled:opacity-50 active:scale-[0.99]"
              >
                {executing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processing with {connector.provider.toUpperCase()}...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    <span>Submit Test Request</span>
                  </>
                )}
              </button>
              {!connector.isActive && (
                <p className="mt-2 text-center text-xs text-amber-400">
                  ⚠️ This connector is currently disabled. Enable it in dashboard to execute calls.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Execution Output & Real-Time Stats */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                Live Response Inspector
              </h2>

              {testResult && (
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold ${
                      testResult.ok
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}
                  >
                    {testResult.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                    {testResult.status} {testResult.ok ? "OK" : "ERROR"}
                  </span>
                </div>
              )}
            </div>

            {/* Performance & Token Telemetry Pills */}
            {testResult && (
              <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2.5">
                  <span className="text-[10px] text-zinc-500 block uppercase">Latency</span>
                  <div className="mt-1 flex items-center gap-1 font-mono text-sm font-bold text-white">
                    <Clock className="h-3.5 w-3.5 text-indigo-400" />
                    {testResult.durationMs} ms
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2.5">
                  <span className="text-[10px] text-zinc-500 block uppercase">Status</span>
                  <div className="mt-1 font-mono text-sm font-bold text-white">
                    {testResult.status}
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2.5">
                  <span className="text-[10px] text-zinc-500 block uppercase">Model Used</span>
                  <div className="mt-1 font-mono text-xs font-semibold text-zinc-300 truncate">
                    {connector.model}
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2.5">
                  <span className="text-[10px] text-zinc-500 block uppercase">Cost</span>
                  <div className="mt-1 flex items-center gap-1 font-mono text-sm font-bold text-emerald-400">
                    <Coins className="h-3.5 w-3.5" />
                    {connector.logs[0]?.estimatedCost !== null && connector.logs[0]?.estimatedCost !== undefined
                      ? `$${connector.logs[0].estimatedCost.toFixed(6)}`
                      : "Calculated"}
                  </div>
                </div>
              </div>
            )}

            {/* JSON Output Viewer */}
            <div className="relative mt-2">
              <div className="flex items-center justify-between rounded-t-lg bg-zinc-950 px-4 py-2 text-xs text-zinc-400 border border-b-0 border-zinc-800 font-mono">
                <span>Response Body (JSON)</span>
                {testResult && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify(testResult.data || testResult.error, null, 2)
                      );
                      setCopiedOutput(true);
                      setTimeout(() => setCopiedOutput(false), 2000);
                    }}
                    className="flex items-center gap-1 rounded px-2 py-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                  >
                    {copiedOutput ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="max-h-[420px] overflow-auto rounded-b-lg border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs">
                {executing ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
                    <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
                    <span>Executing AI provider call and formatting schema...</span>
                  </div>
                ) : testResult ? (
                  testResult.ok ? (
                    <pre className="text-emerald-400 whitespace-pre-wrap">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-red-400">
                      <p className="font-bold mb-1">Execution Failed</p>
                      <pre className="whitespace-pre-wrap">{testResult.error}</pre>
                    </div>
                  )
                ) : (
                  <div className="py-16 text-center text-zinc-600">
                    Click &quot;Submit Test Request&quot; to execute and view structured response.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expected Output Schema Reference */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
              Expected Output Schema (Contract)
            </h3>
            <pre className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-400 overflow-x-auto">
              {(() => {
                try {
                  return JSON.stringify(JSON.parse(connector.outputSchema), null, 2);
                } catch {
                  return connector.outputSchema;
                }
              })()}
            </pre>
          </div>
        </div>
      </div>

      {/* Recent Execution Logs Section */}
      <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-400" />
              Persistent Execution Logs (SQLite)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Historical execution telemetry and audit records stored in SQLite database.
            </p>
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            {connector.logs?.length || 0} recorded runs
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="border-b border-zinc-800 bg-zinc-950 text-zinc-400 uppercase tracking-wider font-mono">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Prompt Tokens</th>
                <th className="px-4 py-3">Completion</th>
                <th className="px-4 py-3">Total Tokens</th>
                <th className="px-4 py-3">Cost ($)</th>
                <th className="px-4 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 font-mono">
              {!connector.logs || connector.logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-zinc-500">
                    No execution logs recorded yet. Run a test request above to generate logs.
                  </td>
                </tr>
              ) : (
                connector.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/40">
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {log.statusCode} {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-300">{log.responseTimeMs} ms</td>
                    <td className="px-4 py-2.5 text-zinc-400">{log.promptTokens ?? "—"}</td>
                    <td className="px-4 py-2.5 text-zinc-400">{log.completionTokens ?? "—"}</td>
                    <td className="px-4 py-2.5 text-zinc-200 font-bold">{log.totalTokens ?? "—"}</td>
                    <td className="px-4 py-2.5 text-emerald-400">
                      {log.estimatedCost !== null && log.estimatedCost !== undefined
                        ? `$${log.estimatedCost.toFixed(6)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500">{formatDate(log.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
