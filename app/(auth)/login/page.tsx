import { LoginView } from "@/components/auth/login-view";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; email?: string };
}) {
  return (
    <LoginView
      callbackUrl={searchParams.callbackUrl}
      defaultEmail={searchParams.email}
    />
  );
}
