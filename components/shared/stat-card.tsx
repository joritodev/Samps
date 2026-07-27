import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  className,
  accent = "primary",
}: {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  description?: string;
  className?: string;
  accent?: "primary" | "destructive" | "muted" | "teal";
}) {
  const accentBorder = {
    primary: "border-l-primary",
    destructive: "border-l-destructive",
    muted: "border-l-muted-foreground",
    teal: "border-l-teal-light",
  }[accent];

  const accentText = {
    primary: "text-primary",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
    teal: "text-teal-light",
  }[accent];

  return (
    <Card
      className={cn(
        "rounded-xl border-l-4 bg-card/90 shadow-soft backdrop-blur-[5px]",
        accentBorder,
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className={cn("h-4 w-4", accentText)} />}
      </CardHeader>
      <CardContent>
        <div className="font-display text-2xl font-semibold text-foreground">
          {value}
        </div>
        {description && (
          <p className={cn("mt-1 text-[11px] font-semibold", accentText)}>
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
