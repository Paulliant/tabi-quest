import { redirect } from "next/navigation";

import {
  AppHeader,
  AppShell,
  Badge,
  Icon,
  SectionHeader,
  StatTile,
} from "@/components/app-ui";
import ThemeToggleButton from "@/components/theme-toggle-button";
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
    <AppShell>
      <AppHeader>
        <ThemeToggleButton />
        <LogoutButton />
      </AppHeader>

      <div className="mx-auto flex min-h-[calc(100vh-76px)] w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid gap-4 rounded-md border border-[#d8e0d9] bg-white p-4 shadow-sm dark:border-[#26364f] dark:bg-[#0f1b2d] lg:grid-cols-[minmax(0,1.25fr)_repeat(3,minmax(180px,0.7fr))] lg:items-stretch">
          <div className="flex min-h-28 flex-col justify-center gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-[#2f7d6b] dark:text-[#38bdf8]">
                Current Journey
              </p>
              <h1 className="mt-2 text-3xl font-bold leading-tight text-[#14231f] dark:text-[#e6edf7]">
                {trip ? trip.trip_name : "まだ旅に参加していません"}
              </h1>
              {trip ? (
                <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-[#d8e0d9] bg-[#fbfcf8] px-3 py-2 text-sm font-semibold text-[#38574f] dark:border-[#26364f] dark:bg-[#0b1626] dark:text-[#dbeafe]">
                  <Icon name="map" className="h-4 w-4" />
                  <span>旅 ID:</span>
                  <span className="font-mono text-xs">
                    {formatTripCode(trip.trip_code)}
                  </span>
                </p>
              ) : (
                <p className="mt-3 max-w-xl text-sm leading-6 text-[#5d6a63] dark:text-[#93a4b8]">
                  新しい旅を作成するか、旅 ID を入力して既存の旅に参加してください。
                </p>
              )}
            </div>
          </div>

          <StatTile
            label="プレイヤー"
            value={profile.display_name}
            detail={`@${profile.username}・参加中`}
            icon="user"
            tone="green"
          />
          <StatTile
            label="現在スコア"
            value={trip ? myRanking?.points ?? 0 : "--"}
            detail={
              trip && myRankingPosition
                ? `${myRankingPosition}位 / ${ranking.length}人`
                : "旅に参加すると表示"
            }
            icon="medal"
            tone="amber"
          />
          <StatTile
            label="進行状況"
            value={trip ? `${completedCount}/${missions.length}` : "--"}
            detail={trip ? `獲得可能 ${totalPoints} pt` : "旅に参加すると表示"}
            icon="target"
            tone="blue"
          />
        </section>

        {trip ? (
          <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-md border border-[#d8e0d9] bg-white p-4 shadow-sm dark:border-[#26364f] dark:bg-[#0f1b2d] sm:p-6">
              <SectionHeader
                eyebrow="Mission List"
                title="今日のミッション"
                description="共通ミッションと極秘ミッションを達成してポイントを獲得"
              />

              <div className="mt-5 grid gap-4">
                {missions.length > 0 ? missions.map((mission) => (
                  <article
                    key={mission.id}
                    className="grid gap-4 rounded-md border border-[#e0e6df] bg-[#fbfcf8] p-4 dark:border-[#26364f] dark:bg-[#0b1626] sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="mr-1 text-lg font-bold text-[#14231f] dark:text-[#e6edf7]">
                          {mission.mission_name}
                        </h3>
                        <Badge tone={mission.access === 1 ? "dark" : "green"}>
                          {getAccessLabel(mission.access)}
                        </Badge>
                        <Badge tone="blue">{getMissionTypeLabel(mission)}</Badge>
                      </div>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5d6a63] dark:text-[#93a4b8]">
                        {mission.mission_description}
                      </p>
                      <p className="mt-3 inline-flex items-center gap-2 text-base font-bold text-[#2f7d6b] dark:text-[#2dd4bf]">
                        <Icon name="spark" className="h-4 w-4" />
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
                  <div className="rounded-md border border-[#e0e6df] bg-[#fbfcf8] p-5 dark:border-[#26364f] dark:bg-[#0b1626]">
                    <p className="font-bold text-[#14231f] dark:text-[#e6edf7]">
                      まだミッションがありません
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#5d6a63] dark:text-[#93a4b8]">
                      旅を作成または参加すると、固定ミッションが自動で作成されます。
                    </p>
                  </div>
                )}
              </div>
            </section>

            <aside className="rounded-md border border-[#d8e0d9] bg-white p-4 shadow-sm dark:border-[#26364f] dark:bg-[#0f1b2d] sm:p-6">
              <SectionHeader
                eyebrow="Ranking"
                title="ランキング"
                description="スコアが高い順に表示中"
              />

              <ol className="mt-5 grid gap-3">
                {ranking.map((user, index) => (
                  <li
                    key={user.user_id}
                    className={`grid min-h-16 grid-cols-[44px_1fr_auto] items-center gap-3 rounded-md border p-3 ${
                      user.is_me
                        ? "border-[#88b9a7] bg-[#eef6f1] dark:border-[#2563eb] dark:bg-[#102a56]"
                        : "border-[#e0e6df] bg-[#fbfcf8] dark:border-[#26364f] dark:bg-[#0b1626]"
                    }`}
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-md bg-white text-base font-bold text-[#2f7d6b] dark:bg-[#0f1b2d] dark:text-[#2dd4bf]">
                      {rankingPositions[index]}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#14231f] dark:text-[#e6edf7]">
                        {user.display_name}
                        {user.is_me ? "（自分）" : ""}
                      </p>
                      <p className="text-xs text-[#5d6a63] dark:text-[#93a4b8]">
                        完了 {user.completed_missions} 件
                      </p>
                    </div>
                    <p className="text-lg font-bold text-[#14231f] dark:text-[#e6edf7]">
                      {user.points}
                      <span className="ml-1 text-xs text-[#5d6a63] dark:text-[#93a4b8]">pt</span>
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
    </AppShell>
  );
}
