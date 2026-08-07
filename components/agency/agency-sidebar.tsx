"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Building2,
  CalendarDays,
  Camera,
  FolderKanban,
  History,
  LayoutDashboard,
  LineChart,
  ListTodo,
  Layers,
  LogOut,
  PanelLeft,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import type { AgencyUserProfile } from "@/lib/agency/current-user";
import { isSectorCollaborator } from "@/types/auth";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationBell } from "@/components/layout/notification-bell";
import type { SearchType } from "@/lib/agency/search-types";
import type { PermissionCode } from "@/lib/permissions/codes";
import { userInitials } from "@/lib/utils";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Visível quando o usuário tem ao menos uma destas. Ausente = sempre. */
  anyOf?: PermissionCode[];
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/painel-gestao",
    label: "Dashboard",
    icon: LayoutDashboard,
    anyOf: ["indicators.view"],
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: Building2,
    anyOf: ["clients.view_all", "clients.view_assigned"],
  },
  { href: "/demandas", label: "Demandas", icon: ListTodo },
  { href: "/setores", label: "Setores", icon: Layers },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/projetos", label: "Projetos", icon: FolderKanban },
  { href: "/captacoes", label: "Captações", icon: Camera },
  {
    href: "/performance",
    label: "Performance",
    icon: LineChart,
    anyOf: ["productivity.view"],
  },
  {
    href: "/equipe",
    label: "Equipe",
    icon: Users,
    anyOf: ["users.edit", "users.create"],
  },
];

function panelNavForUser(userType: AgencyUserProfile["userType"]): NavItem[] {
  switch (userType) {
    case "DESIGNER":
      return [{ href: "/meu-painel/design", label: "Meu Painel", icon: ListTodo }];
    case "VIDEOMAKER":
    case "VIDEO_EDITOR":
      return [{ href: "/meu-painel/video", label: "Meu Painel", icon: ListTodo }];
    case "SOCIAL_MEDIA":
      return [{ href: "/meu-painel/social", label: "Meu Painel", icon: ListTodo }];
    case "OTHER":
      return [{ href: "/meu-painel/trafego", label: "Meu Painel", icon: ListTodo }];
    default:
      return [];
  }
}

const FOOTER_NAV: NavItem[] = [
  {
    href: "/historico",
    label: "Histórico",
    icon: History,
    anyOf: ["history.view"],
  },
  {
    href: "/configuracoes",
    label: "Configurações",
    icon: Settings,
  },
];

function visibleTo(permissions: string[]) {
  return (item: NavItem) =>
    !item.anyOf || item.anyOf.some((code) => permissions.includes(code));
}

function isActive(pathname: string, href: string) {
  if (href === "/painel-gestao") {
    return pathname === href;
  }
  if (href === "/setores") {
    return pathname === "/setores" || pathname.startsWith("/setores/");
  }
  if (href === "/demandas") {
    return pathname === "/demandas";
  }
  if (href.startsWith("/meu-painel")) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type AgencySidebarProps = {
  user: AgencyUserProfile;
  searchTypes: SearchType[];
};

function SidebarBody({
  user,
  searchTypes,
  onNavigate,
}: AgencySidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const initials = userInitials(user.name);
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  const canSee = visibleTo(user.permissions);
  const navItems = [
    ...NAV_ITEMS.filter(canSee)
      .filter(
        (item) =>
          item.href !== "/setores" || !isSectorCollaborator(user.userType)
      )
      .flatMap((item) =>
        item.href === "/demandas"
          ? [item, ...panelNavForUser(user.userType)]
          : [item]
      ),
  ];
  const footerItems = FOOTER_NAV.filter(canSee);

  async function handleLogout() {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  }

  function linkClass(active: boolean) {
    return cn(
      "group flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors",
      "hover:bg-secondary hover:text-foreground",
      active &&
        "bg-[hsl(var(--sidebar-accent))] font-semibold text-[hsl(var(--sidebar-accent-foreground))]"
    );
  }

  return (
    <div className="flex h-full w-full flex-col border-r border-border bg-card">
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

      <div className="px-3 pt-4">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <GlobalSearch types={searchTypes} />
          </div>
          <NotificationBell />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Central de Gestão
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={linkClass(active)}
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
          {footerItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={linkClass(active)}
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
            <div className="flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground">
              <span>Tema</span>
              {mounted ? (
                <AnimatedThemeToggler
                  theme={theme}
                  onThemeChange={setTheme}
                  className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-secondary/80 text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : (
                <span className="inline-flex size-10 rounded-lg border border-border bg-secondary/80" />
              )}
            </div>
          </li>
        </ul>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-lg border border-border bg-secondary/80 px-3 py-2.5 text-left transition-colors",
                "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                pathname.startsWith("/perfil") && "ring-2 ring-primary/20"
              )}
            >
              <Avatar className="h-8 w-8 border border-border">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt="" />
                ) : null}
                <AvatarFallback className="bg-primary text-[10px] font-medium text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.roleName}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuItem asChild>
              <Link
                href="/perfil"
                className="cursor-pointer"
                onClick={onNavigate}
              >
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
    </div>
  );
}

export function AgencySidebar({ user, searchTypes }: AgencySidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <aside className="hidden h-full w-64 shrink-0 lg:flex">
        <SidebarBody user={user} searchTypes={searchTypes} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed left-3 top-3 z-30 size-10 lg:hidden"
            aria-label="Abrir menu"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[min(100%,16rem)] p-0">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SidebarBody
            user={user}
            searchTypes={searchTypes}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
