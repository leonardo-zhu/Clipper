import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getAllArticles } from '@/src/db/queries';

type ExportSnapshot = {
  app: 'Clipper';
  createdAt: string;
  articleCount: number;
  articles: ReturnType<typeof getAllArticles>;
};

export default function StorageScreen() {
  const [exporting, setExporting] = useState(false);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>导出与存储</Text>
      <Text style={styles.hint}>
        这里不再展示 iPhone 沙盒目录结构。推荐流程是从 App 导出 JSON 快照，再在 Mac 上执行 `pnpm analyze` 分析。
      </Text>

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
