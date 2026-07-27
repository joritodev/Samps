"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  BarChart3,
  Settings,
  LogOut,
  PanelLeft,
  Plus,
  Briefcase,
  UserCog,
  Calendar,
  FolderKanban,
  Camera,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { SessionUser } from "@/types/auth";
import { getDashboardPath } from "@/types/auth";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  perm: string | null;
  userTypes?: string[];
};

const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: null },
  {
    href: "/painel/social-media",
    label: "Meu painel",
    icon: PanelLeft,
    perm: null,
    userTypes: ["SOCIAL_MEDIA", "DESIGNER", "VIDEOMAKER", "VIDEO_EDITOR", "OTHER"],
  },
  {
    href: "/gestao",
    label: "Gestão",
    icon: Briefcase,
    perm: "indicators.view",
    userTypes: ["ADMIN", "MANAGEMENT"],
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: Users,
    perm: "clients.view_assigned",
  },
  {
    href: "/quadros/social-media",
    label: "Quadros",
    icon: Kanban,
    perm: "demands.create",
  },
  {
    href: "/calendario",
    label: "Calendário",
    icon: Calendar,
    perm: "demands.create",
  },
  {
    href: "/projetos",
    label: "Projetos",
    icon: FolderKanban,
    perm: "projects.create",
  },
  {
    href: "/captacoes",
    label: "Captações",
    icon: Camera,
    perm: "shoots.create",
  },
  {
    href: "/equipe",
    label: "Equipe",
    icon: UserCog,
    perm: "users.edit",
  },
  {
    href: "/relatorios",
    label: "Relatórios",
    icon: BarChart3,
    perm: "reports.view",
  },
];

function panelHrefForUser(user: SessionUser) {
  switch (user.userType) {
    case "SOCIAL_MEDIA":
      return "/painel/social-media";
    case "DESIGNER":
      return "/painel/design";
    case "VIDEOMAKER":
    case "VIDEO_EDITOR":
      return "/painel/video";
    case "OTHER":
      return "/painel/trafego";
    default:
      return "/painel/social-media";
  }
}

function resolveHref(href: string, user: SessionUser, dashboardPath: string) {
  if (href === "/dashboard") return dashboardPath;
  if (href === "/painel/social-media") return panelHrefForUser(user);
  if (href === "/quadros/social-media") {
    if (user.userType === "DESIGNER") return "/quadros/design";
    if (user.userType === "VIDEOMAKER" || user.userType === "VIDEO_EDITOR") {
      return "/quadros/video";
    }
    if (user.userType === "OTHER") return "/quadros/trafego";
    if (user.userType === "SOCIAL_MEDIA") return "/quadros/social-media";
  }
  return href;
}

function isActive(pathname: string, href: string) {
  if (href === "/gestao") {
    return pathname === "/gestao" || pathname.startsWith("/gestao/");
  }
  if (href.startsWith("/quadros")) {
    return pathname.startsWith("/quadros");
  }
  if (href.startsWith("/painel")) {
    return pathname.startsWith("/painel");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function canSee(item: NavItem, user: SessionUser) {
  if (item.userTypes && !item.userTypes.includes(user.userType)) {
    if (user.userType !== "ADMIN" && user.userType !== "MANAGEMENT") {
      return false;
    }
  }
  if (item.perm && !user.permissions.includes(item.perm)) {
    if (user.userType !== "ADMIN") return false;
  }
  return true;
}

function SidebarContent({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const dashboardPath = getDashboardPath(user.userType);
  const visible = primaryNav.filter((item) => canSee(item, user));
  const canSettings =
    user.userType === "ADMIN" || user.permissions.includes("settings.access");
  const canDemand =
    user.userType === "ADMIN" ||
    user.permissions.includes("demands.create") ||
    user.permissions.includes("demands.edit");

  return (
    <div className="flex h-full w-[260px] flex-col border-r border-sidebar-border bg-sidebar px-6 py-6">
      <div className="mb-6">
        <Link href={dashboardPath} className="block">
          <p className="font-display text-xl font-bold text-primary">Samps OS</p>
          <p className="mt-1 text-xs text-muted-foreground">Operações da agência</p>
        </Link>
      </div>

      {canDemand && (
        <Button asChild className="mb-6 w-full tracking-wide">
          <Link href="/clientes">
            <Plus className="h-3.5 w-3.5" />
            Nova demanda
          </Link>
        </Button>
      )}

      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-2">
          {visible.map((item) => {
            const href = resolveHref(item.href, user, dashboardPath);
            const active = isActive(pathname, href);
            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="mt-4 space-y-1 border-t border-sidebar-border pt-4">
        {canSettings && (
          <Link
            href="/configuracoes"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname.startsWith("/configuracoes")
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            Configurações
          </Link>
        )}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Sair
        </button>
      </div>
    </div>
  );
}

export function AppSidebar({ user }: { user: SessionUser }) {
  return (
    <>
      <aside className="hidden shrink-0 lg:block">
        <SidebarContent user={user} />
      </aside>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="fixed left-4 top-4 z-20 lg:hidden">
            <PanelLeft className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[260px] p-0">
          <SidebarContent user={user} />
        </SheetContent>
      </Sheet>
    </>
  );
}
