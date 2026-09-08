import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { PortalEmpty } from "./portal-empty";
import { PortalPage } from "./portal-page";

const itemClass =
  "rounded-xl border border-border/60 bg-card/50 px-4 py-3 text-sm";

function PortalList({
  title,
  description,
  emptyTitle,
  emptyDescription,
  isEmpty,
  children,
}: {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  return (
    <PortalPage title={title} description={description}>
      {isEmpty ? (
        <PortalEmpty title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </PortalPage>
  );
}

export function PortalCalendario({
  demands,
}: {
  demands: Array<{
    id: string;
    title: string;
    deliveryDate: Date | string | null;
    publishDate: Date | string | null;
  }>;
}) {
  return (
    <PortalList
      title="Calendário"
      description="Entregas e publicações previstas"
      emptyTitle="Nenhum evento no calendário"
      emptyDescription="Entregas e publicações com data aparecem aqui."
      isEmpty={!demands.length}
    >
      {demands.map((demand) => (
        <li
          key={demand.id}
          className={`flex flex-wrap items-center justify-between gap-2 ${itemClass}`}
        >
          <span className="min-w-0 font-medium text-foreground">
            {demand.title}
          </span>
          <div className="flex flex-wrap gap-2">
            {demand.deliveryDate ? (
              <Badge variant="secondary">
                Entrega:{" "}
                {format(new Date(demand.deliveryDate), "dd/MM", {
                  locale: ptBR,
                })}
              </Badge>
            ) : null}
            {demand.publishDate ? (
              <Badge variant="outline">
                Publicação:{" "}
                {format(new Date(demand.publishDate), "dd/MM", {
                  locale: ptBR,
                })}
              </Badge>
            ) : null}
          </div>
        </li>
      ))}
    </PortalList>
  );
}

export function PortalEntregas({
  demands,
}: {
  demands: Array<{
    id: string;
    title: string;
    type: string;
    deliveryDate: Date | string | null;
  }>;
}) {
  return (
    <PortalList
      title="Próximas entregas"
      description="Materiais com entrega programada"
      emptyTitle="Nenhuma entrega programada"
      emptyDescription="Materiais com data de entrega aparecem aqui."
      isEmpty={!demands.length}
    >
      {demands.map((demand) => (
        <li
          key={demand.id}
          className={`flex items-center justify-between gap-3 ${itemClass}`}
        >
          <div className="min-w-0">
            <p className="font-medium text-foreground">{demand.title}</p>
            <p className="text-xs text-muted-foreground">{demand.type}</p>
          </div>
          {demand.deliveryDate ? (
            <Badge className="shrink-0">
              {format(new Date(demand.deliveryDate), "dd/MM/yyyy", {
                locale: ptBR,
              })}
            </Badge>
          ) : null}
        </li>
      ))}
    </PortalList>
  );
}

export function PortalPublicacoes({
  demands,
}: {
  demands: Array<{
    id: string;
    title: string;
    type: string;
    format: string | null;
    publishDate: Date | string | null;
  }>;
}) {
  return (
    <PortalList
      title="Próximas publicações"
      description="Conteúdos com data de publicação"
      emptyTitle="Nenhuma publicação programada"
      emptyDescription="Conteúdos com data de publicação aparecem aqui."
      isEmpty={!demands.length}
    >
      {demands.map((demand) => (
        <li
          key={demand.id}
          className={`flex items-center justify-between gap-3 ${itemClass}`}
        >
          <div className="min-w-0">
            <p className="font-medium text-foreground">{demand.title}</p>
            <p className="text-xs text-muted-foreground">
              {demand.format ?? demand.type}
            </p>
          </div>
          {demand.publishDate ? (
            <Badge className="shrink-0">
              {format(new Date(demand.publishDate), "dd/MM/yyyy", {
                locale: ptBR,
              })}
            </Badge>
          ) : null}
        </li>
      ))}
    </PortalList>
  );
}

export function PortalMateriais({
  demands,
}: {
  demands: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    deliveryDate: Date | string | null;
  }>;
}) {
  return (
    <PortalList
      title="Materiais concluídos"
      description="Conteúdos entregues e finalizados"
      emptyTitle="Nenhum material concluído"
      emptyDescription="Conteúdos entregues e finalizados aparecem aqui."
      isEmpty={!demands.length}
    >
      {demands.map((demand) => (
        <li
          key={demand.id}
          className={`flex items-center justify-between gap-3 ${itemClass}`}
        >
          <div className="min-w-0">
            <p className="font-medium text-foreground">{demand.title}</p>
            <p className="text-xs text-muted-foreground">{demand.type}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Badge variant="secondary">{demand.status}</Badge>
            {demand.deliveryDate ? (
              <Badge variant="outline">
                {format(new Date(demand.deliveryDate), "dd/MM/yyyy", {
                  locale: ptBR,
                })}
              </Badge>
            ) : null}
          </div>
        </li>
      ))}
    </PortalList>
  );
}

export function PortalArquivos({
  files,
}: {
  files: Array<{
    id: string;
    name: string;
    fileType: string | null;
    url?: string | null;
    createdAt: Date | string;
  }>;
}) {
  return (
    <PortalList
      title="Arquivos"
      description="Arquivos compartilhados com você"
      emptyTitle="Nenhum arquivo disponível"
      emptyDescription="Arquivos compartilhados com você aparecem aqui."
      isEmpty={!files.length}
    >
      {files.map((file) => (
        <li
          key={file.id}
          className={`flex items-center justify-between gap-3 ${itemClass}`}
        >
          <div className="min-w-0">
            {file.url ? (
              <a
                href={file.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                {file.name}
              </a>
            ) : (
              <p className="font-medium text-foreground">{file.name}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {file.fileType ?? "Arquivo"}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {format(new Date(file.createdAt), "dd/MM/yyyy", { locale: ptBR })}
          </span>
        </li>
      ))}
    </PortalList>
  );
}

export function PortalNotificacoes({
  notifications,
}: {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    createdAt: Date | string;
    read: boolean;
  }>;
}) {
  return (
    <PortalList
      title="Notificações"
      description="Atualizações sobre seu conteúdo"
      emptyTitle="Nenhuma notificação"
      emptyDescription="Atualizações sobre o seu conteúdo aparecem aqui."
      isEmpty={!notifications.length}
    >
      {notifications.map((notification) => (
        <li key={notification.id} className={itemClass}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-medium text-foreground">{notification.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {notification.message}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {format(new Date(notification.createdAt), "dd/MM/yyyy HH:mm", {
                  locale: ptBR,
                })}
              </p>
            </div>
            {!notification.read ? <Badge className="shrink-0">Nova</Badge> : null}
          </div>
        </li>
      ))}
    </PortalList>
  );
}
