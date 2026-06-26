import type { Metadata } from "next";
import { sendMagicLink } from "./actions";

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
        <h1 className="text-4xl font-bold tracking-tight text-amber-600">
          pintr 🍺
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
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
            className="rounded-lg border border-neutral-300 px-3 py-2 text-base outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-neutral-700 dark:bg-neutral-900"
          />
          <button
            type="submit"
            className="mt-1 rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-white hover:bg-amber-700 active:bg-amber-800"
          >
            Email me a sign-in link
          </button>
        </form>

        {message && (
          <p
            role="status"
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              message.tone === "ok"
                ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
                : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </main>
  );
}
