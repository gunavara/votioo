import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PostCard from '../../components/PostCard';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { devError } from '../../lib/devLog';
import { fetchAvatarUrls } from '../../lib/profileLookup';
import { supabase } from '../../lib/supabase';
import { Post } from '../../types';

function mapDbPost(p: any, avatarUrls: Map<string, string>): Post {
  return {
    id: p.id,
    username: p.username_snapshot,
    avatarUrl: avatarUrls.get(p.user_id) ?? undefined,
    question: p.question_text,
    categories: [p.primary_category, p.secondary_category].filter(Boolean),
    images: p.post_images?.map((i: any) => i.image_url) ?? [],
    yesCount: p.yes_count,
    noCount: p.no_count,
    commentCount: p.comment_count,
    createdAt: p.created_at,
    userVote: p.user_vote ?? null,
  };
}

export default function FeedScreen() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [useMock, setUseMock] = useState(false);
  const [filter, setFilter] = useState<'latest' | 'hot'>('latest');

  const loadPosts = useCallback(async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, post_images(image_url, sort_order)')
        .eq('moderation_status', 'approved')
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) {
      devError('Error loading posts:', error);
      setPosts([]);
      setUseMock(false);
    } else if (!data || data.length === 0) {
      setPosts([]);
      setUseMock(false);
    } else {
      setUseMock(false);
      const avatarUrls = await fetchAvatarUrls(data.map((post: any) => post.user_id));
      const mappedPosts = data.map((post: any) => mapDbPost(post, avatarUrls));
      const sortedPosts = sortPosts(mappedPosts, filter);
      setPosts(sortedPosts);
    }
    setIsLoading(false);
    setRefreshing(false);
  }, [filter]);

  // Helper function to sort posts based on filter
  const sortPosts = (postsToSort: Post[], sortFilter: 'latest' | 'hot'): Post[] => {
    if (sortFilter === 'hot') {
      // Sort by total votes (yes + no) in descending order
      return [...postsToSort].sort((a, b) => {
        const aTotal = a.yesCount + a.noCount;
        const bTotal = b.yesCount + b.noCount;
        return bTotal - aTotal;
      });
    }
    // Latest: already sorted by created_at descending from the query
    return postsToSort;
  };

  useEffect(() => { loadPosts(); }, [loadPosts]);
  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [loadPosts])
  );

  const onRefresh = () => { setRefreshing(true); loadPosts(); };

  // Show loading while auth is initializing
  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.logo}>votioo</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.brand} />
          <Text style={styles.debugText}>Restoring session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>votioo</Text>
          <Text style={styles.headerSubtitle}>
            {user ? 'Fresh questions from the community' : 'Vote fast on real questions'}
          </Text>
        </View>
        {user ? (
          <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(tabs)/profile')}>
            {profile?.avatar_url && profile.avatar_url.length > 0 ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile?.username ? profile.username[0].toUpperCase() : (user.email ? user.email[0].toUpperCase() : 'U')}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/auth')}>
            <Text style={styles.signInText}>Sign in</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            filter === 'latest' && styles.filterBtnActive,
          ]}
          onPress={() => setFilter('latest')}
        >
          <Text
            style={[
              styles.filterBtnText,
              filter === 'latest' && styles.filterBtnTextActive,
            ]}
          >
            Latest
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterBtn,
            filter === 'hot' && styles.filterBtnActive,
          ]}
          onPress={() => setFilter('hot')}
        >
          <Text
            style={[
              styles.filterBtnText,
              filter === 'hot' && styles.filterBtnTextActive,
            ]}
          >
            Hot
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.brand} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard post={item} onVote={loadPosts} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.brand} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyText}>Be the first to ask something and get the conversation started.</Text>
              <TouchableOpacity style={styles.emptyCta} onPress={() => router.push('/(tabs)/create')}>
                <Text style={styles.emptyCtaText}>Ask the first question</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  logo: { fontSize: 22, fontWeight: '800', color: Colors.brand, letterSpacing: -0.5 },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  signInBtn: { backgroundColor: Colors.brand, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  signInText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  avatarBtn: {},
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.brandLight, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.brand, fontWeight: '700', fontSize: 15 },
  
  // Filter styles
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterBtnTextActive: {
    color: '#fff',
  },

  list: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 60 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: { color: Colors.textTertiary, fontSize: 15, textAlign: 'center' },
  emptyCta: {
    marginTop: 18,
    backgroundColor: Colors.brand,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  emptyCtaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  debugText: { color: Colors.textTertiary, fontSize: 14, marginTop: 12 },
});
