"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { SessionUser } from "@/types/auth";

export function GlobalSearch({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <Button
        variant="outline"
        className="hidden h-10 w-64 justify-start border-border bg-card text-muted-foreground shadow-soft sm:flex"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        Pesquisar...
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="sm:hidden"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar clientes, demandas, projetos..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup heading="Atalhos">
            <CommandItem onSelect={() => go("/clientes")}>Clientes</CommandItem>
            <CommandItem onSelect={() => go("/projetos")}>Projetos</CommandItem>
            <CommandItem onSelect={() => go("/captacoes")}>Captações</CommandItem>
            {user.permissions.includes("users.edit") && (
              <CommandItem onSelect={() => go("/usuarios")}>Usuários</CommandItem>
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
