// Shared domain types. Source of truth: docs/PRD.md §8, amended by the Nov 12 handoff note:
// asks are scoped to a Facebook Group (no reach setting), Events replace circles, Marketplace listings
// hold leftover items. Change these deliberately. Every part of the app imports them.

export type Visibility = "public" | "match_only" | "never";
export type Importance = "dealbreaker" | "high" | "medium" | "low";
export type AskType = "roommate" | "sublet" | "item" | "skill_swap" | "plus_one" | "ride" | "other";

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  school?: string;
  schoolVerified: boolean;
  city: string;
  groups: string[];
  friends: string[];
  /** Has Muse at all. false = one-sided mode only (we read their human posts). */
  museEnabled: boolean;
  /** Groups where this user told Muse "yes, check with other Muses here". The opt-in is per Group. */
  museGroups: string[];
  connectionSuggestionsOptIn: boolean;
  interests: { value: string; shareForConnection: boolean }[];
  bio?: string;
}

export interface Preference {
  id: string;
  topic: string;
  value: string;
  importance: Importance;
  visibility: Visibility;
  source: "stated" | "inferred";
  confirmed: boolean; // inferred prefs must be confirmed before sharing
}

export interface RoomDetails {
  furnished: boolean;
  approxSize: string;
  naturalLight: string;
  deskSpace: boolean;
  closet: boolean;
  notes: string[];
}

export interface Item {
  id: string;
  name: string;
  brandGuess?: string;
  condition: string;
  flaws: string[];
  suggestedPriceUsd: number;
  imageDataUrl?: string;
}

export interface Ask {
  id: string;
  userId: string;
  /** The Facebook Group this ask lives in. Candidates and posts come from this Group only. */
  groupId: string;
  type: AskType;
  summary: string;
  preferences: Preference[];
  roomDetails?: RoomDetails;
  items?: Item[];
  createdAt: string;
  status?: "draft" | "matching" | "matched";
}

export interface NegotiationTurn {
  speaker: "A" | "B" | "orchestrator";
  message: string;
  disclosed: string[];
  positions: Record<string, string>;
}

export interface Verdict {
  compatible: boolean;
  /** Kept for ordering only. Never shown in the UI (handoff note, fix 8). */
  score: number;
  fits: string[];
  disagreements: string[];
  compromise: string | null;
  summaryForHumans: string;
}

export interface Negotiation {
  id: string;
  askAId: string;
  askBId: string;
  rounds: NegotiationTurn[];
  verdict?: Verdict;
  status: "running" | "done";
}

export interface ConnectionSuggestion {
  suggest: boolean;
  confidence: number;
  reason: string | null;
  activity: string | null;
  eventId: string | null;
}

export interface Match {
  id: string;
  userId: string;
  candidateId: string;
  askId: string;
  mode: "agent_to_agent" | "one_sided";
  verdict: Verdict;
  trustSignals: string[];
  connection?: ConnectionSuggestion | null;
  negotiationId?: string;
  sourcePostId?: string; // one_sided mode
  draftReply?: string; // one_sided mode
  threadId?: string; // set once the human opened Messenger
  createdAt: string;
}

/** A Facebook Event. Replaces "circles" (handoff note, decision 5). */
export interface FbEvent {
  id: string;
  name: string;
  description: string;
  city: string;
  when: string;
  where: string;
  hostId: string;
  goingIds: string[];
  open: boolean;
  coverEmoji: string;
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
  privacy: "public" | "private";
  coverEmoji: string;
  about: string;
}

export interface GroupPost {
  id: string;
  groupId: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface AgentLogEntry {
  id: string;
  userId: string;
  negotiationId: string;
  counterpartId: string;
  message: string;
  disclosed: string[];
  at: string;
}

export interface DigestCard {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  relatedUserIds: string[];
}

export interface MessengerThread {
  id: string;
  participantIds: string[];
  matchId?: string;
  /** Opener drafted by Muse, shown as editable until sent. */
  draft?: { for: string; text: string };
  messages: { from: string; text: string; at: string }[];
}

export interface MarketplaceListing {
  id: string;
  sellerId: string;
  askId?: string;
  title: string;
  priceUsd: number;
  condition: string;
  description: string;
  items: Item[];
  imageDataUrl?: string;
  createdAt: string;
}
