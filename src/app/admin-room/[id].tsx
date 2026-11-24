import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import Header from '../../components/header';
import { Badge, Card } from '../../components/ui';
import { colors, fonts } from '../../lib/theme';

const PASS = 60;

type Room = {
  id: string; name: string; code: string; status: string; section: string | null;
  school_year: string | null; semester: string | null; created_at: string;
  course: { code: string; name: string } | null;
  teacher: { full_name: string } | null;
};
type Quiz = {
  id: string; title: string; status: string; question_count: number;
  total_points: number; due_date: string | null;
};
type Attempt = { quiz_id: string; student_id: string; percentage: number };
type Student = { student_id: string; profiles: { full_name: string; email: string } | null };

const BINS = [
  { label: '<60', test: (p: number) => p < 60 },
  { label: '60–69', test: (p: number) => p >= 60 && p < 70 },
  { label: '70–79', test: (p: number) => p >= 70 && p < 80 },
  { label: '80–89', test: (p: number) => p >= 80 && p < 90 },
  { label: '90–100', test: (p: number) => p >= 90 },
];

export default function AdminRoom() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const r = await supabase
          .from('rooms')
          .select('id, name, code, status, section, school_year, semester, created_at, course:courses(code, name), teacher:profiles!teacher_id(full_name)')
          .eq('id', id).single();
        if (r.error) return setError(r.error.message);
        setRoom(r.data as unknown as Room);

        const st = await supabase
          .from('room_students')
          .select('student_id, profiles!student_id(full_name, email)')
          .eq('room_id', id);
        setStudents((st.data || []) as unknown as Student[]);

        const qz = await supabase
          .from('quizzes')
          .select('id, title, status, question_count, total_points, due_date')
          .eq('room_id', id)
          .order('created_at', { ascending: false });
        const ql = (qz.data || []) as Quiz[];
        setQuizzes(ql);

        if (ql.length) {
          const at = await supabase
            .from('attempts')
            .select('quiz_id, student_id, percentage')
            .in('quiz_id', ql.map((q) => q.id));
          setAttempts((at.data || []) as Attempt[]);
        } else setAttempts([]);
        setError('');
      })();
    }, [id])
  );

  if (!room && !error) return <ActivityIndicator style={{ flex: 1 }} />;

  const pcts = attempts.map((a) => Number(a.percentage));
  const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
  const passRate = pcts.length ? Math.round((pcts.filter((p) => p >= PASS).length / pcts.length) * 100) : 0;
  const dist = BINS.map((b) => ({ label: b.label, n: pcts.filter(b.test).length }));
  const maxN = Math.max(1, ...dist.map((d) => d.n));

  const Stat = ({ label, value, sub }: { label: string; value: string | number; sub: string }) => (
    <Card style={s.stat}>
      <Text style={s.statL}>{label}</Text>
      <Text style={s.statV}>{value}</Text>
      <Text style={s.statS}>{sub}</Text>
    </Card>
  );

  const created = room ? new Date(room.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <View style={s.screen}>
      <Header role="admin" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.body}>
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

        {room ? (
          <View style={{ gap: 6 }}>
            <Text style={s.crumb}>Rooms › {room.name}</Text>
            <View style={s.row}>
              <Text style={s.h1}>{room.name}</Text>
              <Badge text={room.status} kind={room.status === 'active' ? 'ok' : 'bad'} />
            </View>
            <Text style={s.meta}>Course: {room.course?.code} - {room.course?.name}</Text>
            <Text style={s.meta}>Teacher: {room.teacher?.full_name || '—'}</Text>
            <Text style={s.meta}>Room Code: {room.code}</Text>
            <Text style={s.meta}>School Year: {room.school_year || '—'}</Text>
            <Text style={s.meta}>Created On: {created}</Text>
            <Text style={s.meta}>Semester: {room.semester || '—'}{room.section ? `   Section: ${room.section}` : ''}</Text>
          </View>
        ) : null}

        <View style={s.statRow}>
          <Stat label="Students" value={students.length} sub="Enrolled Students" />
          <Stat label="Quizzes" value={quizzes.length} sub="Total Quizzes" />
        </View>
        <View style={s.statRow}>
          <Stat label="Average Score" value={`${Math.round(avg * 10) / 10}%`} sub="Room Average" />
          <Stat label="Pass Rate" value={`${passRate}%`} sub="Attempts that passed" />
        </View>

        <Card style={{ gap: 10 }}>
          <Text style={s.cardTitle}>Recent Quizzes</Text>
          {quizzes.length === 0 ? <Text style={s.empty}>No quizzes yet</Text> : null}
          {quizzes.map((q) => {
            const n = attempts.filter((a) => a.quiz_id === q.id).length;
            return (
              <View key={q.id} style={s.quiz}>
                <View style={s.row}>
                  <Text style={[s.item, { flex: 1 }]}>{q.title}</Text>
                  <Badge text={q.status} kind={q.status === 'published' ? 'ok' : 'warn'} />
                </View>
                <Text style={s.meta}>
                  {q.question_count} questions · {q.total_points} pts
                  {q.due_date ? ` · Due ${new Date(q.due_date).toLocaleString()}` : ''} · {n} submission(s)
                </Text>
                <Pressable onPress={() => router.push({ pathname: '/quiz-results/[id]', params: { id: q.id } } as any)}>
                  <Text style={s.link}>Results</Text>
                </Pressable>
              </View>
            );
          })}
        </Card>

        <Card style={{ gap: 8 }}>
          <Text style={s.cardTitle}>Score Distribution</Text>
          <View style={s.chart}>
            {dist.map((d, i) => (
              <View key={d.label} style={s.col}>
                <Text style={s.dn}>{d.n}</Text>
                <View style={[s.bar, {
                  height: Math.max(2, (d.n / maxN) * 110),
                  backgroundColor: i === 0 ? '#d05a5a' : '#43b94f',
                }]} />
                <Text style={s.dl}>{d.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card style={{ gap: 4 }}>
          <View style={s.row}>
            <Text style={[s.cardTitle, { flex: 1 }]}>Students</Text>
            <Text style={s.meta}>{students.length} enrolled</Text>
          </View>
          {students.length === 0 ? <Text style={s.empty}>No students have joined yet</Text> : null}
          {students.map((st, i) => (
            <View key={st.student_id} style={[s.srow, i === students.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={s.num}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.item}>{st.profiles?.full_name || 'Student'}</Text>
                <Text style={s.meta}>{st.profiles?.email}</Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 18, gap: 14, paddingBottom: 50 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  crumb: { fontSize: 13.5, fontFamily: fonts.regular, color: colors.text },
  h1: { fontSize: 28, fontFamily: fonts.semibold, color: colors.text },
  meta: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 14 },
  statL: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  statV: { fontSize: 30, fontFamily: fonts.semibold, color: colors.text, marginTop: 4 },
  statS: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  cardTitle: { fontSize: 17, fontFamily: fonts.semibold, color: colors.text },
  quiz: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, gap: 4 },
  item: { fontSize: 14.5, fontFamily: fonts.medium, color: colors.text },
  link: { fontSize: 13.5, fontFamily: fonts.medium, color: colors.primary },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, paddingTop: 10 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bar: { width: '70%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  dl: { fontSize: 11.5, fontFamily: fonts.regular, color: colors.muted },
  dn: { fontSize: 12, fontFamily: fonts.medium, color: colors.text },
  srow: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  num: { width: 18, fontSize: 13.5, fontFamily: fonts.regular, color: colors.text },
  empty: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', paddingVertical: 10 },
});