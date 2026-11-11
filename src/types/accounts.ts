/** Shared public contract. No auth user IDs, emails or private membership data. */
export type PublicOrganizer = {
  id: string; slug: string; displayName: string; biography: string | null;
  city: string | null; avatarUrl: string | null; websiteUrl: string | null;
  isPublished: boolean; createdAt: string; updatedAt: string;
};
export type PrivateUserProfile = { id: string; displayName: string; createdAt: string };
export type OrganizerMembership = { organizerId: string; userId: string; role: 'owner' | 'editor'; createdAt: string };
export type PublicOrganizerPost = { id: string; organizerId: string; body: string; createdAt: string; updatedAt: string; /** Gallery of the post, in order. Empty for text-only posts. */ images: string[] };
export type OrganizerEventSummary = {
  id: string; organizerId: string; title: string; startsAt: string; endsAt: string | null;
  city: string | null; imageUrl: string | null; status: 'scheduled' | 'cancelled' | 'postponed';
};
export type OrganizerProfileChanges = Partial<Pick<PublicOrganizer,
  'slug' | 'displayName' | 'biography' | 'city' | 'avatarUrl' | 'websiteUrl' | 'isPublished'>>;
export type SpotsEventInput = {
  organizerId: string; title: string; startsAt: string; endsAt?: string | null;
  description?: string | null; city?: string | null; venue?: string | null;
  latitude?: number | null; longitude?: number | null; imageUrl?: string | null; ticketUrl?: string | null;
};
