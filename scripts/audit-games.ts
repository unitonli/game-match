import { games } from "@/src/data/games";
import { excludedSteamAppIds } from "@/src/data/excluded-games";
import { generatedGames } from "@/src/data/generated-games";
import { questions } from "@/src/data/questions";
import type { Game } from "@/src/types/game";

type GameWithReleaseData = Game & {
  releaseYear?: number;
  releaseDate?: string;
  release_date?: {
    date?: string;
  };
};

const availableGames = generatedGames.length > 0 ? generatedGames : games;
const excludedSteamAppIdSet = new Set(excludedSteamAppIds);
const matchableGames = availableGames.filter(
  (game) => !excludedSteamAppIdSet.has(game.steamAppId),
);
const multiplayerTags = new Set(["co_op", "pvp", "teamwork"]);
const likelySinglePlayerTitlePatterns = [
  "elden ring",
  "witcher",
  "black myth",
  "cyberpunk",
  "god of war",
  "red dead redemption",
  "hogwarts legacy",
  "baldur's gate",
  "kingdom come",
  "sekiro",
  "dark souls",
  "horizon",
  "assassin's creed",
  "resident evil",
  "silent hill",
  "final fantasy",
  "persona",
  "nier",
  "metro exodus",
  "doom eternal",
  "tomb raider",
  "star wars jedi",
  "death stranding",
  "detroit",
  "disco elysium",
  "hades",
  "subnautica",
  "stardew valley",
];

runAudit();

function runAudit() {
  const gamesWithoutMultiplayerTags = matchableGames.filter(
    (game) => !game.tags.some((tag) => multiplayerTags.has(tag)),
  );
  const gamesWithSinglePlayerLimit = matchableGames.filter(
    (game) => game.maxPlayers <= 1,
  );
  const likelySinglePlayerGames = matchableGames.filter(isLikelySinglePlayer);
  const likelyRemoveIds = new Set(
    [
      ...gamesWithoutMultiplayerTags,
      ...gamesWithSinglePlayerLimit,
      ...likelySinglePlayerGames,
    ].map((game) => game.id),
  );

  console.log("Game Match database audit");
  console.log("=========================");
  console.log("Source:", generatedGames.length > 0 ? "generated-games" : "games");
  console.log("Games loaded:", availableGames.length);
  console.log("Excluded games:", excludedSteamAppIds.length);
  console.log("Matchable games:", matchableGames.length);
  console.log("Suitable for company:", matchableGames.length - likelyRemoveIds.size);
  console.log("Likely should remove:", likelyRemoveIds.size);
  console.log("");

  console.log("Tag statistics:");
  console.table(getTagStatistics(matchableGames));

  console.log("First 20 games:");
  console.table(
    matchableGames.slice(0, 20).map((game) => ({
      title: game.title,
      tags: game.tags.length,
      steamAppId: game.steamAppId,
    })),
  );

  console.log("Unknown tags:");
  console.log(getUnknownTags(matchableGames));

  console.log("Games without tags:");
  console.log(matchableGames.filter((game) => game.tags.length === 0).map(toGameRow));

  const gamesWithoutSteamAppId = matchableGames.filter(
    (game) => !game.steamAppId,
  );
  console.log("Games without steamAppId count:", gamesWithoutSteamAppId.length);
  console.table(gamesWithoutSteamAppId.slice(0, 20).map(toGameRow));

  const gamesWithoutSteamUrl = matchableGames.filter((game) => !game.steamUrl);
  console.log("Games without steamUrl count:", gamesWithoutSteamUrl.length);
  console.table(gamesWithoutSteamUrl.slice(0, 20).map(toGameRow));

  console.log("Suspiciously old games:");
  console.table(getSuspiciouslyOldGames(matchableGames));

  console.log("Duplicate steamAppId:");
  console.table(getDuplicateValues(matchableGames, "steamAppId"));

  console.log("Duplicate titles:");
  console.table(getDuplicateValues(matchableGames, "title"));

  console.log("Games without multiplayer tags:");
  console.table(gamesWithoutMultiplayerTags.map(toGameRow));

  console.log("Games with maxPlayers <= 1:");
  console.table(gamesWithSinglePlayerLimit.map(toGameRow));

  console.log("Likely single-player games:");
  console.table(likelySinglePlayerGames.map(toGameRow));
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
      (left, right) =>
        right.Count - left.Count || left.Tag.localeCompare(right.Tag),
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
      steamAppId: game.steamAppId,
      year: getGameReleaseYear(game),
    }))
    .filter(
      (game): game is { title: string; steamAppId: number; year: number } =>
        typeof game.year === "number" && game.year < 2010,
    );
}

function getGameReleaseYear(game: Game) {
  const gameWithReleaseData = game as GameWithReleaseData;

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
    .map(([value, titles]) => ({ value, titles: titles.join(", ") }));
}

function isLikelySinglePlayer(game: Game) {
  const title = game.title.toLowerCase();
  const hasLikelySinglePlayerTitle = likelySinglePlayerTitlePatterns.some(
    (pattern) => title.includes(pattern),
  );
  const hasNoCoreMultiplayerTag = !game.tags.some((tag) =>
    multiplayerTags.has(tag),
  );

  return hasLikelySinglePlayerTitle || (hasNoCoreMultiplayerTag && game.maxPlayers <= 1);
}

function toGameRow(game: Game) {
  return {
    title: game.title,
    steamAppId: game.steamAppId,
    maxPlayers: game.maxPlayers,
    tags: game.tags.join(", "),
  };
}
