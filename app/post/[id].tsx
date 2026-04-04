import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors, Radius, Shadow } from '../../constants/theme';
import { MOCK_POSTS, MOCK_COMMENTS } from '../../constants/mockData';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

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
  const post = MOCK_POSTS.find((p) => p.id === id) ?? MOCK_POSTS[0];

  const [localVote, setLocalVote] = useState<'yes' | 'no' | null>(null);
  const [yesCt, setYesCt] = useState(post.yesCount);
  const [noCt, setNoCt] = useState(post.noCount);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState(MOCK_COMMENTS);

  const total = yesCt + noCt;
  const yesPercent = total > 0 ? Math.round((yesCt / total) * 100) : 50;
  const noPercent = 100 - yesPercent;
  const yesLeading = yesCt >= noCt;

  const handleVote = (vote: 'yes' | 'no') => {
    if (localVote) return;
    setLocalVote(vote);
    if (vote === 'yes') setYesCt((c) => c + 1);
    else setNoCt((c) => c + 1);
  };

  const handleComment = () => {
    if (!comment.trim()) return;

    if (!user) {
      Alert.alert('Влез в профила си', 'Трябва да си вписан, за да коментираш.', [
        { text: 'Отказ', style: 'cancel' },
        { text: 'Влез', onPress: () => router.push('/auth') },
      ]);
      return;
    }

    // Добавяме коментара локално
    const newComment = {
      id: Date.now().toString(),
      username: profile?.username ?? user.email?.split('@')[0] ?? 'user',
      text: comment.trim(),
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [newComment, ...prev]);
    setComment('');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Post author */}
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{post.username[0].toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.username}>@{post.username}</Text>
              <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.reportBtn}>
              <Ionicons name="flag-outline" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Categories */}
          <View style={styles.catRow}>
            {post.categories.map((cat) => (
              <View key={cat} style={styles.catChip}>
                <Text style={styles.catText}>{cat}</Text>
              </View>
            ))}
          </View>

          {/* Question */}
          <Text style={styles.question}>{post.question}</Text>

          {/* Images */}
          {post.images && post.images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
              {post.images.map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.image} resizeMode="cover" />
              ))}
            </ScrollView>
          )}

          {/* Vote buttons */}
          <View style={styles.voteRow}>
            <TouchableOpacity
              style={[
                styles.voteBtn,
                styles.yesBtn,
                localVote === 'yes' && styles.yesBtnActive,
                yesLeading && !localVote && styles.yesBtnLeading,
              ]}
              onPress={() => handleVote('yes')}
              disabled={!!localVote}
            >
              <Text style={styles.voteBtnEmoji}>👍</Text>
              <Text style={[styles.voteBtnLabel, localVote === 'yes' && styles.labelWhite]}>Yes</Text>
              <Text style={[styles.votePercent, localVote === 'yes' && styles.labelWhite]}>
                {yesPercent}%
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.voteBtn,
                styles.noBtn,
                localVote === 'no' && styles.noBtnActive,
                !yesLeading && !localVote && styles.noBtnLeading,
              ]}
              onPress={() => handleVote('no')}
              disabled={!!localVote}
            >
              <Text style={styles.voteBtnEmoji}>👎</Text>
              <Text style={[styles.voteBtnLabel, localVote === 'no' && styles.labelWhite]}>No</Text>
              <Text style={[styles.votePercent, localVote === 'no' && styles.labelWhite]}>
                {noPercent}%
              </Text>
            </TouchableOpacity>
          </View>

          {/* Vote bar */}
          <View style={styles.barContainer}>
            <View style={[styles.barYes, { flex: yesPercent }]} />
            <View style={[styles.barNo, { flex: noPercent }]} />
          </View>
          <View style={styles.barLabels}>
            <Text style={styles.barLabelYes}>{yesCt} Yes</Text>
            <Text style={styles.barLabelNo}>{noCt} No</Text>
          </View>

          {/* Comments */}
          <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>

          {comments.map((c) => (
            <View key={c.id} style={styles.commentCard}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>{c.username[0].toUpperCase()}</Text>
              </View>
              <View style={styles.commentBody}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUsername}>@{c.username}</Text>
                  <Text style={styles.commentTime}>{timeAgo(c.createdAt)}</Text>
                </View>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Comment input */}
        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor={Colors.textTertiary}
            value={comment}
            onChangeText={setComment}
            maxLength={200}
            returnKeyType="send"
            onSubmitEditing={handleComment}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleComment}>
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.brand,
    fontWeight: '700',
    fontSize: 16,
  },
  username: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  time: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  reportBtn: {
    padding: 4,
  },
  catRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  catChip: {
    backgroundColor: Colors.brandLight,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  catText: {
    color: Colors.brand,
    fontSize: 12,
    fontWeight: '600',
  },
  question: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 28,
    marginBottom: 16,
  },
  imagesScroll: {
    marginBottom: 16,
  },
  image: {
    width: 280,
    height: 200,
    borderRadius: Radius.md,
    marginRight: 10,
  },
  voteRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  voteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  yesBtn: {
    borderColor: Colors.yes,
    backgroundColor: Colors.yesLight,
  },
  yesBtnActive: {
    backgroundColor: Colors.yes,
    borderColor: Colors.yes,
  },
  yesBtnLeading: {
    paddingVertical: 17,
  },
  noBtn: {
    borderColor: Colors.no,
    backgroundColor: Colors.noLight,
  },
  noBtnActive: {
    backgroundColor: Colors.no,
    borderColor: Colors.no,
  },
  noBtnLeading: {
    paddingVertical: 17,
  },
  voteBtnEmoji: {
    fontSize: 18,
  },
  voteBtnLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  votePercent: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  labelWhite: {
    color: '#fff',
  },
  barContainer: {
    flexDirection: 'row',
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: 6,
  },
  barYes: {
    backgroundColor: Colors.yes,
  },
  barNo: {
    backgroundColor: Colors.no,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  barLabelYes: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.yes,
  },
  barLabelNo: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.no,
  },
  commentsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },
  commentCard: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    color: Colors.brand,
    fontWeight: '700',
    fontSize: 14,
  },
  commentBody: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 10,
    ...Shadow.card,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  commentTime: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  commentText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 19,
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendBtn: {
    backgroundColor: Colors.brand,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
