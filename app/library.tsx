import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useArticlesStore } from '@/src/store/articles';
import type { Article } from '@/src/db/schema';
import { fontFamily } from '@/src/theme/typography';
import { BASE_TAGS, parseTags, splitTags } from '@/src/lib/tags';

function CollectionCard({ item, onPress }: { item: Article; onPress: () => void }) {
  const imageUri = item.cover_url_1_1 || item.msg_cdn_url || '';
  const tags = parseTags(item.tags_json);
  const { base, ai } = splitTags(tags);

  return (
    <TouchableOpacity style={styles.collectionCard} onPress={onPress} activeOpacity={0.88}>
      {imageUri ? <Image source={{ uri: imageUri }} style={styles.squareImage} /> : <View style={styles.squarePlaceholder} />}
      <View style={styles.collectionMeta}>
        <Text style={styles.collectionTitle} numberOfLines={2}>
          {item.title ?? 'Untitled'}
        </Text>
        {!!item.description ? <Text style={styles.collectionDesc}>{item.description}</Text> : null}
        {tags.length ? (
          <View style={styles.tagRow}>
            {base.slice(0, 1).map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {ai.slice(0, 1).map((tag) => (
              <View key={tag} style={styles.tagPillAi}>
                <Text style={styles.tagTextAi}>{tag}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function LibraryScreen() {
  const router = useRouter();
  const { articles, loadArticles } = useArticlesStore();
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadArticles();
    }, [loadArticles]),
  );

  const visibleArticles = useMemo(
    () => (activeTag ? articles.filter((item) => parseTags(item.tags_json).includes(activeTag)) : articles),
    [activeTag, articles],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Library</Text>
          <Text style={styles.sub}>Collection View (1:1 Cover)</Text>
        </View>
        <TouchableOpacity style={styles.storageBtn} onPress={() => router.push('/storage')}>
          <Text style={styles.storageBtnText}>Storage</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        horizontal
        data={['All', ...BASE_TAGS]}
        keyExtractor={(item) => `library-tag-${item}`}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagStrip}
        renderItem={({ item }) => {
          const selected = item === 'All' ? activeTag === null : activeTag === item;
          return (
            <TouchableOpacity
              style={[styles.filterChip, selected ? styles.filterChipActive : null]}
              onPress={() => setActiveTag(item === 'All' ? null : item)}
            >
              <Text style={[styles.filterChipText, selected ? styles.filterChipTextActive : null]}>{item}</Text>
            </TouchableOpacity>
          );
        }}
      />
      <FlatList
        data={visibleArticles}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadArticles} tintColor="#325f53" />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <CollectionCard item={item} onPress={() => router.push(`/article/${item.id}`)} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f4', paddingTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 12 },
  heading: { fontSize: 34, color: '#0f3b31', fontFamily: fontFamily.serif },
  sub: { marginTop: 3, fontSize: 11, color: '#6c7e77', fontFamily: fontFamily.mono, letterSpacing: 0.7 },
  storageBtn: {
    borderWidth: 1,
    borderColor: '#c9d5cf',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#e9f0ec',
  },
  storageBtnText: { color: '#1e2f2a', fontFamily: fontFamily.mono, fontSize: 12, letterSpacing: 0.6 },
  tagStrip: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  filterChip: {
    borderWidth: 1,
    borderColor: '#d5ded8',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: '#0f3b31', borderColor: '#0f3b31' },
  filterChipText: { fontSize: 11, color: '#29433c', fontFamily: fontFamily.chinese, textAlign: 'center' },
  filterChipTextActive: { color: '#fff' },
  list: { paddingHorizontal: 16, paddingBottom: 120, gap: 12 },
  collectionCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe4df',
    backgroundColor: '#fff',
    padding: 10,
    alignItems: 'center',
    shadowColor: '#13211b',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  squareImage: { width: 86, height: 86, borderRadius: 12, backgroundColor: '#e9eeea' },
  squarePlaceholder: { width: 86, height: 86, borderRadius: 12, backgroundColor: '#e9eeea' },
  collectionMeta: { flex: 1, gap: 6 },
  collectionTitle: { fontSize: 20, color: '#101815', fontFamily: fontFamily.serif },
  collectionDesc: { fontSize: 13, color: '#3e4a45', lineHeight: 19, fontFamily: fontFamily.chinese },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  tagPill: { backgroundColor: '#eef3ef', borderRadius: 999, paddingHorizontal: 8, minHeight: 24, borderWidth: 1, borderColor: '#d7e1db', alignItems: 'center', justifyContent: 'center' },
  tagText: { fontSize: 10, color: '#315449', fontFamily: fontFamily.chinese, textAlign: 'center' },
  tagPillAi: { backgroundColor: '#f5efe6', borderRadius: 999, paddingHorizontal: 8, minHeight: 24, borderWidth: 1, borderColor: '#e6d5bf', alignItems: 'center', justifyContent: 'center' },
  tagTextAi: { fontSize: 10, color: '#7a5a32', fontFamily: fontFamily.chinese, textAlign: 'center' },
});
