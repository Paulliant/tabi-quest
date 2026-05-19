import { redirect } from "next/navigation";

import { AuthShell } from "@/components/app-ui";
import ThemeToggleButton from "@/components/theme-toggle-button";
import LoginForm from "./login-form";
import { getCurrentProfileFromCookies } from "@/lib/supabase";

export default async function LoginPage() {
  const profile = await getCurrentProfileFromCookies();

  if (profile) {
    redirect("/");
  }

  return (
    <AuthShell action={<ThemeToggleButton />}>
      <LoginForm />
    </AuthShell>
  );
}
