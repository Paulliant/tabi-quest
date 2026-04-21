"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TripLeaveButton({ isOwner }: { isOwner: boolean }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleClick() {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/trips/leave", {
        method: "POST",
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "処理に失敗しました。");
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "処理に失敗しました。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isSubmitting}
        className="h-11 rounded-md bg-[#c74545] px-5 text-sm font-bold text-white transition hover:bg-[#ac3939] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting
          ? "処理中..."
          : isOwner
            ? "旅を終了"
            : "グループを退出"}
      </button>

      {errorMessage ? (
        <p className="text-sm text-[#9a3e2d]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
