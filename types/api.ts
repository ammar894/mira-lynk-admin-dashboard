export interface PageResult<T> {
  items: T[];
  nextCursor?: string | null;
  total: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    platformRole?: string;
    tier: string;
  };
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  newUsersLast7Days: number;
  tierBreakdown: Record<string, number>;
  totalPosts: number;
  totalCommunities: number;
  activeSessions: number;
  pendingReports: number;
  activeEmergencyAlerts: number;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  username: string;
  tier: string;
  platformRole: string;
  isDeleted: boolean;
  isBanned: boolean;
  isVerified: boolean;
  isShadowBanned: boolean;
  isEmailVerified: boolean;
  banReason?: string | null;
  bannedAt?: string | null;
  postCount: number;
  followerCount: number;
  followingCount: number;
  createdAt: string;
  avatarUrl?: string | null;
}

export interface AdminUserDetail extends AdminUser {
  bio?: string | null;
  profileVisibility: string;
}

/**
 * Served by GET /admin/users/:id/subscription, not by the user detail route.
 * Everything below `tier` is absent until the user has actually purchased.
 */
export interface AdminUserSubscription {
  userId: string;
  tier: string;
  createdAt: string;
  status?: string | null;
  platform?: string | null;
  revenuecatProductId?: string | null;
  startedAt?: string | null;
  expiresAt?: string | null;
  cancelledAt?: string | null;
}

export interface AdminUserBlock {
  blockedUserId: string;
  blockedDisplayName: string;
  blockedEmail?: string | null;
  blockedAt: string;
}

export interface AdminPoll {
  id: string;
  question: string;
  status: string;
  creatorId: string;
  creatorName: string;
  optionCount: number;
  voteCount: number;
  expiresAt: string;
  createdAt: string;
}

export interface AdminNotificationPref {
  onNewReport: boolean;
  onActiveAlert: boolean;
  onNewUser: boolean;
}

export interface Report {
  id: string;
  reporterId?: string | null;
  postId?: string | null;
  commentId?: string | null;
  messageId?: string | null;
  reason: string;
  category: string;
  status: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface Community {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  ownerDisplayName: string;
  avatarUrl?: string | null;
  memberCount: number;
  visibility: string;
  isDeleted: boolean;
  createdAt: string;
}

export interface VideoSession {
  id: string;
  title: string;
  topic?: string;
  status: string;
  hostId: string;
  hostName?: string;
  hostDisplayName?: string;
  maxParticipants?: number;
  scheduledAt?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
  participants?: { userId: string; displayName: string; role: string; joinedAt?: string | null; leftAt?: string | null }[];
}

export interface EmergencyAlert {
  id: string;
  userId: string;
  userDisplayName?: string;
  status: string;
  latitude?: number | null;
  longitude?: number | null;
  resolvedAt?: string | null;
  triggeredAt: string;
}

export interface AdConfig {
  id: string;
  /** Tier this placement config applies to. The API keys ad configs by tier, not by a display name. */
  tier: string;
  adsEnabled: boolean;
  injectionInterval: number;
  adUnitId?: string | null;
  /** Admin-entered eCPM used to estimate ad revenue. Minor units (cents). */
  estimatedEcpmCents: number;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  createdAt: string;
}

// ─── Revenue (MIRA-060 / MIRA-067) ───────────────────────────
// Every *Cents field is integer minor units of `currency`, matching the API.

export interface RevenueTotals {
  grossCents: number;
  netCents: number;
  refundedCents: number;
  transactions: number;
  payingUsers: number;
}

export interface RevenueSplit {
  newCents: number;
  renewalCents: number;
  oneOffCents: number;
}

export interface RevenueByTier {
  tier: string | null;
  grossCents: number;
  netCents: number;
  transactions: number;
}

export interface RevenueByStore {
  store: string;
  grossCents: number;
  netCents: number;
  transactions: number;
}

export interface RevenuePoint {
  date: string;
  grossCents: number;
  netCents: number;
  transactions: number;
}

export interface SubscriptionSnapshot {
  activeSubscriptions: number;
  byTier: Record<string, number>;
  mrrCents: number;
  arpuCents: number;
  arppuCents: number;
  churnedInWindow: number;
}

export interface AdRevenue {
  source: 'estimated';
  rewardedCompletions: number;
  uniqueViewers: number;
  activeRewards: number;
  ecpmCents: number;
  /** Null when no eCPM is configured — "unknown", not "zero". */
  estimatedCents: number | null;
}

export type RevenueEnvironment = 'PRODUCTION' | 'SANDBOX' | 'ALL';

export interface RevenueOverview {
  windowDays: number;
  from: string;
  to: string;
  environment: RevenueEnvironment;
  /** False until a real (non-sandbox) purchase has ever landed. */
  hasProductionData: boolean;
  currency: string;
  totals: RevenueTotals;
  split: RevenueSplit;
  byTier: RevenueByTier[];
  byStore: RevenueByStore[];
  series: RevenuePoint[];
  subscriptions: SubscriptionSnapshot;
  ads: AdRevenue;
}

export interface RevenueTransaction {
  id: string;
  eventId: string;
  userId: string | null;
  displayName: string | null;
  eventType: string;
  productId: string | null;
  tier: string | null;
  store: string;
  environment: string;
  grossCents: number;
  netCents: number;
  currency: string;
  occurredAt: string;
}
