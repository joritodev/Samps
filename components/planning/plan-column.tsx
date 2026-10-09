"use client";

import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { canDragCard } from "@/lib/agency/planning/card-input";
import type { PlanCardData, PlanMemberData } from "@/lib/agency/planning/types";
import { PlanCardView } from "./plan-card-view";

type Shared = {
  members: PlanMemberData[];
  kinds: readonly { value: string; label: string }[];
  canEdit: boolean;
  onEdit: (card: PlanCardData) => void;
  onDuplicate: (card: PlanCardData) => void;
  onToggleComplete: (card: PlanCardData) => void;
};

/** Coluna que recebe cards soltos (pessoa × dia ou backlog). */
export function PlanColumn({ id, cards, ...shared }: Shared & { id: string; cards: PlanCardData[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] space-y-2 rounded-md p-1 transition-colors ${
        isOver ? "bg-blue-50 ring-1 ring-blue-200" : ""
      }`}
    >
      <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        {cards.map((card) => (
          <SortableCard key={card.id} card={card} {...shared} />
        ))}
      </SortableContext>
    </div>
  );
}

function SortableCard({ card, ...shared }: Shared & { card: PlanCardData }) {
  const draggable = shared.canEdit && canDragCard(card);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    disabled: !draggable,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={isDragging ? "opacity-40" : ""}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
    >
      <PlanCardView
        card={card}
        members={shared.members}
        kinds={shared.kinds}
        canEdit={shared.canEdit}
        onEdit={shared.onEdit}
        onDuplicate={shared.onDuplicate}
        onToggleComplete={shared.onToggleComplete}
      />
    </div>
  );
}
