import { ConnectorForm } from "@/components/ConnectorForm";

export default function NewConnectorPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Create New API Connector
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Configure a new standard AI API endpoint backed by OpenAI or Google Gemini.
        </p>
      </div>

      <ConnectorForm />
    </div>
  );
}
