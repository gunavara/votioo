import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import { Post } from '../types';

interface Props {
  post: Post;
  onVote?: (postId: string, vote: 'yes' | 'no') => void;
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

export default function PostCard({ post, onVote }: Props) {
  const router = useRouter();
  const [localVote, setLocalVote] = useState<'yes' | 'no' | null>(post.userVote ?? null);
  const [yesCt, setYesCt] = useState(post.yesCount);
  const [noCt, setNoCt] = useState(post.noCount);

  const total = yesCt + noCt;
  const yesPercent = total > 0 ? Math.round((yesCt / total) * 100) : 50;
  const noPercent = total > 0 ? Math.round((noCt / total) * 100) : 50;
  const yesLeading = yesCt >= noCt;

  const handleVote = (vote: 'yes' | 'no') => {
    if (localVote) return;
    setLocalVote(vote);
    if (vote === 'yes') setYesCt((c) => c + 1);
    else setNoCt((c) => c + 1);
    onVote?.(post.id, vote);
  };

  return (
    <Pressable
      style={[styles.card]}
      onPress={() => router.push(`/post/${post.id}`)}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{post.username[0].toUpperCase()}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.username}>@{post.username}</Text>
          <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
        </View>
        <View style={styles.categories}>
          {post.categories.map((cat) => (
            <View key={cat} style={styles.categoryChip}>
              <Text style={styles.categoryText}>{cat}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Question */}
      <Text style={styles.question}>{post.question}</Text>

      {/* Images */}
      {post.images && post.images.length > 0 && (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: post.images[0] }}
            style={styles.image}
            resizeMode="cover"
          />
          {post.images.length > 1 && (
            <View style={styles.imageCount}>
              <Text style={styles.imageCountText}>+{post.images.length - 1}</Text>
            </View>
          )}
        </View>
      )}

      {/* Vote Buttons */}
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
          activeOpacity={0.85}
        >
          <Text style={[styles.voteBtnEmoji]}>👍</Text>
          <Text style={[styles.voteBtnLabel, localVote === 'yes' && styles.voteBtnLabelActive]}>
            Yes
          </Text>
          {localVote && (
            <Text style={[styles.votePercent, localVote === 'yes' && styles.votePercentActive]}>
              {yesPercent}%
            </Text>
          )}
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
          activeOpacity={0.85}
        >
          <Text style={styles.voteBtnEmoji}>👎</Text>
          <Text style={[styles.voteBtnLabel, localVote === 'no' && styles.voteBtnLabelActiveNo]}>
            No
          </Text>
          {localVote && (
            <Text style={[styles.votePercent, localVote === 'no' && styles.votePercentActiveNo]}>
              {noPercent}%
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerStat}>
          <Ionicons name="stats-chart-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.footerText}>{yesCt + noCt} votes</Text>
        </View>
        <View style={styles.footerStat}>
          <Ionicons name="chatbubble-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.footerText}>{post.commentCount} comments</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
    ...Shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: Colors.brand,
    fontWeight: '700',
    fontSize: 15,
  },
  headerInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  time: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  categories: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: 140,
  },
  categoryChip: {
    backgroundColor: Colors.brandLight,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    color: Colors.brand,
    fontSize: 11,
    fontWeight: '600',
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  imageContainer: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: Radius.md,
  },
  imageCount: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  voteRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  voteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
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
    paddingVertical: 13,
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
    paddingVertical: 13,
  },
  voteBtnEmoji: {
    fontSize: 16,
  },
  voteBtnLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  voteBtnLabelActive: {
    color: '#fff',
  },
  voteBtnLabelActiveNo: {
    color: '#fff',
  },
  votePercent: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  votePercentActive: {
    color: '#fff',
  },
  votePercentActiveNo: {
    color: '#fff',
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
});
