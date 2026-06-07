import { games } from "@/src/data/games";
import { excludedSteamAppIds } from "@/src/data/excluded-games";
import { generatedGames } from "@/src/data/generated-games";
import { questions } from "@/src/data/questions";
import type { Game } from "@/src/types/game";

export type MatchGamesAnswers = Partial<Record<string, string | string[]>>;

export type GameMatchResult = {
  game: Game;
  score: number;
  reasons: string[];
  conflicts: string[];
};

const TOP_RESULTS_LIMIT = 10;
const NOT_IMPORTANT_VALUE = "not_important";

const MATCH_WEIGHTS = {
  format: 20,
  favoriteGenres: 25,
  favoriteMechanics: 20,
  difficulty: 15,
  sessionLength: 10,
  budget: 10,
};

const DISLIKED_GENRE_PENALTY = 25;
const MAX_DISLIKED_GENRE_PENALTY = 60;
const availableGames = generatedGames.length > 0 ? generatedGames : games;
const excludedSteamAppIdSet = new Set(excludedSteamAppIds);

export function matchGames(answers: MatchGamesAnswers): GameMatchResult[] {
  const matchableGames = availableGames.filter(
    (game) => !excludedSteamAppIdSet.has(game.steamAppId),
  );

  logGameDatabaseDiagnostics(matchableGames);

  const scoredGames = matchableGames
    .map((game) => scoreGame(game, answers))
    .sort((left, right) => right.score - left.score);

  logTopScoredGames(scoredGames);

  return scoredGames.slice(0, TOP_RESULTS_LIMIT);
}

function scoreGame(game: Game, answers: MatchGamesAnswers): GameMatchResult {
  const reasons: string[] = [];
  const conflicts: string[] = [];
  let score = 0;
  let maxScore = 0;

  const format = getSingleAnswer(answers, "format");
  if (isMeaningfulAnswer(format)) {
    maxScore += MATCH_WEIGHTS.format;

    if (game.tags.includes(format)) {
      score += MATCH_WEIGHTS.format;
      reasons.push("Совпадает формат игры");
    }
  }

  const favoriteGenres = getMultiAnswer(answers, "favorite_genres");
  if (favoriteGenres.length > 0) {
    const matchedGenres = getMatchingValues(favoriteGenres, game.tags);

    maxScore += MATCH_WEIGHTS.favoriteGenres;
    score += getRatioScore(
      matchedGenres.length,
      favoriteGenres.length,
      MATCH_WEIGHTS.favoriteGenres,
    );

    if (matchedGenres.length > 0) {
      reasons.push("Есть совпадения по любимым жанрам");
    }
  }

  const favoriteMechanics = getMultiAnswer(answers, "favorite_mechanics");
  if (favoriteMechanics.length > 0) {
    const matchedMechanics = getMatchingValues(favoriteMechanics, game.tags);

    maxScore += MATCH_WEIGHTS.favoriteMechanics;
    score += getRatioScore(
      matchedMechanics.length,
      favoriteMechanics.length,
      MATCH_WEIGHTS.favoriteMechanics,
    );

    if (matchedMechanics.length > 0) {
      reasons.push("Есть совпадения по игровым механикам");
    }
  }

  const difficulty = getSingleAnswer(answers, "difficulty");
  if (isMeaningfulAnswer(difficulty)) {
    maxScore += MATCH_WEIGHTS.difficulty;

    if (game.difficulty === difficulty) {
      score += MATCH_WEIGHTS.difficulty;
      reasons.push("Подходит по сложности");
    }
  }

  const sessionLength = getSingleAnswer(answers, "session_length");
  if (isMeaningfulAnswer(sessionLength)) {
    maxScore += MATCH_WEIGHTS.sessionLength;

    if (game.sessionLength === sessionLength) {
      score += MATCH_WEIGHTS.sessionLength;
      reasons.push("Подходит по длине игровой сессии");
    }
  }

  const budget = getSingleAnswer(answers, "budget");
  if (isMeaningfulAnswer(budget)) {
    maxScore += MATCH_WEIGHTS.budget;

    if (game.priceType === budget || game.priceType === NOT_IMPORTANT_VALUE) {
      score += MATCH_WEIGHTS.budget;
      reasons.push("Подходит по бюджету");
    }
  }

  const dislikedGenres = getMultiAnswer(answers, "disliked_genres");
  const dislikedGenreConflicts = getMatchingValues(dislikedGenres, game.tags);
  const conflictPenalty = Math.min(
    dislikedGenreConflicts.length * DISLIKED_GENRE_PENALTY,
    MAX_DISLIKED_GENRE_PENALTY,
  );

  for (const genre of dislikedGenreConflicts) {
    conflicts.push(`Содержит нежелательный жанр: ${genre}`);
  }

  const normalizedScore = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const finalScore = clampScore(Math.round(normalizedScore - conflictPenalty));

  return {
    game,
    score: finalScore,
    reasons,
    conflicts,
  };
}

