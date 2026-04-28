import { redirect } from "next/navigation";

import LogoutButton from "@/components/logout-button";
import SettlementFinishButton from "@/components/settlement-finish-button";
import {
  getCurrentProfileFromCookies,
  getMissionsForTripUser,
  getPendingSettlementForUser,
  getSettlementRankingForUser,
  type MissionAccess,
  type MissionProcess,
} from "@/lib/supabase";

function getAccessLabel(access: MissionAccess) {
  return access === 1 ? "極秘" : "共通";
}

function getProcessLabel(process: MissionProcess) {
  return process === 2 ? "完了" : "未完了";
}

export default async function SettlementPage() {
  const profile = await getCurrentProfileFromCookies();

  if (!profile) {
    redirect("/login");
  }

  const pendingSettlement = await getPendingSettlementForUser(profile.id);

  if (!pendingSettlement) {
    redirect("/");
  }

  const [missions, rankingResult] = await Promise.all([
    getMissionsForTripUser({
      tripId: pendingSettlement.trip.id,
      userId: profile.id,
    }),
    getSettlementRankingForUser(profile.id),
  ]);
  const ranking = rankingResult.ranking;
  const completedMissions = missions.filter((mission) => mission.process === 2);
  const completedCount = completedMissions.length;
  const totalPoints = completedMissions.reduce(
    (sum, mission) => sum + mission.point,
    0,
  );

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
        <section className="rounded-lg border border-[#d9ddd0] bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold text-[#4f7668]">Trip Summary</p>
          <h1 className="mt-2 text-3xl font-bold">
            {pendingSettlement.trip.trip_name} の終了画面
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#59645f]">
            {profile.display_name} さんの達成状況と、旅メンバーのランキングです。
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-[#eef4ed] p-4">
              <p className="text-xs font-semibold text-[#607068]">プレイヤー</p>
              <p className="mt-1 text-lg font-bold">{profile.display_name}</p>
              <p className="mt-1 text-sm text-[#59645f]">@{profile.username}</p>
            </div>
            <div className="rounded-lg bg-[#f4f1e7] p-4">
              <p className="text-xs font-semibold text-[#766b4f]">完了タスク</p>
              <p className="mt-1 text-3xl font-bold">
                {completedCount}/{missions.length}
              </p>
            </div>
            <div className="rounded-lg bg-[#edf1f6] p-4">
              <p className="text-xs font-semibold text-[#53677b]">獲得ポイント</p>
              <p className="mt-1 text-3xl font-bold">{totalPoints}</p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-lg border border-[#d9ddd0] bg-white p-4 shadow-sm sm:p-6">
            <div className="border-b border-[#e3e6dc] pb-4">
              <p className="text-sm font-semibold text-[#4f7668]">Tasks</p>
              <h2 className="text-2xl font-bold tracking-normal">
                タスク一覧とコンプリート状況
              </h2>
            </div>

            <div className="mt-5 grid gap-4">
              {missions.map((mission) => (
                <article
                  key={mission.id}
                  className="rounded-lg border border-[#e1e4db] bg-[#fbfcf8] p-4"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-bold">
                      {mission.mission_name}
                    </h3>
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                        mission.access === 1
                          ? "bg-[#2f3432] text-white"
                          : "bg-[#dce9df] text-[#285847]"
                      }`}
                    >
                      {getAccessLabel(mission.access)}
                    </span>
                    <span
                      className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                        mission.process === 2
                          ? "bg-[#dce9df] text-[#285847]"
                          : "bg-[#f4f1e7] text-[#766b4f]"
                      }`}
                    >
                      {getProcessLabel(mission.process)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#59645f]">
                    {mission.mission_description}
                  </p>
                  <p className="mt-3 text-base font-bold text-[#315f52]">
                    {mission.point} pt
                  </p>
                </article>
              ))}
            </div>
          </section>

          <aside className="rounded-lg border border-[#d9ddd0] bg-white p-4 shadow-sm sm:p-6">
            <div className="border-b border-[#e3e6dc] pb-4">
              <p className="text-sm font-semibold text-[#4f7668]">Ranking</p>
              <h2 className="text-2xl font-bold tracking-normal">
                最終ランキング
              </h2>
            </div>

            <ol className="mt-5 grid gap-3">
              {ranking.map((user, index) => (
                <li
                  key={user.user_id}
                  className={`grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-lg border p-3 ${
                    user.is_me
                      ? "border-[#79a894] bg-[#edf6f1]"
                      : "border-[#e1e4db] bg-[#fbfcf8]"
                  }`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-base font-bold text-[#315f52]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-bold">
                      {user.display_name}
                      {user.is_me ? "（自分）" : ""}
                    </p>
                    <p className="text-xs text-[#59645f]">
                      完了 {user.completed_missions} 件
                    </p>
                  </div>
                  <p className="text-lg font-bold text-[#17211f]">
                    {user.points}
                    <span className="ml-1 text-xs text-[#59645f]">pt</span>
                  </p>
                </li>
              ))}
            </ol>

            <SettlementFinishButton />
          </aside>
        </div>
      </div>
    </main>
  );
}
