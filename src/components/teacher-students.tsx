import { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Badge, Card, Field } from './ui';
import { colors, fonts } from '../lib/theme';

type Student = {
  id: string; full_name: string; email: string; code: string | null; status: string; courses: string[];
};

export default function TeacherStudents({ teacherId }: { teacherId: string }) {
  const [list, setList] = useState<Student[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const { data, error } = await supabase
      .from('room_students')
      .select('room_id, room:rooms!inner(name, teacher_id, course:courses(name)), student:profiles!student_id(id, full_name, email, code, status)')
      .eq('room.teacher_id', teacherId);
    if (error) return setError(error.message);
    const m = new Map<string, Student>();
    ((data || []) as any[]).forEach((r) => {
      const st = r.student;
      if (!st) return;
      const cur = m.get(st.id) || { ...st, courses: [] as string[] };
      const cn = r.room?.course?.name;
      if (cn && !cur.courses.includes(cn)) cur.courses.push(cn);
      m.set(st.id, cur);
    });
    setError('');
    setList([...m.values()].sort((a, b) => a.full_name.localeCompare(b.full_name)));
  }
  useEffect(() => { load(); }, [teacherId]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list || []).filter(
      (r) => !q || [r.full_name, r.email, r.code].some((v) => (v || '').toLowerCase().includes(q))
    );
  }, [list, search]);

  function remove(st: Student) {
    Alert.alert('Remove student', `Remove ${st.full_name} from all of your rooms?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const mine = await supabase.from('rooms').select('id').eq('teacher_id', teacherId);
          const ids = (mine.data || []).map((r: any) => r.id);
          const { error } = await supabase.from('room_students').delete().eq('student_id', st.id).in('room_id', ids);
          if (error) return Alert.alert('Error', error.message);
          load();
        },
      },
    ]);
  }

  return (
    <View style={s.body}>
      <Text style={s.h1}>Students</Text>
      <Field placeholder="Search students..." autoCapitalize="none" value={search} onChangeText={setSearch} />
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {!list && !error ? <ActivityIndicator /> : null}
      {list && shown.length === 0 ? <Text style={s.empty}>No students have joined your rooms yet</Text> : null}
      <FlatList
        data={shown} keyExtractor={(r) => r.id} style={{ flex: 1 }}
        contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <Card style={{ padding: 14, gap: 3 }}>
            <View style={s.row}>
              <Text style={[s.name, { flex: 1 }]}>{item.full_name}</Text>
              <Badge text={item.status} kind={item.status === 'active' ? 'ok' : 'bad'} />
            </View>
            <Text style={s.meta}>{item.email}</Text>
            <Text style={s.meta}>{item.code ? `${item.code} · ` : ''}{item.courses.join(', ')}</Text>
            <Pressable onPress={() => remove(item)} hitSlop={8}>
              <Text style={s.del}>Remove</Text>
            </Pressable>
          </Card>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  body: { flex: 1, padding: 18, gap: 10 },
  h1: { fontSize: 30, fontFamily: fonts.semibold, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontFamily: fonts.semibold, color: colors.text },
  meta: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  del: { fontSize: 13, fontFamily: fonts.medium, color: colors.danger, marginTop: 8 },
  empty: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', paddingVertical: 18 },
});