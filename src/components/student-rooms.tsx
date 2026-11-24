import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Badge } from './ui';
import { colors, fonts, radius } from '../lib/theme';

type Row = {
  joined_at: string;
  rooms: {
    id: string;
    name: string;
    section: string | null;
    school_year: string | null;
    semester: string | null;
    status: string;
    courses: { code: string; name: string } | null;
  } | null;
};

export default function StudentRooms({
  studentId,
  refreshKey = 0,
}: {
  studentId: string;
  refreshKey?: number;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .from('room_students')
      .select('joined_at, rooms(id, name, section, school_year, semester, status, courses(code, name))')
      .eq('student_id', studentId)
      .order('joined_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else {
          setError('');
          setRows(data as unknown as Row[]);
        }
      });
  }, [studentId, refreshKey]);

  if (error) return <Text style={[s.empty, { color: colors.danger }]}>{error}</Text>;
  if (!rows) return <ActivityIndicator />;
  if (rows.length === 0) return <Text style={s.empty}>You haven't joined any rooms yet.</Text>;

  return (
    <FlatList
      data={rows.filter((r) => r.rooms)}
      keyExtractor={(r) => r.rooms!.id}
      contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
      renderItem={({ item }) => {
        const r = item.rooms!;
        return (
          <Pressable
            style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
            onPress={() => router.push({ pathname: '/room/[id]', params: { id: r.id, name: r.name } } as any)}
          >
            <Text style={s.course}>
              {r.courses ? `${r.courses.code} · ${r.courses.name}` : 'No course'}
            </Text>
            <Text style={s.name}>{r.name}</Text>
            <Text style={s.meta}>
              {[r.section, r.school_year, r.semester].filter(Boolean).join(' · ')}
            </Text>
            <View style={{ marginTop: 8 }}>
              <Badge text={r.status} kind={r.status === 'active' ? 'ok' : 'bad'} />
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 16,
  },
  course: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  name: { fontSize: 16, fontFamily: fonts.semibold, color: colors.text, marginTop: 2 },
  meta: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted, marginTop: 4 },
  empty: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', paddingVertical: 18 },
});