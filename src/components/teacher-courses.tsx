import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Badge, Button, Card, Field, Tabs } from './ui';
import { colors, fonts } from '../lib/theme';

type Course = { id: string; code: string; name: string; description: string | null; status: string };
type RoomRow = { course_id: string; room_students: { student_id: string }[] };
type Filter = 'all' | 'active' | 'inactive';

export default function TeacherCourses({ teacherId }: { teacherId: string }) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const c = await supabase
        .from('courses').select('id, code, name, description, status')
        .eq('teacher_id', teacherId).order('code');
      if (c.error) return setError(c.error.message);
      const r = await supabase
        .from('rooms').select('course_id, room_students(student_id)').eq('teacher_id', teacherId);
      if (r.error) return setError(r.error.message);
      setCourses((c.data || []) as Course[]);
      setRooms((r.data || []) as unknown as RoomRow[]);
    })();
  }, [teacherId]);

  const counts = (id: string) => {
    const rr = rooms.filter((r) => r.course_id === id);
    return { rooms: rr.length, students: new Set(rr.flatMap((r) => r.room_students.map((s) => s.student_id))).size };
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (courses || []).filter(
      (c) =>
        (filter === 'all' || (filter === 'active' ? c.status === 'active' : c.status !== 'active')) &&
        (!q || [c.code, c.name].some((v) => (v || '').toLowerCase().includes(q)))
    );
  }, [courses, search, filter]);

  return (
    <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>📋 My Courses</Text>

      <Field placeholder="Search courses..." autoCapitalize="none" value={search} onChangeText={setSearch} />
      <Tabs<Filter>
        value={filter}
        onChange={setFilter}
        items={[
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'inactive', label: 'Inactive' },
        ]}
      />

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {!courses && !error ? <ActivityIndicator /> : null}
      {courses && courses.length === 0 ? (
        <Text style={s.empty}>No courses have been assigned to you yet. Ask an administrator.</Text>
      ) : null}
      {courses && courses.length > 0 && shown.length === 0 ? (
        <Text style={s.empty}>No courses found</Text>
      ) : null}
      {courses && courses.length > 0 ? (
        <Text style={s.meta}>{shown.length} of {courses.length} course(s)</Text>
      ) : null}

      {shown.map((c) => {
        const n = counts(c.id);
        return (
          <Card key={c.id} style={{ padding: 14, gap: 4 }}>
            <View style={s.row}>
              <Text style={s.name}><Text style={{ fontFamily: fonts.bold }}>{c.code}</Text> {c.name}</Text>
              <Badge text={c.status} kind={c.status === 'active' ? 'ok' : 'bad'} />
            </View>
            {c.description ? <Text style={s.meta}>{c.description}</Text> : null}
            <Text style={s.meta}>{n.rooms} room(s) · {n.students} student(s)</Text>
            <Button
              small title="View rooms" variant="default" style={{ alignSelf: 'flex-start', marginTop: 6 }}
              onPress={() => router.push({ pathname: '/course-rooms/[id]', params: { id: c.id, title: `${c.code} ${c.name}` } } as any)}
            />
          </Card>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  body: { padding: 18, gap: 10, paddingBottom: 40 },
  h1: { fontSize: 30, fontFamily: fonts.semibold, color: colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 15, fontFamily: fonts.regular, color: colors.text },
  meta: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  empty: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', paddingVertical: 18 },
});