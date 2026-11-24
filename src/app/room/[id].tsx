import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import Header from '../../components/header';
import { Badge, Button, Card } from '../../components/ui';
import { colors, fonts, radius } from '../../lib/theme';

const PASS = 60;

type Room = {
  id: string; name: string; code: string; status: string;
  course: { name: string } | null; teacher: { full_name: string } | null;
};
type Quiz = {
  id: string; title: string; due_date: string | null;
  time_limit_minutes: number | null; question_count: number;
};
type Attempt = { quiz_id: string; score: number; total: number; percentage: number };

export default function RoomStudent() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string; name?: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const r = await supabase
          .from('rooms')
          .select('id, name, code, status, course:courses(name), teacher:profiles!teacher_id(full_name)')
          .eq('id', id)
          .single();
        if (r.error) return setError(r.error.message);
        setRoom(r.data as unknown as Room);

        const q = await supabase
          .from('quizzes')
          .select('id, title, due_date, time_limit_minutes, question_count')
          .eq('room_id', id)
          .eq('status', 'published')
          .order('created_at');
        if (q.error) return setError(q.error.message);
        const list = (q.data || []) as Quiz[];
        setQuizzes(list);

        if (list.length) {
          const a = await supabase
            .from('attempts')
            .select('quiz_id, score, total, percentage')
            .in('quiz_id', list.map((x) => x.id));
          const map: Record<string, Attempt> = {};
          (a.data || []).forEach((x: any) => (map[x.quiz_id] = x));
          setAttempts(map);
        }
      })();
    }, [id])
  );

  return (
    <View style={s.screen}>
      <Header role="student" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.body}>
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        {!room && !error ? <ActivityIndicator /> : null}

        {room ? (
          <Card style={{ gap: 4 }}>
            <Text style={s.h1}>{room.course?.name}</Text>
            <Text style={s.room}>{room.name}</Text>
            <Text style={s.bold}>Teacher: {room.teacher?.full_name}</Text>
            <Text style={s.bold}>Room Code: {room.code}</Text>
          </Card>
        ) : null}

        <Text style={s.h2}>Quizzes</Text>
        {quizzes && quizzes.length === 0 ? <Text style={s.empty}>No quizzes published yet</Text> : null}

        {quizzes?.map((z) => {
          const t = attempts[z.id];
          const late = z.due_date ? new Date(z.due_date) < new Date() : false;
          const inactive = room ? room.status !== 'active' : false;
          return (
            <View key={z.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.t}>{z.title}</Text>
                <Text style={s.hint}>
                  {z.question_count} Questions
                  {z.time_limit_minutes ? ` · ${z.time_limit_minutes} min` : ''}
                  {z.due_date ? ` · Due ${new Date(z.due_date).toLocaleString()}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                {t ? (
                  <>
                    <Badge text={`${t.percentage}%`} kind={Number(t.percentage) >= PASS ? 'ok' : 'bad'} />
                    <Button small variant="default" title="View result"
                      onPress={() => router.push({ pathname: '/review/[id]', params: { id: z.id } } as any)} />
                  </>
                ) : late ? (
                  <Badge text="Closed" kind="bad" />
                ) : inactive ? (
                  <Badge text="Room inactive" />
                ) : (
                  <Button small title="Take Quiz"
                    onPress={() => router.push({ pathname: '/quiz/[id]', params: { id: z.id } } as any)} />
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 18, gap: 12, paddingBottom: 40 },
  h1: { fontSize: 20, fontFamily: fonts.semibold, color: colors.text },
  room: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted },
  bold: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text, marginTop: 2 },
  h2: { fontSize: 17, fontFamily: fonts.semibold, color: colors.text, marginTop: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14,
  },
  t: { fontSize: 15, fontFamily: fonts.medium, color: colors.text },
  hint: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted, marginTop: 2 },
  empty: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', paddingVertical: 14 },
});