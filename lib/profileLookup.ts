import { supabase } from './supabase';

export async function fetchAvatarUrls(userIds: Array<string | null | undefined>) {
  const uniqueUserIds = Array.from(
    new Set(
      userIds.filter((userId): userId is string => typeof userId === 'string' && userId.length > 0)
    )
  );

  if (uniqueUserIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .in('id', uniqueUserIds);

  if (error) {
    throw error;
  }

  return new Map(
    (data ?? [])
      .filter((profile) => typeof profile.avatar_url === 'string' && profile.avatar_url.length > 0)
      .map((profile) => [profile.id, profile.avatar_url as string])
  );
}
