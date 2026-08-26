"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PortalPreviewExit() {
  const router = useRouter();
  const { update } = useSession();

  async function handleExit() {
    await update({ impersonatingClientId: null });
    router.push("/clientes");
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-start"
      onClick={() => void handleExit()}
    >
      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
      Sair da visualização
    </Button>
  );
}
