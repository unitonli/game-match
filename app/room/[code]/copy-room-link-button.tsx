"use client";

import { useState, useSyncExternalStore } from "react";

type CopyRoomLinkButtonProps = {
  roomPath: string;
};

export function CopyRoomLinkButton({ roomPath }: CopyRoomLinkButtonProps) {
  const origin = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => "",
  );
  const roomLink = origin ? new URL(roomPath, origin).toString() : roomPath;
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(roomLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.12] bg-white/[0.04] px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0b0b0b]"
    >
      {copied ? "Ссылка скопирована" : "Скопировать ссылку"}
    </button>
  );
}
