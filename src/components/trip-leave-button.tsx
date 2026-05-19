"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/app-ui";

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

      const data = (await response.json()) as {
        ended?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "処理に失敗しました。");
      }

      if (data.ended) {
        router.push("/settlement?hunt=1");
        return;
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
        className="inline-flex h-11 w-fit min-w-36 items-center justify-center gap-2 rounded-md bg-[#c94f45] px-5 text-sm font-bold text-white transition hover:bg-[#ad4138] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#dc2626] dark:hover:bg-[#b91c1c]"
      >
        <Icon name="flag" />
        {isSubmitting
          ? "処理中..."
          : isOwner
            ? "ミッションハント"
            : "グループを退出"}
      </button>

      {errorMessage ? (
        <p className="text-sm font-medium text-[#9a3e2d] dark:text-[#fca5a5]">{errorMessage}</p>
      ) : null}
    </div>
  );
}
