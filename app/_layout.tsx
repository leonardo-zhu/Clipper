import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useShareIntent } from 'expo-share-intent';
import { useFonts } from 'expo-font';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { Sora_400Regular, Sora_600SemiBold } from '@expo-google-fonts/sora';
import { DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { NotoSansSC_400Regular, NotoSansSC_700Bold } from '@expo-google-fonts/noto-sans-sc';
import { processUrl } from '@/src/lib/queue';
import { getDB } from '@/src/db';
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    Sora_400Regular,
    Sora_600SemiBold,
    DMMono_500Medium,
    NotoSansSC_400Regular,
    NotoSansSC_700Bold,
  });
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

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9faf7' }}>
        <ActivityIndicator color="#45655b" />
      </View>
    );
  }

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
