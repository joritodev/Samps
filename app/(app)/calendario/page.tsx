import { redirect } from "next/navigation";

/** Legacy `(app)/calendario` — sunset. Agenda viva em `/agenda`. */
export default function LegacyCalendarioPage() {
  redirect("/agenda");
}
