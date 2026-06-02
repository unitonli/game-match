import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type SteamSpyGame = {
  appid?: number;
  name?: string;
  owners?: string;
  positive?: number;
  negative?: number;
  average_forever?: number;
  median_forever?: number;
};

type SteamCategory = {
  id: number;
  description: string;
};

type SteamGenre = {
  id: string;
  description: string;
};

type SteamAppDetails = {
  type?: string;
  name?: string;
  steam_appid?: number;
  short_description?: string;
  about_the_game?: string;
  header_image?: string;
  is_free?: boolean;
  categories?: SteamCategory[];
  genres?: SteamGenre[];
};

type SteamAppDetailsResponse = Record<
  string,
  {
    success?: boolean;
    data?: SteamAppDetails;
  }
>;

type GeneratedGame = {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  steamAppId: number;
  steamUrl: string;
  minPlayers: number;
  maxPlayers: number;
  tags: string[];
  difficulty: string;
  sessionLength: string;
  priceType: string;
};

type CandidateGame = {
  appId: number;
  name?: string;
  owners?: string;
  ownersMin?: number;
  ownersMax?: number;
  positive?: number;
  negative?: number;
  averageForever?: number;
  medianForever?: number;
  steamSpyTags: Set<string>;
};

type FetchJsonOptions = {
  maxRateLimitRetries?: number;
  onRateLimitRetry?: () => void;
};

class HttpError extends Error {
  constructor(
    public readonly status: number,
    statusText: string,
  ) {
    super(`${status} ${statusText}`);
  }
}

const ROOT_DIR = process.cwd();
const OUTPUT_PATH = path.join(ROOT_DIR, "src", "data", "generated-games.ts");
const QUESTIONS_PATH = path.join(ROOT_DIR, "src", "data", "questions.ts");
const GAMES_PATH = path.join(ROOT_DIR, "src", "data", "games.ts");
const STEAMSPY_TAGS = [
  "Multiplayer",
  "Co-op",
  "Online Co-Op",
  "PvP",
  "Survival",
  "Horror",
  "Party",
  "Sandbox",
  "Shooter",
  "Strategy",
  "RPG",
  "Racing",
  "Simulation",
];

const DEFAULT_LIMIT = 300;
const DEFAULT_REQUEST_DELAY_MS = 2000;
const RATE_LIMIT_RETRY_DELAY_MS = 30_000;
const MAX_RATE_LIMIT_RETRIES = 2;
const CHECKPOINT_SIZE = 25;
const MIN_OWNERS = 50_000;
const MIN_POSITIVE_REVIEWS = 500;
const STEAM_STORE_BASE_URL = "https://store.steampowered.com/app";
const STEAM_CDN_BASE_URL = "https://cdn.cloudflare.steamstatic.com/steam/apps";
const IMPORTANT_STEAMSPY_TAGS = new Set([
  "Multiplayer",
  "Co-op",
  "Online Co-Op",
  "PvP",
]);
const COMPANY_TAGS = new Set([
  "co_op",
  "pvp",
  "pve",
  "multiplayer",
  "teamwork",
  "fun_and_chaotic",
  "competitive",
]);
const SKIP_TITLE_PATTERNS = [
  "demo",
  "soundtrack",
  "ost",
  "dlc",
  "dedicated server",
  "playtest",
  "trailer",
  "tool",
  "editor",
];

