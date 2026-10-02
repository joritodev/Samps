"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const ANALYTICS_TABS = [
  { href: "/performance", label: "Visão geral" },
  { href: "/performance/okrs", label: "OKRs" },
  { href: "/performance/metas", label: "Metas" },
  { href: "/performance/indicadores", label: "Indicadores" },
] as const;

const MY_SUMMARY_TAB = { href: "/performance/meu-resumo", label: "Meu resumo" } as const;

/** Abas como links: cada uma é uma página, e o período escolhido acompanha. */
/** `analytics`: quem tem Performance completa; os demais só veem o próprio resumo. */
export function PerformanceTabs({ analytics }: { analytics: boolean }) {
  const tabs = analytics ? [...ANALYTICS_TABS, MY_SUMMARY_TAB] : [MY_SUMMARY_TAB];
  const pathname = usePathname();
  const search = useSearchParams().toString();

  return (
    <nav aria-label="Seções de performance" className="flex gap-1 border-b border-border/70 print:hidden">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={search ? `${tab.href}?${search}` : tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
