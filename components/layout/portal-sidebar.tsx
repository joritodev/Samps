"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Calendar,
  Package,
  Send,
  FileCheck,
  FolderOpen,
  Bell,
  LogOut,
  PanelLeft,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn, userInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SampsLogo } from "@/components/brand/samps-logo";
import { PortalPreviewExit } from "@/components/portal/portal-preview-exit";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { SessionUser } from "@/types/auth";

const portalNav = [
  { href: "/portal", label: "Visão geral", icon: Home },
  { href: "/portal/calendario", label: "Calendário", icon: Calendar },
  { href: "/portal/entregas", label: "Próximas entregas", icon: Package },
  { href: "/portal/publicacoes", label: "Próximas publicações", icon: Send },
  { href: "/portal/materiais", label: "Materiais concluídos", icon: FileCheck },
  { href: "/portal/arquivos", label: "Arquivos", icon: FolderOpen },
  { href: "/portal/notificacoes", label: "Notificações", icon: Bell },
];

type PortalSidebarProps = {
  user: SessionUser;
  clientName: string;
  isPreview: boolean;
};

function SidebarBody({
  user,
  clientName,
  isPreview,
  onNavigate,
}: PortalSidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  const initials = userInitials(user.name);

  return (
    <div className="flex h-full w-full flex-col border-r border-sidebar-border bg-sidebar">
      <div className="border-b border-sidebar-border px-5 py-5">
        <SampsLogo withWordmark={false} />
        <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
          Portal do Cliente
        </p>
        <h2 className="mt-1 font-display font-semibold text-foreground">
          {clientName}
        </h2>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {portalNav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-sidebar-border p-4">
        <div className="mb-3 flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-secondary text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.userType === "EXTERNAL_CLIENT"
                ? "Cliente externo"
                : "Visualizando como cliente"}
            </p>
          </div>
        </div>
        {isPreview ? <PortalPreviewExit /> : null}
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          Sair
        </Button>
      </div>
    </div>
  );
}

export function PortalSidebar({
  user,
  clientName,
  isPreview,
}: PortalSidebarProps) {
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
          clientName={clientName}
          isPreview={isPreview}
        />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            type="button"
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
            clientName={clientName}
            isPreview={isPreview}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