main().catch((error: unknown) => {
  console.error("Failed to generate Steam games database.");
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const outputLimit = readLimit();
  const appLimit = readPositiveIntEnv(
    "STEAM_GAMES_APP_LIMIT",
    Math.max(outputLimit * 4, outputLimit),
  );
  const requestDelayMs = Math.max(
    1500,
    readPositiveIntEnv("STEAM_GAMES_DELAY_MS", DEFAULT_REQUEST_DELAY_MS),
  );
  const allowedTags = await readAllowedGameTags();
  const generatedGames = await readExistingGeneratedGames();
  const savedAppIds = new Set(generatedGames.map((game) => game.steamAppId));
  const candidates = await fetchSteamSpyCandidates(appLimit);
  let skippedCount = 0;
  let retryCount = 0;
  let savedSinceLastCheckpoint = 0;

  console.log(`Found ${candidates.length} unique Steam app ids.`);
  console.log(`Resuming with ${generatedGames.length} already saved games.`);
  console.log(`Target limit: ${outputLimit} games.`);
  console.log(`Fetching Steam Store appdetails with ${requestDelayMs}ms delay.`);

  for (const [index, candidate] of candidates.entries()) {
    if (generatedGames.length >= outputLimit) {
      break;
    }

    const position = index + 1;

    if (savedAppIds.has(candidate.appId)) {
      skippedCount += 1;
      console.log(
        `[${position}/${candidates.length}] appId=${candidate.appId} saved=${generatedGames.length} skipped=${skippedCount} retries=${retryCount} (resume skip)`,
      );
      continue;
    }

    console.log(
      `[${position}/${candidates.length}] appId=${candidate.appId} saved=${generatedGames.length} skipped=${skippedCount} retries=${retryCount}`,
    );

    try {
      const details = await fetchBestAppDetails(candidate.appId, () => {
        retryCount += 1;
        console.log(
          `[${position}/${candidates.length}] appId=${candidate.appId} saved=${generatedGames.length} skipped=${skippedCount} retries=${retryCount} (429 retry)`,
        );
      });

      if (!details || shouldSkipDetails(details)) {
        skippedCount += 1;
        await delay(requestDelayMs);
        continue;
      }

      const game = createGeneratedGame(candidate, details, allowedTags);

      if (game && isCompanyGame(game)) {
        generatedGames.push(game);
        savedAppIds.add(game.steamAppId);
        savedSinceLastCheckpoint += 1;

        if (savedSinceLastCheckpoint >= CHECKPOINT_SIZE) {
          await writeGeneratedGames(generatedGames);
          savedSinceLastCheckpoint = 0;
          console.log(
            `Checkpoint saved: ${generatedGames.length} games to ${toRelative(OUTPUT_PATH)}.`,
          );
        }
      } else {
        skippedCount += 1;
      }
    } catch (error: unknown) {
      skippedCount += 1;
      console.warn(`Skipped app ${candidate.appId}: ${formatError(error)}`);
    }

    await delay(requestDelayMs);
  }

  await writeGeneratedGames(generatedGames);
  console.log(`Saved ${generatedGames.length} games to ${toRelative(OUTPUT_PATH)}.`);
}

async function fetchSteamSpyCandidates(appLimit: number) {
  const candidatesByAppId = new Map<number, CandidateGame>();

  for (const tag of STEAMSPY_TAGS) {
    const url = createSteamSpyTagUrl(tag);
    console.log(`Fetching SteamSpy tag: ${tag}`);

    try {
      const response = await fetchJson<Record<string, SteamSpyGame>>(url);

      for (const [appIdValue, steamSpyGame] of Object.entries(response)) {
        const appId = Number(steamSpyGame.appid ?? appIdValue);

        if (!Number.isInteger(appId) || appId <= 0) {
          continue;
        }

        const candidate =
          candidatesByAppId.get(appId) ?? createCandidateGame(appId);
        candidate.steamSpyTags.add(tag);
        updateCandidateFromSteamSpy(candidate, steamSpyGame);
        candidatesByAppId.set(appId, candidate);
      }
    } catch (error: unknown) {
      console.warn(`Skipped SteamSpy tag ${tag}: ${formatError(error)}`);
    }
  }

  const candidates = Array.from(candidatesByAppId.values());
  const popularCandidates = candidates
    .filter(isPopularCandidate)
    .sort(compareCandidatesByPopularity);

  console.log(`SteamSpy candidates before popularity filter: ${candidates.length}`);
  console.log(
    `SteamSpy candidates after popularity filter: ${popularCandidates.length}`,
  );

  return popularCandidates.slice(0, appLimit);
}

function createSteamSpyTagUrl(tag: string) {
  const params = new URLSearchParams({
    request: "tag",
    tag,
  });

  return `https://steamspy.com/api.php?${params.toString()}`;
}

function createCandidateGame(appId: number): CandidateGame {
  return {
    appId,
    steamSpyTags: new Set<string>(),
  };
}

function updateCandidateFromSteamSpy(
  candidate: CandidateGame,
  steamSpyGame: SteamSpyGame,
) {
  const ownersRange = steamSpyGame.owners
    ? parseOwnersRange(steamSpyGame.owners)
    : null;

  candidate.name ??= steamSpyGame.name;
  candidate.owners ??= steamSpyGame.owners;
  candidate.ownersMin ??= ownersRange?.min;
  candidate.ownersMax ??= ownersRange?.max;
  candidate.positive ??= steamSpyGame.positive;
  candidate.negative ??= steamSpyGame.negative;
  candidate.averageForever ??= steamSpyGame.average_forever;
  candidate.medianForever ??= steamSpyGame.median_forever;
}

function parseOwnersRange(owners: string) {
  const [minValue, maxValue] = owners
    .split("..")
    .map((value) => Number(value.replace(/,/g, "").trim()));

  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
    return null;
  }

  return {
    min: minValue,
    max: maxValue,
  };
}

