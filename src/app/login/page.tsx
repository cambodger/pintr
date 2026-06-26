import type { Metadata } from "next";
import { sendMagicLink } from "./actions";
import { Wordmark } from "@/components/wordmark";

export const metadata: Metadata = { title: "Sign in" };

const STATUS_MESSAGES: Record<string, { tone: "ok" | "error"; text: string }> =
  {
    sent: {
      tone: "ok",
      text: "Check your email — we've sent you a sign-in link.",
    },
    invalid_email: {
      tone: "error",
      text: "That doesn't look like an email address.",
    },
    send_failed: {
      tone: "error",
      text: "Couldn't send the link. Try again in a minute.",
    },
    invalid_link: {
      tone: "error",
      text: "That sign-in link is invalid or has expired. Request a new one.",
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
          The SEXY way to know when your mates are in the same city.
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
            Email me a sign-in link
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
