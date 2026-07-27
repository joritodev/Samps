"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function SettingsSectionStub({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col bg-card">
      <header className="shrink-0 border-b border-border px-6 py-5">
        <Link
          href="/configuracoes"
          className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Configurações
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
      </header>
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
      </div>
    </div>
  );
}
