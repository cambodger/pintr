import { notFound } from "next/navigation";
import { devLogin } from "./actions";

// A handful of simulated mates so flows can be tested from several accounts
// without magic-link round trips.
const TEST_USERS = Array.from({ length: 5 }, (_, i) => ({
  email: `andrewtjones85+pintrdev${i + 1}@gmail.com`,
  label: `dev${i + 1}`,
}));

/**
 * Dev-only user switcher. 404s outside `npm run dev`.
 */
export default async function DevLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (
    process.env.NODE_ENV !== "development" ||
    !process.env.DEV_LOGIN_PASSWORD
  ) {
    notFound();
  }

  const { status } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Dev login</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Switch test user. Development only.
      </p>

      {status === "failed" && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          Sign-in failed — check DEV_LOGIN_PASSWORD matches the database.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {TEST_USERS.map((u) => (
          <form key={u.email} action={devLogin}>
            <input type="hidden" name="email" value={u.email} />
            <button
              type="submit"
              className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-left text-sm font-medium hover:border-amber-500 hover:bg-amber-50 dark:border-neutral-700 dark:hover:bg-amber-950"
            >
              {u.label}
            </button>
          </form>
        ))}
      </div>
    </main>
  );
}
