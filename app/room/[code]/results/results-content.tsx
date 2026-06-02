"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { getSteamHeaderImageUrl } from "@/src/lib/getSteamImageUrl";
import { matchGames, type MatchGamesAnswers } from "@/src/lib/matchGames";
import { getQuizAnswersStorageKey } from "@/src/lib/quizStorage";

type ResultsContentProps = {
  roomCode: string;
};

export function ResultsContent({ roomCode }: ResultsContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const storageKey = getQuizAnswersStorageKey(roomCode);
  const storedAnswers = useSyncExternalStore(
    subscribeToStorage,
    () => sessionStorage.getItem(storageKey),
    () => null,
  );
  const answers = useMemo(() => parseAnswers(storedAnswers), [storedAnswers]);
  const results = useMemo(() => matchGames(answers), [answers]);
  const hiddenResultsCount = Math.max(results.length - 3, 0);
  const visibleResults = isExpanded ? results : results.slice(0, 3);
  const shouldShowToggle = hiddenResultsCount > 0;

  if (!storedAnswers) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 py-12 text-white">
        <section className="w-full max-w-xl rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-8 text-center shadow-sm sm:p-10">
          <p className="text-sm font-medium uppercase text-white/45">
            Комната {roomCode}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Сначала пройдите опрос
          </h1>
          <p className="mt-3 text-base leading-7 text-white/55">
            Чтобы подобрать игры, нужно ответить на несколько вопросов.
          </p>
          <Link
            href={`/room/${roomCode}/quiz`}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-[10px] bg-white px-5 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-white/88 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0b0b0b] sm:w-auto"
          >
            Пройти опрос
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-8 text-white sm:px-8">
      <section className="mx-auto w-full max-w-[1500px]">
        <div className="mb-7">
          <p className="text-sm font-medium uppercase text-white/45">
            Комната {roomCode}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
            🏆 Топ 10 игр для вашей компании
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-white/55">
            Вот топ 10 игр, которые лучше всего подходят под выбранные
            предпочтения.
          </p>
        </div>

        <div className="grid gap-4">
          {visibleResults.map(({ game, score, reasons, conflicts }, index) => {
            const hasSteamUrl = Boolean(game.steamUrl);

            return (
              <article
                key={game.id}
                className="grid gap-5 rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-sm shadow-black/30 md:grid-cols-[420px_minmax(0,1fr)_240px] md:items-center md:gap-9 md:p-6"
              >
                <div className="aspect-video overflow-hidden rounded-xl bg-[#151515] md:w-[420px]">
                  <img
                    src={getSteamHeaderImageUrl(game.steamAppId)}
                    alt={game.title}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.hidden = true;
                    }}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <RankBadge rank={index + 1} />
                      <h2 className="text-2xl font-bold tracking-tight text-white sm:text-[28px] sm:leading-tight">
                        {game.title}
                      </h2>
                    </div>
                    <div className="shrink-0 md:hidden">
                      <ScoreBadge score={score} />
                    </div>
                  </div>

                  <p className="mt-3 max-w-[650px] text-[15px] leading-6 text-white/58 sm:text-base">
                    {game.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {game.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/[0.12] bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-white/62"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <ResultList
                      title="Причины"
                      items={reasons}
                      emptyText="Нет явных совпадений"
                      tone="positive"
                    />
                    <ResultList
                      title="Конфликты"
                      items={conflicts}
                      emptyText="Конфликтов нет"
                      tone="negative"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 md:items-center">
                  <div className="hidden w-full rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.025] p-6 text-center md:block">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/42">
                      Score
                    </p>
                    <p className="mt-3 text-[80px] font-bold leading-none text-lime-400">
                      {score}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white/38">
                      /100
                    </p>
                  </div>

                  {hasSteamUrl ? (
                    <a
                      href={game.steamUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 w-full items-center justify-center rounded-[10px] bg-white px-4 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-white/88 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0b0b0b]"
                    >
                      Открыть в Steam
                    </a>
                  ) : (
                    <span className="inline-flex h-11 w-full cursor-not-allowed items-center justify-center rounded-[10px] bg-white/20 px-4 text-sm font-bold text-white/35">
                      Открыть в Steam
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {shouldShowToggle ? (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setIsExpanded((currentValue) => !currentValue)}
              className="inline-flex min-h-11 items-center justify-center rounded-[10px] border border-white/[0.12] bg-white/[0.04] px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#050505]"
            >
              {isExpanded
                ? "Скрыть остальные"
                : `Показать еще ${hiddenResultsCount} игр`}
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function ResultList({
  title,
  items,
  emptyText,
  tone,
}: {
  title: string;
  items: string[];
  emptyText: string;
  tone: "positive" | "negative";
}) {
  const isPositive = tone === "positive";

  return (
    <div>
      <p
        className={[
          "text-sm font-semibold",
          isPositive ? "text-emerald-400" : "text-red-400",
        ].join(" ")}
      >
        {title}
      </p>
      {items.length > 0 ? (
        <ul className="mt-1.5 space-y-1 text-sm leading-5 text-white/58">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              {isPositive ? (
                <span className="shrink-0 font-semibold text-emerald-400">
                  ✓
                </span>
              ) : null}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-sm text-white/42">{emptyText}</p>
      )}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <div className="shrink-0 rounded-full border border-lime-400/35 bg-lime-400/10 px-3 py-1.5 text-sm font-bold text-lime-400">
      {score} / 100
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const classNameByRank =
    rank === 1
      ? "border-yellow-300/50 bg-yellow-300 text-black"
      : rank === 2
        ? "border-zinc-300/40 bg-zinc-300 text-black"
        : rank === 3
          ? "border-amber-600/50 bg-amber-700 text-white"
          : "border-white/[0.12] bg-white/[0.04] text-white/70";

  return (
    <span
      className={[
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
        classNameByRank,
      ].join(" ")}
    >
      {rank}
    </span>
  );
}

function subscribeToStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
  };
}

function parseAnswers(value: string | null): MatchGamesAnswers {
  if (!value) {
    return {};
  }

  try {
    const parsedValue = JSON.parse(value);

    return isAnswersRecord(parsedValue) ? parsedValue : {};
  } catch {
    return {};
  }
}

function isAnswersRecord(value: unknown): value is MatchGamesAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(
    (answer) =>
      typeof answer === "string" ||
      (Array.isArray(answer) &&
        answer.every((answerValue) => typeof answerValue === "string")),
  );
}
