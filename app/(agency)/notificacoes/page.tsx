import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { requireAuth } from "@/lib/permissions/check";
import { listUserNotifications } from "@/lib/services/notifications.service";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function AgencyNotificacoesPage() {
  const user = await requireAuth();
  const notifications = await listUserNotifications(user.id);

  return (
    <div className="h-full min-h-0 overflow-y-auto p-6">
      <PageHeader
        title="Notificações"
        description="Alertas do fluxo operacional"
      />
      <div className="space-y-2">
        {notifications.length ? (
          notifications.map((notification) => (
            <Card key={notification.id} className="rounded-xl shadow-sm">
              <CardContent className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0 flex-1">
                  {notification.link ? (
                    <Link
                      href={notification.link}
                      className="font-medium text-sm text-foreground hover:underline"
                    >
                      {notification.title}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium">{notification.title}</p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {format(new Date(notification.createdAt), "dd/MM/yyyy HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                {!notification.read && <Badge>Nova</Badge>}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma notificação.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
