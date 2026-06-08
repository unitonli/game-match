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

  return matchableGames
    .map((game) => scoreGame(game, answers))
    .sort((left, right) => right.score - left.score)
    .slice(0, TOP_RESULTS_LIMIT);
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
