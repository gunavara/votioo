import { supabase } from './supabase';

export async function reportPost(params: {
  reporterUserId: string;
  postId: string;
  reason: string;
}) {
  const { data: existingReports, error: checkError } = await supabase
    .from('reports')
    .select('id')
    .eq('reporter_user_id', params.reporterUserId)
    .eq('target_type', 'post')
    .eq('target_id', params.postId)
    .limit(1);

  if (checkError) {
    throw checkError;
  }

  if (existingReports && existingReports.length > 0) {
    return { alreadyReported: true };
  }

  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_user_id: params.reporterUserId,
      target_type: 'post',
      target_id: params.postId,
      reason: params.reason,
      status: 'pending',
    });

  if ((error as any)?.code === '23505') {
    return { alreadyReported: true };
  }

  if (error) {
    throw error;
  }

  return { alreadyReported: false };
}
