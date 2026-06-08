import { games } from "@/src/data/games";
import { excludedSteamAppIds } from "@/src/data/excluded-games";
import { generatedGames } from "@/src/data/generated-games";
import type { Game } from "@/src/types/game";

export type MatchGamesAnswers = Partial<Record<string, string | string[]>>;

export type GameMatchResult = {
  game: Game;
  score: number;
  reasons: string[];
  conflicts: string[];
};

type AnswerFrequency = {
  count: number;
  ratio: number;
};

type AnswerStats = {
  totalPlayers: number;
  byKey: Record<string, Record<string, AnswerFrequency>>;
};

const TOP_RESULTS_LIMIT = 10;
const NOT_IMPORTANT_VALUE = "not_important";
const MAJORITY_RATIO = 0.5;

const MATCH_WEIGHTS = {
  format: 18,
  favoriteGenres: 24,
  favoriteMechanics: 18,
  gameVibe: 14,
  difficulty: 8,
  sessionLength: 8,
  budget: 8,
};

const DISLIKED_GENRE_MAX_PENALTY = 48;
const FORMAT_MISMATCH_MAX_PENALTY = 10;
const VIBE_MISMATCH_MAX_PENALTY = 18;
const availableGames = generatedGames.length > 0 ? generatedGames : games;
const excludedSteamAppIdSet = new Set(excludedSteamAppIds);

const TAG_LABELS: Record<string, string> = {
  base_building: "строительство баз",
  character_progression: "прокачку персонажа",
  chill: "чилловый вайб",
  co_op: "кооператив",
  competitive: "соревновательный вайб",
  crafting: "крафт",
  fun_and_chaotic: "веселый хаос",
  hardcore: "хардкорный вайб",
  horror: "хорроры",
  loot: "лут",
  pve: "PvE",
  pvp: "PvP",
  racing: "гонки",
  resource_management: "управление ресурсами",
  rpg: "RPG",
  sandbox: "песочницы",
  shooter: "шутеры",
  simulator: "симуляторы",
  strategy: "стратегии",
  survival: "выживание",
  teamwork: "командную работу",
  tense: "напряженный вайб",
  world_exploration: "исследование мира",
};

const VIBE_CONFLICTS: Record<string, string[]> = {
  chill: ["hardcore", "tense", "competitive"],
  competitive: ["chill"],
  hardcore: ["chill"],
  tense: ["chill"],
};

export function matchGames(answers: MatchGamesAnswers): GameMatchResult[] {
  const answerStats = buildAnswerStats(answers);
  const matchableGames = availableGames.filter(
    (game) => !excludedSteamAppIdSet.has(game.steamAppId),
  );

  return matchableGames
    .map((game) => scoreGame(game, answerStats))
    .sort((left, right) => right.score - left.score)
    .slice(0, TOP_RESULTS_LIMIT);
}

function scoreGame(game: Game, answerStats: AnswerStats): GameMatchResult {
  const reasons: string[] = [];
  const conflicts: string[] = [];
  let score = 0;
  let maxScore = 0;
  let penalty = 0;

  const formatResult = scoreFormat(game, answerStats);
  score += formatResult.score;
  maxScore += formatResult.maxScore;
  penalty += formatResult.penalty;
  reasons.push(...formatResult.reasons);
  conflicts.push(...formatResult.conflicts);

  const favoriteGenresResult = scoreWeightedTags(
    game,
    answerStats,
    "favorite_genres",
    MATCH_WEIGHTS.favoriteGenres,
    "любят",
  );
  score += favoriteGenresResult.score;
  maxScore += favoriteGenresResult.maxScore;
  reasons.push(...favoriteGenresResult.reasons);

  const favoriteMechanicsResult = scoreWeightedTags(
    game,
    answerStats,
    "favorite_mechanics",
    MATCH_WEIGHTS.favoriteMechanics,
    "выбрали",
  );
  score += favoriteMechanicsResult.score;
  maxScore += favoriteMechanicsResult.maxScore;
  reasons.push(...favoriteMechanicsResult.reasons);

  const vibeResult = scoreGameVibe(game, answerStats);
  score += vibeResult.score;
  maxScore += vibeResult.maxScore;
  penalty += vibeResult.penalty;
  reasons.push(...vibeResult.reasons);
  conflicts.push(...vibeResult.conflicts);

  const difficultyResult = scoreSingleProperty(
    game.difficulty,
    answerStats,
    "difficulty",
    MATCH_WEIGHTS.difficulty,
    "игроков выбрали эту сложность",
  );
  score += difficultyResult.score;
  maxScore += difficultyResult.maxScore;
  reasons.push(...difficultyResult.reasons);

  const sessionLengthResult = scoreSingleProperty(
    normalizeSessionLength(game.sessionLength),
    answerStats,
    "session_length",
    MATCH_WEIGHTS.sessionLength,
    "игроков выбрали такую длину сессии",
  );
  score += sessionLengthResult.score;
  maxScore += sessionLengthResult.maxScore;
  reasons.push(...sessionLengthResult.reasons);

  const budgetResult = scoreBudget(game, answerStats);
  score += budgetResult.score;
  maxScore += budgetResult.maxScore;
  penalty += budgetResult.penalty;
  reasons.push(...budgetResult.reasons);
  conflicts.push(...budgetResult.conflicts);

  const dislikedGenresResult = scoreDislikedGenres(game, answerStats);
  penalty += dislikedGenresResult.penalty;
  conflicts.push(...dislikedGenresResult.conflicts);

  const normalizedScore = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const finalScore = clampScore(Math.round(normalizedScore - penalty));

  return {
    game,
    score: finalScore,
    reasons: reasons.slice(0, 4),
    conflicts: conflicts.slice(0, 4),
  };
}

