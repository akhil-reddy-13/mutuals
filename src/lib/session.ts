// Demo "auth": the logged-in persona is a cookie set by the PersonaSwitcher. Default: alex.
import { cookies } from "next/headers";
export const PERSONA_COOKIE = "mutuals_persona";
export async function currentUserId(): Promise<string> {
  return (await cookies()).get(PERSONA_COOKIE)?.value ?? "alex";
}
