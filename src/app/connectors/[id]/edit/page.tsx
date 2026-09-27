import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ConnectorForm } from "@/components/ConnectorForm";

export default async function EditConnectorPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const connector = await prisma.apiConnector.findUnique({
    where: { id },
  });

  if (!connector) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Edit API Connector
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Modify configuration, parameters, or schema for &quot;{connector.name}&quot;
        </p>
      </div>

      <ConnectorForm initialData={connector} isEditing={true} />
    </div>
  );
}
