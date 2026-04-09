import { supabase } from './supabase';

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  reference_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export async function fetchNotificationsForUser(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) throw error;
}

export async function createNotification(params: {
  userId: string;
  type: 'vote' | 'comment';
  postId: string;
  message: string;
}) {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      type: params.type,
      reference_id: params.postId,
      message: params.message,
      is_read: false,
    });

  if (error) throw error;
}
