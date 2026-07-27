import { ProfileForm } from "@/components/agency/profile-form";
import { getCurrentAgencyUser } from "@/lib/agency/current-user";

export default async function PerfilPage() {
  const user = await getCurrentAgencyUser();

  if (!user) {
    return (
      <div className="flex h-full flex-col">
        <header className="shrink-0 border-b border-border px-6 py-5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Meu perfil
          </h1>
        </header>
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            Usuário{" "}
            <span className="font-medium text-foreground/80">
              gestao@samps.digital
            </span>{" "}
            não encontrado. Rode{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              npx prisma db seed
            </code>
            .
          </p>
        </div>
      </div>
    );
  }

  return <ProfileForm user={user} />;
}
