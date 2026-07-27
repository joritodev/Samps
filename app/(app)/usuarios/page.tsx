import { requireAuth } from "@/lib/permissions/check";
import { listUsers } from "@/lib/services/users.service";
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

export default async function UsuariosPage() {
  const user = await requireAuth();
  const users = await listUsers(user);

  return (
    <div>
      <PageHeader title="Usuários" description="Gerenciamento de usuários do sistema" />
      <div className="rounded-xl border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length ? (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.userType}</TableCell>
                  <TableCell>{u.role.name}</TableCell>
                  <TableCell>{u.sector?.name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{u.status}</Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  Nenhum usuário encontrado ou sem permissão.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
