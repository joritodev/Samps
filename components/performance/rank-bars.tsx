export type RankItem = {
  key: string;
  label: string;
  /** 0 a 1: largura da barra. */
  ratio: number;
  value: string;
};

/** Lista com barra fina: valor em texto, barra só ajuda a comparar. */
export function RankBars({
  title,
  items,
  empty,
}: {
  title: string;
  items: RankItem[];
  empty: string;
}) {
  return (
    <section className="rounded-xl border border-border/80 bg-card p-4 shadow-xs">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={item.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-foreground">{item.label}</span>
                <span className="num shrink-0 text-xs text-muted-foreground">{item.value}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(2, Math.round(item.ratio * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
