"use client";

import { useRouter } from "next/navigation";
import { generateRoomCode } from "./utils/rooms";

export default function HomePage() {
  const router = useRouter();

  function handleCreateRoom() {
    const code = generateRoomCode();
    router.push(`/room/${code}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="flex max-w-md flex-col items-center text-center">
        <h1 className="text-5xl font-bold tracking-tight">Game Match</h1>
        <p className="mt-4 text-lg text-gray-500">
          Find the perfect game for your squad
        </p>
        <button
          type="button"
          onClick={handleCreateRoom}
          className="mt-8 rounded-lg bg-foreground px-6 py-3 font-semibold text-background transition hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background"
        >
          Create Room
        </button>
      </section>
    </main>
  );
}
