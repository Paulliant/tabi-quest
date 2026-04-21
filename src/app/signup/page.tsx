import { redirect } from "next/navigation";

import SignupForm from "./signup-form";
import { getCurrentProfileFromCookies } from "@/lib/supabase";

export default async function SignupPage() {
  const profile = await getCurrentProfileFromCookies();

  if (profile) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f3] px-4 py-8">
      <div className="w-full max-w-md">
        <SignupForm />
      </div>
    </main>
  );
}
