// Shared validation used by admin-api and admin-ai (adult-only rules, settings schema).

export const CATEGORIES = ["Original", "Anime", "Fantasy", "Sci-Fi", "Romance", "Roleplay", "Mythology", "Classics"];
export const MODELS = ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"];

export const SPICE_LABELS: Record<number, string> = {
  1: "Sweet", 2: "Flirty", 3: "Romantic & sensual", 4: "Steamy", 5: "Spicy", 6: "Maximum",
};

const AGE_PATTERNS = [
  /\b(?:[0-9]|1[0-7])[\s-]*(?:years?|yrs?)[\s-]*old\b/i,
  /\b(?:[0-9]|1[0-7])[\s-]*(?:yo|y\/o)\b/i,
  /\bage[d]?\s*[:=]?\s*(?:[0-9]|1[0-7])\b/i,
];
const MINOR_WORDS =
  /\b(loli|lolita|shota|underage|under-age|minor|child|children|kid|little girl|little boy|schoolgirl|school girl|schoolboy|preteen|pre-teen|teen|teenager|toddler|juvenile)\b/i;

export function looksLikeMinor(text: string): boolean {
  return MINOR_WORDS.test(text) || AGE_PATTERNS.some((re) => re.test(text));
}

const LIMITS: Record<string, number> = {
  name: 60, tagline: 120, description: 1500, personality: 1500, scenario: 1000, greeting: 1000, example_dialogue: 1500, category: 30, creator_name: 40,
};

// ---------- avatar spec (rendered client-side by src/lib/avatar.ts) ----------
export const AVATAR_ENUMS = {
  hairStyle: ["long", "wavy", "bob", "ponytail", "bun", "short", "twin", "braid"],
  fringe: ["side", "blunt", "part", "none"],
  accessory: ["glasses", "headphones", "elf", "horns", "halo", "tiara", "flower", "cyber", "beret", "catears", "veil", "fox", "none"],
  outfitStyle: ["round", "vneck", "strap", "collar", "turtle"],
  smile: ["soft", "smirk", "open", "calm"],
};
const HEX = /^#[0-9a-fA-F]{6}$/;

export function cleanAvatarSpec(a: any): { spec?: Record<string, unknown>; error?: string } {
  if (!a || typeof a !== "object") return { error: "avatar must be an object" };
  const out: Record<string, unknown> = {};
  for (const k of ["skin", "hair", "eyes", "outfit", "lips", "accent"]) {
    if (a[k] === undefined) continue;
    if (typeof a[k] !== "string" || !HEX.test(a[k])) return { error: `avatar.${k} must be a #RRGGBB colour` };
    out[k] = a[k];
  }
  for (const [k, allowed] of Object.entries(AVATAR_ENUMS)) {
    if (a[k] === undefined) continue;
    if (!allowed.includes(a[k])) return { error: `avatar.${k} must be one of: ${allowed.join(", ")}` };
    out[k] = a[k];
  }
  if (a.bg !== undefined) {
    if (!Array.isArray(a.bg) || a.bg.length !== 2 || !a.bg.every((c: unknown) => typeof c === "string" && HEX.test(c))) {
      return { error: "avatar.bg must be two #RRGGBB colours" };
    }
    out.bg = a.bg;
  }
  for (const k of ["blush", "freckles"]) if (typeof a[k] === "boolean") out[k] = a[k];
  return { spec: out };
}

