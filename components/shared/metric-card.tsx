import {
  MetricCard as AgencyMetricCard,
  type MetricTone,
} from "@/components/agency/metric-card";

const toneMap: Record<"default" | "danger" | "teal" | "primary", MetricTone> = {
  default: "default",
  danger: "danger",
  teal: "success",
  primary: "primary",
};

/** Compat: mesma API antiga, visual unificado do MetricCard da agência. */
export function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "danger" | "teal" | "primary";
}) {
  return <AgencyMetricCard label={label} value={value} tone={toneMap[tone]} />;
}
