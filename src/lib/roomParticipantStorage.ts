export const ROOM_PARTICIPANT_STORAGE_EVENT =
  "game-match:room-participant-updated";

export function getRoomNicknameStorageKey(roomCode: string) {
  return `room_${roomCode}_nickname`;
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
