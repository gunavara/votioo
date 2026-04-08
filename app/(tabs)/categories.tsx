import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CATEGORIES, MOCK_POSTS } from '../../constants/mockData';
import { Colors, Radius, Shadow } from '../../constants/theme';
import { Post } from '../../types';

// Unique color palette for each category
const CATEGORY_COLORS: { [key: string]: string } = {
  Shopping: '#EC4899',    // Pink
  Tech: '#3B82F6',        // Blue
  Fashion: '#F59E0B',     // Amber
  Food: '#EF4444',        // Red
  Travel: '#10B981',      // Emerald
  Relationships: '#F43F5E', // Rose
  Lifestyle: '#8B5CF6',   // Violet
  Home: '#F97316',        // Orange
  Other: '#6366F1',       // Indigo
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Inline PostCard component for categories view
function CategoryPostCard({ post }: { post: Post }) {
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
  };

  return (
    <Pressable
      style={[styles.card]}
      onPress={() => {
        try {
          router.push(`/post/${post.id}`);
        } catch (e) {
          console.log('Navigation error:', e);
        }
      }}
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

export default function CategoriesScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const navigation = useNavigation();

  // Listen for tab press events
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress' as any, (e) => {

      // Reset to categories list when tab is pressed
      setSelected(null);
    });

    return unsubscribe;
  }, [navigation]);

  const filtered = selected
    ? MOCK_POSTS.filter((p) => p.categories.includes(selected as any))
    : MOCK_POSTS;

  const categoryColor = selected 
    ? (CATEGORY_COLORS[selected] || Colors.brand) 
    : Colors.brand;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.headerView}>
        {selected ? (
          <>
            <TouchableOpacity
              onPress={() => setSelected(null)}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={24} color={categoryColor} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: categoryColor }]}>#{selected}</Text>
            <View style={{ width: 24 }} />
          </>
        ) : (
          <Text style={styles.title}>Categories</Text>
        )}
      </View>

      {/* Show chips or posts based on selection */}
      {!selected ? (
        <View style={styles.chipsContainer}>
          <View style={styles.chipsGrid}>
            {CATEGORIES.map((cat) => {
              const color = CATEGORY_COLORS[cat.name] || Colors.brand;
              return (
                <TouchableOpacity
                  key={cat.name}
                  style={[styles.hashtagChip, { borderColor: color }]}
                  onPress={() => setSelected(cat.name)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.hashtagText, { color }]}>#{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CategoryPostCard post={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No posts in #{selected} yet.</Text>
              <Text style={styles.emptySubtext}>Be the first to ask something!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  chipsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 20,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },
  hashtagChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 2,
    marginBottom: 4,
  },
  hashtagText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: Colors.textTertiary,
    fontSize: 14,
  },
  // PostCard styles
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