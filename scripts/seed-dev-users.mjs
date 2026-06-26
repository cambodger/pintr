// Dev-only: create the +pintrdevN test users (email + password, pre-confirmed)
// so /dev-login works without hand-creating accounts in the Supabase dashboard.
//
// Run once:  npm run seed:dev
// Needs in .env.local:  NEXT_PUBLIC_SUPABASE_URL, DEV_LOGIN_PASSWORD, and
// SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API → service_role — secret,
// gitignored, NEVER committed or exposed to the browser). Idempotent: skips
// users that already exist.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// tiny .env.local loader so we don't need a dotenv dependency
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
} catch {
  // no .env.local — fall through to the missing-vars check below
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEV_LOGIN_PASSWORD;

if (!url || !serviceKey || !password) {
  console.error(
    "Missing config. .env.local needs NEXT_PUBLIC_SUPABASE_URL, " +
      "SUPABASE_SERVICE_ROLE_KEY (Settings → API → service_role) and DEV_LOGIN_PASSWORD.",
  );
  process.exit(1);
}

// service_role bypasses RLS — admin API only, never ship this to the client
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const COUNT = 5; // matches the dev1..dev5 buttons on /dev-login

for (let i = 1; i <= COUNT; i++) {
  const email = `andrewtjones85+pintrdev${i}@gmail.com`;
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // pre-confirmed, so dev-login works immediately
  });
  if (!error) {
    console.log(`✓ created ${email}`);
  } else if (/already|exists|registered/i.test(error.message)) {
    console.log(`= ${email} (already exists, skipped)`);
  } else {
    console.error(`✗ ${email}: ${error.message}`);
  }
}

console.log("\nDone. Sign in at /dev-login (dev1 … dev5).");
