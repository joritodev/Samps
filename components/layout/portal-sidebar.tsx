"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  Package,
  Send,
  FileCheck,
  FolderOpen,
  Bell,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

export function PortalSidebar({
  user,
  clientName,
}: {
  user: SessionUser;
  clientName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="border-b border-sidebar-border p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Portal do Cliente
        </p>
        <h2 className="mt-1 font-display font-semibold text-foreground">{clientName}</h2>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {portalNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-secondary text-primary">
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">Cliente externo</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
