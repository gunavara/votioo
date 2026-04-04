import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Colors, Radius, Shadow } from '../../constants/theme';
import { useRouter } from 'expo-router';

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    type: 'first_vote',
    message: 'Your question got its first vote!',
    time: '2m ago',
    read: false,
    postId: '1',
  },
  {
    id: '2',
    type: 'comment',
    message: '@techgeek99 commented on your question.',
    time: '15m ago',
    read: false,
    postId: '1',
  },
  {
    id: '3',
    type: 'milestone',
    message: 'Your question reached 25 votes! 🎉',
    time: '1h ago',
    read: true,
    postId: '2',
  },
  {
    id: '4',
    type: 'comment',
    message: '@nina_v commented on your question.',
    time: '3h ago',
    read: true,
    postId: '3',
  },
];

const notifIcon = (type: string) => {
  if (type === 'first_vote') return '👍';
  if (type === 'comment') return '💬';
  if (type === 'milestone') return '🏆';
  if (type === 'moderation') return '⚠️';
  return '🔔';
};

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <FlatList
        data={MOCK_NOTIFICATIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, !item.read && styles.itemUnread]}
            onPress={() => router.push(`/post/${item.postId}`)}
          >
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>{notifIcon(item.type)}</Text>
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemMessage}>{item.message}</Text>
              <Text style={styles.itemTime}>{item.time}</Text>
            </View>
            {!item.read && <View style={styles.dot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptyText}>
              When someone votes or comments on your questions, you'll see it here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 10,
    ...Shadow.card,
  },
  itemUnread: {
    backgroundColor: '#F5F3FF',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  itemContent: {
    flex: 1,
  },
  itemMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 20,
  },
  itemTime: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.brand,
    marginLeft: 8,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
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
    lineHeight: 20,
  },
});
