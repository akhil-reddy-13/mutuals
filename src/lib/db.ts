// Storage: seed JSON loaded into memory + a runtime JSON store for things created during the demo
// (asks, matches, negotiations, threads, agent log). Runtime store persists to .cache/runtime.json so a
// dev-server reload doesn't wipe state. `resetRuntime()` (POST /api/reset) clears it before a demo run.
//
// Kept deliberately simple (no SQLite) — swap later only if needed.
import fs from "fs";
import path from "path";
import users from "../../seed/users.json";
import groups from "../../seed/groups.json";
import posts from "../../seed/posts.json";
import circles from "../../seed/circles.json";
import seedAsks from "../../seed/asks.json";
import type {
  AgentLogEntry,
  Ask,
  Circle,
  Group,
  GroupPost,
  Match,
  MessengerThread,
  Negotiation,
  User,
} from "./types";

export const seed = {
  users: users as User[],
  groups: groups as Group[],
  posts: posts as GroupPost[],
  circles: circles as Circle[],
  asks: seedAsks as Ask[],
};

interface Runtime {
  asks: Ask[];
  matches: Match[];
  negotiations: Negotiation[];
  threads: MessengerThread[];
  agentLog: AgentLogEntry[];
  userOverrides: Record<string, Partial<User>>; // settings toggles
}

const RUNTIME_FILE = path.join(process.cwd(), ".cache", "runtime.json");
const empty = (): Runtime => ({ asks: [], matches: [], negotiations: [], threads: [], agentLog: [], userOverrides: {} });

// Survive Next.js hot reloads in dev.
const g = globalThis as unknown as { __mutualsRuntime?: Runtime };
function rt(): Runtime {
  if (!g.__mutualsRuntime) {
    try {
      g.__mutualsRuntime = { ...empty(), ...JSON.parse(fs.readFileSync(RUNTIME_FILE, "utf8")) };
    } catch {
      g.__mutualsRuntime = empty();
    }
  }
  return g.__mutualsRuntime!;
}
function persist() {
  fs.mkdirSync(path.dirname(RUNTIME_FILE), { recursive: true });
  fs.writeFileSync(RUNTIME_FILE, JSON.stringify(rt(), null, 2));
}

export function resetRuntime() {
  g.__mutualsRuntime = empty();
  persist();
}

// ---- users ----
export function getUser(id: string): User | undefined {
  const base = seed.users.find((u) => u.id === id);
  return base ? { ...base, ...rt().userOverrides[id] } : undefined;
}
export function allUsers(): User[] {
  return seed.users.map((u) => getUser(u.id)!);
}
export function updateUser(id: string, patch: Partial<User>) {
  rt().userOverrides[id] = { ...rt().userOverrides[id], ...patch };
  persist();
}

// ---- asks ----
export function allAsks(): Ask[] {
  return [...seed.asks, ...rt().asks];
}
export function getAsk(id: string) {
  return allAsks().find((a) => a.id === id);
}
export function saveAsk(ask: Ask) {
  const r = rt();
  r.asks = [...r.asks.filter((a) => a.id !== ask.id), ask];
  persist();
}

// ---- matches ----
export function matchesForAsk(askId: string) {
  return rt().matches.filter((m) => m.askId === askId);
}
export function getMatch(id: string) {
  return rt().matches.find((m) => m.id === id);
}
export function saveMatch(m: Match) {
  const r = rt();
  r.matches = [...r.matches.filter((x) => x.id !== m.id), m];
  persist();
}

// ---- negotiations ----
export function getNegotiation(id: string) {
  return rt().negotiations.find((n) => n.id === id);
}
export function saveNegotiation(n: Negotiation) {
  const r = rt();
  r.negotiations = [...r.negotiations.filter((x) => x.id !== n.id), n];
  persist();
}

// ---- messenger ----
export function getThread(id: string) {
  return rt().threads.find((t) => t.id === id);
}
export function threadsForUser(userId: string) {
  return rt().threads.filter((t) => t.participantIds.includes(userId));
}
export function saveThread(t: MessengerThread) {
  const r = rt();
  r.threads = [...r.threads.filter((x) => x.id !== t.id), t];
  persist();
}

// ---- agent log ----
export function logAgentMessage(e: AgentLogEntry) {
  rt().agentLog.push(e);
  persist();
}
export function agentLogFor(userId: string) {
  return rt().agentLog.filter((e) => e.userId === userId);
}

export const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
