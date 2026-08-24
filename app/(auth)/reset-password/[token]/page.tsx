import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="mx-auto flex min-h-dvh items-center justify-center p-6">
      <ResetPasswordForm token={token} />
    </div>
  );
}
