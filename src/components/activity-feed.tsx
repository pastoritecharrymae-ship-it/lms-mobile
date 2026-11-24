import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Card } from './ui';
import { colors, fonts } from '../lib/theme';

type Activity = { id: string; kind: string; text: string; created_at: string; rooms: { name: string } | null };

export default function ActivityFeed({ roomId, limit = 10 }: { roomId?: string; limit?: number }) {
  const [items, setItems] = useState<Activity[] | null>(null);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let q = supabase
        .from('activities')
        .select('id, kind, text, created_at, rooms(name)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (roomId) q = q.eq('room_id', roomId);
      q.then(({ data, error }) => {
        if (error) setError(error.message);
        else { setError(''); setItems(data as unknown as Activity[]); }
      });
    }, [roomId, limit])
  );

  return (
    <Card style={{ padding: 6 }}>
      {error ? <Text style={{ color: colors.danger, padding: 12 }}>{error}</Text> : null}
      {!items && !error ? <ActivityIndicator style={{ padding: 20 }} /> : null}
      {items && items.length === 0 ? <Text style={s.empty}>No activity yet.</Text> : null}
      {items?.map((a, i) => (
        <View key={a.id} style={[s.row, i === items.length - 1 && { borderBottomWidth: 0 }]}>
          <Text style={s.text}>{a.text}</Text>
          <Text style={s.meta}>
            {a.rooms?.name ? `${a.rooms.name} · ` : ''}{new Date(a.created_at).toLocaleString()}
          </Text>
        </View>
      ))}
    </Card>
  );
}

const s = StyleSheet.create({
  row: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 2 },
  text: { fontSize: 13, fontFamily: fonts.regular, color: colors.text },
  meta: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  empty: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', padding: 18 },
});