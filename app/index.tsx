import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, RefreshControl, Alert, Modal, Pressable, TextInput } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useArticlesStore } from '@/src/store/articles';
import type { Article } from '@/src/db/schema';
import { t } from '@/src/i18n';
import { processUrl } from '@/src/lib/queue';
import { AppIcon } from '@/src/components/AppIcon';
import { fontFamily } from '@/src/theme/typography';

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
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [link, setLink] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadArticles();
    }, [loadArticles]),
  );

  const openAddMenu = useCallback(() => setShowAddSheet(true), []);
  const closeAddMenu = useCallback(() => {
    setShowAddSheet(false);
    setShowLinkInput(false);
    setLink('');
  }, []);

  const confirmLinkImport = useCallback(() => {
    const url = link.trim();
    if (!url.startsWith('http')) {
      Alert.alert('链接无效', '请粘贴完整的 http(s) 链接');
      return;
    }
    const id = processUrl(url);
    closeAddMenu();
    router.push(`/ingestion/${id}`);
  }, [closeAddMenu, link, router]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>Clipper</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.libraryBtn} onPress={() => router.push('/library')}>
            <Text style={styles.libraryBtnText}>Library</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.storageBtn} onPress={() => router.push('/storage')}>
            <Text style={styles.storageBtnText}>Storage</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadArticles} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <HomeCard item={item} onPress={() => router.push(`/article/${item.id}`)} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <AppIcon name="auto_stories" size={48} color="#8fa19a" />
            </View>
            <Text style={styles.emptyTitle}>Your library is empty</Text>
            <Text style={styles.emptyHint}>Share an article from WeChat or add one manually to get started.</Text>
            <TouchableOpacity style={styles.emptyCta} onPress={openAddMenu} activeOpacity={0.9}>
              <View style={styles.emptyCtaInner}>
                <AppIcon name="add_circle" size={20} color="#ffffff" />
                <Text style={styles.emptyCtaText}>Add Your First Article</Text>
              </View>
            </TouchableOpacity>
          </View>
        }
      />
      {articles.length > 0 ? (
        <TouchableOpacity style={styles.fab} onPress={openAddMenu} activeOpacity={0.9}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      ) : null}

      <Modal visible={showAddSheet} transparent animationType="fade" onRequestClose={closeAddMenu}>
        <Pressable style={styles.sheetMask} onPress={closeAddMenu}>
          <Pressable style={styles.sheetCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>添加内容</Text>
            <Text style={styles.sheetSub}>请选择添加方式</Text>

            {showLinkInput ? (
              <>
                <TextInput
                  value={link}
                  onChangeText={setLink}
                  placeholder="粘贴公众号文章链接"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.linkInput}
                />
                <TouchableOpacity style={styles.sheetActionPrimary} onPress={confirmLinkImport}>
                  <Text style={styles.sheetActionPrimaryText}>导入链接</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.sheetAction} onPress={() => setShowLinkInput(true)}>
                  <Text style={styles.sheetActionText}>粘贴微信链接</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sheetAction} onPress={() => { closeAddMenu(); router.push('/storage'); }}>
                  <Text style={styles.sheetActionText}>导入 Snapshot JSON</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.sheetCancel} onPress={closeAddMenu}>
              <Text style={styles.sheetCancelText}>取消</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9faf7' },
  header: { paddingTop: 60, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 8 },
  brand: { fontSize: 32, color: '#064e3b', fontFamily: fontFamily.serif },
  libraryBtn: { borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff' },
  libraryBtnText: { color: '#1f2937', fontFamily: fontFamily.mono, fontSize: 12, letterSpacing: 0.8 },
  storageBtn: { borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#f3f4f1' },
  storageBtnText: { color: '#1f2937', fontFamily: fontFamily.mono, fontSize: 12, letterSpacing: 0.8 },
  list: { padding: 16, gap: 16, paddingBottom: 120 },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  cover: { width: '100%', height: 180, backgroundColor: '#edeeeb' },
  content: { padding: 14, gap: 8 },
  title: { fontSize: 22, color: '#1a1c1b', fontFamily: fontFamily.serif },
  description: { fontSize: 15, color: '#45474a', lineHeight: 22, fontFamily: fontFamily.chinese },
  progressWrap: { marginTop: 4, gap: 6 },
  progressLabel: { color: '#45655b', fontSize: 13, fontFamily: fontFamily.mono, letterSpacing: 0.6 },
  progressTrack: { width: '100%', height: 4, backgroundColor: '#dbe4de', borderRadius: 999 },
  progressFill: { height: '100%', backgroundColor: '#45655b', borderRadius: 999 },
  emptyWrap: { flex: 1, minHeight: 520, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, gap: 16 },
  emptyIconCircle: {
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 1,
    borderColor: '#d7ddd8',
    backgroundColor: '#f3f4f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 24, color: '#1a1c1b', fontFamily: fontFamily.serif },
  emptyHint: { fontSize: 17, lineHeight: 28, color: '#45474a', textAlign: 'center', maxWidth: 360, fontFamily: fontFamily.sans },
  emptyCta: {
    marginTop: 8,
    backgroundColor: '#002019',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyCtaInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyCtaText: { color: '#fff', fontFamily: fontFamily.sansMedium, fontSize: 17 },
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
  sheetMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', padding: 20 },
  sheetCard: { backgroundColor: '#fff', borderRadius: 24, padding: 18, gap: 10, borderWidth: 1, borderColor: '#dfe4df' },
  sheetTitle: { fontSize: 40 / 2, color: '#111827', fontFamily: fontFamily.chineseBold },
  sheetSub: { fontSize: 17, color: '#6b7280', fontFamily: fontFamily.chinese },
  sheetAction: { backgroundColor: '#eff1ef', borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  sheetActionText: { fontSize: 20, color: '#111827', fontFamily: fontFamily.chineseBold },
  sheetActionPrimary: { backgroundColor: '#002019', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 6 },
  sheetActionPrimaryText: { color: '#fff', fontSize: 17, fontFamily: fontFamily.chineseBold },
  linkInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, fontFamily: fontFamily.chinese },
  sheetCancel: { backgroundColor: '#e6ece8', borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  sheetCancelText: { color: '#111827', fontSize: 20, fontFamily: fontFamily.chineseBold },
});
