"use client";

import { useRouter } from "next/navigation";
import { generateRoomCode } from "./utils/rooms";

export default function HomePage() {
  const router = useRouter();
  const steps = [
    "Создайте комнату",
    "Каждый пройдет короткий опрос",
    "Получите топ игр с объяснением",
  ];
  const features = [
    {
      title: "Без регистрации",
      description: "Создавайте комнату и делитесь ссылкой без аккаунтов.",
    },
    {
      title: "Для компании друзей",
      description: "Учитываем предпочтения всех участников комнаты.",
    },
    {
      title: "С объяснением результата",
      description: "Показываем, почему игра попала в рекомендации.",
    },
  ];

  function handleCreateRoom() {
    const code = generateRoomCode();
    router.push(`/room/${code}`);
  }

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-8 text-white sm:px-8">
      <section className="mx-auto w-full max-w-6xl">
        <div className="grid min-h-[70vh] items-center gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-6 shadow-sm shadow-black/30 sm:p-8 lg:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
              Game Match
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Найдите игру для всей компании
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
              Создайте комнату, отправьте ссылку друзьям и получите топ игр,
              которые подойдут большинству.
            </p>
            <button
              type="button"
              onClick={handleCreateRoom}
              className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-[10px] bg-white px-6 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-white/88 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0b0b0b] sm:w-auto"
            >
              Создать комнату
            </button>
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

        <div className="grid gap-4 pb-8 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-sm shadow-black/30"
            >
              <h3 className="text-xl font-bold tracking-tight text-white">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-white/58">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
