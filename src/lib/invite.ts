// Invite-link plumbing. A /join/<code> link drops a mate straight into a group
// even across the magic-link sign-in detour: when they land logged-out we stash
// the code in this cookie, then consume it once they're authed + onboarded.
// (The magic-link email is a fixed template, so we can't smuggle the code
// through the auth redirect itself — hence the cookie hand-off.)
export const INVITE_COOKIE = "pintr_invite";
export const INVITE_CODE_RE = /^[0-9a-f]{20}$/; // 10 random bytes, hex-encoded