function isPopularCandidate(candidate: CandidateGame) {
  const hasPopularityData =
    typeof candidate.ownersMin === "number" ||
    typeof candidate.positive === "number";

  if (!hasPopularityData) {
    return hasMultipleImportantSteamSpyTags(candidate);
  }

  return (
    (candidate.ownersMin ?? 0) >= MIN_OWNERS &&
    (candidate.positive ?? 0) >= MIN_POSITIVE_REVIEWS
  );
}

function hasMultipleImportantSteamSpyTags(candidate: CandidateGame) {
  let importantTagsCount = 0;

  for (const tag of candidate.steamSpyTags) {
    if (IMPORTANT_STEAMSPY_TAGS.has(tag)) {
      importantTagsCount += 1;
    }
  }

  return importantTagsCount >= 2;
}

function compareCandidatesByPopularity(
  left: CandidateGame,
  right: CandidateGame,
) {
  return (
    (right.ownersMin ?? 0) - (left.ownersMin ?? 0) ||
    (right.positive ?? 0) - (left.positive ?? 0) ||
    right.steamSpyTags.size - left.steamSpyTags.size
  );
}

async function fetchBestAppDetails(appId: number, onRateLimitRetry: () => void) {
  const russianDetails = await fetchAppDetails(
    appId,
    "russian",
    onRateLimitRetry,
  );

  if (russianDetails && getDescription(russianDetails)) {
    return russianDetails;
  }

  return fetchAppDetails(appId, "english", onRateLimitRetry);
}

async function fetchAppDetails(
  appId: number,
  language: "russian" | "english",
  onRateLimitRetry: () => void,
) {
  const params = new URLSearchParams({
    appids: String(appId),
    l: language,
  });
  const response = await fetchJson<SteamAppDetailsResponse>(
    `https://store.steampowered.com/api/appdetails?${params.toString()}`,
    {
      maxRateLimitRetries: MAX_RATE_LIMIT_RETRIES,
      onRateLimitRetry,
    },
  );
  const appResponse = response[String(appId)];

  if (!appResponse?.success || !appResponse.data) {
    return null;
  }

  return appResponse.data;
}

function shouldSkipDetails(details: SteamAppDetails) {
  if (details.type !== "game") {
    return true;
  }

  const title = details.name?.toLowerCase() ?? "";

  if (SKIP_TITLE_PATTERNS.some((pattern) => title.includes(pattern))) {
    return true;
  }

  return getRawMetadata(details).some((metadata) =>
    SKIP_TITLE_PATTERNS.some((pattern) => metadata.includes(pattern)),
  );
}

function createGeneratedGame(
  candidate: CandidateGame,
  details: SteamAppDetails,
  allowedTags: Set<string>,
): GeneratedGame | null {
  const title = details.name?.trim();
  const description = getDescription(details);

  if (!title || !description) {
    return null;
  }

  const tags = mapTags(candidate, details, allowedTags);

  if (tags.length === 0) {
    return null;
  }

  return {
    id: slugify(`${title}-${candidate.appId}`),
    title,
    description,
    coverUrl: `${STEAM_CDN_BASE_URL}/${candidate.appId}/header.jpg`,
    steamAppId: candidate.appId,
    steamUrl: `${STEAM_STORE_BASE_URL}/${candidate.appId}`,
    minPlayers: 1,
    maxPlayers: getMaxPlayers(candidate, details),
    tags,
    difficulty: getDifficulty(candidate, details),
    sessionLength: getSessionLength(candidate, details),
    priceType: details.is_free ? "free" : "paid",
  };
}

