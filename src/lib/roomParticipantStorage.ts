export const ROOM_PARTICIPANT_STORAGE_EVENT =
  "game-match:room-participant-updated";

export type RoomPlayer = {
  nickname: string;
  completedQuiz: boolean;
};

export function getRoomNicknameStorageKey(roomCode: string) {
  return `room_${roomCode}_nickname`;
}

export function getRoomPlayersStorageKey(roomCode: string) {
  return `room_${roomCode}_players`;
}

export function getRoomParticipantAnswersStorageKey(
  roomCode: string,
  nickname: string,
) {
  return `room_${roomCode}_answers_${nickname}`;
}

export function getRoomParticipantCompletedStorageKey(
  roomCode: string,
  nickname: string,
) {
  return `room_${roomCode}_completed_${nickname}`;
}

export function readRoomPlayers(roomCode: string): RoomPlayer[] {
  const value = localStorage.getItem(getRoomPlayersStorageKey(roomCode));

  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value);

    return isRoomPlayers(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

export function addRoomPlayer(roomCode: string, nickname: string) {
  const players = readRoomPlayers(roomCode);
  const hasPlayer = players.some((player) => player.nickname === nickname);

  if (hasPlayer) {
    return players;
  }

  const nextPlayers = [...players, { nickname, completedQuiz: false }];
  writeRoomPlayers(roomCode, nextPlayers);

  return nextPlayers;
}

export function updateRoomPlayerCompletion(
  roomCode: string,
  nickname: string,
  completedQuiz: boolean,
) {
  const players = readRoomPlayers(roomCode);
  const hasPlayer = players.some((player) => player.nickname === nickname);
  const nextPlayers = hasPlayer
    ? players.map((player) =>
        player.nickname === nickname ? { ...player, completedQuiz } : player,
      )
    : [...players, { nickname, completedQuiz }];

  writeRoomPlayers(roomCode, nextPlayers);

  return nextPlayers;
}

function writeRoomPlayers(roomCode: string, players: RoomPlayer[]) {
  localStorage.setItem(getRoomPlayersStorageKey(roomCode), JSON.stringify(players));
}

function isRoomPlayers(value: unknown): value is RoomPlayer[] {
  return (
    Array.isArray(value) &&
    value.every(
      (player) =>
        player &&
        typeof player === "object" &&
        "nickname" in player &&
        "completedQuiz" in player &&
        typeof player.nickname === "string" &&
        typeof player.completedQuiz === "boolean",
    )
  );
}
