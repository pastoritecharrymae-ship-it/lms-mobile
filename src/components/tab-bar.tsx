import { View, Text, Pressable, StyleSheet } from 'react-native';
import { fonts, roleColors } from '../lib/theme';

export type TabItem<T extends string> = { key: T; label: string; icon: string };

export default function TabBar<T extends string>({
  role, items, value, onChange,
}: {
  role: 'admin' | 'teacher' | 'student';
  items: TabItem<T>[];
  value: T;
  onChange: (k: T) => void;
}) {
  const c = roleColors[role];
  return (
    <View style={[s.bar, { backgroundColor: c.side }]}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable key={it.key} style={[s.item, on && s.on]} onPress={() => onChange(it.key)}>
            <Text style={s.icon}>{it.icon}</Text>
            <Text
              numberOfLines={1}
              style={[s.label, { opacity: on ? 1 : 0.75, fontFamily: on ? fonts.semibold : fonts.regular }]}
            >
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', paddingTop: 8, paddingBottom: 18, paddingHorizontal: 6, gap: 4 },
  item: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 10 },
  on: { backgroundColor: 'rgba(255,255,255,0.16)' },
  icon: { fontSize: 18 },
  label: { color: '#fff', fontSize: 10.5, marginTop: 2 },
});