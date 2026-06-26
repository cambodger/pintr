import type { Metadata } from "next";
import { sendMagicLink } from "./actions";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = { title: "Sign in" };

const STATUS_MESSAGES: Record<string, { tone: "ok" | "error"; text: string }> =
  {
    sent: {
      tone: "ok",
      text: "Right, check your email, ya muppet — your sign-in link's on its way.",
    },
    invite: {
      tone: "ok",
      text: "Sign in below and we'll drop you straight into your mate's group.",
    },
    invalid_email: {
      tone: "error",
      text: "That's not an email address, ya daft cunt. Try again.",
    },
    send_failed: {
      tone: "error",
      text: "Bollocks — couldn't send the link. Have another go in a minute.",
    },
    invalid_link: {
      tone: "error",
      text: "That link's knackered or expired, ya slow cunt. Get a fresh one.",
    },
  };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const message = status ? STATUS_MESSAGES[status] : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Wordmark height={40} />
        <p className="mt-1 text-sm text-[var(--muted)]">
          Who&apos;s nearby for pints, ya cunt?
        </p>

        <form action={sendMagicLink} className="mt-8 flex flex-col gap-3">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="input"
          />
          <button
            type="submit"
            className="mt-1 btn-amber"
          >
            Send me the link
          </button>
        </form>

        {message && (
          <p
            role="status"
            className={`mt-4 banner ${
              message.tone === "ok" ? "banner-ok" : "banner-bad"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </main>
  );
}
