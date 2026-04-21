import { redirect } from "next/navigation";

import LogoutButton from "@/components/logout-button";
import { getCurrentProfileFromCookies } from "@/lib/supabase";

type Mission = {
  title: string;
  type: "共通" | "極秘";
  description: string;
  points: number;
  completed?: boolean;
};

type RankingUser = {
  name: string;
  points: number;
  isMe?: boolean;
};

const missions: Mission[] = [
  {
    title: "朝市で一番人気を聞く",
    type: "共通",
    description:
      "地元の人におすすめを聞き、グループチャットに写真と一言メモを投稿する。",
    points: 120,
  },
  {
    title: "橋の上で集合写真",
    type: "共通",
    description:
      "全員が写る写真を撮影する。背景に旅先らしい景色が入っていれば追加評価。",
    points: 180,
    completed: true,
  },
  {
    title: "誰かを自然に褒める",
    type: "極秘",
    description:
      "自分のミッションだと気づかれないように、旅の途中で仲間を一度だけ褒める。",
    points: 220,
  },
  {
    title: "知らない路地を提案する",
    type: "極秘",
    description:
      "安全な範囲で、予定にない道を一つ提案する。採用されたら達成。",
    points: 260,
  },
];

const rankingBase: RankingUser[] = [
  { name: "美咲", points: 920 },
  { name: "", points: 840, isMe: true },
  { name: "悠斗", points: 780 },
  { name: "莉子", points: 710 },
  { name: "健太", points: 640 },
];

export default async function Home() {
  const profile = await getCurrentProfileFromCookies();

  if (!profile) {
    redirect("/login");
  }

  const totalPoints = missions.reduce((sum, mission) => sum + mission.points, 0);
  const completedCount = missions.filter((mission) => mission.completed).length;
  const ranking = rankingBase
    .map((user) =>
      user.isMe ? { ...user, name: profile.display_name } : user,
    )
    .sort((a, b) => b.points - a.points);

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
            <p className="text-sm font-semibold text-[#4f7668]">Current Trip</p>
            <h1 className="mt-1 text-2xl font-bold tracking-normal text-[#17211f]">
              京都週末トリップ
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#59645f]">
              旅先でミッションを達成して、仲間とスコアを競い合おう！
            </p>
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
            <p className="mt-1 text-3xl font-bold">840</p>
            <p className="mt-1 text-sm text-[#665f50]">2位 / 5人</p>
          </div>

          <div className="rounded-lg bg-[#edf1f6] p-4">
            <p className="text-xs font-semibold text-[#53677b]">進行状況</p>
            <p className="mt-1 text-3xl font-bold">
              {completedCount}/{missions.length}
            </p>
            <p className="mt-1 text-sm text-[#59645f]">
              獲得可能 {totalPoints} pt
            </p>
          </div>
        </section>

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
              {missions.map((mission) => (
                <article
                  key={mission.title}
                  className="grid gap-4 rounded-lg border border-[#e1e4db] bg-[#fbfcf8] p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-bold">{mission.title}</h3>
                      <span
                        className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                          mission.type === "極秘"
                            ? "bg-[#2f3432] text-white"
                            : "bg-[#dce9df] text-[#285847]"
                        }`}
                      >
                        {mission.type}
                      </span>
                    </div>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-[#59645f]">
                      {mission.description}
                    </p>
                    <p className="mt-3 text-base font-bold text-[#315f52]">
                      {mission.points} pt
                    </p>
                  </div>

                  <button
                    type="button"
                    className={`h-11 rounded-md px-5 text-sm font-bold transition ${
                      mission.completed
                        ? "bg-[#d7ddd2] text-[#536057]"
                        : "bg-[#236b5b] text-white hover:bg-[#1c5649]"
                    }`}
                  >
                    {mission.completed ? "完了済み" : "完了する"}
                  </button>
                </article>
              ))}
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
                  key={`${user.name}-${index}`}
                  className={`grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-lg border p-3 ${
                    user.isMe
                      ? "border-[#79a894] bg-[#edf6f1]"
                      : "border-[#e1e4db] bg-[#fbfcf8]"
                  }`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-base font-bold text-[#315f52]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-bold">
                      {user.name}
                      {user.isMe ? "（自分）" : ""}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-[#17211f]">
                    {user.points}
                    <span className="ml-1 text-xs text-[#59645f]">pt</span>
                  </p>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                className="h-11 rounded-md bg-[#c74545] px-5 text-sm font-bold text-white transition hover:bg-[#ac3939]"
              >
                グループを退出
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
