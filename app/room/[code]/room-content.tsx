"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  addRoomPlayer,
  getRoomNicknameStorageKey,
  readRoomPlayers,
  type RoomPlayer,
} from "@/src/lib/roomParticipantStorage";
import { CopyRoomLinkButton } from "./copy-room-link-button";

type RoomContentProps = {
  code: string;
};

export function RoomContent({ code }: RoomContentProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const currentPlayer = players.find((player) => player.nickname === nickname);
  const isQuizCompleted = currentPlayer?.completedQuiz ?? false;
  const totalPlayers = players.length;
  const completedPlayers = players.filter(
    (player) => player.completedQuiz,
  ).length;
  const hasPlayers = totalPlayers > 0;
  const allPlayersCompleted = hasPlayers && completedPlayers === totalPlayers;
  const isWaitingForPlayers = hasPlayers && completedPlayers < totalPlayers;

  const roomPath = `/room/${code}`;
  const quizPath = `${roomPath}/quiz`;
  const resultsPath = `${roomPath}/results`;
  const steps = [
    "Каждый отвечает на вопросы",
    "Мы сравниваем предпочтения",
    "Показываем топ игр для компании",
  ];

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setNickname(localStorage.getItem(getRoomNicknameStorageKey(code)));
      setPlayers(readRoomPlayers(code));
      setIsInitialized(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [code]);

  function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedNickname = nicknameInput.trim();

    if (!trimmedNickname) {
      return;
    }

    const nicknameStorageKey = getRoomNicknameStorageKey(code);
    localStorage.setItem(nicknameStorageKey, trimmedNickname);
    const nextPlayers = addRoomPlayer(code, trimmedNickname);
    setNickname(trimmedNickname);
    setPlayers(nextPlayers);
    setNicknameInput("");
  }

  if (!isInitialized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 py-12 text-white sm:px-8">
        <p className="text-sm text-white/45">Загружаем комнату...</p>
      </main>
    );
  }

  if (!nickname) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 py-12 text-white sm:px-8">
        <section className="w-full max-w-xl rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-6 shadow-sm shadow-black/30 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
            Комната {code}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Присоединиться к комнате
          </h1>
          <p className="mt-4 text-base leading-7 text-white/60">
            Введите никнейм, чтобы участвовать в подборе игр
          </p>

          <form onSubmit={handleJoin} className="mt-7 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-white/45">
                Никнейм
              </span>
              <input
                type="text"
                value={nicknameInput}
                onChange={(event) => setNicknameInput(event.target.value)}
                placeholder="Введите никнейм"
                className="min-h-12 rounded-xl border border-white/[0.08] bg-[#050505] px-4 text-base text-white outline-none transition placeholder:text-white/28 focus:border-white/30 focus:ring-2 focus:ring-white/20"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center rounded-[10px] bg-white px-5 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-white/88 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0b0b0b]"
            >
              Продолжить
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-8 text-white sm:px-8">
      <section className="mx-auto flex min-h-[70vh] w-full max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-6 shadow-sm shadow-black/30 sm:p-8 lg:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
              Комната {code}
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Соберите компанию
            </h1>
            <p className="mt-4 text-lg font-semibold text-lime-400">
              Привет, {nickname} 👋
            </p>
            {isQuizCompleted ? (
              <p className="mt-3 rounded-xl border border-lime-400/25 bg-lime-400/10 px-4 py-3 text-sm font-semibold text-lime-400">
                Ваш опрос завершен
              </p>
            ) : null}
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
              Скопируйте ссылку, отправьте друзьям и пройдите короткий опрос,
              чтобы подобрать игру для всех.
            </p>

            <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
              <p className="text-sm font-semibold text-white/45">
                Ссылка комнаты
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <p className="min-h-12 flex-1 break-all rounded-xl border border-white/[0.08] bg-[#050505] px-4 py-3 font-mono text-sm text-white/75">
                  {roomPath}
                </p>
                <CopyRoomLinkButton roomPath={roomPath} />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <p className="text-sm font-semibold text-white/45">
                  Участники
                </p>
                <p className="text-sm font-semibold text-white/65">
                  {completedPlayers} из {totalPlayers} завершили опрос
                </p>
              </div>
              <div className="mt-3 grid gap-2">
                {players.map((player) => (
                  <div
                    key={player.nickname}
                    className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#050505] px-4 py-3"
                  >
                    <span className="font-medium text-white/78">
                      {player.nickname}
                    </span>
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-bold",
                        player.completedQuiz
                          ? "bg-lime-400/10 text-lime-400"
                          : "bg-white/[0.06] text-white/45",
                      ].join(" ")}
                    >
                      {player.completedQuiz ? "Готов" : "Ожидаем"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {allPlayersCompleted ? (
              <div className="mt-5 rounded-2xl border border-lime-400/25 bg-lime-400/10 p-4 sm:p-5">
                <h2 className="text-xl font-bold tracking-tight text-lime-400">
                  Все готовы
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/68">
                  Все участники прошли опрос. Можно смотреть общий результат.
                </p>
                <Link
                  href={resultsPath}
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[10px] bg-lime-400 px-5 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-lime-300 focus:outline-none focus:ring-2 focus:ring-lime-300 focus:ring-offset-2 focus:ring-offset-[#0b0b0b] sm:w-auto"
                >
                  Показать результаты
                </Link>
              </div>
            ) : null}

            {isWaitingForPlayers ? (
              <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Ожидаем остальных
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Результаты появятся, когда все участники пройдут опрос.
                </p>
                <p className="mt-3 text-sm font-semibold text-white/72">
                  {completedPlayers} из {totalPlayers} завершили опрос
                </p>
              </div>
            ) : null}

            <Link
              href={quizPath}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-[10px] bg-white px-5 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-white/88 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0b0b0b] sm:w-auto"
            >
              {isQuizCompleted ? "Изменить ответы" : "Пройти опрос"}
            </Link>
          </div>

          <aside className="rounded-2xl border border-white/[0.08] bg-[#101010] p-6 shadow-sm shadow-black/30 sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Как это работает
            </h2>
            <div className="mt-6 grid gap-4">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="flex gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-lime-400/35 bg-lime-400/10 text-sm font-bold text-lime-400">
                    {index + 1}
                  </span>
                  <p className="pt-1.5 text-sm font-medium leading-6 text-white/72">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
