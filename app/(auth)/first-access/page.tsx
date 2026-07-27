import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/permissions/check";
import { FirstAccessForm } from "@/components/auth/first-access-form";
import { getDashboardPath } from "@/types/auth";

export default async function FirstAccessPage() {
  const user = await requireAuth();

  if (!user.mustResetPassword) {
    redirect(getDashboardPath(user.userType));
  }

  return (
    <FirstAccessForm
      userId={user.id}
      defaultName={user.name}
      email={user.email}
    />
  );
}
