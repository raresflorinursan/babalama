import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { isSolvixOwner, normalizeUsername, validateUsername } from "@/lib/platform-security";

type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

function fallbackUsername(user: User) {
  return `creator_${user.id.replaceAll("-", "").slice(0, 8)}`;
}

function usernameFromUser(user: User) {
  const wantedUsername =
    typeof user.user_metadata?.username === "string" && user.user_metadata.username.trim()
      ? user.user_metadata.username
      : (user.email?.split("@")[0] ?? "");

  const normalized = normalizeUsername(wantedUsername);
  const validation = validateUsername(normalized, { allowReserved: isSolvixOwner(user.id) });

  return validation.valid ? validation.username : fallbackUsername(user);
}

function fullNameFromUser(user: User, username: string) {
  const metadataName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim());

  return metadataName || username;
}

function avatarFromUser(user: User) {
  const avatar = user.user_metadata?.avatar_url;
  return typeof avatar === "string" && avatar.startsWith("http") ? avatar : null;
}

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}

export async function ensureUserProfile(user: User) {
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) throw readError;

  const username = usernameFromUser(user);
  const fullName = fullNameFromUser(user, username);
  const avatarUrl = avatarFromUser(user);

  if (!existing) {
    const payload: ProfileInsert = {
      id: user.id,
      username,
      full_name: fullName,
      avatar_url: avatarUrl,
    };
    const { error } = await supabase.from("profiles").insert(payload);
    if (isUniqueViolation(error) && username !== fallbackUsername(user)) {
      const { error: fallbackError } = await supabase.from("profiles").insert({
        ...payload,
        username: fallbackUsername(user),
      });
      if (fallbackError) throw fallbackError;
      return;
    }
    if (error) throw error;
    return;
  }

  const patch: ProfileUpdate = {};
  if (!existing.username) patch.username = username;
  if (!existing.full_name) patch.full_name = fullName;
  if (!existing.avatar_url && avatarUrl) patch.avatar_url = avatarUrl;

  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (isUniqueViolation(error) && patch.username) {
    const { error: fallbackError } = await supabase
      .from("profiles")
      .update({ ...patch, username: fallbackUsername(user) })
      .eq("id", user.id);
    if (fallbackError) throw fallbackError;
    return;
  }
  if (error) throw error;
}