function getSingleAnswer(
  answers: MatchGamesAnswers,
  key: string,
): string | undefined {
  const value = answers[key];

  return Array.isArray(value) ? value[0] : value;
}

function getMultiAnswer(answers: MatchGamesAnswers, key: string): string[] {
  const value = answers[key];

  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function isMeaningfulAnswer(value: string | undefined): value is string {
  return Boolean(value && value !== NOT_IMPORTANT_VALUE);
}

function getMatchingValues(values: string[], tags: string[]) {
  return values.filter((value) => tags.includes(value));
}

function getRatioScore(matches: number, total: number, weight: number) {
  return total > 0 ? (matches / total) * weight : 0;
}

function clampScore(score: number) {
  return Math.min(Math.max(score, 0), 100);
}

function logGameDatabaseDiagnostics(gamesToAnalyze: Game[]) {
  console.log("Games loaded:", gamesToAnalyze.length);
  console.log("Tag statistics:");
  console.table(getTagStatistics(gamesToAnalyze));
  console.log("First 20 games:");
  console.table(
    gamesToAnalyze.slice(0, 20).map((game) => ({
      title: game.title,
      tags: game.tags.length,
      steamAppId: game.steamAppId,
    })),
  );
  console.log("Unknown tags:", getUnknownTags(gamesToAnalyze));
  console.log(
    "Games without tags:",
    gamesToAnalyze
      .filter((game) => game.tags.length === 0)
      .map((game) => game.title),
  );

  const gamesWithoutSteamAppId = gamesToAnalyze.filter(
    (game) => !game.steamAppId,
  );
  console.log("Games without steamAppId count:", gamesWithoutSteamAppId.length);
  console.log(
    "Games without steamAppId examples:",
    gamesWithoutSteamAppId.slice(0, 20).map((game) => game.title),
  );

  const gamesWithoutSteamUrl = gamesToAnalyze.filter((game) => !game.steamUrl);
  console.log("Games without steamUrl count:", gamesWithoutSteamUrl.length);
  console.log(
    "Games without steamUrl examples:",
    gamesWithoutSteamUrl.slice(0, 20).map((game) => game.title),
  );

  console.log("Suspiciously old games:", getSuspiciouslyOldGames(gamesToAnalyze));
  console.log("Duplicate steamAppId:", getDuplicateValues(gamesToAnalyze, "steamAppId"));
  console.log("Duplicate titles:", getDuplicateValues(gamesToAnalyze, "title"));
}

function getTagStatistics(gamesToAnalyze: Game[]) {
  const tagCounts = new Map<string, number>();

  for (const game of gamesToAnalyze) {
    for (const tag of game.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({
      Tag: tag,
      Count: count,
    }))
    .sort(
      (left, right) => right.Count - left.Count || left.Tag.localeCompare(right.Tag),
    );
}

function getUnknownTags(gamesToAnalyze: Game[]) {
  const knownTags = new Set(
    questions.flatMap((question) =>
      question.options.map((option) => option.value),
    ),
  );
  const gameTags = new Set(gamesToAnalyze.flatMap((game) => game.tags));

  return Array.from(gameTags)
    .filter((tag) => !knownTags.has(tag))
    .sort();
}

function getSuspiciouslyOldGames(gamesToAnalyze: Game[]) {
  return gamesToAnalyze
    .map((game) => ({
      title: game.title,
      year: getGameReleaseYear(game),
    }))
    .filter(
      (game): game is { title: string; year: number } =>
        typeof game.year === "number" && game.year < 2010,
    );
}

function getGameReleaseYear(game: Game) {
  const gameWithReleaseData = game as Game & {
    releaseYear?: number;
    releaseDate?: string;
    release_date?: {
      date?: string;
    };
  };

  if (typeof gameWithReleaseData.releaseYear === "number") {
    return gameWithReleaseData.releaseYear;
  }

  return parseReleaseYear(
    gameWithReleaseData.releaseDate ?? gameWithReleaseData.release_date?.date,
  );
}

function parseReleaseYear(value: string | undefined) {
  const match = value?.match(/\b(19|20)\d{2}\b/);

  return match ? Number(match[0]) : undefined;
}

function getDuplicateValues(gamesToAnalyze: Game[], key: "steamAppId" | "title") {
  const gamesByValue = new Map<string, string[]>();

  for (const game of gamesToAnalyze) {
    const value = String(game[key] ?? "");

    if (!value) {
      continue;
    }

    gamesByValue.set(value, [...(gamesByValue.get(value) ?? []), game.title]);
  }

  return Array.from(gamesByValue.entries())
    .filter(([, titles]) => titles.length > 1)
    .map(([value, titles]) => ({ value, titles }));
}

function logTopScoredGames(scoredGames: GameMatchResult[]) {
  console.log(
    "Top 20 scored games:",
    scoredGames.slice(0, 20).map(({ game, score }) => ({
      title: game.title,
      score,
    })),
  );
}
