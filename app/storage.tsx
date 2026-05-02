import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getAllArticles, getArticleByUrl, insertArticle, updateArticle } from '@/src/db/queries';
import { useArticlesStore } from '@/src/store/articles';
import type { Article, ArticleStatus } from '@/src/db/schema';

type ExportSnapshot = {
  app: 'Clipper';
  createdAt: string;
  articleCount: number;
  articles: ReturnType<typeof getAllArticles>;
};

export default function StorageScreen() {
  const { import: importFlag } = useLocalSearchParams<{ import?: string }>();
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

  useEffect(() => {
    if (importFlag === '1') {
      void importSnapshot();
    }
  }, [importFlag, importSnapshot]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>导出与存储</Text>
      <Text style={styles.hint}>
        这里不再展示 iPhone 沙盒目录结构。推荐流程是从 App 导出 JSON 快照，再在 Mac 上执行 `pnpm analyze` 分析。
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>导入数据快照</Text>
        <Text style={styles.cardText}>
          从已导出的 snapshot JSON 一键导入。相同 URL 会自动更新，不会重复入库。
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={importSnapshot} disabled={importing}>
          <Text style={styles.primaryBtnText}>{importing ? '导入中...' : '导入 JSON 文件'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>导出数据快照（推荐）</Text>
        <Text style={styles.cardText}>
          导出内容包含文章列表、状态、摘要、正文 HTML，适用于真机场景下在 Mac 侧离线分析。
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={exportSnapshot} disabled={exporting}>
          <Text style={styles.primaryBtnText}>{exporting ? '导出中...' : '导出并分享 JSON'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mac 分析命令</Text>
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
  container: { flex: 1, backgroundColor: '#eef4ff' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  hint: { fontSize: 13, color: '#475569', lineHeight: 19 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: '#dbeafe' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  cardText: { fontSize: 13, color: '#475569', lineHeight: 18 },
  primaryBtn: { backgroundColor: '#1d4ed8', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start' },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  code: { fontFamily: 'Menlo', fontSize: 12, color: '#0f172a', backgroundColor: '#eff6ff', padding: 10, borderRadius: 8 },
  path: { fontSize: 12, color: '#334155' },
});
