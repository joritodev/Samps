export function BoardColumnEmpty({
  title = "Nenhum cartão nesta coluna",
  description = "Arraste uma demanda para cá ou crie um cartão.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-border px-3 py-6 text-center">
      <p className="text-xs font-medium text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
