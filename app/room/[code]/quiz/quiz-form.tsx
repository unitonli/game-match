"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { questions } from "@/src/data/questions";
import { getQuizAnswersStorageKey } from "@/src/lib/quizStorage";

type QuizFormProps = {
  roomCode: string;
};

type QuizAnswers = Record<string, string[]>;

export function QuizForm({ roomCode }: QuizFormProps) {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.key] ?? [];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progress = useMemo(
    () => ((currentQuestionIndex + 1) / questions.length) * 100,
    [currentQuestionIndex],
  );

  function handleSelect(optionValue: string) {
    setAnswers((currentAnswers) => {
      if (currentQuestion.type === "single-select") {
        return {
          ...currentAnswers,
          [currentQuestion.key]: [optionValue],
        };
      }

      const values = currentAnswers[currentQuestion.key] ?? [];
      const nextValues = values.includes(optionValue)
        ? values.filter((value) => value !== optionValue)
        : [...values, optionValue];

      return {
        ...currentAnswers,
        [currentQuestion.key]: nextValues,
      };
    });
  }

  function handleBack() {
    setCurrentQuestionIndex((index) => Math.max(index - 1, 0));
  }

  function handleNext() {
    if (isLastQuestion) {
      sessionStorage.setItem(
        getQuizAnswersStorageKey(roomCode),
        JSON.stringify(answers),
      );
      router.push(`/room/${roomCode}/results`);
      return;
    }

    setCurrentQuestionIndex((index) =>
      Math.min(index + 1, questions.length - 1),
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <section className="w-full max-w-2xl rounded-2xl border border-foreground/10 bg-background p-6 shadow-sm sm:p-10">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 text-sm text-foreground/55">
            <span>Комната {roomCode}</span>
            <span>
              {currentQuestionIndex + 1} из {questions.length}
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-foreground transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium uppercase text-foreground/50">
            Вопрос {currentQuestionIndex + 1}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {currentQuestion.title}
          </h1>
        </div>

        <div className="mt-8 grid gap-3">
          {currentQuestion.options.map((option) => {
            const isSelected = currentAnswer.includes(option.value);

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleSelect(option.value)}
                className={[
                  "flex min-h-14 items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background sm:text-base",
                  isSelected
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground/12 bg-background text-foreground hover:border-foreground/35 hover:bg-foreground/[0.04]",
                ].join(" ")}
              >
                <span>{option.label}</span>
                <span
                  className={[
                    "ml-4 h-3 w-3 rounded-full border",
                    isSelected
                      ? "border-background bg-background"
                      : "border-foreground/30",
                  ].join(" ")}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentQuestionIndex === 0}
            className="inline-flex min-h-12 items-center justify-center rounded-lg border border-foreground/15 px-5 text-sm font-semibold text-foreground transition hover:border-foreground/35 hover:bg-foreground/[0.04] focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40"
          >
            Назад
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background"
          >
            {isLastQuestion ? "Завершить" : "Далее"}
          </button>
        </div>
      </section>
    </main>
  );
}
