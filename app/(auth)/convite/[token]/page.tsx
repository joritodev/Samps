import Link from "next/link";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { findInviteByToken, inviteState } from "@/lib/services/invites.service";

const INVALID_MESSAGE: Record<string, string> = {
  not_found: "Não encontramos este convite. Confira o link recebido por e-mail.",
  accepted: "Este convite já foi utilizado. Faça login com sua senha.",
  expired: "Este convite expirou. Peça um novo à equipe que o convidou.",
  revoked: "Este convite foi revogado.",
};

export default async function AcceptInvitePage({
  params,
}: {
  params: { token: string };
}) {
  const invite = await findInviteByToken(params.token);
  const state = inviteState(invite);

  if (state !== "valid" || !invite?.user) {
    return (
      <div className="mx-auto flex min-h-dvh items-center justify-center p-6">
        <Card className="w-full max-w-md rounded-2xl border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Convite indisponível</CardTitle>
            <CardDescription>{INVALID_MESSAGE[state]}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/login">Ir para o login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh items-center justify-center p-6">
      <AcceptInviteForm
        token={params.token}
        defaultName={invite.user.name}
        email={invite.user.email}
      />
    </div>
  );
}
