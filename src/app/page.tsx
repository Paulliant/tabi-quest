import { redirect } from "next/navigation";

import MissionCompleteButton from "@/components/mission-complete-button";
import TripLeaveButton from "@/components/trip-leave-button";
import LogoutButton from "@/components/logout-button";
import TripEntryPanel from "@/components/trip-entry-panel";
import {
  getCurrentProfileFromCookies,
  getRankingForUser,
  getPendingSettlementForUser,
  listMissionsForUser,
  type Mission,
  type MissionAccess,
} from "@/lib/supabase";
import { buildCompetitionRanks } from "@/lib/ranking";

function formatTripCode(tripCode: string) {
  return `${tripCode.slice(0, 3)}-${tripCode.slice(3, 6)}-${tripCode.slice(6, 9)}`;
}

function getAccessLabel(access: MissionAccess) {
  return access === 1 ? "極秘" : "共通";
}

function getMissionTypeLabel(mission: Mission) {
  if (mission.mission_type === 1) {
    return "投票必要";
  }

  if (mission.mission_type === 2) {
    return "写真";
  }

  if (mission.mission_type === 3) {
    return "位置情報";
  }

  return "通常";
}

export default async function Home() {
  const profile = await getCurrentProfileFromCookies();

  if (!profile) {
    redirect("/login");
  }

  const pendingSettlement = await getPendingSettlementForUser(profile.id);

  if (pendingSettlement) {
    redirect("/settlement");
  }

  const [{ trip, missions }, rankingResult] = await Promise.all([
    listMissionsForUser(profile.id),
    getRankingForUser(profile.id),
  ]);
  const ranking = rankingResult.ranking;
  const rankingPositions = buildCompetitionRanks(ranking);
  const myRankingIndex = ranking.findIndex((user) => user.user_id === profile.id);
  const myRanking = myRankingIndex >= 0 ? ranking[myRankingIndex] : null;
  const myRankingPosition =
    myRankingIndex >= 0 ? rankingPositions[myRankingIndex] : null;
  const totalPoints = missions.reduce((sum, mission) => sum + mission.point, 0);
  const completedCount = missions.filter((mission) => mission.process === 2).length;

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

      <div className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid gap-4 rounded-lg border border-[#d9ddd0] bg-white p-4 shadow-sm sm:grid-cols-[1.1fr_0.9fr_0.8fr_0.8fr] sm:items-center">
          <div>
            <p className="text-sm font-semibold text-[#4f7668]">Current Journey</p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal text-[#17211f]">
              {trip ? trip.trip_name : "まだ旅に参加していません"}
            </h1>
            {trip ? (
              <p className="mt-3 text-sm font-semibold text-[#315f52]">
                旅 ID:{" "}
                <span className="font-mono text-xs text-[#59645f]">
                  {formatTripCode(trip.trip_code)}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-[#59645f]">
                新しい旅を作成するか、旅 ID を入力して既存の旅に参加してください。
              </p>
            )}
          </div>

          <div className="rounded-lg bg-[#eef4ed] p-4">
            <p className="text-xs font-semibold text-[#607068]">プレイヤー</p>
            <p className="mt-1 text-lg font-bold">{profile.display_name}</p>
            <p className="mt-1 text-sm text-[#59645f]">
              @{profile.username}・参加中
            </p>
          </div>

          <div className="rounded-lg bg-[#f4f1e7] p-4">
            <p className="text-xs font-semibold text-[#766b4f]">現在スコア</p>
            <p className="mt-1 text-3xl font-bold">
              {trip ? myRanking?.points ?? 0 : "--"}
            </p>
            <p className="mt-1 text-sm text-[#665f50]">
              {trip && myRankingPosition
                ? `${myRankingPosition}位 / ${ranking.length}人`
                : "旅に参加すると表示"}
            </p>
          </div>

          <div className="rounded-lg bg-[#edf1f6] p-4">
            <p className="text-xs font-semibold text-[#53677b]">進行状況</p>
            <p className="mt-1 text-3xl font-bold">
              {trip ? `${completedCount}/${missions.length}` : "--"}
            </p>
            <p className="mt-1 text-sm text-[#59645f]">
              {trip ? `獲得可能 ${totalPoints} pt` : "旅に参加すると表示"}
            </p>
          </div>
        </section>

        {trip ? (
          <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-lg border border-[#d9ddd0] bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-2 border-b border-[#e3e6dc] pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#4f7668]">
                    Mission List
                  </p>
                  <h2 className="text-2xl font-bold tracking-normal">
                    今日のミッション
                  </h2>
                </div>
                <p className="text-sm text-[#59645f]">
                  共通ミッションと極秘ミッションを達成してポイントを獲得
                </p>
              </div>

              <div className="mt-5 grid gap-4">
                {missions.length > 0 ? missions.map((mission) => (
                  <article
                    key={mission.id}
                    className="grid gap-4 rounded-lg border border-[#e1e4db] bg-[#fbfcf8] p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
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
                        <span className="rounded-md bg-[#edf1f6] px-2.5 py-1 text-xs font-bold text-[#53677b]">
                          {getMissionTypeLabel(mission)}
                        </span>
                      </div>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#59645f]">
                        {mission.mission_description}
                      </p>
                      <p className="mt-3 text-base font-bold text-[#315f52]">
                        {mission.point} pt
                      </p>
                    </div>

                    <MissionCompleteButton
                      missionId={String(mission.id)}
                      process={mission.process}
                      missionType={mission.mission_type}
                    />
                  </article>
                )) : (
                  <div className="rounded-lg border border-[#e1e4db] bg-[#fbfcf8] p-5">
                    <p className="font-bold text-[#17211f]">
                      まだミッションがありません
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#59645f]">
                      旅を作成または参加すると、固定ミッションが自動で作成されます。
                    </p>
                  </div>
                )}
              </div>
            </section>

            <aside className="rounded-lg border border-[#d9ddd0] bg-white p-4 shadow-sm sm:p-6">
              <div className="border-b border-[#e3e6dc] pb-4">
                <p className="text-sm font-semibold text-[#4f7668]">Ranking</p>
                <h2 className="text-2xl font-bold tracking-normal">
                  フレンドランキング
                </h2>
                <p className="mt-2 text-sm text-[#59645f]">
                  スコアが高い順に表示中
                </p>
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
                      {rankingPositions[index]}
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

              <TripLeaveButton isOwner={trip.owner_user_id === profile.id} />
            </aside>
          </div>
        ) : (
          <TripEntryPanel />
        )}
      </div>
    </main>
  );
}
