"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { startImpersonation } from "@/lib/actions/impersonate.actions";

export function PortalImpersonationRedirect({ clientId }: { clientId: string }) {
  const router = useRouter();
  const { update } = useSession();
  const [error, setError] = useState("");

  useEffect(() => {
    async function run() {
      const result = await startImpersonation(clientId);
      if (!result.success) {
        setError("Sem permissão para visualizar este cliente.");
        return;
      }
      await update({ impersonatingClientId: clientId });
      router.replace("/portal");
    }
    run();
  }, [clientId, update, router]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      Abrindo portal do cliente...
    </div>
  );
}
