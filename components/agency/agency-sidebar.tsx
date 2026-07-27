"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Building2,
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  LineChart,
  ListTodo,
  Layers,
  LogOut,
  Settings,
  UserRound,
  Users,
} from "lucide-react";
import type { AgencyUserProfile } from "@/lib/agency/current-user";
import { userInitials } from "@/lib/agency/current-user";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/painel-gestao", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Building2 },
  { href: "/demandas", label: "Demandas", icon: ListTodo },
  { href: "/setores/design", label: "Setores", icon: Layers },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/projetos", label: "Projetos", icon: FolderKanban },
  { href: "/performance", label: "Performance", icon: LineChart },
  { href: "/equipe", label: "Equipe", icon: Users },
] as const;

const FOOTER_NAV = [
  { href: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/painel-gestao") {
    return pathname === href;
  }
  if (href === "/setores/design") {
    return pathname.startsWith("/setores");
  }
  if (href === "/demandas") {
    return pathname === "/demandas" || pathname.startsWith("/meu-painel");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AgencySidebarProps = {
  user: AgencyUserProfile | null;
};

export function AgencySidebar({ user }: AgencySidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const displayName = user?.name ?? "Gestão Samps";
  const displayEmail = user?.email ?? "gestao@samps.digital";
  const initials = userInitials(displayName);
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  async function handleLogout() {
    try {
      await signOut({ redirect: false });
    } catch {
      // Auth ainda opcional na agency
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="border-b border-border px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(220_14%_12%)] dark:bg-primary">
            <span className="absolute inset-[3px] rounded-full border-2 border-brand" />
            <span className="absolute inset-[7px] rounded-full border border-primary/80 dark:border-primary-foreground/40" />
            <span className="text-[11px] font-bold tracking-tight text-white">
              S
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Intranet
            </p>
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
              SAMPS Digital
            </h1>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Diagnóstico + Planejamento + Método
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Central de Gestão
        </p>
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
                    "hover:bg-secondary hover:text-foreground",
                    active &&
                      "bg-[hsl(var(--sidebar-accent))] font-semibold text-[hsl(var(--sidebar-accent-foreground))]"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-colors",
                      "group-hover:text-foreground",
                      active && "text-primary"
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-border p-4">
        <ul className="space-y-0.5">
          {FOOTER_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
                    "hover:bg-secondary hover:text-foreground",
                    active &&
                      "bg-[hsl(var(--sidebar-accent))] font-semibold text-[hsl(var(--sidebar-accent-foreground))]"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-colors",
                      "group-hover:text-foreground",
                      active && "text-primary"
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}

          <li>
            <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground">
              <span>Tema</span>
              {mounted ? (
                <AnimatedThemeToggler
                  theme={theme}
                  onThemeChange={setTheme}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-border bg-secondary/80 text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : (
                <span className="inline-flex size-8 rounded-lg border border-border bg-secondary/80" />
              )}
            </div>
          </li>
        </ul>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border border-border bg-secondary/80 px-3 py-2.5 text-left transition-colors",
                "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                pathname.startsWith("/perfil") && "ring-2 ring-primary/20"
              )}
            >
              <Avatar className="h-8 w-8 border border-border">
                {user?.avatar ? (
                  <AvatarImage src={user.avatar} alt="" />
                ) : null}
                <AvatarFallback className="bg-primary text-[10px] font-medium text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {displayEmail}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/perfil" className="cursor-pointer">
                <UserRound className="mr-2 h-4 w-4" />
                Editar usuário
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                void handleLogout();
              }}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
