"use client";

import { useMemo, useSyncExternalStore } from "react";
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
            Спасибо, ваши ответы сохранены
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-foreground/60">
            Вот top 10 игр, которые лучше всего подходят под выбранные
            предпочтения.
          </p>
        </div>

        <div className="grid gap-4">
          {results.map(({ game, score, reasons, conflicts }) => (
            <article
              key={game.id}
              className="rounded-2xl border border-foreground/10 bg-background p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    {game.title}
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/65">
                    {game.description}
                  </p>
                </div>
                <div className="shrink-0 rounded-xl border border-foreground/10 px-4 py-3 text-center">
                  <p className="text-3xl font-semibold text-foreground">
                    {score}
                  </p>
                  <p className="text-xs font-medium uppercase text-foreground/50">
                    score
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {game.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-foreground/10 px-3 py-1 text-xs font-medium text-foreground/65"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <ResultList title="Причины" items={reasons} emptyText="Нет явных совпадений" />
                <ResultList title="Конфликты" items={conflicts} emptyText="Конфликтов нет" />
              </div>

              <a
                href={game.steamUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-semibold text-background transition hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background"
              >
                Открыть в Steam
              </a>
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
    <div className="rounded-xl bg-foreground/[0.03] p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm text-foreground/65">
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
