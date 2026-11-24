import { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Badge, Card, Field, Tabs } from './ui';
import { colors, fonts } from '../lib/theme';

type Room = {
  id: string; name: string; status: string;
  course: { name: string } | null;
  teacher: { full_name: string } | null;
  room_students: { count: number }[];
  quizzes: { count: number }[];
};
type Filter = 'all' | 'active' | 'inactive';

export default function RoomsAdmin() {
  const router = useRouter();
  const [rows, setRows] = useState<Room[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .from('rooms')
      .select('id, name, status, course:courses(name), teacher:profiles!teacher_id(full_name), room_students(count), quizzes(count)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows((data || []) as unknown as Room[]);
      });
  }, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows || []).filter(
      (r) =>
        (filter === 'all' || r.status === filter) &&
        (!q || [r.name, r.course?.name, r.teacher?.full_name].some((v) => (v || '').toLowerCase().includes(q)))
    );
  }, [rows, filter, search]);

  const totalStudents = (rows || []).reduce((a, r) => a + (r.room_students[0]?.count || 0), 0);
  const active = (rows || []).filter((r) => r.status === 'active').length;

  return (
    <View style={s.body}>
      <Text style={s.h1}>🏫 Rooms</Text>
      <View style={s.stats}>
        <Card style={s.stat}><Text style={s.statL}>Rooms</Text><Text style={s.statV}>{rows?.length ?? 0}</Text></Card>
        <Card style={s.stat}><Text style={s.statL}>Active</Text><Text style={s.statV}>{active}</Text></Card>
        <Card style={s.stat}><Text style={s.statL}>Students</Text><Text style={s.statV}>{totalStudents}</Text></Card>
      </View>
      <Field placeholder="Search rooms..." value={search} onChangeText={setSearch} />
      <Tabs<Filter>
        value={filter} onChange={setFilter}
        items={[{ key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'inactive', label: 'Inactive' }]}
      />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {!rows && !error ? <ActivityIndicator /> : null}
      {rows && shown.length === 0 ? <Text style={s.empty}>No rooms found</Text> : null}

      <FlatList
        data={shown} keyExtractor={(r) => r.id} style={{ flex: 1 }}
        contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
        renderItem={({ item: r }) => (
          <Pressable onPress={() => router.push({ pathname: '/admin-room/[id]', params: { id: r.id, name: r.name } } as any)}>
            <Card style={{ padding: 14, gap: 3 }}>
              <View style={s.row}>
                <Text style={s.name}>{r.name}</Text>
                <Badge text={r.status} kind={r.status === 'active' ? 'ok' : 'bad'} />
              </View>
              <Text style={s.meta}>{r.course?.name || 'No course'}</Text>
              <Text style={s.meta}>Teacher: {r.teacher?.full_name || '—'}</Text>
              <Text style={s.meta}>
                {r.room_students[0]?.count || 0} student(s) · {r.quizzes[0]?.count || 0} quiz(zes)
              </Text>
              <Text style={s.link}>View</Text>
            </Card>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  body: { flex: 1, padding: 18, gap: 10 },
  h1: { fontSize: 30, fontFamily: fonts.semibold, color: colors.text },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 12 },
  statL: { fontSize: 12, fontFamily: fonts.semibold, color: colors.text },
  statV: { fontSize: 24, fontFamily: fonts.semibold, color: colors.text, marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 15, fontFamily: fonts.semibold, color: colors.text },
  meta: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  link: { fontSize: 13, fontFamily: fonts.medium, color: colors.primary, marginTop: 4 },
  empty: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', paddingVertical: 18 },
});