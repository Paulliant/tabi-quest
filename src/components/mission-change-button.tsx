"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/app-ui";

export default function MissionChangeButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function changeMissions() {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/missions/change", {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "ミッションの変更に失敗しました。");
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "ミッションの変更に失敗しました。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2 border-t border-[#e1e6df] pt-4 text-center dark:border-[#26364f]">
      <button
        type="button"
        onClick={changeMissions}
        disabled={isSubmitting}
        className="inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-md bg-[#315f9a] px-5 text-sm font-bold text-white transition hover:bg-[#294f80] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8]"
      >
        <Icon name="spark" />
        {isSubmitting ? "変更中..." : "ミッション変更"}
      </button>

      {errorMessage ? (
        <p className="max-w-md text-sm font-medium text-[#9a3e2d] dark:text-[#fca5a5]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
