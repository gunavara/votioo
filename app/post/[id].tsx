import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { devError, devLog } from '../../lib/devLog';
import { fetchAvatarUrls } from '../../lib/profileLookup';
import { reportPost } from '../../lib/reports';
import { supabase } from '../../lib/supabase';
import { fetchUserVote, submitVote } from '../../lib/votes';

interface PostData {
  id: string;
  question_text: string;
  primary_category: string;
  secondary_category: string | null;
  user_id: string;
  username_snapshot: string;
  created_at: string;
  post_images?: Array<{ image_url: string; sort_order: number }>;
  avatar_url?: string | null;
}

interface CommentData {
  id: string;
  post_id: string;
  user_id?: string;
  username_snapshot: string;
  text: string;
  created_at: string;
  avatar_url?: string | null;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [localVote, setLocalVote] = useState<'yes' | 'no' | null>(null);
  const [yesCt, setYesCt] = useState(0);
  const [noCt, setNoCt] = useState(0);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<CommentData[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  const openReportFlow = () => {
    if (!user) {
      Alert.alert('Sign in required', 'You need to sign in to report a post.');
      return;
    }

    if (hasReported) {
      Alert.alert('Already reported', 'You have already reported this post.');
      return;
    }

    if (post?.user_id === user.id) {
      Alert.alert('Not allowed', 'You cannot report your own post.');
      return;
    }

    Alert.alert('Report post', 'Why are you reporting this post?', [
      { text: 'Spam', onPress: () => handleReport('Spam or advertising') },
      { text: 'Harassment', onPress: () => handleReport('Harassment or abuse') },
      { text: 'Inappropriate', onPress: () => handleReport('Inappropriate content') },
      { text: 'Misleading', onPress: () => handleReport('Misleading or low-quality content') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleReport = async (reason: string) => {
    if (!user || !post) return;

    try {
      const result = await reportPost({
        reporterUserId: user.id,
        postId: post.id,
        reason,
      });

      if (result.alreadyReported) {
        setHasReported(true);
        Alert.alert('Already reported', 'You have already reported this post.');
        return;
      }

      setHasReported(true);
      Alert.alert('Report submitted', 'Thanks. We will review this post.');
    } catch (error) {
      devError('Report error:', error);
      Alert.alert('Error', 'Failed to submit report.');
    }
  };

  // Fetch post data
  useEffect(() => {
    if (id) {
      fetchPost();
      fetchComments();
      fetchVotes();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('*, post_images(image_url, sort_order)')
        .eq('id', id)
        .single();

      if (error) {
        devError('Error fetching post:', error);
        Alert.alert('Error', 'Failed to load post');
        return;
      }

      const avatarUrls = await fetchAvatarUrls([data.user_id]);
      setPost({
        ...(data as PostData),
        avatar_url: avatarUrls.get(data.user_id) ?? null,
      });
    } catch (error: any) {
      devError('Post fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', id)
        .order('created_at', { ascending: false });

      if (error) {
        devError('Error fetching comments:', error);
        return;
      }
      const avatarUrls = await fetchAvatarUrls(data?.map((comment: any) => comment.user_id) ?? []);
      setComments(
        ((data ?? []) as CommentData[]).map((comment) => ({
          ...comment,
          avatar_url: comment.user_id ? avatarUrls.get(comment.user_id) ?? null : null,
        }))
      );
    } catch (error: any) {
      devError('Comments fetch error:', error);
    }
  };

  const fetchVotes = async () => {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('vote_type')
        .eq('post_id', id);

      if (error) {
        devError('Error fetching votes:', error);
        return;
      }

      const yesVotes = data?.filter((v) => v.vote_type === 'yes').length || 0;
      const noVotes = data?.filter((v) => v.vote_type === 'no').length || 0;
      setYesCt(yesVotes);
      setNoCt(noVotes);

      if (user) {
        const existingVote = await fetchUserVote(String(id), user.id);
        setLocalVote(existingVote);
      } else {
        setLocalVote(null);
      }
    } catch (error: any) {
      devError('Votes fetch error:', error);
    }
  };

  const handleVote = async (vote: 'yes' | 'no') => {
    if (localVote || !user) {
      Alert.alert('Error', 'You can only vote once, or you need to be signed in');
      return;
    }

    try {
      const result = await submitVote({
        postId: String(id),
        userId: user.id,
        vote,
      });

      if (result.alreadyVoted) {
        Alert.alert('Error', 'You have already voted on this post');
        await fetchVotes();
        return;
      }

      setLocalVote(vote);
      if (vote === 'yes') {
        setYesCt((c) => c + 1);
      } else {
        setNoCt((c) => c + 1);
      }

    } catch (error: any) {
      devError('Vote submit error:', error);
      Alert.alert('Error', 'Failed to vote');
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;

    if (!user) {
      Alert.alert('Sign In', 'You need to be signed in to comment.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign In', onPress: () => router.push('/auth') },
      ]);
      return;
    }

    try {
      setSubmittingComment(true);

      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: id,
          user_id: user.id,
          username_snapshot: profile?.username || user.email?.split('@')[0] || 'user',
          text: comment.trim(),
        });

      if (error) {
        devError('Comment error:', error);
        Alert.alert('Error', 'Failed to post comment');
        return;
      }

      setComment('');
      await fetchComments();

    } catch (error: any) {
      devError('Comment submit error:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Post not found</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const total = yesCt + noCt;
  const yesPercent = total > 0 ? Math.round((yesCt / total) * 100) : 50;
  const noPercent = 100 - yesPercent;
  const images = post.post_images?.sort((a, b) => a.sort_order - b.sort_order) || [];

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior="padding"
      keyboardVerticalOffset={72}
    >
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {/* Post author */}
          <View style={styles.postCard}>
            <View style={styles.authorRow}>
              <View style={styles.avatar}>
                {post.avatar_url ? (
                  <Image
                    source={{
                      uri: post.avatar_url,
                    }}
                    style={styles.avatarImage}
                    onError={() => devLog('Avatar load error, falling back to letter')}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {post.username_snapshot[0].toUpperCase()}
                  </Text>
                )}
              </View>

              <View>
                <Text style={styles.username}>@{post.username_snapshot}</Text>
                <Text style={styles.time}>{timeAgo(post.created_at)}</Text>
              </View>
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={styles.reportBtn} onPress={openReportFlow}>
                <Ionicons name="flag-outline" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.catRow}>
              {post.primary_category && (
                <TouchableOpacity
                  style={styles.category}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/categories',
                      params: { category: post.primary_category },
                    })
                  }
                >
                  <Text style={styles.categoryText}>{post.primary_category}</Text>
                </TouchableOpacity>
              )}
              {post.secondary_category && (
                <TouchableOpacity
                  style={styles.category}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/categories',
                      params: { category: post.secondary_category as string },
                    })
                  }
                >
                  <Text style={styles.categoryText}>{post.secondary_category}</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.question}>{post.question_text}</Text>

            {images.length > 0 && (
              <View style={styles.imagesContainer}>
                <FlatList
                  data={images}
                  renderItem={({ item }) => (
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.image}
                      onError={(error) => devLog('Image load error:', error)}
                    />
                  )}
                  keyExtractor={(item, index) => index.toString()}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                />
                {images.length > 1 && (
                  <Text style={styles.imageCount}>{images.length} photos</Text>
                )}
              </View>
            )}

            <View style={styles.voteContainer}>
              <TouchableOpacity
                style={[
                  styles.voteBtn,
                  styles.yesBtn,
                  localVote === 'yes' && styles.votedYes,
                ]}
                onPress={() => handleVote('yes')}
                disabled={!!localVote}
              >
                <Text style={styles.voteBtnEmoji}>👍</Text>
                <Text style={styles.voteBtnText}>Yes {yesPercent}%</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.voteBtn,
                  styles.noBtn,
                  localVote === 'no' && styles.votedNo,
                ]}
                onPress={() => handleVote('no')}
                disabled={!!localVote}
              >
                <Text style={styles.voteBtnEmoji}>👎</Text>
                <Text style={styles.voteBtnText}>No {noPercent}%</Text>
              </TouchableOpacity>
            </View>

            {total > 0 ? (
              <>
                <View style={styles.voteBar}>
                  <View
                    style={[
                      styles.voteBarSegment,
                      { width: `${yesPercent}%`, backgroundColor: '#10B981' },
                    ]}
                  />
                  <View
                    style={[
                      styles.voteBarSegment,
                      { width: `${noPercent}%`, backgroundColor: '#EF4444' },
                    ]}
                  />
                </View>

                <View style={styles.voteSummaryRow}>
                  <View style={styles.voteStatPill}>
                    <View style={[styles.voteStatDot, styles.voteStatDotYes]} />
                    <Text style={styles.voteStatText}>
                      <Text style={styles.voteStatNumber}>{yesCt}</Text> yes
                    </Text>
                  </View>
                  <View style={styles.voteStatPill}>
                    <View style={[styles.voteStatDot, styles.voteStatDotNo]} />
                    <Text style={styles.voteStatText}>
                      <Text style={styles.voteStatNumber}>{noCt}</Text> no
                    </Text>
                  </View>
                  <Text style={styles.totalVotesText}>{total} total votes</Text>
                </View>
              </>
            ) : (
              <View style={styles.noVotesState}>
                <Text style={styles.noVotesTitle}>No votes yet</Text>
                <Text style={styles.noVotesText}>Be the first to give a quick opinion.</Text>
              </View>
            )}
          </View>

          {/* Comments section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>

            {/* Comments list */}
            {comments.length === 0 ? (
              <View style={styles.commentsEmptyState}>
                <Text style={styles.noCommentsText}>No comments yet</Text>
                <Text style={styles.noCommentsSubtext}>Be the first to help with an opinion.</Text>
              </View>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={styles.commentItem}>
                  {c.avatar_url ? (
                    <View style={styles.commentAvatarContainer}>
                      <Image
                        source={{
                          uri: c.avatar_url,
                        }}
                        style={styles.commentAvatarImage}
                      />
                    </View>
                  ) : (
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>
                        {c.username_snapshot[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUsername}>@{c.username_snapshot}</Text>
                      <Text style={styles.commentTime}>{timeAgo(c.created_at)}</Text>
                    </View>
                    <Text style={styles.commentText}>{c.text}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
        <View style={styles.commentComposerDock}>
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor={Colors.textTertiary}
              value={comment}
              onChangeText={setComment}
              multiline
              editable={!submittingComment}
              textAlignVertical="top"
              autoCorrect
              autoCapitalize="sentences"
              scrollEnabled={false}
            />
            <TouchableOpacity
              style={[
                styles.commentSubmitBtn,
                (!comment.trim() || submittingComment) && styles.commentSubmitBtnDisabled,
              ]}
              onPress={handleComment}
              disabled={!comment.trim() || submittingComment}
            >
              <Ionicons
                name="send"
                size={20}
                color={comment.trim() && !submittingComment ? 'white' : Colors.textTertiary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

interface AvatarStyle {
  width: number;
  height: number;
  borderRadius: number;
  backgroundColor: string;
  justifyContent: 'center';
  alignItems: 'center';
  overflow: 'hidden';
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 132,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: Colors.brand,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: Radius.md,
  },
  backBtnText: {
    color: 'white',
    fontWeight: '600',
  },
  postCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  time: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  reportBtn: {
    padding: 8,
  },
  catRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  category: {
    backgroundColor: Colors.brandLight,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
  },
  categoryText: {
    fontSize: 12,
    color: Colors.brand,
    fontWeight: '600',
  },
  question: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    lineHeight: 22,
  },
  imagesContainer: {
    marginBottom: 12,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  image: {
    width: 284,
    height: 284,
    marginRight: 8,
  },
  imageCount: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: 'white',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.md,
    fontSize: 12,
    fontWeight: '600',
  },
  voteContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  voteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  yesBtn: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  noBtn: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  votedYes: {
    backgroundColor: '#10B981',
  },
  votedNo: {
    backgroundColor: '#EF4444',
  },
  voteBtnEmoji: {
    fontSize: 18,
  },
  voteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  voteBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: Colors.border,
  },
  voteBarSegment: {
    height: '100%',
  },
  voteSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  voteStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.background,
  },
  voteStatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  voteStatDotYes: {
    backgroundColor: '#10B981',
  },
  voteStatDotNo: {
    backgroundColor: '#EF4444',
  },
  voteStatText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  voteStatNumber: {
    fontWeight: '700',
    color: Colors.text,
  },
  totalVotesText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginLeft: 'auto',
  },
  noVotesState: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  noVotesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  noVotesText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  commentsSection: {
    marginTop: 6,
    marginBottom: 8,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  commentComposerDock: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  commentInputContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
  },
  commentInput: {
    flex: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.surface,
    minHeight: 46,
    maxHeight: 120,
    lineHeight: 20,
  },
  commentSubmitBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSubmitBtnDisabled: {
    backgroundColor: Colors.border,
  },
  noCommentsText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  noCommentsSubtext: {
    fontSize: 13,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 6,
  },
  commentsEmptyState: {
    paddingVertical: 20,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: Colors.brand,
  },
  commentAvatarImage: {
    width: '100%',
    height: '100%',
  },
  commentAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  commentTime: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  commentText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
