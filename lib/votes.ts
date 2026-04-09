import { supabase } from './supabase';

export async function submitVote(params: {
  postId: string;
  userId: string;
  vote: 'yes' | 'no';
}) {
  const { data: existingVote, error: checkError } = await supabase
    .from('votes')
    .select('id')
    .eq('post_id', params.postId)
    .eq('user_id', params.userId)
    .maybeSingle();

  if (checkError) throw checkError;

  if (existingVote) {
    return { alreadyVoted: true };
  }

  const { error } = await supabase
    .from('votes')
    .insert({
      post_id: params.postId,
      user_id: params.userId,
      vote_type: params.vote,
    });

  if (error) throw error;

  return { alreadyVoted: false };
}

export async function fetchUserVote(postId: string, userId: string) {
  const { data, error } = await supabase
    .from('votes')
    .select('vote_type')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  return (data?.vote_type as 'yes' | 'no' | null) ?? null;
}
