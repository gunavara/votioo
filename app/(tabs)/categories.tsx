import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import PostCard from '../../components/PostCard';
import { CATEGORIES, MOCK_POSTS } from '../../constants/mockData';
import { Colors, Radius } from '../../constants/theme';

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

export default function CategoriesScreen() {
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = selected
    ? MOCK_POSTS.filter((p) => p.categories.includes(selected as any))
    : MOCK_POSTS;

  const categoryColor = selected 
    ? (CATEGORY_COLORS[selected] || Colors.brand) 
    : Colors.brand;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
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
          renderItem={({ item }) => <PostCard post={item} />}
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
});
