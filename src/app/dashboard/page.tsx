"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Play,
  FileCode,
  Edit,
  Trash2,
  Copy,
  Check,
  Search,
  ExternalLink,
  Layers,
  Activity,
  CheckCircle2,
  XCircle,
  Cpu,
  Clock,
  Coins,
  RefreshCw,
} from "lucide-react";
import { formatDate, formatRelativeTime } from "@/lib/utils";

interface ConnectorItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  provider: string;
  model: string;
  inputParameters: string;
  outputSchema: string;
  apiKey: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  totalRequests: number;
  lastUsedAt: string | null;
}

export default function DashboardPage() {
  const [connectors, setConnectors] = useState<ConnectorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchConnectors = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/connectors");
      const json = await res.json();
      if (json.success && json.data) {
        setConnectors(json.data);
      }
    } catch (err) {
      console.error("Failed to load connectors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectors();
  }, []);

  const handleCopy = (slug: string) => {
    const fullUrl = `${window.location.origin}/api/v1/run/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleToggleActive = async (connector: ConnectorItem) => {
    try {
      const res = await fetch(`/api/connectors/${connector.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !connector.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        setConnectors((prev) =>
          prev.map((c) =>
            c.id === connector.id ? { ...c, isActive: !c.isActive } : c
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete connector "${name}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/connectors/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setConnectors((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete connector:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = connectors.filter((c) => {
    const query = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.slug.toLowerCase().includes(query) ||
      c.provider.toLowerCase().includes(query) ||
      c.model.toLowerCase().includes(query)
    );
  });

  const totalCalls = connectors.reduce((acc, c) => acc + (c.totalRequests || 0), 0);
  const activeCount = connectors.filter((c) => c.isActive).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header & Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            API Connectors & Hub
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage, test, and expose multi-provider AI models behind standardized, schema-enforced REST endpoints.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchConnectors}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/connectors/new"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Create New API Connector
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="my-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Connectors</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{connectors.length}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
            <span>Configured endpoints in SQLite</span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Status</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-400">
            {activeCount} <span className="text-sm font-normal text-zinc-500">/ {connectors.length} active</span>
          </p>
          <div className="mt-1 text-xs text-zinc-500">Ready for incoming requests</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Invocations</span>
            <Cpu className="h-4 w-4 text-sky-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{totalCalls}</p>
          <div className="mt-1 text-xs text-zinc-500">Recorded execution logs</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">AI Providers</span>
            <Coins className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">2 Native Engines</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1 text-emerald-400">● OpenAI</span>
            <span className="inline-flex items-center gap-1 text-sky-400">● Google Gemini</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, slug, provider or model..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/80 pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>
        <div className="text-xs text-zinc-400 self-center">
          Showing {filtered.length} of {connectors.length} connectors
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="border-b border-zinc-800 bg-zinc-950/80 text-xs uppercase tracking-wider text-zinc-400">
              <tr>
                <th scope="col" className="px-5 py-3.5">
                  Connector Name
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Endpoint Slug
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Provider & Model
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Input Parameters
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">
                  Status
                </th>
                <th scope="col" className="px-4 py-3.5 text-center">
                  Total Requests
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Last Used
                </th>
                <th scope="col" className="px-5 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
                      <span>Loading API Connectors...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="rounded-full bg-zinc-800/80 p-3">
                        <Layers className="h-8 w-8 text-zinc-600" />
                      </div>
                      <p className="text-base font-medium text-zinc-400">
                        {search ? "No connectors match your search" : "No API Connectors configured yet"}
                      </p>
                      <Link
                        href="/connectors/new"
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Create your first connector
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((connector) => {
                  let inputParams: any[] = [];
                  try {
                    inputParams = JSON.parse(connector.inputParameters || "[]");
                  } catch {
                    inputParams = [];
                  }

                  const isGroq = connector.provider.toLowerCase().includes("groq");
                  const isGemini = connector.provider.toLowerCase().includes("gemini");
                  const isOpenAI = connector.provider.toLowerCase().includes("openai");

                  return (
                    <tr
                      key={connector.id}
                      className="group transition hover:bg-zinc-800/30"
                    >
                      {/* Name & Description */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white group-hover:text-indigo-300 transition">
                          {connector.name}
                        </div>
                        {connector.description && (
                          <div className="mt-0.5 line-clamp-1 max-w-xs text-xs text-zinc-500">
                            {connector.description}
                          </div>
                        )}
                      </td>

                      {/* Endpoint Slug */}
                      <td className="px-4 py-4 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">
                            /api/v1/run/{connector.slug}
                          </span>
                          <button
                            onClick={() => handleCopy(connector.slug)}
                            title="Copy full endpoint URL"
                            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition"
                          >
                            {copiedSlug === connector.slug ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Provider & Model */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                              isGroq
                                ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                                : isOpenAI
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : isGemini
                                ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            }`}
                          >
                            {connector.provider.toUpperCase()}
                          </span>
                          <span className="font-mono text-xs text-zinc-400">
                            {connector.model}
                          </span>
                        </div>
                      </td>

                      {/* Input Types */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {inputParams.length === 0 ? (
                            <span className="text-xs text-zinc-600">None</span>
                          ) : (
                            inputParams.map((param, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-mono ${
                                  param.type === "Image"
                                    ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                    : param.type === "JSON"
                                    ? "bg-violet-500/10 text-violet-300 border border-violet-500/20"
                                    : "bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                                }`}
                              >
                                {param.name}
                                <span className="opacity-60 text-[9px]">({param.type})</span>
                                {param.required && (
                                  <span className="text-red-400 font-bold">*</span>
                                )}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Status Toggle Badge */}
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => handleToggleActive(connector)}
                          title={`Click to ${connector.isActive ? "disable" : "activate"}`}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                            connector.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700"
                          }`}
                        >
                          {connector.isActive ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Disabled</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Total Requests */}
                      <td className="px-4 py-4 text-center font-mono font-medium text-white">
                        {connector.totalRequests || 0}
                      </td>

                      {/* Last Used */}
                      <td className="px-4 py-4 text-xs text-zinc-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-zinc-600" />
                          <span>{formatRelativeTime(connector.lastUsedAt)}</span>
                        </div>
                      </td>

                      {/* Action Links: Test, Edit, Docs, Delete */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/connectors/${connector.id}/test`}
                            className="flex items-center gap-1 rounded-md bg-indigo-600/10 px-2.5 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-600 hover:text-white transition"
                            title="Interactive Test Playground"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            Test
                          </Link>

                          <Link
                            href={`/connectors/${connector.id}/docs`}
                            className="flex items-center gap-1 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
                            title="API Documentation & Snippets"
                          >
                            <FileCode className="h-3 w-3" />
                            Docs
                          </Link>

                          <Link
                            href={`/connectors/${connector.id}/edit`}
                            className="rounded-md p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                            title="Edit Connector"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Link>

                          <button
                            onClick={() => handleDelete(connector.id, connector.name)}
                            disabled={deletingId === connector.id}
                            className="rounded-md p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition disabled:opacity-50"
                            title="Delete Connector"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
