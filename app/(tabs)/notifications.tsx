import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { useNotifications } from '../../context/NotificationsContext';

const notifIcon = (type: string) => {
  if (type === 'vote') return '👍';
  if (type === 'comment') return '💬';
  if (type === 'milestone') return '🏆';
  if (type === 'moderation') return '⚠️';
  return '🔔';
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, markAllRead, markOneRead } = useNotifications();

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (unreadCount > 0) {
          markAllRead();
        }
      };
    }, [markAllRead, unreadCount])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Updates</Text>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>
          {unreadCount > 0
            ? `${unreadCount} new ${unreadCount === 1 ? 'alert' : 'alerts'} waiting`
            : 'Votes and comments on your questions will show up here'}
        </Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, !item.is_read && styles.itemUnread]}
            onPress={async () => {
              await markOneRead(item.id);
              if (item.reference_id) {
                router.push(`/post/${item.reference_id}`);
              }
            }}
          >
            {!item.is_read && <View style={styles.unreadAccent} />}
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>{notifIcon(item.type)}</Text>
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.itemMessage, item.is_read && styles.itemMessageRead]}>
                {item.message}
              </Text>
              <View style={styles.itemMeta}>
                <Text style={styles.itemTime}>{new Date(item.created_at).toLocaleString()}</Text>
                {!item.is_read && <Text style={styles.unreadLabel}>New</Text>}
              </View>
            </View>
            {!item.is_read && <View style={styles.dot} />}
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
    paddingVertical: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
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
    position: 'relative',
    overflow: 'hidden',
    ...Shadow.card,
  },
  itemUnread: {
    backgroundColor: '#F6F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  unreadAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Colors.brand,
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
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 20,
  },
  itemMessageRead: {
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  itemTime: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  unreadLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.brand,
    backgroundColor: Colors.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
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
    paddingTop: 96,
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
