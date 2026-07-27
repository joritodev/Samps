import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { requireAuth } from "@/lib/permissions/check";
import { listShoots } from "@/lib/services/shoots.service";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function CaptacoesPage() {
  const user = await requireAuth();
  const shoots = await listShoots(user);

  return (
    <div>
      <PageHeader title="Captações" description="Agenda de gravações e captações" />
      <div className="rounded-xl border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Participantes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shoots.length ? (
              shoots.map((shoot) => (
                <TableRow key={shoot.id}>
                  <TableCell className="font-medium">{shoot.title}</TableCell>
                  <TableCell>{shoot.client.name}</TableCell>
                  <TableCell>
                    {format(new Date(shoot.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{shoot.location ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{shoot.status}</Badge>
                  </TableCell>
                  <TableCell>{shoot.participants.length}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  Nenhuma captação encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
