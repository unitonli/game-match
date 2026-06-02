export type Game = {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  steamUrl: string;
  minPlayers: number;
  maxPlayers: number;
  tags: string[];
  difficulty: string;
  sessionLength: string;
  priceType: string;
};
