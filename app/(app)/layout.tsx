import Link from "next/link";
import { Plus, User } from "lucide-react";
import { NotificationBell } from "@/components/layout/notification-bell";
import { GlobalSearch } from "@/components/layout/global-search";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { requireAuth } from "@/lib/permissions/check";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const canDemand =
    user.userType === "ADMIN" ||
    user.permissions.includes("demands.create") ||
    user.permissions.includes("demands.edit");

  return (
    <Providers>
      <div className="flex min-h-screen bg-background">
        <AppSidebar user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-card/90 px-4 backdrop-blur-sm lg:px-6">
            <GlobalSearch user={user} />
            <div className="ml-auto flex items-center gap-2">
              {canDemand && (
                <Button asChild size="sm" className="hidden sm:inline-flex">
                  <Link href="/clientes">
                    <Plus className="h-3.5 w-3.5" />
                    Nova demanda
                  </Link>
                </Button>
              )}
              <NotificationBell />
              <Avatar className="h-10 w-10 border border-border bg-secondary">
                <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
                <AvatarFallback className="bg-secondary text-muted-foreground">
                  {user.name ? (
                    user.name.slice(0, 2).toUpperCase()
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
      <Toaster />
    </Providers>
  );
}
