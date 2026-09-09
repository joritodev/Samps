import { redirect } from "next/navigation";

/** Legacy `(app)/usuarios` — sunset. Quem gerencia equipe usa `/equipe`. */
export default function LegacyUsuariosPage() {
  redirect("/equipe");
}
