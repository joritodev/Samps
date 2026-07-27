"use client";

import Link from "next/link";
import {
  Activity,
  Bell,
  Building2,
  ChevronRight,
  FileText,
  FileType,
  Flag,
  Globe,
  Layers,
  Palette,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import { canSeeSettingsSection } from "@/lib/agency/settings-access";

const SETTINGS_SECTIONS: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/configuracoes/temas",
    label: "Temas",
    description: "Cor principal e aparência claro/escuro.",
    icon: Palette,
  },
  {
    href: "/configuracoes/empresa",
    label: "Empresa",
    description: "Dados da agência e identidade.",
    icon: Building2,
  },
  {
    href: "/configuracoes/usuarios",
    label: "Usuários",
    description: "Contas internas e acesso.",
    icon: Users,
  },
  {
    href: "/configuracoes/funcoes",
    label: "Funções",
    description: "Papéis e permissões RBAC.",
    icon: Shield,
  },
  {
    href: "/configuracoes/setores",
    label: "Setores",
    description: "Equipes operacionais.",
    icon: Layers,
  },
  {
    href: "/configuracoes/tipos",
    label: "Tipos de conteúdo",
    description: "Formatos de demanda.",
    icon: FileType,
  },
  {
    href: "/configuracoes/prioridades",
    label: "Prioridades",
    description: "Níveis de urgência.",
    icon: Flag,
  },
  {
    href: "/configuracoes/status",
    label: "Status",
    description: "Fluxos de atividade.",
    icon: Activity,
  },
  {
    href: "/configuracoes/contratos",
    label: "Contratos",
    description: "Planos e volumes.",
    icon: FileText,
  },
  {
    href: "/configuracoes/notificacoes",
    label: "Notificações",
    description: "Alertas e canais.",
    icon: Bell,
  },
  {
    href: "/configuracoes/portal",
    label: "Portal do cliente",
    description: "Aparência e liberação.",
    icon: Globe,
  },
];

export function SettingsHub({ permissions }: { permissions: string[] }) {
  const sections = SETTINGS_SECTIONS.filter((item) =>
    canSeeSettingsSection(permissions, item.href)
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-border bg-card px-6 py-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Configurações
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Preferências pessoais e parâmetros do sistema
        </p>
      </header>

      <div className="grid gap-4 bg-muted/30 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:bg-card/90 hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-foreground">
                    {item.label}
                  </h2>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/60 opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
