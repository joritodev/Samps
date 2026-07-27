"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  updateCurrentUser,
  type UpdateProfileState,
} from "@/app/actions/profile";
import { userInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileFormProps = {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    roleName: string;
  };
};

const initialState: UpdateProfileState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando…" : "Salvar alterações"}
    </Button>
  );
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [state, formAction] = useFormState(updateCurrentUser, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success("Perfil atualizado.");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <header className="shrink-0 border-b border-border bg-card px-6 py-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Meu perfil
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Atualize seus dados de acesso na intranet
        </p>
      </header>

      <div className="mx-auto w-full max-w-lg p-6">
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-border bg-muted/80 px-4 py-3">
          <Avatar className="h-12 w-12 border border-border">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
            <AvatarFallback className="bg-primary text-sm font-medium text-primary-foreground">
              {userInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {user.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.roleName}
            </p>
          </div>
        </div>

        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              name="name"
              defaultValue={user.name}
              required
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={user.email}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar">URL do avatar</Label>
            <Input
              id="avatar"
              name="avatar"
              type="text"
              inputMode="url"
              placeholder="https://…"
              defaultValue={user.avatarUrl ?? ""}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">Opcional.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Deixe em branco para manter"
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
          </div>

          <div className="flex justify-end pt-2">
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}
