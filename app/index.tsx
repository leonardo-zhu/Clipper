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
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.88}>
      {item.msg_cdn_url ? <Image source={{ uri: item.msg_cdn_url }} style={styles.cover} /> : <View style={styles.coverPlaceholder} />}
      <View style={styles.content}>
        <Text style={styles.title}>{item.title ?? 'Untitled'}</Text>
        {!!item.description ? <Text style={styles.description}>{item.description}</Text> : null}
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
        <View>
          <Text style={styles.brand}>Clipper</Text>
          <Text style={styles.headerSub}>WeChat Article Workspace</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => router.push('/library')}>
            <Text style={styles.outlineBtnText}>Library</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filledBtn} onPress={() => router.push('/storage')}>
            <Text style={styles.filledBtnText}>Storage</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={false} onRefresh={loadArticles} tintColor="#325f53" />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <HomeCard item={item} onPress={() => router.push(`/article/${item.id}`)} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <AppIcon name="auto_stories" size={48} color="#709186" />
            </View>
            <Text style={styles.emptyTitle}>Your library is empty</Text>
            <Text style={styles.emptyHint}>Start by sharing from WeChat, or import an exported snapshot file.</Text>
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
          <AppIcon name="add" size={25} color="#fff" />
        </TouchableOpacity>
      ) : null}

      <Modal visible={showAddSheet} transparent animationType="fade" onRequestClose={closeAddMenu}>
        <Pressable style={styles.sheetMask} onPress={closeAddMenu}>
          <Pressable style={styles.sheetCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>添加内容</Text>
            <Text style={styles.sheetSub}>选择导入方式</Text>

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
                  <Text style={styles.sheetActionPrimaryText}>开始抓取</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.sheetAction} onPress={() => setShowLinkInput(true)}>
                  <View style={styles.sheetActionInner}>
                    <AppIcon name="bookmarks" size={18} color="#1a3029" />
                    <Text style={styles.sheetActionText}>粘贴微信链接</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.sheetAction}
                  onPress={() => {
                    closeAddMenu();
                    router.push('/storage');
                  }}
                >
                  <View style={styles.sheetActionInner}>
                    <AppIcon name="download" size={18} color="#1a3029" />
                    <Text style={styles.sheetActionText}>导入 Snapshot JSON</Text>
                  </View>
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
  container: { flex: 1, backgroundColor: '#f4f7f4' },
  header: {
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  brand: { fontSize: 34, color: '#0f3b31', fontFamily: fontFamily.serif },
  headerSub: { marginTop: 3, fontSize: 11, color: '#6c7e77', fontFamily: fontFamily.mono, letterSpacing: 0.7 },
  headerActions: { flexDirection: 'row', gap: 8 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#d0d9d4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  outlineBtnText: { color: '#1e2f2a', fontFamily: fontFamily.mono, fontSize: 12, letterSpacing: 0.6 },
  filledBtn: {
    borderWidth: 1,
    borderColor: '#c9d5cf',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#e9f0ec',
  },
  filledBtnText: { color: '#1e2f2a', fontFamily: fontFamily.mono, fontSize: 12, letterSpacing: 0.6 },
  list: { padding: 16, gap: 16, paddingBottom: 120 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dbe4df',
    shadowColor: '#13211b',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  cover: { width: '100%', height: 194, backgroundColor: '#e9eeea' },
  coverPlaceholder: { width: '100%', height: 194, backgroundColor: '#e9eeea' },
  content: { padding: 14, gap: 8 },
  title: { fontSize: 23, color: '#101815', fontFamily: fontFamily.serif },
  description: { fontSize: 14, color: '#3e4a45', lineHeight: 22, fontFamily: fontFamily.chinese },
  progressWrap: { marginTop: 4, gap: 8 },
  progressLabel: { color: '#476a5f', fontSize: 12, fontFamily: fontFamily.mono, letterSpacing: 0.4 },
  progressTrack: { width: '100%', height: 5, backgroundColor: '#dae6df', borderRadius: 999 },
  progressFill: { height: '100%', backgroundColor: '#46655b', borderRadius: 999 },
  emptyWrap: { flex: 1, minHeight: 520, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, gap: 14 },
  emptyIconCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: '#d3ddd7',
    backgroundColor: '#eef3ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: 2, fontSize: 26, color: '#141c19', fontFamily: fontFamily.serif },
  emptyHint: { fontSize: 16, lineHeight: 25, color: '#4a5853', textAlign: 'center', maxWidth: 360, fontFamily: fontFamily.sans },
  emptyCta: {
    marginTop: 8,
    backgroundColor: '#0f3b31',
    paddingHorizontal: 26,
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
    backgroundColor: '#305e51',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0e1f19',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  sheetMask: { flex: 1, backgroundColor: 'rgba(8,12,10,0.32)', justifyContent: 'center', padding: 20 },
  sheetCard: { backgroundColor: '#fff', borderRadius: 24, padding: 18, gap: 10, borderWidth: 1, borderColor: '#d8e1dc' },
  sheetTitle: { fontSize: 20, color: '#111827', fontFamily: fontFamily.chineseBold },
  sheetSub: { fontSize: 14, color: '#6b7280', fontFamily: fontFamily.chinese },
  sheetAction: { backgroundColor: '#ecf2ee', borderRadius: 14, paddingVertical: 15, paddingHorizontal: 14, marginTop: 4 },
  sheetActionInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetActionText: { fontSize: 16, color: '#111827', fontFamily: fontFamily.chineseBold },
  sheetActionPrimary: { backgroundColor: '#0f3b31', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 6 },
  sheetActionPrimaryText: { color: '#fff', fontSize: 16, fontFamily: fontFamily.chineseBold },
  linkInput: {
    borderWidth: 1,
    borderColor: '#d1d9d4',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: fontFamily.chinese,
    backgroundColor: '#fafcfb',
  },
  sheetCancel: { backgroundColor: '#e6ece8', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 6 },
  sheetCancelText: { color: '#111827', fontSize: 16, fontFamily: fontFamily.chineseBold },
});
