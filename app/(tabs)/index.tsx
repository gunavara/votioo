import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, SafeAreaView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { MOCK_POSTS } from '../../constants/mockData';
import PostCard from '../../components/PostCard';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
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
  const { user, profile, signOut } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [useMock, setUseMock] = useState(false);

  const loadPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*, post_images(image_url, sort_order)')
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data) {
      setUseMock(true);
      setPosts(MOCK_POSTS);
    } else if (data.length === 0) {
      setUseMock(true);
      setPosts(MOCK_POSTS);
    } else {
      setUseMock(false);
      setPosts(data.map(mapDbPost));
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const onRefresh = () => { setRefreshing(true); loadPosts(); };

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

      {loading ? (
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
  list: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, marginTop: 60 },
  emptyText: { color: Colors.textTertiary, fontSize: 15, textAlign: 'center' },
});
