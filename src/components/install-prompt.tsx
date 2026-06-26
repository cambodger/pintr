"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pintr:install-nudge-dismissed";

/**
 * "Bung it on your home screen" nudge. An installed PWA makes login a
 * once-per-device thing (and is the prerequisite for iOS push later, SPEC §7).
 *
 * Two paths: Chrome/Android/desktop Chromium fire `beforeinstallprompt`, which
 * we stash and replay behind our own button for a true one-tap install. iOS
 * Safari never fires it, so there we show the manual Share → Add to Home
 * Screen steps instead. Hidden once installed (standalone display-mode) or
 * after the user waves it away (remembered in localStorage).
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [iosHint, setIosHint] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* private mode — just carry on */
    }

    const nav = window.navigator as Navigator & { standalone?: boolean };
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;
    if (installed) return;

    const onPrompt = (e: Event) => {
      e.preventDefault(); // stop Chrome's default mini-infobar
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt as EventListener);

    // iOS Safari has no install event — detect it and show manual steps.
    const ua = nav.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIOS && isSafari) {
      setIosHint(true);
      setShow(true);
    }

    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        onPrompt as EventListener,
      );
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode — it'll just ask again next time */
    }
    setShow(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="mt-4 card p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          🍺
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Bung pintr on your home screen</p>
          {iosHint ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              Tap <span aria-hidden>⬆️</span> Share, then{" "}
              <strong>Add to Home Screen</strong>, ya muppet — one tap to the
              pub from then on, no browser faff.
            </p>
          ) : (
            <p className="mt-1 text-sm text-[var(--muted)]">
              Install the daft little thing — no app store, no faff. One tap
              from your phone straight to the pub-finder.
            </p>
          )}
          <div className="mt-3 flex items-center gap-4">
            {!iosHint && (
              <button type="button" onClick={install} className="btn-amber">
                Install, ya sexy cunt
              </button>
            )}
            <button type="button" onClick={dismiss} className="text-sm link">
              Nah, do one
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
