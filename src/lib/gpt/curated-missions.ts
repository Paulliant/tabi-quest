export type CuratedMission = {
  missionName: string;
  description: string;
  points?: number;
  clearMethod?: string; // "0"=instant, "1"=vote, "2"=photo-vote
  // tags help decide whether mission is suitable for common/secret and for UI hints
  tags?: string[];
};

const COMMON_CURATED_MISSIONS: CuratedMission[] = [
  {
    missionName: "美味しいものを見つけよう",
    description:
      "今いる場所の近くで、一番美味しそうな料理やスナックを見つけて写真を撮って共有してください。みんなの投票で一番支持を集めた人が優勝です。",
    points: 40,
    clearMethod: "2",
    tags: ["food", "photo", "vote"],
  },
  {
    missionName: "一番大きな数字を探せ",
    description:
      "街で見つかる数字（看板や表示など）のうち、一番大きな数字を見つけて写真を撮ってください。もっとも大きな数字を見つけた人が優勝です。",
    points: 30,
    clearMethod: "2",
    tags: ["photo", "explore"],
  },
  {
    missionName: "季節の1枚を撮る",
    description:
      "季節感のあるもの（桜、紅葉、雪、花、空など）を撮影して共有してください。みんなの投票で一番エモい写真として支持を集めた人が優勝です。",
    points: 30,
    clearMethod: "2",
    tags: ["photo", "seasonal"],
  },
  {
    missionName: "カタカナ禁止ゲーム",
    description:
      "このお題が出たら、会話をする中で、カタカナを言ったら脱落です。他の人も脱落させるように頑張りましょう！最後まで言わなかった人だけが完了ボタンを押してください。",
    points: 30,
    clearMethod: "0",
    tags: ["social", "fun"],
  },
  {
    missionName: "謎の被写体ハンター",
    description:
      "街中にある「なんでこれ作ったん？」「どういう状況？」と思うような変な看板やオブジェを見つけて写真を撮ってください。一番変な写真として支持を集めた人が優勝です。",
    points: 40,
    clearMethod: "2",
    tags: ["photo", "explore", "vote"],
  },
  {
    missionName: "擬態写真選手権",
    description:
      "風景に溶け込んでいるように見える写真や、顔に見えるモノなど、錯覚を利用した面白い写真を撮ってください。一番発想が豊かな写真として支持を集めた人が優勝です。",
    points: 40,
    clearMethod: "2",
    tags: ["photo", "creative"],
  },
];

const SECRET_CURATED_MISSIONS: CuratedMission[] = [
  {
    missionName: "しりとり縛り",
    description:
      "その場で自分だけ、直前の人の発言の最後の一文字から始まる言葉で返事をしてみてください。5回連続で成功できたら完了です。",
    points: 35,
    clearMethod: "0",
    tags: ["stealth", "language"],
  },
  {
    missionName: "セルフ語尾チェンジ",
    description:
      "『〜っす』『〜じゃん』など、普段自分が使わない語尾を心の中で1つ決めて、こっそり会話に混ぜてください。5回連続使えたら成功です。",
    points: 30,
    clearMethod: "0",
    tags: ["stealth", "roleplay"],
  },
  {
    missionName: "一人称チェンジ作戦",
    description:
      "一人称を変えて次の目的地まで演じきる（例：急に『僕』から『私』に変える）。",
    points: 30,
    clearMethod: "0",
    tags: ["stealth", "roleplay"],
  },
  {
    missionName: "こっそりツーショット",
    description:
      "メンバーの中からターゲットを心の中で1人決め、背後などから一緒に写った自撮り写真を撮ったら成功です。",
    points: 40,
    clearMethod: "0",
    tags: ["stealth", "photo"],
  },
  {
    missionName: "自然な誘導ミッション",
    description:
      "自分が気になったお店や場所に、「あそこ面白そうじゃない？」などと自然に声をかけて、誘導できたらクリアです。",
    points: 35,
    clearMethod: "0",
    tags: ["stealth", "lead"],
  },
 {
    missionName: "「季節限定」の飲み物を飲む",
    description:
      "「季節限定」,「期間限定」と書かれている飲みものを飲む。完飲できたらクリア。",
    points: 35,
    clearMethod: "0",
    tags: ["stealth", "drink"],
  },
 {
    missionName: "間違えて動画を撮る",
    description:
      "みんなの写真をセルフィーで撮る時に間違えて動画を回す。",
    points: 40,
    clearMethod: "0",
    tags: ["stealth", "lead"],
  },
{
  missionName: "他の人の写真に写り込む",
  description: "誰かが風景や食べ物の写真を撮っている時に、その人のスマホの画面内にこっそりピースなどで写り込んでください。写りこめたら大成功です。", 
  points: 50,
  clearMethod: "0",
  tags: ["stealth", "photo", "challenge"], }
];


function djb2Hash(str: string) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash >>> 0);
}

export function selectCuratedMission(mode: "common" | "secret", seed: string) {
  const list = mode === "secret" ? SECRET_CURATED_MISSIONS : COMMON_CURATED_MISSIONS;
  if (list.length === 0) return null;
  const idx = djb2Hash(seed) % list.length;
  return list[idx];
}

export default {
  selectCuratedMission,
};
