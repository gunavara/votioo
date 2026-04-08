import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Colors, Radius, Shadow } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Post } from '../types';

export default function MyQuestionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyQuestions();
    }
  }, [user]);

  const fetchMyQuestions = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('❌ Error fetching questions:', error.message);
      } else {
        setPosts(data || []);
      }

      setLoading(false);
    } catch (error) {
      console.log('❌ Error:', error);
      setLoading(false);
    }
  };

  const renderPost = ({ item }: { item: Post }) => {
    const totalVotes = item.yesCount + item.noCount;
    const yesPercent = totalVotes > 0 ? Math.round((item.yesCount / totalVotes) * 100) : 0;

    return (
      <TouchableOpacity
        style={styles.postCard}
        onPress={() => router.push(`/post/${item.id}`)}
      >
        <Text style={styles.postTitle}>{item.question}</Text>
        <Text style={styles.postCategory}>{item.categories?.[0] || 'Other'}</Text>

        <View style={styles.voteContainer}>
          <View style={[styles.voteBtn, styles.yesBtn]}>
            <Text style={styles.voteBtnLabel}>👍 {yesPercent}%</Text>
          </View>
          <View style={[styles.voteBtn, styles.noBtn]}>
            <Text style={styles.voteBtnLabel}>👎 {100 - yesPercent}%</Text>
          </View>
        </View>

        <Text style={styles.postTime}>{formatTime(item.createdAt)}</Text>
      </TouchableOpacity>
    );
  };

  const formatTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>My Questions</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.brand} />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyTitle}>No questions yet</Text>
          <Text style={styles.emptyText}>Start by asking your first question!</Text>
          <TouchableOpacity
            style={styles.askBtn}
            onPress={() => router.push('/(tabs)/create')}
          >
            <Text style={styles.askBtnText}>Ask a Question</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  askBtn: {
    backgroundColor: Colors.brand,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  askBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  postCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 16,
    marginBottom: 12,
    ...Shadow.card,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  postCategory: {
    fontSize: 12,
    color: Colors.brand,
    fontWeight: '600',
    marginBottom: 12,
  },
  voteContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  voteBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  yesBtn: {
    borderColor: Colors.yes,
    backgroundColor: Colors.yesLight,
  },
  noBtn: {
    borderColor: Colors.no,
    backgroundColor: Colors.noLight,
  },
  voteBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  postTime: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
});
