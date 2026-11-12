// Storage: seed JSON loaded into memory + a runtime JSON store for things created during the demo
// (asks, matches, negotiations, threads, listings, agent log). Runtime store persists to .cache/runtime.json
// so a dev-server reload doesn't wipe state. `resetRuntime()` (POST /api/reset) clears it before a demo run.
//
// Kept deliberately simple (no SQLite).
import fs from "fs";
import path from "path";
import users from "../../seed/users.json";
import groups from "../../seed/groups.json";
import posts from "../../seed/posts.json";
import events from "../../seed/events.json";
import seedAsks from "../../seed/asks.json";
import type {
  AgentLogEntry,
  Ask,
  FbEvent,
  Group,
  GroupPost,
  MarketplaceListing,
  Match,
  MessengerThread,
  Negotiation,
  User,
} from "./types";

export const seed = {
  users: users as User[],
  groups: groups as Group[],
  posts: posts as GroupPost[],
  events: events as FbEvent[],
  asks: seedAsks as Ask[],
};

interface Runtime {
  asks: Ask[];
  matches: Match[];
  negotiations: Negotiation[];
  threads: MessengerThread[];
  listings: MarketplaceListing[];
  agentLog: AgentLogEntry[];
  userOverrides: Record<string, Partial<User>>; // opt-ins, toggles
  eventOverrides: Record<string, Partial<FbEvent>>; // "going" joins
}

const RUNTIME_FILE = path.join(process.cwd(), ".cache", "runtime.json");
const empty = (): Runtime => ({
  asks: [],
  matches: [],
  negotiations: [],
  threads: [],
  listings: [],
  agentLog: [],
  userOverrides: {},
  eventOverrides: {},
});

// Survive Next.js hot reloads in dev, AND pick up writes from other processes (npm run warm / demo / reset
// from a terminal while the dev server runs): reload whenever the file's mtime changes.
const g = globalThis as unknown as { __mutualsRuntime?: Runtime; __mutualsRuntimeMtime?: number };
function fileMtime(): number {
  try {
    return fs.statSync(RUNTIME_FILE).mtimeMs;
  } catch {
    return 0;
  }
}
function rt(): Runtime {
  const m = fileMtime();
  if (!g.__mutualsRuntime || g.__mutualsRuntimeMtime !== m) {
    try {
      g.__mutualsRuntime = { ...empty(), ...JSON.parse(fs.readFileSync(RUNTIME_FILE, "utf8")) };
    } catch {
      g.__mutualsRuntime = empty();
    }
    g.__mutualsRuntimeMtime = m;
  }
  return g.__mutualsRuntime!;
}
function persist() {
  fs.mkdirSync(path.dirname(RUNTIME_FILE), { recursive: true });
  fs.writeFileSync(RUNTIME_FILE, JSON.stringify(g.__mutualsRuntime ?? empty(), null, 2));
  g.__mutualsRuntimeMtime = fileMtime();
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
/** The per-Group opt-in: "Want me to check with other Muses in <group>?" -> yes. */
export function optIntoGroup(userId: string, groupId: string) {
  const u = getUser(userId);
  if (!u) return;
  if (!u.museGroups.includes(groupId)) updateUser(userId, { museGroups: [...u.museGroups, groupId] });
}

// ---- groups / posts / events ----
export function getGroup(id: string) {
  return seed.groups.find((g) => g.id === id);
}
export function postsInGroup(groupId: string): GroupPost[] {
  return seed.posts
    .filter((p) => p.groupId === groupId)
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (a.createdAt < b.createdAt ? 1 : -1));
}
export function getPost(id: string) {
  return seed.posts.find((p) => p.id === id);
}
export function getEvent(id: string): FbEvent | undefined {
  const base = seed.events.find((e) => e.id === id);
  return base ? { ...base, ...rt().eventOverrides[id] } : undefined;
}
export function allEvents(): FbEvent[] {
  return seed.events.map((e) => getEvent(e.id)!);
}
export function joinEvent(eventId: string, userId: string) {
  const e = getEvent(eventId);
  if (!e || e.goingIds.includes(userId)) return;
  rt().eventOverrides[eventId] = { ...rt().eventOverrides[eventId], goingIds: [...e.goingIds, userId] };
  persist();
}

// ---- asks ----
export function allAsks(): Ask[] {
  const overridden = new Set(rt().asks.map((a) => a.id));
  return [...seed.asks.filter((a) => !overridden.has(a.id)), ...rt().asks];
}
export function getAsk(id: string) {
  return allAsks().find((a) => a.id === id);
}
export function asksForUser(userId: string) {
  return allAsks().filter((a) => a.userId === userId);
}
export function saveAsk(ask: Ask) {
  const r = rt();
  r.asks = [...r.asks.filter((a) => a.id !== ask.id), ask];
  persist();
}

// ---- matches ----
/** Latest match per (ask, candidate), so re-runs never show duplicates. */
function latestMatches(ms: Match[]): Match[] {
  const byKey = new Map<string, Match>();
  for (const m of ms) {
    const k = `${m.askId}|${m.candidateId}`;
    const prev = byKey.get(k);
    if (!prev || prev.createdAt < m.createdAt) byKey.set(k, m);
  }
  return [...byKey.values()];
}
export function matchesForAsk(askId: string) {
  return latestMatches(rt().matches.filter((m) => m.askId === askId));
}
/** Matches where this user is the asker OR the candidate (the candidate's phone also gets a notification). */
export function matchesInvolving(userId: string) {
  return latestMatches(rt().matches.filter((m) => m.userId === userId || m.candidateId === userId));
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
export function threadBetween(a: string, b: string) {
  return rt().threads.find((t) => t.participantIds.includes(a) && t.participantIds.includes(b));
}
export function saveThread(t: MessengerThread) {
  const r = rt();
  r.threads = [...r.threads.filter((x) => x.id !== t.id), t];
  persist();
}

// ---- marketplace ----
export function getListing(id: string) {
  return rt().listings.find((l) => l.id === id);
}
export function listingsForUser(userId: string) {
  return rt().listings.filter((l) => l.sellerId === userId);
}
export function saveListing(l: MarketplaceListing) {
  const r = rt();
  r.listings = [...r.listings.filter((x) => x.id !== l.id), l];
  persist();
}

// ---- agent log ("what my Muse shared") ----
export function logAgentMessage(e: AgentLogEntry) {
  rt().agentLog.push(e);
  persist();
}
export function agentLogFor(userId: string, negotiationId?: string) {
  return rt().agentLog.filter((e) => e.userId === userId && (!negotiationId || e.negotiationId === negotiationId));
}

export const newId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
