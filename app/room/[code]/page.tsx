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

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <section className="w-full max-w-2xl rounded-2xl border border-foreground/10 bg-background p-6 shadow-sm sm:p-10">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm font-medium uppercase text-foreground/50">
              Комната
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Комната {code}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-foreground/60">
              Поделитесь ссылкой с участниками и переходите к опросу, когда все
              готовы.
            </p>
          </div>

          <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4">
            <p className="text-sm font-medium text-foreground/50">
              Ссылка комнаты
            </p>
            <p className="mt-2 break-all font-mono text-sm text-foreground sm:text-base">
              {roomPath}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <CopyRoomLinkButton roomPath={roomPath} />
            <Link
              href={quizPath}
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background"
            >
              Пройти опрос
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
