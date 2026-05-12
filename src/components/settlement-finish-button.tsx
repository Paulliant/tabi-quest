"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/app-ui";

export default function SettlementFinishButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleClick() {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/trips/settlement/complete", {
        method: "POST",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "結算の完了に失敗しました。");
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "結算の完了に失敗しました。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isSubmitting}
        className="inline-flex h-11 w-fit min-w-32 items-center justify-center gap-2 rounded-md bg-[#2f7d6b] px-6 text-sm font-bold text-white transition hover:bg-[#276452] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0ea5e9] dark:hover:bg-[#0284c7]"
      >
        <Icon name="check" />
        {isSubmitting ? "終了処理中..." : "終了"}
      </button>

      {errorMessage ? (
        <p className="text-sm font-medium text-[#9a3e2d] dark:text-[#fca5a5]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
