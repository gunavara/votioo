import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Radius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface PostData {
  id: string;
  question_text: string;
  primary_category: string;
  secondary_category: string | null;
  user_id: string;
  username_snapshot: string;
  created_at: string;
  post_images?: Array<{ image_url: string; sort_order: number }>;
}

interface CommentData {
  id: string;
  post_id: string;
  user_id: string;
  username_snapshot: string;
  comment_text: string;
  created_at: string;
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
        console.log('❌ Error fetching post:', error);
        Alert.alert('Error', 'Failed to load post');
        return;
      }

      setPost(data as PostData);
      console.log('✅ Post loaded:', data);
    } catch (error: any) {
      console.log('❌ Error:', error);
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
        console.log('❌ Error fetching comments:', error);
        return;
      }

      setComments(data as CommentData[]);
    } catch (error: any) {
      console.log('❌ Error:', error);
    }
  };

  const fetchVotes = async () => {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('vote_type')
        .eq('post_id', id);

      if (error) {
        console.log('❌ Error fetching votes:', error);
        return;
      }

      const yesVotes = data?.filter((v) => v.vote_type === 'yes').length || 0;
      const noVotes = data?.filter((v) => v.vote_type === 'no').length || 0;
      setYesCt(yesVotes);
      setNoCt(noVotes);
    } catch (error: any) {
      console.log('❌ Error:', error);
    }
  };

  const handleVote = async (vote: 'yes' | 'no') => {
    if (localVote || !user) {
      Alert.alert('Error', 'You can only vote once, or you need to be signed in');
      return;
    }

    try {
      // Check if user already voted
      const { data: existingVote, error: checkError } = await supabase
        .from('votes')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .single();

      if (existingVote) {
        Alert.alert('Error', 'You have already voted on this post');
        return;
      }

      // Insert vote
      const { error } = await supabase
        .from('votes')
        .insert({
          post_id: id,
          user_id: user.id,
          vote_type: vote,
        });

      if (error) {
        console.log('❌ Vote error:', error);
        Alert.alert('Error', 'Failed to vote');
        return;
      }

      setLocalVote(vote);
      if (vote === 'yes') {
        setYesCt((c) => c + 1);
      } else {
        setNoCt((c) => c + 1);
      }
    } catch (error: any) {
      console.log('❌ Error:', error);
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
          comment_text: comment.trim(),
        });

      if (error) {
        console.log('❌ Comment error:', error);
        Alert.alert('Error', 'Failed to post comment');
        return;
      }

      setComment('');
      await fetchComments();
    } catch (error: any) {
      console.log('❌ Error:', error);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.safe}>
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
  const yesLeading = yesCt >= noCt;

  const images = post.post_images?.sort((a, b) => a.sort_order - b.sort_order) || [];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Back button */}
          <TouchableOpacity style={styles.backButtonRow} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          {/* Post author */}
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              {post.user_id ? (
                <Image
                  source={{
                    uri: `https://whaxkumefdykypunpoxf.supabase.co/storage/v1/object/public/avatars/${post.user_id}/avatar.jpg`,
                  }}
                  style={styles.avatarImage}
                  onError={() => {
                    console.log('Avatar load error, falling back to letter');
                  }}
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
            <TouchableOpacity style={styles.reportBtn}>
              <Ionicons name="flag-outline" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <View style={styles.catRow}>
            {post.primary_category && (
              <View style={styles.category}>
                <Text style={styles.categoryText}>{post.primary_category}</Text>
              </View>
            )}
            {post.secondary_category && (
              <View style={styles.category}>
                <Text style={styles.categoryText}>{post.secondary_category}</Text>
              </View>
            )}
          </View>

          {/* Question text */}
          <Text style={styles.question}>{post.question_text}</Text>

          {/* Images carousel */}
          {images.length > 0 && (
            <View style={styles.imagesContainer}>
              <FlatList
                data={images}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.image}
                    onError={(error) => {
                      console.log('❌ Image load error:', error);
                    }}
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

          {/* Vote buttons */}
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

          {/* Vote bar */}
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

          {/* Vote counts */}
          <View style={styles.voteCounts}>
            <Text style={styles.voteCountText}>
              <Text style={styles.voteCountNumber}>{yesCt}</Text> Yes
            </Text>
            <Text style={styles.voteCountText}>
              <Text style={styles.voteCountNumber}>{noCt}</Text> No
            </Text>
          </View>

          {/* Comments section */}
          <View style={styles.commentsSection}>
            <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>

            {/* Comment input */}
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor={Colors.textTertiary}
                value={comment}
                onChangeText={setComment}
                multiline
                editable={!submittingComment}
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

            {/* Comments list */}
            {comments.length === 0 ? (
              <Text style={styles.noCommentsText}>No comments yet. Be the first!</Text>
            ) : (
              comments.map((c) => (
                <View key={c.id} style={styles.commentItem}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.commentAvatarText}>
                      {c.username_snapshot[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentUsername}>@{c.username_snapshot}</Text>
                      <Text style={styles.commentTime}>{timeAgo(c.created_at)}</Text>
                    </View>
                    <Text style={styles.commentText}>{c.comment_text}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
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
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
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
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 12,
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
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    lineHeight: 24,
  },
  imagesContainer: {
    marginBottom: 16,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  image: {
    width: 300,
    height: 300,
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
    marginBottom: 12,
  },
  voteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 2,
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
    fontSize: 20,
  },
  voteBtnText: {
    fontSize: 14,
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
  voteCounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  voteCountText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  voteCountNumber: {
    fontWeight: '700',
    color: Colors.text,
  },
  commentsSection: {
    marginTop: 12,
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  commentInputContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    maxHeight: 100,
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
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginVertical: 20,
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
