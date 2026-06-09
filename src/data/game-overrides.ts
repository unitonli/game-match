export type GameOverride = {
  addTags?: string[];
  removeTags?: string[];
  minPlayers?: number;
  maxPlayers?: number;
  difficulty?: "easy" | "medium" | "hard";
  sessionLength?: "short" | "medium" | "long";
};

export const gameOverrides: Record<number, GameOverride> = {
  413150: {
    addTags: [
      "co_op",
      "teamwork",
      "chill",
      "sandbox",
      "simulator",
      "resource_management",
    ],
    removeTags: ["horror", "tense"],
    minPlayers: 1,
    maxPlayers: 4,
    difficulty: "easy",
    sessionLength: "long",
  },
  242760: {
    addTags: [
      "co_op",
      "teamwork",
      "survival",
      "horror",
      "tense",
      "sandbox",
      "crafting",
      "base_building",
      "resource_management",
    ],
    minPlayers: 1,
    maxPlayers: 8,
    difficulty: "medium",
    sessionLength: "long",
  },
  275850: {
    addTags: [
      "co_op",
      "teamwork",
      "survival",
      "sandbox",
      "world_exploration",
      "resource_management",
      "chill",
    ],
    minPlayers: 1,
    maxPlayers: 4,
    difficulty: "medium",
    sessionLength: "long",
  },
  227300: {
    addTags: ["co_op", "chill", "racing", "simulator", "sandbox"],
    removeTags: ["rpg", "character_progression"],
    minPlayers: 1,
    maxPlayers: 8,
    difficulty: "easy",
    sessionLength: "medium",
  },
  244210: {
    addTags: ["pvp", "competitive", "racing", "simulator"],
    removeTags: ["horror", "tense"],
    minPlayers: 1,
    maxPlayers: 16,
    difficulty: "medium",
    sessionLength: "short",
  },
  438100: {
    addTags: ["co_op", "teamwork", "chill", "fun_and_chaotic", "sandbox", "simulator"],
    removeTags: ["horror", "tense"],
    minPlayers: 1,
    maxPlayers: 10,
    difficulty: "easy",
    sessionLength: "medium",
  },
  261550: {
    addTags: ["pvp", "competitive", "sandbox", "strategy", "rpg", "character_progression"],
    minPlayers: 1,
    maxPlayers: 10,
    difficulty: "medium",
    sessionLength: "long",
  },
  284160: {
    addTags: ["pvp", "competitive", "fun_and_chaotic", "racing", "simulator", "sandbox"],
    removeTags: ["horror", "tense"],
    minPlayers: 1,
    maxPlayers: 4,
    difficulty: "medium",
    sessionLength: "short",
  },
  48700: {
    addTags: ["pvp", "competitive", "sandbox", "strategy", "rpg", "character_progression"],
    minPlayers: 1,
    maxPlayers: 10,
    difficulty: "medium",
    sessionLength: "long",
  },
  1245620: {
    addTags: ["co_op", "pvp", "hardcore", "tense", "rpg", "character_progression"],
    maxPlayers: 4,
    difficulty: "hard",
    sessionLength: "long",
  },
  1086940: {
    addTags: ["co_op", "teamwork", "strategy", "rpg", "character_progression"],
    maxPlayers: 4,
    difficulty: "medium",
    sessionLength: "long",
  },
  1293830: {
    addTags: ["co_op", "pvp", "racing", "simulator", "chill"],
    maxPlayers: 4,
    difficulty: "easy",
    sessionLength: "medium",
  },
  1551360: {
    addTags: ["co_op", "pvp", "racing", "simulator", "chill"],
    maxPlayers: 4,
    difficulty: "easy",
    sessionLength: "medium",
  },
};