// ---------- characters ----------
export function cleanCharacter(input: any, partial: boolean): { data?: Record<string, unknown>; error?: string } {
  if (!input || typeof input !== "object") return { error: "Invalid body" };
  const out: Record<string, unknown> = {};

  for (const key of Object.keys(LIMITS)) {
    if (input[key] === undefined) continue;
    const v = input[key] === null ? null : String(input[key]).trim();
    if (v && v.length > LIMITS[key]) return { error: `${key} is too long (max ${LIMITS[key]})` };
    out[key] = v || null;
  }
  if (input.age !== undefined) {
    const age = Number(input.age);
    if (!Number.isInteger(age) || age < 18 || age > 9999) return { error: "Characters must be adults (age 18 or older)." };
    out.age = age;
  }
  if (input.spice_level !== undefined) {
    const s = Number(input.spice_level);
    if (!Number.isInteger(s) || s < 1 || s > 6) return { error: "spice_level must be an integer from 1 to 6" };
    out.spice_level = s;
  }
  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags)) return { error: "tags must be an array" };
    out.tags = input.tags.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 6);
  }
  if (input.avatar_url !== undefined) {
    const a = input.avatar_url === null ? null : String(input.avatar_url).trim();
    if (a && !/^(https?:\/\/|\/avatars\/|data:image\/)/i.test(a)) return { error: "avatar_url must be an http(s) URL" };
    if (a && a.length > 60000) return { error: "avatar_url is too long" };
    out.avatar_url = a || null;
  }
  if (out.category && !CATEGORIES.includes(String(out.category))) out.category = "Original";

  if (!partial) {
    if (!out.name) return { error: "Name is required" };
    if (out.age === undefined) return { error: "Age is required (18+)" };
  }

  const text = ["name", "tagline", "description", "personality", "scenario", "greeting", "example_dialogue"]
    .map((k) => out[k]).concat((out.tags as string[]) ?? []).filter(Boolean).join("\n");
  if (looksLikeMinor(text)) {
    return { error: "Characters must be adults. Remove references to minors, school-age or youthful ages." };
  }
  return { data: out };
}

// ---------- app settings ----------
export const PUBLIC_DEFAULTS = {
  app_name: "Uncensored AI Girls",
  tagline: "Adults only · 18+",
  accent: "#ff4d8d",
  accent2: "#8b2fff",
  announcement: "",
  show_trending: true,
  show_just_added: true,
  allow_user_characters: true,
  maintenance_mode: false,
  maintenance_message: "We'll be right back.",
  max_spice_level: 5,
};
export const PRIVATE_DEFAULTS = {
  global_prompt: "",
  chat_model: "claude-sonnet-5-5",
  max_reply_tokens: 1024,
};
export const PUBLIC_KEYS = Object.keys(PUBLIC_DEFAULTS);
export const PRIVATE_KEYS = Object.keys(PRIVATE_DEFAULTS);

export function cleanSettings(input: any): { data?: Record<string, unknown>; error?: string } {
  if (!input || typeof input !== "object") return { error: "Invalid body" };
  const out: Record<string, unknown> = {};
  const str = (k: string, max: number) => {
    if (input[k] === undefined) return null;
    const v = String(input[k] ?? "").trim();
    if (v.length > max) return `${k} is too long (max ${max})`;
    out[k] = v;
    return null;
  };
  const bool = (k: string) => { if (input[k] !== undefined) out[k] = Boolean(input[k]); };
  const hex = (k: string) => {
    if (input[k] === undefined) return null;
    if (typeof input[k] !== "string" || !HEX.test(input[k])) return `${k} must be a #RRGGBB colour`;
    out[k] = input[k].toLowerCase();
    return null;
  };

  const errors = [
    str("app_name", 30), str("tagline", 40), str("announcement", 300), str("maintenance_message", 300),
    str("global_prompt", 3000), hex("accent"), hex("accent2"),
  ].filter(Boolean);
  if (errors.length) return { error: String(errors[0]) };

  bool("show_trending"); bool("show_just_added"); bool("allow_user_characters"); bool("maintenance_mode");

  if (input.max_spice_level !== undefined) {
    const n = Number(input.max_spice_level);
    if (!Number.isInteger(n) || n < 1 || n > 6) return { error: "max_spice_level must be 1-6" };
    out.max_spice_level = n;
  }
  if (input.max_reply_tokens !== undefined) {
    const n = Number(input.max_reply_tokens);
    if (!Number.isInteger(n) || n < 200 || n > 8000) return { error: "max_reply_tokens must be 200-8000" };
    out.max_reply_tokens = n;
  }
  if (input.chat_model !== undefined) {
    if (!MODELS.includes(input.chat_model)) return { error: `chat_model must be one of: ${MODELS.join(", ")}` };
    out.chat_model = input.chat_model;
  }
  if (out.app_name === "") return { error: "app_name cannot be empty" };
  if (typeof out.global_prompt === "string" && looksLikeMinor(out.global_prompt)) {
    return { error: "global_prompt must not reference minors or youthful ages." };
  }
  return { data: out };
}
