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
import { SampsLogo } from "@/components/brand/samps-logo";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationBell } from "@/components/layout/notification-bell";
import { MuralPopover } from "@/components/agency/mural-popover";
import { SessionMuteButton } from "@/components/agency/live-alerts-host";
import type { BannerAnnouncement, BannerBirthday } from "@/components/agency/announcement-banner";
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
  /** Restringe a tipos de usuário (além das permissões). */
  userTypes?: AgencyUserProfile["userType"][];
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/painel-gestao",
    label: "Painel",
    icon: LayoutDashboard,
    userTypes: ["ADMIN", "MANAGEMENT"],
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

function visibleTo(
  permissions: string[],
  userType: AgencyUserProfile["userType"]
) {
  return (item: NavItem) => {
    if (item.userTypes && !item.userTypes.includes(userType)) return false;
    return !item.anyOf || item.anyOf.some((code) => permissions.includes(code));
  };
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
  announcements?: BannerAnnouncement[];
  birthdays?: BannerBirthday[];
};

function SidebarBody({
  user,
  searchTypes,
  announcements = [],
  birthdays = [],
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

  const canSee = visibleTo(user.permissions, user.userType);
  const navItems = [
    ...NAV_ITEMS.filter(canSee)
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
      "group relative flex min-h-9 items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-sidebar-foreground transition-[background-color,color,box-shadow] duration-150",
      "hover:bg-foreground/[0.05] hover:text-foreground",
      active &&
        "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-border/60 hover:bg-sidebar-accent"
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-sidebar">
      <div className="flex items-center justify-between gap-1 pb-3 pl-4 pr-2 pt-4">
        <SampsLogo />
        <div className="flex items-center">
          <MuralPopover announcements={announcements} birthdays={birthdays} />
          <SessionMuteButton />
          <NotificationBell />
        </div>
      </div>

      <div className="px-3">
        <GlobalSearch types={searchTypes} compact />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="eyebrow mb-1.5 px-2.5">Central de Gestão</p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={linkClass(active)}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground/80 transition-colors",
                      "group-hover:text-foreground",
                      active && "text-primary dark:text-cyan"
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-2 border-t border-sidebar-border px-3 pb-3 pt-3">
        <ul className="space-y-0.5">
          {footerItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={linkClass(active)}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground/80 transition-colors",
                      "group-hover:text-foreground",
                      active && "text-primary dark:text-cyan"
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}

          <li>
            <div className="flex min-h-9 items-center justify-between gap-3 rounded-md px-2.5 py-1 text-sm font-medium text-sidebar-foreground">
              <span>Tema</span>
              {mounted ? (
                <AnimatedThemeToggler
                  theme={theme}
                  onThemeChange={setTheme}
                  className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              ) : (
                <span className="inline-flex size-9 rounded-md" />
              )}
            </div>
          </li>
        </ul>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors",
                "hover:bg-foreground/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                pathname.startsWith("/perfil") && "ring-2 ring-primary/20"
              )}
            >
              <Avatar className="h-8 w-8 ring-2 ring-card">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt="" />
                ) : null}
                <AvatarFallback className="bg-foreground/[0.08] text-xs font-semibold text-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
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

export function AgencySidebar({
  user,
  searchTypes,
  announcements = [],
  birthdays = [],
}: AgencySidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <aside className="hidden h-full w-64 shrink-0 lg:flex">
        <SidebarBody
          user={user}
          searchTypes={searchTypes}
          announcements={announcements}
          birthdays={birthdays}
        />
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
            announcements={announcements}
            birthdays={birthdays}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

