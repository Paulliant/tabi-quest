"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Icon, LoadingOverlay, SectionHeader } from "@/components/app-ui";

export default function TripEntryPanel() {
  const router = useRouter();
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [joinTripCode, setJoinTripCode] = useState("");
  const [createError, setCreateError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  async function handleCreateTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError("");
    setIsCreating(true);

    try {
      const response = await fetch("/api/trips/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tripName: createName,
          tripDescription: createDescription,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "trip の作成に失敗しました。");
      }

      router.refresh();
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "trip の作成に失敗しました。",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleJoinTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJoinError("");
    setIsJoining(true);

    try {
      const response = await fetch("/api/trips/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tripCode: joinTripCode,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "trip への参加に失敗しました。");
      }

      router.refresh();
    } catch (error) {
      setJoinError(
        error instanceof Error ? error.message : "trip への参加に失敗しました。",
      );
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {isCreating ? (
        <LoadingOverlay label="AIが旅のミッションを生成中..." />
      ) : null}

      <section className="flex min-h-96 flex-col rounded-md border border-[#d8e0d9] bg-white p-5 shadow-sm dark:border-[#26364f] dark:bg-[#0f1b2d] sm:p-6">
        <SectionHeader
          eyebrow="Create Journey"
          title="新しい旅"
          description="旅の名前と説明を入力すると、新しい旅を開始できます。"
        />

        <form onSubmit={handleCreateTrip} className="mt-5 flex flex-1 flex-col gap-4">
          <label className="grid gap-2 text-sm font-semibold text-[#24312d] dark:text-[#e6edf7]">
            旅の名前
            <input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              className="h-11 rounded-md border border-[#cfd8d1] bg-[#fbfcf8] px-3 text-base outline-none transition focus:border-[#2f7d6b] focus:ring-3 focus:ring-[#2f7d6b]/15 dark:border-[#26364f] dark:bg-[#0b1626] dark:text-[#e6edf7] dark:placeholder:text-[#64748b] dark:focus:border-[#38bdf8] dark:focus:ring-[#38bdf8]/15"
              placeholder="旅の名前を入力"
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[#24312d] dark:text-[#e6edf7]">
            旅の説明
            <textarea
              value={createDescription}
              onChange={(event) => setCreateDescription(event.target.value)}
              className="min-h-32 rounded-md border border-[#cfd8d1] bg-[#fbfcf8] px-3 py-3 text-base outline-none transition focus:border-[#2f7d6b] focus:ring-3 focus:ring-[#2f7d6b]/15 dark:border-[#26364f] dark:bg-[#0b1626] dark:text-[#e6edf7] dark:placeholder:text-[#64748b] dark:focus:border-[#38bdf8] dark:focus:ring-[#38bdf8]/15"
              placeholder="旅の説明を入力"
              required
            />
          </label>

          {createError ? (
            <p className="rounded-md border border-[#efc9c1] bg-[#fff6f3] px-3 py-2 text-sm font-medium text-[#9a3e2d]">
              {createError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isCreating}
            className="mt-auto inline-flex h-11 w-fit min-w-36 items-center justify-center gap-2 self-center rounded-md bg-[#2f7d6b] px-5 text-sm font-bold text-white transition hover:bg-[#276452] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#0ea5e9] dark:hover:bg-[#0284c7]"
          >
            <Icon name="flag" />
            {isCreating ? "作成中..." : "旅を作成"}
          </button>
        </form>
      </section>

      <section className="flex min-h-96 flex-col rounded-md border border-[#d8e0d9] bg-white p-5 shadow-sm dark:border-[#26364f] dark:bg-[#0f1b2d] sm:p-6">
        <SectionHeader
          eyebrow="Join Journey"
          title="旅に参加"
          description="招待された旅 ID を入力すると、既存の旅に参加できます。"
        />

        <form onSubmit={handleJoinTrip} className="mt-5 flex flex-1 flex-col gap-4">
          <label className="grid gap-2 text-sm font-semibold text-[#24312d] dark:text-[#e6edf7]">
            旅 ID
            <input
              value={joinTripCode}
              onChange={(event) => setJoinTripCode(event.target.value)}
              className="h-11 rounded-md border border-[#cfd8d1] bg-[#fbfcf8] px-3 text-base outline-none transition focus:border-[#2f7d6b] focus:ring-3 focus:ring-[#2f7d6b]/15 dark:border-[#26364f] dark:bg-[#0b1626] dark:text-[#e6edf7] dark:placeholder:text-[#64748b] dark:focus:border-[#38bdf8] dark:focus:ring-[#38bdf8]/15"
              placeholder="123-456-789"
              required
            />
          </label>

          {joinError ? (
            <p className="rounded-md border border-[#efc9c1] bg-[#fff6f3] px-3 py-2 text-sm font-medium text-[#9a3e2d]">
              {joinError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isJoining}
            className="mt-auto inline-flex h-11 w-fit min-w-36 items-center justify-center gap-2 self-center rounded-md bg-[#315f9a] px-5 text-sm font-bold text-white transition hover:bg-[#294f80] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#2563eb] dark:hover:bg-[#1d4ed8]"
          >
            <Icon name="join" />
            {isJoining ? "参加中..." : "旅に参加"}
          </button>
        </form>
      </section>
    </div>
  );
}
