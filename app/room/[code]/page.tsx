import Link from "next/link";
import { CopyRoomLinkButton } from "./copy-room-link-button";

type RoomPageProps = {
  params: Promise<{
    code: string;
  }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { code } = await params;
  const roomPath = `/room/${code}`;
  const quizPath = `${roomPath}/quiz`;
  const steps = [
    "Каждый отвечает на вопросы",
    "Мы сравниваем предпочтения",
    "Показываем топ игр для компании",
  ];

  return (
    <main className="min-h-screen bg-[#050505] px-6 py-8 text-white sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-6 shadow-sm shadow-black/30 sm:p-8 lg:p-10">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
              Комната {code}
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Соберите компанию
            </h1>
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

            <Link
              href={quizPath}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-[10px] bg-white px-5 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-white/88 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0b0b0b] sm:w-auto"
            >
              Пройти опрос
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