function buildAnswerStats(answers: MatchGamesAnswers): AnswerStats {
  const byKey: AnswerStats["byKey"] = {};

  for (const [key, value] of Object.entries(answers)) {
    const values = normalizeAnswerValue(value).filter(isMeaningfulAnswer);
    const counts: Record<string, number> = {};

    for (const answerValue of values) {
      counts[answerValue] = (counts[answerValue] ?? 0) + 1;
    }

    byKey[key] = Object.fromEntries(
      Object.entries(counts).map(([answerValue, count]) => [
        answerValue,
        { count, ratio: 0 },
      ]),
    );
  }

  const totalPlayers = inferTotalPlayers(answers, byKey);

  for (const answersByValue of Object.values(byKey)) {
    for (const answer of Object.values(answersByValue)) {
      answer.ratio = totalPlayers > 0 ? answer.count / totalPlayers : 0;
    }
  }

  return { totalPlayers, byKey };
}

function inferTotalPlayers(
  answers: MatchGamesAnswers,
  byKey: AnswerStats["byKey"],
) {
  const singleAnswerKeys = [
    "format",
    "game_vibe",
    "difficulty",
    "session_length",
    "budget",
  ];
  const singleAnswerCount = Math.max(
    0,
    ...singleAnswerKeys.map((key) => normalizeAnswerValue(answers[key]).length),
  );

  if (singleAnswerCount > 0) {
    return singleAnswerCount;
  }

  return Math.max(
    1,
    ...Object.values(byKey).flatMap((answersByValue) =>
      Object.values(answersByValue).map((answer) => answer.count),
    ),
  );
}

function scoreFormat(game: Game, answerStats: AnswerStats) {
  const answersByValue = answerStats.byKey.format;

  if (!answersByValue) {
    return emptyScore();
  }

  const majority = getMajorityAnswer(answersByValue);

  if (!majority) {
    return emptyScore();
  }

  const maxScore = MATCH_WEIGHTS.format;
  const hasMatchingFormat = game.tags.includes(majority.value);

  if (hasMatchingFormat) {
    return {
      ...emptyScore(),
      maxScore,
      score: maxScore * majority.answer.ratio,
      reasons: [
        `${majority.answer.count} из ${answerStats.totalPlayers} игроков выбрали ${getTagLabel(majority.value)}`,
      ],
    };
  }

  return {
    ...emptyScore(),
    maxScore,
    penalty: FORMAT_MISMATCH_MAX_PENALTY * majority.answer.ratio,
    conflicts: ["Формат игры может не совпасть с выбором большинства"],
  };
}

function scoreWeightedTags(
  game: Game,
  answerStats: AnswerStats,
  key: string,
  weight: number,
  verb: string,
) {
  const answersByValue = answerStats.byKey[key];

  if (!answersByValue) {
    return emptyScore();
  }

  const matchedAnswers = getSortedAnswers(answersByValue).filter(({ value }) =>
    game.tags.includes(value),
  );

  if (matchedAnswers.length === 0) {
    return { ...emptyScore(), maxScore: weight };
  }

  const matchedStrength = matchedAnswers.reduce(
    (total, { answer }) => total + answer.ratio,
    0,
  );
  const bestMatch = matchedAnswers[0];

  return {
    ...emptyScore(),
    maxScore: weight,
    score: weight * Math.min(matchedStrength, 1),
    reasons: [
      `${bestMatch.answer.count} из ${answerStats.totalPlayers} игроков ${verb} ${getTagLabel(bestMatch.value)}`,
    ],
  };
}

function scoreGameVibe(game: Game, answerStats: AnswerStats) {
  const answersByValue = answerStats.byKey.game_vibe;

  if (!answersByValue) {
    return emptyScore();
  }

  const matchedAnswers = getSortedAnswers(answersByValue).filter(({ value }) =>
    game.tags.includes(value),
  );
  const majority = getMajorityAnswer(answersByValue);
  const result = { ...emptyScore(), maxScore: MATCH_WEIGHTS.gameVibe };

  if (matchedAnswers.length > 0) {
    const bestMatch = matchedAnswers[0];
    result.score = MATCH_WEIGHTS.gameVibe * bestMatch.answer.ratio;
    result.reasons = [
      `${bestMatch.answer.count} из ${answerStats.totalPlayers} игроков выбрали ${getTagLabel(bestMatch.value)}`,
    ];
  }

  if (majority && hasVibeConflict(game, majority.value)) {
    result.penalty = VIBE_MISMATCH_MAX_PENALTY * majority.answer.ratio;
    result.conflicts = ["Вайб игры может не совпасть с ожиданиями"];

    if (majority.answer.ratio > MAJORITY_RATIO) {
      result.conflicts = [
        `Большинство выбрало ${getTagLabel(majority.value)}, а игра выглядит иначе`,
      ];
    }
  } else if (majority?.answer.ratio && majority.answer.ratio > MAJORITY_RATIO) {
    result.reasons = [
      ...result.reasons,
      `Большинство выбрало ${getTagLabel(majority.value)}`,
    ];
  }

  return result;
}

