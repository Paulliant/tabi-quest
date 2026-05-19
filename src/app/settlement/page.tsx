import { redirect } from "next/navigation";

import {
  AppHeader,
  AppShell,
  Badge,
  Icon,
  SectionHeader,
  StatTile,
} from "@/components/app-ui";
import LogoutButton from "@/components/logout-button";
import SettlementFinishButton from "@/components/settlement-finish-button";
import ThemeToggleButton from "@/components/theme-toggle-button";
import { buildCompetitionRanks } from "@/lib/ranking";
import {
  getCurrentProfileFromCookies,
  getMissionsForTripUser,
  getPendingSettlementForUser,
  getSettlementRankingForUser,
  parseMissionAdditional,
  type MissionAccess,
  type MissionProcess,
} from "@/lib/supabase";

function formatTripCode(tripCode: string) {
  return `${tripCode.slice(0, 3)}-${tripCode.slice(3, 6)}-${tripCode.slice(6, 9)}`;
}

function getAccessLabel(access: MissionAccess) {
  return access === 1 ? "極秘" : "共通";
}

function getProcessLabel(process: MissionProcess) {
  return process === 2 ? "完了" : "未完了";
}

function getMissionTypeLabel(missionType: number) {
  if (missionType === 1) {
    return "投票必要";
  }

  if (missionType === 2) {
    return "写真付き投票";
  }

  if (missionType === 3) {
    return "位置情報";
  }

  return "通常";
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
  const rankingPositions = buildCompetitionRanks(ranking);
  const completedMissions = missions.filter((mission) => mission.process === 2);
  const completedCount = completedMissions.length;
  const totalPoints = completedMissions.reduce((sum, mission) => {
    const isVoteMission =
      mission.mission_type === 1 || mission.mission_type === 2;
    const additional = parseMissionAdditional(mission.additional);

    if (
      isVoteMission &&
      typeof additional.vote_awarded_at !== "string"
    ) {
      return sum;
    }

    return sum + mission.point;
  }, 0);

  return (
    <AppShell>
      <AppHeader>
        <ThemeToggleButton />
        <LogoutButton />
      </AppHeader>

      <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <section className="grid gap-4 rounded-md border border-[#d8e0d9] bg-white p-4 shadow-sm dark:border-[#26364f] dark:bg-[#0f1b2d] lg:grid-cols-[minmax(0,1.25fr)_repeat(3,minmax(180px,0.7fr))] lg:items-stretch">
          <div className="flex min-h-28 flex-col justify-center gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-[#2f7d6b] dark:text-[#38bdf8]">
                Trip Summary
              </p>
              <h1 className="mt-2 text-3xl font-bold leading-tight text-[#14231f] dark:text-[#e6edf7]">
                {pendingSettlement.trip.trip_name}のまとめ
              </h1>
              <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-[#d8e0d9] bg-[#fbfcf8] px-3 py-2 text-sm font-semibold text-[#38574f] dark:border-[#26364f] dark:bg-[#0b1626] dark:text-[#dbeafe]">
                <Icon name="map" className="h-4 w-4" />
                <span>旅 ID:</span>
                <span className="font-mono text-xs">
                  {formatTripCode(pendingSettlement.trip.trip_code)}
                </span>
              </p>
            </div>
          </div>

          <StatTile
            label="プレイヤー"
            value={profile.display_name}
            icon="user"
            tone="green"
          />
          <StatTile
            label="現在スコア"
            value={totalPoints}
            icon="medal"
            tone="amber"
          />
          <StatTile
            label="進行状況"
            value={`${completedCount}/${missions.length}`}
            icon="target"
            tone="blue"
          />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-md border border-[#d8e0d9] bg-white p-4 shadow-sm dark:border-[#26364f] dark:bg-[#0f1b2d] sm:p-6">
            <SectionHeader
              eyebrow="Mission List"
              title="今回のミッション"
              description="達成状況をふりかえって今回の旅を終了"
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
                      <Badge tone="blue">
                        {getMissionTypeLabel(mission.mission_type)}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#5d6a63] dark:text-[#93a4b8]">
                      {mission.mission_description}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-2 text-base font-bold text-[#2f7d6b] dark:text-[#2dd4bf]">
                      <Icon name="spark" className="h-4 w-4" />
                      {mission.point} pt
                    </p>
                  </div>

                  <Badge tone={mission.process === 2 ? "muted" : "amber"}>
                    {getProcessLabel(mission.process)}
                  </Badge>
                </article>
              )) : (
                <div className="rounded-md border border-[#e0e6df] bg-[#fbfcf8] p-5 dark:border-[#26364f] dark:bg-[#0b1626]">
                  <p className="font-bold text-[#14231f] dark:text-[#e6edf7]">
                    表示できるミッションがありません
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

            <SettlementFinishButton />
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
