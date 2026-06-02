export function getQuizAnswersStorageKey(roomCode: string) {
  return `game-match:room:${roomCode}:answers`;
}
