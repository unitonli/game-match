"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getSteamHeaderImageUrl } from "@/src/lib/getSteamImageUrl";
import { matchGames, type MatchGamesAnswers } from "@/src/lib/matchGames";
import { getQuizAnswersStorageKey } from "@/src/lib/quizStorage";

type ResultsContentProps = {
  roomCode: string;
};

export function ResultsContent({ roomCode }: ResultsContentProps) {
  const storageKey = getQuizAnswersStorageKey(roomCode);
  const storedAnswers = useSyncExternalStore(
    subscribeToStorage,
    () => sessionStorage.getItem(storageKey),
    () => null,
  );
  const answers = useMemo(
    () => parseAnswers(storedAnswers),
    [storedAnswers],
  );
  const results = useMemo(() => matchGames(answers), [answers]);

  if (!storedAnswers) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <section className="w-full max-w-xl rounded-2xl border border-foreground/10 bg-background p-8 text-center shadow-sm sm:p-10">
          <p className="text-sm font-medium uppercase text-foreground/50">
            Комната {roomCode}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Ответы для этой комнаты не найдены
          </h1>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <section className="mx-auto w-full max-w-5xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase text-foreground/50">
            Комната {roomCode}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Ваши совпадения
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-foreground/60">
            Вот топ 10 игр, которые лучше всего подходят под выбранные
            предпочтения.
          </p>
        </div>

        <div className="grid gap-3">
          {results.map(({ game, score, reasons, conflicts }) => (
            <article
              key={game.id}
              className="grid gap-4 rounded-2xl border border-foreground/10 bg-background p-4 shadow-sm lg:grid-cols-[340px_minmax(0,1fr)_150px] lg:items-stretch"
            >
              <div className="overflow-hidden rounded-xl bg-foreground/[0.04] lg:w-[340px]">
                <img
                  src={getSteamHeaderImageUrl(game.steamAppId)}
                  alt={game.title}
                  className="aspect-video w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.hidden = true;
                  }}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3 lg:block">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                      {game.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-foreground/65">
                      {game.description}
                    </p>
                  </div>
                  <div className="shrink-0 lg:hidden">
                    <ScoreWidget score={score} compact />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {game.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-foreground/10 px-2.5 py-1 text-xs font-medium text-foreground/65"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ResultList
                    title="Причины"
                    items={reasons}
                    emptyText="Нет явных совпадений"
                  />
                  <ResultList
                    title="Конфликты"
                    items={conflicts}
                    emptyText="Конфликтов нет"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:justify-between">
                <div className="hidden lg:block">
                  <ScoreWidget score={score} />
                </div>
                <a
                  href={game.steamUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-background"
                >
                  Открыть в Steam
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function ResultList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="rounded-xl bg-foreground/[0.03] p-3">
      <p className="text-xs font-semibold uppercase text-foreground/55">
        {title}
      </p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm leading-5 text-foreground/65">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-foreground/45">{emptyText}</p>
      )}
    </div>
  );
}

function ScoreWidget({
  score,
  compact = false,
}: {
  score: number;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-emerald-300/40 bg-gradient-to-br from-emerald-300/20 via-emerald-400/10 to-transparent text-center shadow-sm shadow-emerald-500/10",
        compact ? "px-3 py-2" : "px-4 py-5",
      ].join(" ")}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
        Score
      </p>
      <p
        className={[
          "font-semibold leading-none text-emerald-500",
          compact ? "mt-1 text-3xl" : "mt-2 text-5xl",
        ].join(" ")}
      >
        {score}
      </p>
      <p className="mt-1 text-xs font-semibold text-foreground/45">/100</p>
    </div>
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
