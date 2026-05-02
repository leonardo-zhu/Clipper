import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getAllArticles, getArticleByUrl, insertArticle, updateArticle } from '@/src/db/queries';
import { useArticlesStore } from '@/src/store/articles';
import type { Article, ArticleStatus } from '@/src/db/schema';
import { fontFamily } from '@/src/theme/typography';

type ExportSnapshot = {
  app: 'Clipper';
  createdAt: string;
  articleCount: number;
  articles: ReturnType<typeof getAllArticles>;
};

export default function StorageScreen() {
  const { loadArticles } = useArticlesStore();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastPath, setLastPath] = useState<string | null>(null);

  const exportSnapshot = useCallback(async () => {
    try {
      setExporting(true);
      const articles = getAllArticles();
      const payload: ExportSnapshot = {
        app: 'Clipper',
        createdAt: new Date().toISOString(),
        articleCount: articles.length,
        articles,
      };
      const fileName = `clipper-snapshot-${Date.now()}.json`;
      const path = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });
      setLastPath(path);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('导出完成', `文件已生成：\n${path}`);
        return;
      }
      await Sharing.shareAsync(path, {
        mimeType: 'application/json',
        dialogTitle: '导出 Clipper 数据快照',
      });
    } catch (err: any) {
      Alert.alert('导出失败', err?.message ?? '未知错误');
    } finally {
      setExporting(false);
    }
  }, []);

  const normalizeStatus = (status: string): ArticleStatus => {
    if (status === 'pending') return 'queued';
    if (status === 'fetching') return 'ingesting';
    if (status === 'queued' || status === 'ingesting' || status === 'ingested' || status === 'summarising' || status === 'done' || status === 'error') {
      return status;
    }
    return 'queued';
  };

  const importSnapshot = useCallback(async () => {
    try {
      setImporting(true);
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      if (!picked.assets?.length) {
        throw new Error('未选择文件或文件不可读取');
      }

      const asset = picked.assets[0];
      const raw = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
      const payload = JSON.parse(raw) as { articles?: Partial<Article>[] };
      const rows = Array.isArray(payload.articles) ? payload.articles : [];

      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      for (const row of rows) {
        if (!row.url || typeof row.url !== 'string') {
          skipped++;
          continue;
        }
        const existed = getArticleByUrl(row.url);
        const patch = {
          title: row.title ?? null,
          description: row.description ?? null,
          body: row.body ?? null,
          summary: row.summary ?? null,
          source: row.source ?? null,
          profile_signature: row.profile_signature ?? null,
          msg_cdn_url: row.msg_cdn_url ?? null,
          cover_url_1_1: row.cover_url_1_1 ?? null,
          tags_json: row.tags_json ?? null,
          lang: row.lang ?? null,
          ingested_at: row.ingested_at ?? null,
          summarising_progress: typeof row.summarising_progress === 'number' ? row.summarising_progress : 0,
          status: normalizeStatus((row.status as string) ?? 'queued'),
        } as const;

        if (existed) {
          updateArticle(existed.id, patch);
          updated++;
        } else {
          const id = row.id && typeof row.id === 'string' ? row.id : `import-${Date.now()}-${Math.random().toString(16).slice(2)}`;
          insertArticle({
            id,
            url: row.url,
            status: patch.status,
            created_at: typeof row.created_at === 'number' ? row.created_at : Date.now(),
          });
          updateArticle(id, patch);
          inserted++;
        }
      }

      loadArticles();
      Alert.alert('导入完成', `新增 ${inserted} 篇，更新 ${updated} 篇，跳过 ${skipped} 条`);
    } catch (err: any) {
      Alert.alert('导入失败', err?.message ?? '未知错误');
    } finally {
      setImporting(false);
    }
  }, [loadArticles]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Storage</Text>
      <Text style={styles.hint}>导入导出都保留在这里。建议你从 Home 的 + 菜单进入导入，从本页执行导出与数据检查。</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>导入 Snapshot JSON</Text>
        <Text style={styles.cardText}>读取你之前导出的快照，按 URL 去重并自动更新现有文章字段。</Text>
        <TouchableOpacity style={[styles.primaryBtn, importing ? styles.disabledBtn : null]} onPress={importSnapshot} disabled={importing}>
          <Text style={styles.primaryBtnText}>{importing ? '导入中...' : '选择并导入 JSON'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>导出 Snapshot JSON</Text>
        <Text style={styles.cardText}>包含文章列表、状态、摘要、正文 HTML，用于备份或在 Mac 侧分析修补。</Text>
        <TouchableOpacity style={[styles.primaryBtn, exporting ? styles.disabledBtn : null]} onPress={exportSnapshot} disabled={exporting}>
          <Text style={styles.primaryBtnText}>{exporting ? '导出中...' : '导出并分享 JSON'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mac 侧分析命令</Text>
        <Text style={styles.code}>pnpm analyze /path/to/clipper-snapshot.json</Text>
        {lastPath ? (
          <>
            <Text style={styles.cardText}>最近导出文件：</Text>
            <Text style={styles.path}>{lastPath}</Text>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f4' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { fontSize: 34, color: '#0f3b31', fontFamily: fontFamily.serif },
  hint: { fontSize: 13, color: '#4c5f58', lineHeight: 20, fontFamily: fontFamily.chinese },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#dbe4df',
    shadowColor: '#13211b',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: { fontSize: 17, color: '#11211b', fontFamily: fontFamily.chineseBold },
  cardText: { fontSize: 13, color: '#4a5a54', lineHeight: 20, fontFamily: fontFamily.chinese },
  primaryBtn: {
    backgroundColor: '#1f5b4c',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  disabledBtn: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: 13, fontFamily: fontFamily.chineseBold },
  code: {
    fontFamily: fontFamily.mono,
    fontSize: 12,
    color: '#0f172a',
    backgroundColor: '#edf3ef',
    padding: 10,
    borderRadius: 8,
  },
  path: { fontSize: 12, color: '#334155', fontFamily: fontFamily.mono },
});
