"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

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
      <section className="rounded-lg border border-[#d9ddd0] bg-white p-5 shadow-sm sm:p-6">
        <div className="border-b border-[#e3e6dc] pb-4">
          <p className="text-sm font-semibold text-[#4f7668]">Create Journey</p>
          <h2 className="text-2xl font-bold tracking-normal text-[#17211f]">
            新しい旅を作成
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#59645f]">
            旅の名前と説明を入力すると、自分がオーナーとして新しい旅を開始できます。
          </p>
        </div>

        <form onSubmit={handleCreateTrip} className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-[#24312d]">
            旅の名前
            <input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              className="h-11 rounded-md border border-[#cfd5ca] bg-[#fbfcf8] px-3 text-base outline-none transition focus:border-[#4f7668]"
              placeholder="旅の名前を入力"
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[#24312d]">
            旅の説明
            <textarea
              value={createDescription}
              onChange={(event) => setCreateDescription(event.target.value)}
              className="min-h-32 rounded-md border border-[#cfd5ca] bg-[#fbfcf8] px-3 py-3 text-base outline-none transition focus:border-[#4f7668]"
              placeholder="旅の説明を入力"
              required
            />
          </label>

          {createError ? (
            <p className="rounded-md border border-[#ebc8c1] bg-[#fff5f3] px-3 py-2 text-sm text-[#9a3e2d]">
              {createError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isCreating}
            className="h-11 rounded-md bg-[#236b5b] text-sm font-bold text-white transition hover:bg-[#1c5649] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? "作成中..." : "旅を作成"}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-[#d9ddd0] bg-white p-5 shadow-sm sm:p-6">
        <div className="border-b border-[#e3e6dc] pb-4">
          <p className="text-sm font-semibold text-[#4f7668]">Join Journey</p>
          <h2 className="text-2xl font-bold tracking-normal text-[#17211f]">
            旅に参加
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#59645f]">
            招待された旅 ID を入力すると、既存の旅に参加できます。
          </p>
        </div>

        <form onSubmit={handleJoinTrip} className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold text-[#24312d]">
            旅 ID
            <input
              value={joinTripCode}
              onChange={(event) => setJoinTripCode(event.target.value)}
              className="h-11 rounded-md border border-[#cfd5ca] bg-[#fbfcf8] px-3 text-base outline-none transition focus:border-[#4f7668]"
              placeholder="123-456-789"
              required
            />
          </label>

          {joinError ? (
            <p className="rounded-md border border-[#ebc8c1] bg-[#fff5f3] px-3 py-2 text-sm text-[#9a3e2d]">
              {joinError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isJoining}
            className="h-11 rounded-md bg-[#315f9a] text-sm font-bold text-white transition hover:bg-[#294f80] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isJoining ? "参加中..." : "旅に参加"}
          </button>
        </form>
      </section>
    </div>
  );
}
