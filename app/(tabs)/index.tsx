import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import PostCard from '../../components/PostCard';
import { MOCK_POSTS } from '../../constants/mockData';
import { Colors } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Post } from '../../types';

function mapDbPost(p: any): Post {
  return {
    id: p.id,
    username: p.username_snapshot,
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
  const { user, profile, loading, signOut } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [useMock, setUseMock] = useState(false);
  const [filter, setFilter] = useState<'latest' | 'hot'>('latest');

  // DEBUG: Log auth state
  useEffect(() => {
    console.log('🔍 Auth Debug:', {
      user: user?.email,
      profile: profile?.username,
      loading,
      hasSession: !!user,
    });
  }, [user, profile, loading]);

  const loadPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*, post_images(image_url, sort_order)')
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data) {
      setUseMock(true);
      const sortedMock = sortPosts(MOCK_POSTS, filter);
      setPosts(sortedMock);
    } else if (data.length === 0) {
      setUseMock(true);
      const sortedMock = sortPosts(MOCK_POSTS, filter);
      setPosts(sortedMock);
    } else {
      setUseMock(false);
      const mappedPosts = data.map(mapDbPost);
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
          <Text style={styles.debugText}>Checking session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.logo}>votioo</Text>
        {user ? (
          <TouchableOpacity style={styles.avatarBtn} onPress={() => router.push('/(tabs)/profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile?.username ?? user.email ?? 'U')[0].toUpperCase()}
              </Text>
            </View>
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
            🔥 Hot
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
              <Text style={styles.emptyText}>No questions yet. Be the first to ask!</Text>
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
    paddingVertical: 12,
    gap: 8,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
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
  emptyText: { color: Colors.textTertiary, fontSize: 15, textAlign: 'center' },
  debugText: { color: Colors.textTertiary, fontSize: 14, marginTop: 12 },
});