import { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useArticlesStore } from '@/src/store/articles';
import type { Article } from '@/src/db/schema';

function CollectionCard({ item, onPress }: { item: Article; onPress: () => void }) {
  const imageUri = item.cover_url_1_1 || item.msg_cdn_url || '';

  return (
    <TouchableOpacity style={styles.collectionCard} onPress={onPress} activeOpacity={0.8}>
      {imageUri ? <Image source={{ uri: imageUri }} style={styles.squareImage} /> : <View style={styles.squarePlaceholder} />}
      <View style={styles.collectionMeta}>
        <Text style={styles.collectionTitle} numberOfLines={2}>
          {item.title ?? 'Untitled'}
        </Text>
        <Text style={styles.collectionDesc}>{item.description ?? ''}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function LibraryScreen() {
  const router = useRouter();
  const { articles, loadArticles } = useArticlesStore();

  useFocusEffect(
    useCallback(() => {
      loadArticles();
    }, [loadArticles]),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Library</Text>
      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadArticles} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <CollectionCard item={item} onPress={() => router.push(`/article/${item.id}`)} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9faf7', paddingTop: 20 },
  heading: { fontSize: 34, color: '#064e3b', fontWeight: '700', paddingHorizontal: 16, paddingBottom: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 120, gap: 12 },
  collectionCard: { flexDirection: 'row', gap: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff', padding: 10, alignItems: 'center' },
  squareImage: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#edeeeb' },
  squarePlaceholder: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#edeeeb' },
  collectionMeta: { flex: 1, gap: 4 },
  collectionTitle: { fontSize: 18, color: '#1a1c1b', fontWeight: '600' },
  collectionDesc: { fontSize: 14, color: '#45474a' },
});

