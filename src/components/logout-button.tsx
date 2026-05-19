"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/app-ui";

export default function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      await fetch("/api/logout", {
        method: "POST",
      });
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isSubmitting}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cfd8d1] bg-white px-4 text-sm font-semibold text-[#2e5149] transition hover:border-[#2f7d6b] hover:bg-[#eef5f1] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#26364f] dark:bg-[#0f1b2d] dark:text-[#dbeafe] dark:hover:border-[#38bdf8] dark:hover:bg-[#172033]"
    >
      <Icon name="join" />
      {isSubmitting ? "処理中..." : "ログアウト"}
    </button>
  );
}
