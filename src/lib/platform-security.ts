const FALLBACK_PUBLIC_ORIGIN = "https://babalama.vercel.app";
const SOLVIX_OWNER_USER_IDS = new Set(["a87436d3-f228-4145-8e1d-1426a98c0d50"]);

const RESERVED_USERNAME_EXACT = new Set([
  "admin",
  "administrator",
  "ceo",
  "founder",
  "moderator",
  "official",
  "solvix",
  "solvix_ceo",
  "solvixceo",
  "support",
  "team",
]);

const RESERVED_USERNAME_PARTS = ["solvix", "sovix"];

const USERNAME_CONFUSABLES: Record<string, string> = {
  а: "a",
  е: "e",
  і: "i",
  ӏ: "l",
  о: "o",
  р: "p",
  с: "c",
  х: "x",
  у: "y",
  ѕ: "s",
};

function foldUsernameCharacters(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[аеіӏорсхуѕ]/g, (character) => USERNAME_CONFUSABLES[character] ?? character);
}

export function normalizeUsername(value: string) {
  return foldUsernameCharacters(value)
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "");
}

function usernameBrandKey(value: string) {
  return normalizeUsername(value)
    .replaceAll("_", "")
    .replace(/(.)\1+/g, "$1");
}

function isReservedUsername(username: string) {
  const brandKey = usernameBrandKey(username);
  const resemblesSolvix = /[s5][o0][l1]v[i1]x/.test(brandKey);
  const resemblesSovix = /[s5][o0]v[i1]x/.test(brandKey);
  return (
    RESERVED_USERNAME_EXACT.has(username) ||
    resemblesSolvix ||
    resemblesSovix ||
    RESERVED_USERNAME_PARTS.some((part) => username.includes(part) || brandKey.includes(part))
  );
}

export function isSolvixOwner(userId: string | null | undefined) {
  return !!userId && SOLVIX_OWNER_USER_IDS.has(userId);
}

export function validateUsername(value: string, options: { allowReserved?: boolean } = {}) {
  const username = normalizeUsername(value);

  if (!username) return { valid: false, username, message: "Bitte gib einen Username ein." };
  if (username.length < 3)
    return { valid: false, username, message: "Der Username muss mindestens 3 Zeichen haben." };
  if (username.length > 24)
    return { valid: false, username, message: "Der Username darf maximal 24 Zeichen haben." };
  if (!/^[a-z0-9_]+$/.test(username)) {
    return { valid: false, username, message: "Nutze nur Buchstaben, Zahlen und Unterstriche." };
  }
  if (!options.allowReserved && isReservedUsername(username)) {
    return { valid: false, username, message: "Der Name ist schon vergeben." };
  }

  return { valid: true, username, message: "" };
}

export function buildPublicShareUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (typeof window === "undefined") return `${FALLBACK_PUBLIC_ORIGIN}${normalizedPath}`;

  const isLocalHost =
    window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
  const origin = isLocalHost ? FALLBACK_PUBLIC_ORIGIN : window.location.origin;

  return `${origin}${normalizedPath}`;
}
