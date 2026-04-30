import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useShareIntent } from 'expo-share-intent';
import { processUrl } from '@/src/lib/queue';
import { getDB } from '@/src/db';

export default function RootLayout() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    getDB();
  }, []);

  useEffect(() => {
    if (hasShareIntent && shareIntent?.webUrl) {
      processUrl(shareIntent.webUrl);
      resetShareIntent();
    }
  }, [hasShareIntent]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#f5f5f5' },
          headerTintColor: '#333',
          headerBackTitle: '返回',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Clipper' }} />
        <Stack.Screen name="article/[id]" options={{ title: '文章详情' }} />
        <Stack.Screen name="storage" options={{ title: '存储管理' }} />
      </Stack>
    </>
  );
}
