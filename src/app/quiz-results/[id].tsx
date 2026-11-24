import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import Header from '../../components/header';
import { Badge, Card } from '../../components/ui';
import { colors, fonts } from '../../lib/theme';

const PASS = 60;

type Quiz = {
  id: string; title: string; status: string; question_count: number;
  total_points: number; room_id: string; room: { name: string } | null;
};
type Attempt = {
  student_id: string; score: number; total: number; percentage: number; submitted_at: string;
  student: { full_name: string; email: string } | null;
};

const r2 = (n: number) => Math.round(Number(n) * 100) / 100;

export default function QuizResults() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [rows, setRows] = useState<Attempt[]>([]);
  const [enrolled, setEnrolled] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const z = await supabase
        .from('quizzes')
        .select('id, title, status, question_count, total_points, room_id, room:rooms(name)')
        .eq('id', id).single();
      if (z.error) return setError(z.error.message);
      const qz = z.data as unknown as Quiz;
      setQuiz(qz);

      const at = await supabase
        .from('attempts')
        .select('student_id, score, total, percentage, submitted_at, student:profiles!student_id(full_name, email)')
        .eq('quiz_id', id)
        .order('percentage', { ascending: false });
      if (at.error) return setError(at.error.message);
      setRows((at.data || []) as unknown as Attempt[]);

      const c = await supabase.from('room_students').select('*', { count: 'exact', head: true }).eq('room_id', qz.room_id);
      setEnrolled(c.count || 0);
    })();
  }, [id]);

  if (!quiz && !error) return <ActivityIndicator style={{ flex: 1 }} />;

  const pcts = rows.map((r) => Number(r.percentage));
  const avg = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;
  const high = pcts.length ? Math.max(...pcts) : 0;
  const rate = pcts.length ? Math.round((pcts.filter((p) => p >= PASS).length / pcts.length) * 100) : 0;

  const Stat = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <Card style={s.stat}>
      <Text style={s.statL}>{label}</Text>
      <Text style={s.statV}>{value}</Text>
      {sub ? <Text style={s.statS}>{sub}</Text> : null}
    </Card>
  );

  return (
    <View style={s.screen}>
      <Header role="admin" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.body}>
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

        {quiz ? (
          <>
            <Text style={s.back} onPress={() => router.back()}>← Back to {quiz.room?.name}</Text>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.h1}>{quiz.title}</Text>
                <Text style={s.meta}>{quiz.question_count} questions · {quiz.total_points} points</Text>
              </View>
              <Badge text={quiz.status} kind={quiz.status === 'published' ? 'ok' : 'warn'} />
            </View>
          </>
        ) : null}

        <View style={s.statRow}>
          <Stat label="Submissions" value={rows.length} sub={`of ${enrolled} enrolled`} />
          <Stat label="Average" value={`${Math.round(avg * 10) / 10}%`} />
        </View>
        <View style={s.statRow}>
          <Stat label="Highest" value={`${r2(high)}%`} />
          <Stat label="Pass Rate" value={`${rate}%`} />
        </View>

        <Card style={{ gap: 2 }}>
          {rows.length === 0 ? <Text style={s.empty}>No submissions yet</Text> : null}
          {rows.map((r, i) => {
            const pass = Number(r.percentage) >= PASS;
            return (
              <View key={r.student_id} style={[s.srow, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={s.num}>{i + 1}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.item}>{r.student?.full_name || 'Student'}</Text>
                  <Text style={s.meta}>{r.student?.email}</Text>
                  <Text style={s.meta}>
                    Score: {r2(r.score)} / {r2(r.total)} · {r2(r.percentage)}%
                  </Text>
                  <Text style={s.meta}>Submitted {new Date(r.submitted_at).toLocaleString()}</Text>
                </View>
                <Badge text={pass ? 'Passed' : 'Failed'} kind={pass ? 'ok' : 'bad'} />
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 18, gap: 14, paddingBottom: 50 },
  back: { fontSize: 14, fontFamily: fonts.regular, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  h1: { fontSize: 28, fontFamily: fonts.semibold, color: colors.text },
  meta: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 14 },
  statL: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  statV: { fontSize: 28, fontFamily: fonts.semibold, color: colors.text, marginTop: 4 },
  statS: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  srow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
  num: { width: 18, fontSize: 13.5, fontFamily: fonts.regular, color: colors.text },
  item: { fontSize: 14.5, fontFamily: fonts.medium, color: colors.text },
  empty: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', paddingVertical: 14 },
});