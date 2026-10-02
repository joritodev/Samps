"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BoardCoverUpload } from "@/components/board/board-cover-upload";
import { Label } from "@/components/ui/label";
import { updateBoardAppearanceAction } from "@/lib/actions/board.actions";
import {
  BOARD_ACCENTS,
  BOARD_COVERS,
  type BoardAppearance,
} from "@/lib/board/appearance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function BoardAppearanceForm({
  boardId,
  clientId,
  initial,
  clientName,
  brandColor,
}: {
  boardId: string;
  clientId: string;
  initial: BoardAppearance;
  clientName: string;
  brandColor?: string | null;
}) {
  const [accent, setAccent] = useState(initial.accent);
  const [cover, setCover] = useState(initial.cover);
  const [pending, startTransition] = useTransition();
  const dirty = accent !== initial.accent || cover !== initial.cover;

  function save() {
    startTransition(async () => {
      const r = await updateBoardAppearanceAction(boardId, clientId, {
        accent,
        cover,
      });
      if (r.error) toast.error(r.error);
      else toast.success("Aparência atualizada");
    });
  }

  return (
    <div className="space-y-5">
      <fieldset className="space-y-2">
        <Label asChild>
          <legend>Cor de destaque</legend>
        </Label>
        <p className="text-xs text-muted-foreground">
          Muda botões, aba ativa e etiquetas deste quadro. Alertas de atraso
          continuam vermelhos.
        </p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor de destaque">
          {BOARD_ACCENTS.map((a) => {
            const selected = (accent ?? "teal") === a.id;
            return (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={a.label}
                title={a.label}
                onClick={() => setAccent(a.id === "teal" ? null : a.id)}
                className={cn(
                  "grid size-9 place-items-center rounded-full border border-border text-white outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  selected && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                )}
                style={{ backgroundColor: a.swatch }}
              >
                {selected ? <Check className="size-4" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <Label asChild>
          <legend>Capa</legend>
        </Label>
        <p className="text-xs text-muted-foreground">
          Faixa decorativa no topo do quadro. O conteúdo abaixo continua liso.
        </p>
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          role="radiogroup"
          aria-label="Capa"
        >
          <CoverOption
            label="Sem capa"
            selected={cover === null}
            onSelect={() => setCover(null)}
          />
          {BOARD_COVERS.map((c) => (
            <CoverOption
              key={c.id}
              label={c.label}
              css={c.css}
              selected={cover === c.id}
              onSelect={() => setCover(c.id)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <Label asChild>
          <legend>Foto da capa</legend>
        </Label>
        <BoardCoverUpload
          clientId={clientId}
          clientName={clientName}
          brandColor={brandColor}
          initial={initial.coverImage}
        />
      </fieldset>

      <Button disabled={pending || !dirty} onClick={save}>
        Salvar aparência
      </Button>
    </div>
  );
}

function CoverOption({
  label,
  css,
  selected,
  onSelect,
}: {
  label: string;
  css?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "overflow-hidden rounded-lg border border-border text-left outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
      )}
    >
      <span
        aria-hidden
        className="block h-12 bg-muted"
        style={css ? { background: css } : undefined}
      />
      <span className="block px-2 py-1.5 text-xs font-medium">{label}</span>
    </button>
  );
}
