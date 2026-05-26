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
      "近くで見つけられる料理やスナックを1つ見つけて写真を撮って共有してください。みんなの投票で一番支持を集めた人が優勝します。",
    points: 40,
    clearMethod: "1",
    tags: ["food", "photo", "vote"],
  },
  {
    missionName: "一番大きな数字を探せ",
    description:
      "街で見つかる数字（看板や表示）のうち、一番大きな数字を見つけて写真を撮ってください。ユニークさが勝負のポイントで、もっとも大きな数字を見つけた人が優勝します。",
    points: 30,
    clearMethod: "2",
    tags: ["photo", "explore"],
  },
  {
    missionName: "場所再現ショット",
    description:
      "指定された場所で、提示された見本とできるだけ同じ構図で写真を撮ってください。技術と観察力が試されます。見本に最も近い再現をした人が投票で選ばれて優勝します。",
    points: 50,
    clearMethod: "2",
    tags: ["photo", "challenge"],
  },
  {
    missionName: "ごはん探訪",
    description:
      "その場で食べられる料理を見つけて写真を撮り、コメントで味のポイントを共有してください。みんなの評価で一番支持された人が優勝します。",
    points: 40,
    clearMethod: "1",
    tags: ["food", "share", "vote"],
  },
  {
    missionName: "歩数チャレンジ",
    description:
      "合計で指定歩数（例: 5000歩）を達成して、体感と行動範囲を競えてください。先に歩数を達成した人が優勝します。",
    // instant type
    // note: points awarded on personal completion
    // (no changes to points property)
    points: 30,
    clearMethod: "0",
    tags: ["activity"],
  },
  {
    missionName: "季節の1枚を撮る",
    description:
      "季節感のあるもの（桜、紅葉、雪、花、空など）を撮影して共有してください。みんなの投票で一番支持を集めた写真が優勝します。",
    points: 30,
    clearMethod: "2",
    tags: ["photo", "seasonal"],
  },
  {
    missionName: "NGワード回避ゲーム",
    description:
      "指定されたNGワードを使わずに過ごし、最後まで成功した人が勝ちになります。会話の工夫で盛り上がります。",
    points: 30,
    clearMethod: "0",
    tags: ["social", "fun"],
  },
  {
    missionName: "ベストミール投票",
    description:
      "食べたものの中から一番美味しかった一品を選び、写真と短いレビューを共有してください。みんなの評価で一番支持を集めた人が優勝します。",
    points: 40,
    clearMethod: "1",
    tags: ["food", "vote"],
  },
  {
    missionName: "ペアショット10枚チャレンジ",
    description:
      "同じ相手と合計で写真を10枚撮ってください。最も早く指定枚数を達成したペアが優勝します。",
    points: 35,
    clearMethod: "0",
    tags: ["photo", "co-op"],
  },
  {
    missionName: "おでかけクイズマスター",
    description:
      "おでかけ中に1問クイズを出題して、正解数が最も多い人が優勝するルールで楽しんでください。",
    points: 30,
    clearMethod: "1",
    tags: ["game", "social"],
  },
];

const SECRET_CURATED_MISSIONS: CuratedMission[] = [
  {
    missionName: "しりとり縛り",
    description:
      "その場でしりとりだけで会話してみる（うまく続けられれば成功）。気付かれずに続ける工夫がスリルになります。最後まで続けられた人が優勝です。",
    points: 35,
    clearMethod: "0",
    tags: ["stealth", "language"],
  },
  {
    missionName: "語尾チェンジ",
    description:
      "指定の語尾（〜だぜ、〜ですわ 等）を使ってこっそり会話を続ける。バレないように工夫するのが面白さです。指定の時間内に最も自然に続けられた人が勝ちになります。",
    points: 30,
    clearMethod: "0",
    tags: ["stealth", "roleplay"],
  },
  {
    missionName: "一人称チェンジ作戦",
    description:
      "一人称を変えて一時的に演じきる（例：急に『僕』から『私』に変える）。気付かれないように振る舞おう。最も自然に演じ切れた人が優勝します。",
    points: 30,
    clearMethod: "0",
    tags: ["stealth", "roleplay"],
  },
  {
    missionName: "心の声をそっと残す",
    description:
      "自分の『心の声』を短いテキストで記録して共有。散策中の小さな発見を文字で残す楽しさがあります。最も共感を集めた投稿が優勝です。",
    points: 35,
    clearMethod: "0",
    tags: ["stealth", "creative"],
  },
  {
    missionName: "目立たぬお礼",
    description:
      "ささやかな感謝をそっと伝える（例：小さなメモや差し入れ）。静かに行う優しさが評価されます。もっとも心が温まった行動に票が集まった人が勝ちです。",
    points: 30,
    clearMethod: "0",
    tags: ["stealth", "kindness"],
  },
  {
    missionName: "密かなチャレンジ",
    description:
      "小さなミッション（例：指定された物を5分以内に見つける）をこっそり達成する。成功の快感が強い。もっとも早く達成した人が優勝します。",
    points: 35,
    clearMethod: "0",
    tags: ["stealth", "mini"],
  },
  {
    missionName: "写真密約",
    description:
      "指定したユーザーとだけ写真を数枚交換して協力する。協力して最も魅力的な写真を作れた人が優勝します。",
    points: 40,
    clearMethod: "2",
    tags: ["stealth", "photo"],
  },
  {
    missionName: "短時間歩数ミッション",
    description:
      "短時間で歩数ノルマをひっそりクリアする。達成感と静かな満足感が得られます。先にノルマを達成した人が勝ちです。",
    points: 30,
    clearMethod: "0",
    tags: ["stealth", "activity"],
  },
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
