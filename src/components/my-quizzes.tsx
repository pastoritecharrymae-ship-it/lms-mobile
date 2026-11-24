import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Badge } from './ui';
import { colors, fonts, radius } from '../lib/theme';

type Quiz = {
  id: string; title: string; due_date: string | null; question_count: number;
  total_points: number; time_limit_minutes: number | null; rooms: { name: string } | null;
};
type Attempt = { quiz_id: string; score: number; total: number; percentage: number };

export default function MyQuizzes() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const rs = await supabase.from('room_students').select('room_id').eq('student_id', user.id);
        if (rs.error) return setError(rs.error.message);
        const ids = (rs.data || []).map((r: any) => r.room_id);
        if (!ids.length) return setQuizzes([]);
        const q = await supabase
          .from('quizzes')
          .select('id, title, due_date, question_count, total_points, time_limit_minutes, rooms(name)')
          .in('room_id', ids)
          .eq('status', 'published')
          .order('created_at', { ascending: false });
        if (q.error) return setError(q.error.message);
        const list = (q.data || []) as unknown as Quiz[];
        setQuizzes(list);
        if (list.length) {
          const a = await supabase
            .from('attempts')
            .select('quiz_id, score, total, percentage')
            .in('quiz_id', list.map((x) => x.id));
          const map: Record<string, Attempt> = {};
          (a.data || []).forEach((r: any) => (map[r.quiz_id] = r));
          setAttempts(map);
        }
      })();
    }, [])
  );

  return (
    <ScrollView contentContainerStyle={s.body}>
      <Text style={s.h1}>My Quiz</Text>
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {!quizzes && !error ? <ActivityIndicator /> : null}
      {quizzes && quizzes.length === 0 ? <Text style={s.empty}>No quizzes yet.</Text> : null}

      {quizzes?.map((q) => {
        const att = attempts[q.id];
        const pastDue = q.due_date ? new Date(q.due_date) < new Date() : false;
        const canTake = !att && !pastDue;
        return (
          <Pressable
            key={q.id}
            disabled={!att && !canTake}
            style={[s.card, !att && !canTake && { opacity: 0.7 }]}
            onPress={() =>
              router.push({ pathname: att ? '/review/[id]' : '/quiz/[id]', params: { id: q.id } } as any)
            }
          >
            <View style={s.row}>
              <Text style={s.t}>{q.title}</Text>
              {att ? <Badge text={`${att.percentage}%`} kind="ok" />
                : pastDue ? <Badge text="Past due" kind="bad" />
                : <Badge text="Open" kind="info" />}
            </View>
            <Text style={s.meta}>{q.rooms?.name}</Text>
            <Text style={s.meta}>
              {q.question_count} questions · {q.total_points} pts
              {q.time_limit_minutes ? ` · ${q.time_limit_minutes} min` : ''}
            </Text>
            {q.due_date ? <Text style={s.meta}>Due {new Date(q.due_date).toLocaleString()}</Text> : null}
            <Text style={s.action}>
              {att ? `Score ${att.score}/${att.total} · Tap to review` : canTake ? 'Tap to take quiz' : ''}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  body: { padding: 18, gap: 12, paddingBottom: 40 },
  h1: { fontSize: 30, fontFamily: fonts.semibold, color: colors.text },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  t: { flex: 1, fontSize: 15.5, fontFamily: fonts.medium, color: colors.text },
  meta: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted, marginTop: 3 },
  action: { fontSize: 13, fontFamily: fonts.medium, color: colors.primary, marginTop: 8 },
  empty: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', paddingVertical: 18 },
});