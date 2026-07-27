import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireAuth } from "@/lib/permissions/check";
import { listUserNotifications } from "@/lib/services/notifications.service";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function PortalNotificacoesPage() {
  const user = await requireAuth();
  const notifications = await listUserNotifications(user.id);

  return (
    <div>
      <PageHeader title="Notificações" description="Atualizações sobre seu conteúdo" />
      <div className="space-y-2">
        {notifications.length ? (
          notifications.map((notification) => (
            <Card key={notification.id} className="rounded-xl shadow-sm">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm">{notification.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(notification.createdAt), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  {!notification.read && <Badge>Nova</Badge>}
                </div>
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
