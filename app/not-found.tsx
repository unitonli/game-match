import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 py-12 text-white sm:px-8">
      <section className="w-full max-w-xl rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-8 text-center shadow-sm shadow-black/30 sm:p-10">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-white/45">
          Game Match
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Страница не найдена
        </h1>
        <p className="mt-4 text-base leading-7 text-white/58">
          Такой страницы нет или ссылка устарела.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-[10px] bg-white px-6 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-white/88 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0b0b0b] sm:w-auto"
        >
          На главную
        </Link>
      </section>
    </main>
  );
}
