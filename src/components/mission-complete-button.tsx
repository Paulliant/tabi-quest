"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type MissionCompleteButtonProps = {
  missionId: string;
  process: 0 | 1 | 2;
  missionType?: 0 | 1 | 2 | 3;
};

export default function MissionCompleteButton({
  missionId,
  process,
}: MissionCompleteButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleComplete() {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/missions/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          missionId,
          extraData: {},
          additional: {},
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "ミッションの更新に失敗しました。");
      }

      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "ミッションの更新に失敗しました。",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isDone = process === 2;
  const disabled = isSubmitting || isDone;
  const label = isSubmitting
    ? "処理中..."
    : isDone
      ? "完了済み"
      : "完了する";

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={handleComplete}
        disabled={disabled}
        className={`h-11 rounded-md px-5 text-sm font-bold transition ${
          isDone
            ? "bg-[#d7ddd2] text-[#536057]"
            : "bg-[#236b5b] text-white hover:bg-[#1c5649]"
        } disabled:cursor-not-allowed disabled:opacity-75`}
      >
        {label}
      </button>

      {errorMessage ? (
        <p className="max-w-40 text-sm text-[#9a3e2d]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
