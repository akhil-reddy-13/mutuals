// Shared domain types. Source of truth: docs/PRD.md §8.
// Change these deliberately — every part of the app imports them.

export type Reach = "school" | "network" | "nearby" | "anyone";
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
  museEnabled: boolean;
  defaultReach: Reach;
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
  type: AskType;
  summary: string;
  reach: Reach;
  preferences: Preference[];
  roomDetails?: RoomDetails;
  items?: Item[];
  createdAt: string;
}

export interface NegotiationTurn {
  speaker: "A" | "B" | "orchestrator";
  message: string;
  disclosed: string[];
  positions: Record<string, string>;
}

export interface Verdict {
  compatible: boolean;
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
  circleId: string | null;
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
}

export interface Circle {
  id: string;
  name: string;
  description: string;
  city: string;
  memberIds: string[];
  open: boolean;
  lastActiveAt: string;
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
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
  messages: { from: string; text: string; at: string }[];
}
