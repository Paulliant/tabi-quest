import { redirect } from "next/navigation";

import { AuthShell } from "@/components/app-ui";
import ThemeToggleButton from "@/components/theme-toggle-button";
import SignupForm from "./signup-form";
import { getCurrentProfileFromCookies } from "@/lib/supabase";

export default async function SignupPage() {
  const profile = await getCurrentProfileFromCookies();

  if (profile) {
    redirect("/");
  }

  return (
    <AuthShell action={<ThemeToggleButton />}>
      <SignupForm />
    </AuthShell>
  );
}
