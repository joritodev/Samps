import { ProfileForm } from "@/components/agency/profile-form";
import { getCurrentAgencyUser } from "@/lib/agency/current-user";

export default async function PerfilPage() {
  const user = await getCurrentAgencyUser();

  return <ProfileForm user={user} />;
}
