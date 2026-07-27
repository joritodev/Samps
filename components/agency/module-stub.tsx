export function ModuleStub({
  title,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex h-full flex-col bg-card">
      <header className="shrink-0 border-b border-border px-6 py-5">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
      </header>
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Em desenvolvimento</p>
      </div>
    </div>
  );
}
