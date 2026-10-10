"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ScheduleView, type ScheduleItem } from "@/components/agency/schedule-view";
import { ProjectFormSheet } from "@/components/work/project-form-sheet";
import { Button } from "@/components/ui/button";

export function ProjectsListView({
  items,
  canCreate,
  clients,
  users,
  currentUserId,
}: {
  items: ScheduleItem[];
  canCreate: boolean;
  clients: { id: string; name: string }[];
  users: { id: string; name: string }[];
  currentUserId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ScheduleView
        title="Projetos"
        description="Conjuntos de demandas que o cliente pediu para um fim específico, com prazo e progresso"
        dateLabel="Prazo"
        emptyMessage="Nenhum projeto cadastrado"
        items={items}
        action={
          canCreate ? (
            <Button onClick={() => setOpen(true)} disabled={clients.length === 0}>
              <Plus className="mr-1.5 h-4 w-4" />
              Novo projeto
            </Button>
          ) : null
        }
      />
      {canCreate ? (
        <ProjectFormSheet
          open={open}
          onOpenChange={setOpen}
          clients={clients}
          users={users}
          currentUserId={currentUserId}
        />
      ) : null}
    </>
  );
}
