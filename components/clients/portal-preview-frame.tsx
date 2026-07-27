"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { startImpersonation } from "@/lib/actions/impersonate.actions";
import { useSession } from "next-auth/react";

export function PortalPreviewFrame({ clientId }: { clientId: string }) {
  const { update } = useSession();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function run() {
      const result = await startImpersonation(clientId);
      if (!result.success) {
        setError("Sem permissão para visualizar este cliente.");
        return;
      }
      await update({ impersonatingClientId: clientId });
      setReady(true);
    }
    run();
  }, [clientId, update]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!ready) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Preparando prévia...
      </div>
    );
  }

  return (
    <iframe
      src="/portal"
      title="Prévia do portal"
      className="h-[70vh] w-full rounded-xl border shadow-sm bg-white"
    />
  );
}
