"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/app-ui";

export default function TripLeaveButton({ isOwner }: { isOwner: boolean }) {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function handleClick() {
    setErrorMessage("");
    setIsConfirmOpen(true);
  }

  async function submitLeave() {
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

      setIsConfirmOpen(false);
      router.push("/settlement?hunt=1");
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
    <div
      className="mt-6 flex flex-col items-center gap-3"
      data-owner={isOwner ? "true" : "false"}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={isSubmitting}
        className="inline-flex h-11 w-fit min-w-36 items-center justify-center gap-2 rounded-md bg-[#c94f45] px-5 text-sm font-bold text-white transition hover:bg-[#ad4138] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#dc2626] dark:hover:bg-[#b91c1c]"
      >
        <Icon name="flag" />
        {isSubmitting ? "処理中..." : "ミッションハント"}
      </button>

      {errorMessage ? (
        <p className="text-sm font-medium text-[#9a3e2d] dark:text-[#fca5a5]">{errorMessage}</p>
      ) : null}

      {isConfirmOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-[#08111f]/65 px-4 py-6"
        >
          <section className="w-full max-w-sm rounded-md border border-[#d8e0d9] bg-white p-5 shadow-xl dark:border-[#26364f] dark:bg-[#0f1b2d]">
            <h2 className="text-xl font-bold text-[#14231f] dark:text-[#e6edf7]">
              旅を終了しますか？
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#5d6a63] dark:text-[#93a4b8]">
              終了するとミッションハントに進みます。
            </p>
            {errorMessage ? (
              <p className="mt-4 rounded-md border border-[#efc9c1] bg-[#fff6f3] px-3 py-2 text-sm font-medium text-[#9a3e2d] dark:border-[#7f2a2a] dark:bg-[#351515] dark:text-[#fca5a5]">
                {errorMessage}
              </p>
            ) : null}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center justify-center rounded-md border border-[#cfd8d1] bg-white px-4 text-sm font-bold text-[#2e5149] transition hover:border-[#2f7d6b] hover:bg-[#eef5f1] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#26364f] dark:bg-[#0f1b2d] dark:text-[#dbeafe] dark:hover:border-[#38bdf8] dark:hover:bg-[#172033]"
              >
                いいえ
              </button>
              <button
                type="button"
                onClick={() => void submitLeave()}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center justify-center rounded-md bg-[#c94f45] px-4 text-sm font-bold text-white transition hover:bg-[#ad4138] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#dc2626] dark:hover:bg-[#b91c1c]"
              >
                {isSubmitting ? "処理中..." : "はい"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
