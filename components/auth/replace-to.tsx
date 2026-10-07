"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Troca a rota sem o `redirect()` do servidor, que estoura o React #310 no App Router. */
export function ReplaceTo({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [href, router]);
  return null;
}
