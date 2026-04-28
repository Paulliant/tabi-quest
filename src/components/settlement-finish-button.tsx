"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
        className="h-11 rounded-md bg-[#236b5b] px-6 text-sm font-bold text-white transition hover:bg-[#1c5649] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "終了処理中..." : "終了"}
      </button>

      {errorMessage ? (
        <p className="text-sm text-[#9a3e2d]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
