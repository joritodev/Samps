"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateContentTypeRequirementsAction } from "@/lib/actions/settings.actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type ContentTypeRequirementFlags = {
  id: string;
  name: string;
  requiresDuration: boolean;
  requiresFormat: boolean;
  requiresCaption: boolean;
  requiresReference: boolean;
  requiresRawDelivery: boolean;
};

const FIELDS: {
  key: keyof Omit<ContentTypeRequirementFlags, "id" | "name">;
  label: string;
}[] = [
  { key: "requiresDuration", label: "Duração (segundos) obrigatória" },
  { key: "requiresFormat", label: "Formato/orientação obrigatório" },
  { key: "requiresCaption", label: "Legenda obrigatória" },
  { key: "requiresReference", label: "Referência obrigatória" },
  { key: "requiresRawDelivery", label: "Entrega bruta obrigatória" },
];

export function ContentTypeRequirementsForm({
  contentType,
}: {
  contentType: ContentTypeRequirementFlags;
}) {
  const [pending, startTransition] = useTransition();
  const [flags, setFlags] = useState({
    requiresDuration: contentType.requiresDuration,
    requiresFormat: contentType.requiresFormat,
    requiresCaption: contentType.requiresCaption,
    requiresReference: contentType.requiresReference,
    requiresRawDelivery: contentType.requiresRawDelivery,
  });

  function toggle(key: (typeof FIELDS)[number]["key"]) {
    const previous = flags;
    const next = { ...flags, [key]: !flags[key] };
    setFlags(next);
    startTransition(async () => {
      const result = await updateContentTypeRequirementsAction({
        id: contentType.id,
        ...next,
      });
      if ("success" in result && result.success) {
        toast.success("Campos obrigatórios atualizados");
        return;
      }
      setFlags(previous);
      toast.error(
        "error" in result ? result.error : "Não foi possível salvar"
      );
    });
  }

  return (
    <details className="border-t border-border px-4 py-2">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
        Campos obrigatórios do briefing
      </summary>
      <ul className="space-y-2 py-3">
        {FIELDS.map((field) => {
          const inputId = `${contentType.id}-${field.key}`;
          return (
            <li key={field.key} className="flex items-center gap-2">
              <Checkbox
                id={inputId}
                checked={flags[field.key]}
                disabled={pending}
                onCheckedChange={() => toggle(field.key)}
              />
              <Label htmlFor={inputId} className="text-sm font-normal">
                {field.label}
              </Label>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
