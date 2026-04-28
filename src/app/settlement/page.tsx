import { redirect } from "next/navigation";

import LogoutButton from "@/components/logout-button";
import SettlementFinishButton from "@/components/settlement-finish-button";
import {
  getCurrentProfileFromCookies,
  getPendingSettlementForUser,
} from "@/lib/supabase";

const completedTasks = [
  {
    title: "橋の上で集合写真",
    summary: "全員で撮影した旅の記念ショット。",
    points: 180,
  },
  {
    title: "朝市で一番人気を聞く",
    summary: "地元のおすすめを聞いて共有済み。",
    points: 120,
  },
  {
    title: "知らない路地を提案する",
    summary: "新しい寄り道ルートを提案して採用された。",
    points: 260,
  },
];

export default async function SettlementPage() {
  const profile = await getCurrentProfileFromCookies();

  if (!profile) {
    redirect("/login");
  }

  const pendingSettlement = await getPendingSettlementForUser(profile.id);

  if (!pendingSettlement) {
    redirect("/");
  }

  const totalPoints = completedTasks.reduce((sum, task) => sum + task.points, 0);

  return (
    <main className="min-h-screen bg-[#f7f8f3] text-[#18211f]">
      <header className="w-full bg-[#2f6a5d] text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="text-2xl font-bold">TabiQuest</p>
            <p className="text-sm text-white/85">
              旅先のひとときを、ミッションでもっと面白く。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="h-10 rounded-md border border-white/35 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              設定
            </button>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-[#d9ddd0] bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-[#4f7668]">Settlement</p>
          <h1 className="mt-2 text-3xl font-bold">
            {pendingSettlement.trip.trip_name} の結算
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#59645f]">
            {profile.display_name} さんが今回の旅で達成した内容です。確認後に終了してください。
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-[#eef4ed] p-4">
              <p className="text-xs font-semibold text-[#607068]">プレイヤー</p>
              <p className="mt-1 text-lg font-bold">{profile.display_name}</p>
              <p className="mt-1 text-sm text-[#59645f]">@{profile.username}</p>
            </div>
            <div className="rounded-lg bg-[#f4f1e7] p-4">
              <p className="text-xs font-semibold text-[#766b4f]">完了タスク</p>
              <p className="mt-1 text-3xl font-bold">{completedTasks.length}</p>
            </div>
            <div className="rounded-lg bg-[#edf1f6] p-4">
              <p className="text-xs font-semibold text-[#53677b]">合計ポイント</p>
              <p className="mt-1 text-3xl font-bold">{totalPoints}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4">
            {completedTasks.map((task) => (
              <article
                key={task.title}
                className="rounded-lg border border-[#e1e4db] bg-[#fbfcf8] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold">{task.title}</h2>
                  <p className="text-base font-bold text-[#315f52]">{task.points} pt</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#59645f]">
                  {task.summary}
                </p>
              </article>
            ))}
          </div>

          <SettlementFinishButton />
        </section>
      </div>
    </main>
  );
}
