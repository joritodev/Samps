"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ScheduleView, type ScheduleItem } from "@/components/agency/schedule-view";
import { ShootFormSheet } from "@/components/work/shoot-form-sheet";
import { Button } from "@/components/ui/button";

export function ShootsListView({
  items,
  canCreate,
  clients,
  users,
  projects,
  currentUserId,
  canCreateDemand,
}: {
  items: ScheduleItem[];
  canCreate: boolean;
  clients: { id: string; name: string }[];
  users: { id: string; name: string }[];
  projects: { id: string; title: string; clientId: string }[];
  currentUserId: string;
  canCreateDemand: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ScheduleView
        title="Captações"
        description="Gravações e sessões de foto agendadas, com a edição ligada a cada uma"
        dateLabel="Data"
        emptyMessage="Nenhuma captação agendada"
        items={items}
        action={
          canCreate ? (
            <Button onClick={() => setOpen(true)} disabled={clients.length === 0}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nova captação
            </Button>
          ) : null
        }
      />
      {canCreate ? (
        <ShootFormSheet
          open={open}
          onOpenChange={setOpen}
          clients={clients}
          users={users}
          projects={projects}
          currentUserId={currentUserId}
          canCreateDemand={canCreateDemand}
        />
      ) : null}
    </>
  );
}
