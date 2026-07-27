import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/permissions/check";
import { FirstAccessForm } from "@/components/auth/first-access-form";

export default async function FirstAccessPage() {
  const user = await requireAuth();

  if (!user.mustResetPassword) {
    redirect("/dashboard");
  }

  return <FirstAccessForm userId={user.id} />;
}
