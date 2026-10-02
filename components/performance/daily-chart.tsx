"use client";

import { useState } from "react";
import { shortDay, weekdayShort } from "@/lib/agency/performance-format";
import type { DailyPoint } from "@/lib/agency/performance-summary";

const W = 640;
const H = 210;
const M = { top: 14, right: 10, bottom: 28, left: 30 };

/** Topo do eixo: inteiro, com no mínimo 3 para um dia pequeno não parecer cheio. */
function axisMax(points: DailyPoint[]) {
  const max = Math.max(3, ...points.flatMap((p) => [p.current, p.previous]));
  return max % 2 === 0 || max <= 4 ? max : max + 1;
}

/**
 * Entregas por dia: linha = período atual, barras claras = período anterior.
 * SVG próprio, sem biblioteca. Cada dia tem uma faixa de toque para o tooltip.
 */
export function DailyChart({ points }: { points: DailyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = points.length;
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const band = plotW / n;
  const top = axisMax(points);
  const y = (v: number) => M.top + plotH - (v / top) * plotH;
  const cx = (i: number) => M.left + band * i + band / 2;
  const barW = Math.min(band * 0.6, 34);
  const everyLabel = Math.ceil(n / 8);
  const dots = n <= 31;
  const ticks = [0, top / 2, top];
  const active = hover === null ? null : points[hover]!;

  return (
    <figure className="m-0">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Entregas por dia: ${points.reduce((s, p) => s + p.current, 0)} no período, ${points.reduce((s, p) => s + p.previous, 0)} no anterior. A tabela abaixo traz os valores por dia.`}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
              <text x={M.left - 6} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
                {t}
              </text>
            </g>
          ))}

          {points.map((p, i) => (
            <rect
              key={`b${p.date}`}
              x={cx(i) - barW / 2}
              y={y(p.previous)}
              width={barW}
              height={Math.max(0, y(0) - y(p.previous))}
              rx={4}
              className={hover === i ? "fill-muted-foreground/40" : "fill-muted-foreground/25"}
            />
          ))}

          <polyline
            fill="none"
            className="stroke-primary"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points.map((p, i) => `${cx(i)},${y(p.current)}`).join(" ")}
          />
          {dots
            ? points.map((p, i) => (
                <circle
                  key={`c${p.date}`}
                  cx={cx(i)}
                  cy={y(p.current)}
                  r={hover === i ? 5 : 4}
                  className="fill-primary stroke-card"
                  strokeWidth={2}
                />
              ))
            : null}

          {points.map((p, i) =>
            i % everyLabel === 0 ? (
              <text key={`l${p.date}`} x={cx(i)} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                {n <= 7 ? `${weekdayShort(p.date)} ${shortDay(p.date).slice(0, 2)}` : shortDay(p.date)}
              </text>
            ) : null
          )}

          {points.map((p, i) => (
            <rect
              key={`h${p.date}`}
              x={M.left + band * i}
              y={M.top}
              width={band}
              height={plotH}
              fill="transparent"
              onPointerEnter={() => setHover(i)}
              onPointerMove={() => setHover(i)}
            />
          ))}
        </svg>

        {active ? (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${(cx(hover!) / W) * 100}%` }}
          >
            <p className="font-semibold text-foreground">
              {weekdayShort(active.date)}, {shortDay(active.date)}
            </p>
            <p className="text-foreground">
              <span className="num font-semibold">{active.current}</span> entregas
            </p>
            <p className="text-muted-foreground">
              <span className="num">{active.previous}</span> no dia equivalente antes
            </p>
          </div>
        ) : null}
      </div>

      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 rounded-full bg-primary" />
          Período atual
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-3 rounded-sm bg-muted-foreground/25" />
          Período anterior
        </span>
      </figcaption>

      <table className="sr-only">
        <caption>Entregas por dia</caption>
        <thead>
          <tr>
            <th>Dia</th>
            <th>Período atual</th>
            <th>Período anterior</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <td>{shortDay(p.date)}</td>
              <td>{p.current}</td>
              <td>{p.previous}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
