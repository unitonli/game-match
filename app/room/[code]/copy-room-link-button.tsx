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
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex min-h-12 items-center justify-center rounded-lg border border-foreground/15 px-5 text-sm font-semibold text-foreground transition hover:border-foreground/35 hover:bg-foreground/[0.04] focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2 focus:ring-offset-background"
    >
      {copied ? "Ссылка скопирована" : "Скопировать ссылку"}
    </button>
  );
}
