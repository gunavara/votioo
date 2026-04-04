import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Colors, Radius, Shadow } from '../../constants/theme';
import { CATEGORIES, MOCK_POSTS } from '../../constants/mockData';
import PostCard from '../../components/PostCard';

export default function CategoriesScreen() {
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = selected
    ? MOCK_POSTS.filter((p) => p.categories.includes(selected as any))
    : MOCK_POSTS;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Categories</Text>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        <TouchableOpacity
          style={[styles.chip, !selected && styles.chipActive]}
          onPress={() => setSelected(null)}
        >
          <Text style={[styles.chipText, !selected && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.name}
            style={[styles.chip, selected === cat.name && styles.chipActive]}
            onPress={() => setSelected(cat.name === selected ? null : cat.name)}
          >
            <Text style={styles.chipEmoji}>{cat.emoji}</Text>
            <Text style={[styles.chipText, selected === cat.name && styles.chipTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category grid (when no selection) */}
      {!selected && (
        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.name}
              style={styles.gridCard}
              onPress={() => setSelected(cat.name)}
            >
              <Text style={styles.gridEmoji}>{cat.emoji}</Text>
              <Text style={styles.gridName}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Posts for selected category */}
      {selected && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard post={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No posts in this category yet.</Text>
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
  chipsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 10,
  },
  gridCard: {
    width: '46%',
    marginHorizontal: '2%',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  gridEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  gridName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  empty: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textTertiary,
    fontSize: 15,
  },
});
