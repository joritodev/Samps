import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireAuth } from "@/lib/permissions/check";
import { getPortalFiles } from "@/lib/services/portal.service";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default async function PortalArquivosPage() {
  const user = await requireAuth();
  const files = await getPortalFiles(user);

  return (
    <div>
      <PageHeader title="Arquivos" description="Arquivos compartilhados com você" />
      <div className="space-y-2">
        {files.length ? (
          files.map((file) => (
            <Card key={file.id} className="rounded-xl shadow-sm">
              <CardContent className="flex items-center justify-between py-4 text-sm">
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-slate-500">{file.fileType ?? "Arquivo"}</p>
                </div>
                <span className="text-xs text-slate-400">
                  {format(new Date(file.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="py-12 text-center text-sm text-slate-500">
              Nenhum arquivo disponível.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