function getDescription(details: SteamAppDetails) {
  const description =
    details.short_description?.trim() || details.about_the_game?.trim() || "";

  return cleanDescription(description);
}

function cleanDescription(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function mapTags(
  candidate: CandidateGame,
  details: SteamAppDetails,
  allowedTags: Set<string>,
) {
  const rawTags = [
    ...candidate.steamSpyTags,
    ...getRawMetadata(details),
    details.name ?? "",
  ];
  const mappedTags = new Set<string>();

  for (const rawTag of rawTags) {
    for (const mappedTag of mapRawTag(rawTag)) {
      if (allowedTags.has(mappedTag)) {
        mappedTags.add(mappedTag);
      }
    }
  }

  return Array.from(mappedTags);
}

function mapRawTag(rawTag: string) {
  const value = normalizeRawValue(rawTag);
  const tags: string[] = [];

  if (includesAny(value, ["online co-op", "co-op", "cooperative"])) {
    tags.push("co_op", "teamwork");
  }

  if (includesAny(value, ["multi-player", "multiplayer"])) {
    tags.push("multiplayer");
  }

  if (includesAny(value, ["pvp", "player vs player"])) {
    tags.push("pvp", "competitive");
  }

  if (includesAny(value, ["pve", "player vs environment"])) {
    tags.push("pve");
  }

  if (value.includes("survival")) {
    tags.push("survival", "resource_management");
  }

  if (value.includes("horror")) {
    tags.push("horror", "tense");
  }

  if (includesAny(value, ["shooter", "fps", "third-person shooter"])) {
    tags.push("shooter");
  }

  if (value.includes("rpg")) {
    tags.push("rpg", "character_progression");
  }

  if (value.includes("strategy")) {
    tags.push("strategy", "resource_management");
  }

  if (value.includes("sandbox")) {
    tags.push("sandbox");
  }

  if (value.includes("racing")) {
    tags.push("racing");
  }

  if (includesAny(value, ["simulation", "simulator"])) {
    tags.push("simulator");
  }

  if (value.includes("crafting")) {
    tags.push("crafting");
  }

  if (includesAny(value, ["building", "base building"])) {
    tags.push("base_building");
  }

  if (includesAny(value, ["exploration", "open world"])) {
    tags.push("world_exploration");
  }

  if (value.includes("loot")) {
    tags.push("loot");
  }

  if (includesAny(value, ["casual", "funny", "party"])) {
    tags.push("fun_and_chaotic", "chill");
  }

  if (value.includes("competitive")) {
    tags.push("competitive");
  }

  if (includesAny(value, ["difficult", "hardcore", "souls-like", "soulslike"])) {
    tags.push("hardcore");
  }

  return tags;
}

function getRawMetadata(details: SteamAppDetails) {
  return [
    ...(details.categories?.map((category) => category.description) ?? []),
    ...(details.genres?.map((genre) => genre.description) ?? []),
  ].map(normalizeRawValue);
}

function normalizeRawValue(value: string) {
  return value.toLowerCase().trim();
}

function isCompanyGame(game: GeneratedGame) {
  return game.tags.some((tag) => COMPANY_TAGS.has(tag)) || game.maxPlayers > 1;
}

function getMaxPlayers(candidate: CandidateGame, details: SteamAppDetails) {
  const metadata = [
    ...Array.from(candidate.steamSpyTags, normalizeRawValue),
    ...getRawMetadata(details),
  ].join(" ");

  if (includesAny(metadata, ["mmo", "massively multiplayer"])) {
    return 10;
  }

  if (
    includesAny(metadata, [
      "local co-op",
      "party",
      "co-op",
      "online co-op",
      "multiplayer",
      "multi-player",
      "pvp",
    ])
  ) {
    return 4;
  }

  return 4;
}

function getDifficulty(candidate: CandidateGame, details: SteamAppDetails) {
  const metadata = [
    ...Array.from(candidate.steamSpyTags, normalizeRawValue),
    ...getRawMetadata(details),
  ].join(" ");

  if (includesAny(metadata, ["difficult", "hardcore", "souls-like", "soulslike"])) {
    return "hard";
  }

  if (metadata.includes("casual")) {
    return "easy";
  }

  return "medium";
}

function getSessionLength(candidate: CandidateGame, details: SteamAppDetails) {
  const metadata = [
    ...Array.from(candidate.steamSpyTags, normalizeRawValue),
    ...getRawMetadata(details),
  ].join(" ");

  if (includesAny(metadata, ["roguelike", "rogue-like", "party", "racing"])) {
    return "short";
  }

  if (includesAny(metadata, ["survival", "sandbox", "rpg", "strategy"])) {
    return "long";
  }

  return "medium";
}

async function readAllowedGameTags() {
  const [questionsSource, gamesSource] = await Promise.all([
    readFile(QUESTIONS_PATH, "utf8"),
    readFile(GAMES_PATH, "utf8"),
  ]);
  const allowedTags = new Set<string>();

  for (const value of [
    ...extractQuestionOptionValues(questionsSource),
    ...extractExistingGameTags(gamesSource),
  ]) {
    allowedTags.add(value);
  }

  return allowedTags;
}

async function readExistingGeneratedGames() {
  try {
    const source = await readFile(OUTPUT_PATH, "utf8");
    const jsonValue = source.match(
      /export const generatedGames: Game\[] = ([\s\S]*?);\s*$/,
    )?.[1];

    if (!jsonValue) {
      return [];
    }

    const parsedValue = JSON.parse(jsonValue);

    return isGeneratedGames(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function isGeneratedGames(value: unknown): value is GeneratedGame[] {
  return (
    Array.isArray(value) &&
    value.every(
      (game) =>
        game &&
        typeof game === "object" &&
        "id" in game &&
        "title" in game &&
        "description" in game &&
        "coverUrl" in game &&
        "steamAppId" in game &&
        "steamUrl" in game &&
        "minPlayers" in game &&
        "maxPlayers" in game &&
        "tags" in game &&
        "difficulty" in game &&
        "sessionLength" in game &&
        "priceType" in game &&
        typeof game.id === "string" &&
        typeof game.title === "string" &&
        typeof game.description === "string" &&
        typeof game.coverUrl === "string" &&
        typeof game.steamAppId === "number" &&
        typeof game.steamUrl === "string" &&
        typeof game.minPlayers === "number" &&
        typeof game.maxPlayers === "number" &&
        isStringArray(game.tags) &&
        typeof game.difficulty === "string" &&
        typeof game.sessionLength === "string" &&
        typeof game.priceType === "string",
    )
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function extractQuestionOptionValues(source: string) {
  return Array.from(source.matchAll(/value:\s*"([^"]+)"/g), (match) => match[1]);
}

function extractExistingGameTags(source: string) {
  const tags = new Set<string>();
  const tagBlocks = source.matchAll(/tags:\s*\[([\s\S]*?)\]/g);

  for (const tagBlock of tagBlocks) {
    for (const tagMatch of tagBlock[1].matchAll(/"([^"]+)"/g)) {
      tags.add(tagMatch[1]);
    }
  }

  return Array.from(tags);
}

async function writeGeneratedGames(games: GeneratedGame[]) {
  const source = [
    'import type { Game } from "@/src/types/game";',
    "",
    `export const generatedGames: Game[] = ${JSON.stringify(games, null, 2)};`,
    "",
  ].join("");

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, source, "utf8");
}

async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const maxRateLimitRetries = options.maxRateLimitRetries ?? 0;
  let attempt = 0;

  while (true) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new HttpError(response.status, response.statusText);
      }

      return (await response.json()) as T;
    } catch (error: unknown) {
      if (
        error instanceof HttpError &&
        error.status === 429 &&
        attempt < maxRateLimitRetries
      ) {
        attempt += 1;
        options.onRateLimitRetry?.();
        await delay(RATE_LIMIT_RETRY_DELAY_MS);
        continue;
      }

      throw error;
    }
  }
}

function includesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function readPositiveIntEnv(name: string, fallbackValue: number) {
  const value = Number(process.env[name]);

  return Number.isInteger(value) && value > 0 ? value : fallbackValue;
}

function readLimit() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const argValue = limitArg?.split("=")[1];
  const value = Number(argValue ?? process.env.STEAM_GAMES_OUTPUT_LIMIT);

  return Number.isInteger(value) && value > 0 ? value : DEFAULT_LIMIT;
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function toRelative(filePath: string) {
  return path.relative(ROOT_DIR, filePath);
}
