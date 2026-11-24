import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AdminAnalytics from './admin-analytics';
import QuestionAnalysis from './question-analysis';
import SettingsPanel from './settings-panel';
import { colors, fonts } from '../lib/theme';

type Sub = 'analytics' | 'questions' | 'settings';
const ITEMS: { key: Sub; label: string; icon: string }[] = [
  { key: 'analytics', label: 'Analytics', icon: '📈' },
  { key: 'questions', label: 'Questions', icon: '🧩' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminMore() {
  const [sub, setSub] = useState<Sub>('analytics');
  return (
    <View style={{ flex: 1 }}>
      <View style={s.tabs}>
        {ITEMS.map((it) => {
          const on = it.key === sub;
          return (
            <Pressable key={it.key} onPress={() => setSub(it.key)} style={[s.tab, on && s.tabOn]}>
              <Text style={s.icon}>{it.icon}</Text>
              <Text style={[s.label, on && s.labelOn]}>{it.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {sub === 'analytics' ? <AdminAnalytics /> : null}
      {sub === 'questions' ? <QuestionAnalysis /> : null}
      {sub === 'settings' ? <SettingsPanel /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingTop: 12 },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card,
  },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  icon: { fontSize: 18 },
  label: { fontSize: 12, fontFamily: fonts.regular, color: colors.text, marginTop: 2 },
  labelOn: { color: '#fff', fontFamily: fonts.semibold },
});