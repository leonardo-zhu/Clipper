import { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useArticlesStore } from '@/src/store/articles';
import type { Article } from '@/src/db/schema';
import { t } from '@/src/i18n';
import { processUrl } from '@/src/lib/queue';

function HomeCard({ item, onPress }: { item: Article; onPress: () => void }) {
  const isSummarising = item.status === 'summarising';
  const progress = Math.max(0, Math.min(100, item.summarising_progress ?? 0));

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {item.msg_cdn_url ? <Image source={{ uri: item.msg_cdn_url }} style={styles.cover} /> : null}
      <View style={styles.content}>
        <Text style={styles.title}>{item.title ?? 'Untitled'}</Text>
        <Text style={styles.description}>{item.description ?? ''}</Text>
        {isSummarising ? (
          <View style={styles.progressWrap}>
            <Text style={styles.progressLabel}>{t('home.aiSummaryInProgress')}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { articles, loadArticles } = useArticlesStore();

  useFocusEffect(
    useCallback(() => {
      loadArticles();
    }, [loadArticles]),
  );

  const showAddMenu = useCallback(() => {
    Alert.alert('添加内容', '请选择添加方式', [
      { text: '取消', style: 'cancel' },
      {
        text: '粘贴微信链接',
        onPress: () => {
          Alert.prompt(
            '粘贴微信链接',
            '输入公众号文章链接',
            [
              { text: '取消', style: 'cancel' },
              {
                text: '导入',
                onPress: (value?: string) => {
                  const url = (value ?? '').trim();
                  if (!url.startsWith('http')) {
                    Alert.alert('链接无效', '请粘贴完整的 http(s) 链接');
                    return;
                  }
                  const id = processUrl(url);
                  router.push(`/ingestion/${id}`);
                },
              },
            ],
            'plain-text',
          );
        },
      },
      {
        text: '导入 Snapshot JSON',
        onPress: () => router.push('/storage?import=1'),
      },
    ]);
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>Clipper</Text>
        <TouchableOpacity style={styles.libraryBtn} onPress={() => router.push('/library')}>
          <Text style={styles.libraryBtnText}>Library</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadArticles} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <HomeCard item={item} onPress={() => router.push(`/article/${item.id}`)} />}
      />
      <TouchableOpacity style={styles.fab} onPress={showAddMenu} activeOpacity={0.9}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9faf7' },
  header: { paddingTop: 60, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 32, color: '#064e3b', fontWeight: '700' },
  libraryBtn: { borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff' },
  libraryBtnText: { color: '#1f2937', fontWeight: '600' },
  list: { padding: 16, gap: 16, paddingBottom: 120 },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  cover: { width: '100%', height: 180, backgroundColor: '#edeeeb' },
  content: { padding: 14, gap: 8 },
  title: { fontSize: 22, color: '#1a1c1b', fontWeight: '600' },
  description: { fontSize: 15, color: '#45474a', lineHeight: 22 },
  progressWrap: { marginTop: 4, gap: 6 },
  progressLabel: { color: '#45655b', fontSize: 13, fontWeight: '600' },
  progressTrack: { width: '100%', height: 4, backgroundColor: '#dbe4de', borderRadius: 999 },
  progressFill: { height: '100%', backgroundColor: '#45655b', borderRadius: 999 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#45655b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { color: '#fff', fontSize: 34, lineHeight: 36, marginTop: -2 },
});