function scoreSingleProperty(
  gameValue: string,
  answerStats: AnswerStats,
  key: string,
  weight: number,
  reasonText: string,
) {
  const answersByValue = answerStats.byKey[key];

  if (!answersByValue) {
    return emptyScore();
  }

  const answer = answersByValue[gameValue];

  if (!answer) {
    return { ...emptyScore(), maxScore: weight };
  }

  return {
    ...emptyScore(),
    maxScore: weight,
    score: weight * answer.ratio,
    reasons: [
      `${answer.count} из ${answerStats.totalPlayers} ${reasonText}`,
    ],
  };
}

function scoreBudget(game: Game, answerStats: AnswerStats) {
  const answersByValue = answerStats.byKey.budget;

  if (!answersByValue) {
    return emptyScore();
  }

  const result = { ...emptyScore(), maxScore: MATCH_WEIGHTS.budget };
  const freeOnly = answersByValue.free_only;
  const paidBudget = answersByValue.up_to_1000_rub;
  const gameIsFree = game.priceType === "free" || game.priceType === "free_only";
  const gameIsPaid = game.priceType === "paid" || game.priceType === "up_to_1000_rub";

  if (gameIsFree && freeOnly) {
    result.score += MATCH_WEIGHTS.budget * freeOnly.ratio;
    result.reasons.push(
      `${freeOnly.count} из ${answerStats.totalPlayers} игроков хотят бесплатную игру`,
    );
  }

  if ((gameIsPaid || gameIsFree) && paidBudget) {
    result.score += MATCH_WEIGHTS.budget * paidBudget.ratio;
  }

  if (gameIsPaid && freeOnly) {
    result.penalty += 10 * freeOnly.ratio;
    result.conflicts.push(
      `${freeOnly.count} из ${answerStats.totalPlayers} игроков хотят только бесплатные игры`,
    );
  }

  result.score = Math.min(result.score, MATCH_WEIGHTS.budget);

  return result;
}

function scoreDislikedGenres(game: Game, answerStats: AnswerStats) {
  const answersByValue = answerStats.byKey.disliked_genres;

  if (!answersByValue) {
    return emptyScore();
  }

  const dislikedMatches = getSortedAnswers(answersByValue).filter(({ value }) =>
    game.tags.includes(value),
  );
  const penalty = dislikedMatches.reduce(
    (total, { answer }) => total + DISLIKED_GENRE_MAX_PENALTY * answer.ratio,
    0,
  );
  const conflicts = dislikedMatches.map(({ value, answer }) => {
    const label = getTagLabel(value);

    if (answer.ratio > MAJORITY_RATIO) {
      return `Большинство не любит ${label}`;
    }

    return `${answer.count} из ${answerStats.totalPlayers} игроков не любят ${label}`;
  });

  return {
    ...emptyScore(),
    penalty: Math.min(penalty, DISLIKED_GENRE_MAX_PENALTY),
    conflicts,
  };
}

function getMajorityAnswer(answersByValue: Record<string, AnswerFrequency>) {
  return getSortedAnswers(answersByValue)[0];
}

function getSortedAnswers(answersByValue: Record<string, AnswerFrequency>) {
  return Object.entries(answersByValue)
    .map(([value, answer]) => ({ value, answer }))
    .filter(({ value }) => value !== NOT_IMPORTANT_VALUE)
    .sort(
      (left, right) =>
        right.answer.count - left.answer.count || left.value.localeCompare(right.value),
    );
}

function hasVibeConflict(game: Game, vibe: string) {
  return (VIBE_CONFLICTS[vibe] ?? []).some((conflictVibe) =>
    game.tags.includes(conflictVibe),
  );
}

function normalizeSessionLength(sessionLength: string) {
  const sessionLengthMap: Record<string, string> = {
    long: "three_plus_hours",
    medium: "one_to_two_hours",
    short: "up_to_30_minutes",
  };

  return sessionLengthMap[sessionLength] ?? sessionLength;
}

function getTagLabel(tag: string) {
  return TAG_LABELS[tag] ?? tag;
}

function normalizeAnswerValue(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function isMeaningfulAnswer(value: string | undefined): value is string {
  return Boolean(value && value !== NOT_IMPORTANT_VALUE);
}

function emptyScore() {
  return {
    score: 0,
    maxScore: 0,
    penalty: 0,
    reasons: [] as string[],
    conflicts: [] as string[],
  };
}

function clampScore(score: number) {
  return Math.min(Math.max(score, 0), 100);
}
