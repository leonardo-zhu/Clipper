import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { AppIcon } from '@/src/components/AppIcon';
import { fontFamily } from '@/src/theme/typography';
import { t } from '@/src/i18n';

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const active = pathname.includes('/library') ? 'library' : 'home';

  const jump = (target: 'home' | 'library') => {
    if (target === active) return;
    router.replace(target === 'home' ? '/(tabs)' : '/(tabs)/library');
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.item} activeOpacity={0.85} onPress={() => jump('home')}>
        <AppIcon name="home" size={28} color={active === 'home' ? '#26755e' : '#b2b8be'} />
        <Text style={[styles.label, active === 'home' ? styles.labelActive : null]}>HOME</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.item} activeOpacity={0.85} onPress={() => jump('library')}>
        <AppIcon name="bookmarks" size={28} color={active === 'library' ? '#26755e' : '#b2b8be'} />
        <Text style={[styles.label, active === 'library' ? styles.labelActive : null]}>{t('nav.library').toUpperCase()}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#d6d9dc',
    backgroundColor: '#f7f8f9',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    height: 88,
    shadowColor: '#112018',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minWidth: 104,
  },
  label: {
    fontSize: 12,
    color: '#b2b8be',
    fontFamily: fontFamily.mono,
    letterSpacing: 1.1,
  },
  labelActive: {
    color: '#26755e',
  },
});
