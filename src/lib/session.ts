// Demo "auth": the logged-in persona is a cookie set by the PersonaSwitcher. Default: alex.
import { cookies } from "next/headers";
import { getUser } from "./db";
import type { User } from "./types";
export const PERSONA_COOKIE = "mutuals_persona";
export async function currentUserId(): Promise<string> {
  const id = (await cookies()).get(PERSONA_COOKIE)?.value ?? "alex";
  return getUser(id) ? id : "alex"; // a stale cookie after a seed rename must not crash a page
}
export async function currentUser(): Promise<User> {
  return getUser(await currentUserId())!;
}
