import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useShareIntent } from 'expo-share-intent';
import { processUrl } from '@/src/lib/queue';
import { getDB } from '@/src/db';

export default function RootLayout() {
  const router = useRouter();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    getDB();
  }, []);

  useEffect(() => {
    if (hasShareIntent && shareIntent?.webUrl) {
      const id = processUrl(shareIntent.webUrl);
      router.push(`/ingestion/${id}`);
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent?.webUrl, router, resetShareIntent]);

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
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="ingestion/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="library" options={{ title: 'Library' }} />
        <Stack.Screen
          name="article/[id]"
          options={{
            title: '文章详情',
            headerBackButtonDisplayMode: 'minimal',
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen name="storage" options={{ title: '存储管理' }} />
      </Stack>
    </>
  );
}
