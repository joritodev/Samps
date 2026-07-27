"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckCircle2,
  Clock3,
  Filter,
  RotateCcw,
  Target,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const KPI = [
  {
    id: "completion",
    label: "Taxa de Conclusão",
    value: "87%",
    hint: "+4,2 pts vs. período anterior",
    icon: Target,
  },
  {
    id: "cycle",
    label: "Tempo Médio de Entrega",
    value: "3,4 dias",
    hint: "−0,6 dia vs. meta de 4 dias",
    icon: Clock3,
  },
  {
    id: "rework",
    label: "Demandas Refeitas (Ajustes)",
    value: "12",
    hint: "8,1% do volume total",
    icon: RotateCcw,
  },
  {
    id: "sla",
    label: "Entregas no Prazo (SLA)",
    value: "92%",
    hint: "Meta OKR: 90%",
    icon: CheckCircle2,
  },
] as const;

const PRODUCTIVITY = [
  { sector: "Social Media", entregas: 28 },
  { sector: "Design", entregas: 41 },
  { sector: "Vídeo", entregas: 19 },
];

const STATUS_SHARE = [
  { status: "concluido", label: "Concluído", value: 54, fill: "var(--color-concluido)" },
  { status: "andamento", label: "Em Andamento", value: 31, fill: "var(--color-andamento)" },
  { status: "atrasado", label: "Atrasado", value: 15, fill: "var(--color-atrasado)" },
];

const TOP_PERFORMERS = [
  { rank: 1, name: "João Lima", role: "Designer", entregas: 14, sla: "96%" },
  { rank: 2, name: "Maria Souza", role: "Social Media", entregas: 11, sla: "94%" },
  { rank: 3, name: "Ana Carolina", role: "Gestão", entregas: 8, sla: "100%" },
  { rank: 4, name: "Carlos Mendes", role: "Vídeo", entregas: 7, sla: "89%" },
  { rank: 5, name: "Rafael Alves", role: "Tráfego", entregas: 5, sla: "91%" },
];

const productivityConfig = {
  entregas: {
    label: "Entregas",
    color: "hsl(221 72% 38%)", // azul royal
  },
} satisfies ChartConfig;

const statusConfig = {
  concluido: { label: "Concluído", color: "hsl(221 72% 38%)" },
  andamento: { label: "Em Andamento", color: "hsl(220 10% 55%)" },
  atrasado: { label: "Atrasado", color: "hsl(16 88% 55%)" }, // coral
} satisfies ChartConfig;

const FILTERS = ["Últimos 30 dias", "Por Setor", "Por Colaborador"] as const;

export function PerformanceDashboard() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-card">
      <header className="shrink-0 border-b border-border px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Performance
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Análise executiva e acompanhamento de OKRs
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((filter, index) => (
              <Button
                key={filter}
                variant={index === 0 ? "default" : "outline"}
                size="sm"
                type="button"
                className="gap-1.5"
              >
                {index === 0 ? <Filter className="h-3.5 w-3.5" /> : null}
                {filter}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="space-y-6 bg-background p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {KPI.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Card key={kpi.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {kpi.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tracking-tight text-foreground">
                    {kpi.value}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{kpi.hint}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold tracking-tight">
                Produtividade por Setor
              </CardTitle>
              <CardDescription>
                Entregas finalizadas nos últimos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={productivityConfig}
                className="aspect-[16/9] w-full"
              >
                <BarChart
                  accessibilityLayer
                  data={PRODUCTIVITY}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="sector"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    allowDecimals={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar
                    dataKey="entregas"
                    fill="var(--color-entregas)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={56}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base font-semibold tracking-tight">
                Status das Demandas
              </CardTitle>
              <CardDescription>
                Distribuição do pipeline atual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={statusConfig}
                className="mx-auto aspect-square max-h-[260px]"
              >
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="status" hideLabel />}
                  />
                  <Pie
                    data={STATUS_SHARE}
                    dataKey="value"
                    nameKey="status"
                    innerRadius={58}
                    outerRadius={88}
                    strokeWidth={3}
                    stroke="#fff"
                  >
                    {STATUS_SHARE.map((entry) => (
                      <Cell key={entry.status} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <ul className="mt-2 space-y-2">
                {STATUS_SHARE.map((item) => (
                  <li
                    key={item.status}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span
                        className="h-2 w-2 rounded-[2px]"
                        style={{ backgroundColor: statusConfig[item.status as keyof typeof statusConfig].color }}
                      />
                      {item.label}
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      {item.value}%
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold tracking-tight">
                Top Performers
              </CardTitle>
              <CardDescription>
                Colaboradores com mais entregas finalizadas na semana
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-2">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-16 pl-6">#</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-right">Entregas</TableHead>
                    <TableHead className="pr-6 text-right">SLA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TOP_PERFORMERS.map((person) => (
                    <TableRow key={person.rank}>
                      <TableCell className="pl-6">
                        <span
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-md border border-border text-xs font-medium text-muted-foreground",
                            person.rank === 1 &&
                              "border-primary bg-primary text-primary-foreground"
                          )}
                        >
                          {person.rank}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {person.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{person.role}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-foreground/80">
                        {person.entregas}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Badge variant="success">{person.sla}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
