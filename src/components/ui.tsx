import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { colors, fonts, radius, mode } from '../lib/theme';

export function Button({
  title, onPress, variant = 'primary', disabled, small, style,
}: {
  title: string; onPress: () => void; disabled?: boolean; small?: boolean; style?: ViewStyle;
  variant?: 'primary' | 'default' | 'gray' | 'danger';
}) {
  const dark = mode === 'dark';
  const v = {
    primary: { bg: '#2091ea', border: '#2091ea', color: '#fff' },
    default: { bg: colors.card, border: colors.border, color: colors.text },
    gray: dark
      ? { bg: '#27344d', border: '#27344d', color: '#e8eef9' }
      : { bg: '#dde2ea', border: '#dde2ea', color: '#111' },
    danger: { bg: colors.danger, border: colors.danger, color: '#fff' },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: v.bg, borderColor: v.border, borderWidth: 1, borderRadius: 6,
          paddingVertical: small ? 6 : 12, paddingHorizontal: small ? 10 : 16,
          alignItems: 'center', opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: v.color, fontFamily: fonts.medium, fontSize: small ? 12 : 14 }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, password, ...props }: TextInputProps & { label?: string; password?: boolean }) {
  const [hidden, setHidden] = useState(!!password);
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View>
        <TextInput
          {...props}
          secureTextEntry={hidden}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholderTextColor={colors.muted}
          style={[s.input, focus && { borderColor: colors.primary }, password && { paddingRight: 56 }]}
        />
        {password ? (
          <Pressable onPress={() => setHidden((h) => !h)} style={s.eye}>
            <Text style={{ color: colors.primary, fontFamily: fonts.medium, fontSize: 12 }}>
              {hidden ? 'Show' : 'Hide'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Badge({ text, kind }: { text: string; kind?: 'ok' | 'bad' | 'warn' | 'info' }) {
  const dark = mode === 'dark';
  const light: Record<string, string[]> = {
    ok: ['#d9f7e3', '#157a3c'], bad: ['#fde2e2', '#b02a2a'],
    warn: ['#fdf0d0', '#8a6410'], info: ['#dbeafe', '#1d4ed8'],
  };
  const night: Record<string, string[]> = {
    ok: ['#14442a', '#7be0a3'], bad: ['#4a1c1c', '#f19a9a'],
    warn: ['#4a3a12', '#f0cd7a'], info: ['#172b55', '#93b8ff'],
  };
  const k = (dark ? night : light)[kind as string] || (dark ? ['#27344d', '#c3cde0'] : ['#e5e7eb', '#374151']);
  return (
    <View style={{ backgroundColor: k[0], borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color: k[1], fontSize: 12, fontFamily: fonts.medium, textTransform: 'capitalize' }}>{text}</Text>
    </View>
  );
}

export function AlertBox({ text }: { text: string }) {
  return (
    <View style={s.alert}>
      <Text style={{ color: mode === 'dark' ? '#f19a9a' : '#a02828', fontFamily: fonts.regular, fontSize: 13 }}>{text}</Text>
    </View>
  );
}

export function Tabs<T extends string>({
  items, value, onChange,
}: { items: { key: T; label: string }[]; value: T; onChange: (k: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {items.map((it) => {
        const on = it.key === value;
        return (
          <Pressable
            key={it.key}
            onPress={() => onChange(it.key)}
            style={{
              flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, borderWidth: 1,
              backgroundColor: on ? colors.primary : colors.card,
              borderColor: on ? colors.primary : colors.border,
            }}
          >
            <Text style={{ fontSize: 13, fontFamily: on ? fonts.semibold : fonts.regular, color: on ? '#fff' : colors.text }}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 12.5, fontFamily: fonts.medium, color: colors.text },
  input: {
    fontFamily: fonts.regular, fontSize: 14, paddingVertical: 11, paddingHorizontal: 12,
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    backgroundColor: colors.card, color: colors.text,
  },
  eye: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 18,
  },
  alert: {
    backgroundColor: mode === 'dark' ? '#3a1a1a' : '#fdecec',
    borderWidth: 1, borderColor: mode === 'dark' ? '#6b2b2b' : '#f3c1c1',
    borderRadius: radius.md, padding: 10,
  },
});