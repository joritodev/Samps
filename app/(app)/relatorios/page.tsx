import { redirect } from "next/navigation";

/** Legacy `(app)/relatorios` — sunset. Relatórios vivos em `/performance`. */
export default function LegacyRelatoriosPage() {
  redirect("/performance");
}
