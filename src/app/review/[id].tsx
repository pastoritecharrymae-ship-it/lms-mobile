import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import Header from '../../components/header';
import { Badge, Card } from '../../components/ui';
import { colors, fonts, radius } from '../../lib/theme';

const PASS = 60;

type Item = {
  question_id: string;
  type: 'multiple_choice' | 'true_false' | 'identification' | 'matching';
  text: string; points: number; earned: number | null; is_correct: boolean | null;
  response: any; answer: any;
};

const cap = (v: string) => (v ? v[0].toUpperCase() + v.slice(1) : v);

const show = (v: any, type: string): string => {
  if (v === null || v === undefined || v === '') return 'No answer';
  if (type === 'matching') {
    if (Array.isArray(v)) return v.map((p: any) => `${p.left} → ${p.right}`).join('\n');
    return Object.entries(v).map(([l, r]) => `${l} → ${r || '—'}`).join('\n');
  }
  if (type === 'true_false') return cap(String(v));
  return String(v);
};

const correct = (v: any, type: string): string => {
  if (type === 'matching') return (v || []).map((p: any) => `${p.left} → ${p.right}`).join('\n');
  if (type === 'identification') return String(v ?? '').split('|').join(' / ');
  if (type === 'true_false') return cap(String(v));
  return String(v ?? '');
};

export default function Review() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    supabase.rpc('get_attempt_review', { p_quiz: id }).then(({ data, error }) => {
      if (error || !data) {
        Alert.alert('Cannot load result', error?.message || 'No attempt found');
        return router.back();
      }
      setData(data);
    });
  }, [id]);

  if (!data) return <ActivityIndicator style={{ flex: 1 }} />;
  const a = data.attempt;
  const items: Item[] = data.items;
  const pass = Number(a.percentage) >= PASS;

  return (
    <View style={s.screen}>
      <Header role="student" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.body}>
        <Card style={{ gap: 6 }}>
          <Text style={s.h1}>Result</Text>
          <Text style={s.muted}>{data.quiz.title}</Text>
          <View style={s.scoreRow}>
            <Text style={s.big}>{a.percentage}%</Text>
            <View style={{ gap: 4 }}>
              <Text style={s.val}>Score: <Text style={{ fontFamily: fonts.bold }}>{a.score} / {a.total}</Text></Text>
              <Badge text={pass ? 'Passed' : 'Not passed'} kind={pass ? 'ok' : 'bad'} />
              <Text style={s.muted}>Passing mark {PASS}%</Text>
              {a.submitted_at ? <Text style={s.muted}>Submitted {new Date(a.submitted_at).toLocaleString()}</Text> : null}
            </View>
          </View>
        </Card>

        <Text style={s.h2}>Review</Text>
        {items.map((it, i) => (
          <View key={it.question_id} style={[s.rev, { borderLeftColor: it.is_correct ? colors.ok : colors.danger }]}>
            <Text style={s.q}>
              Q{i + 1}. {it.text} <Text style={s.muted}>({it.earned ?? 0} / {it.points} pts)</Text>
            </Text>
            <Text style={s.val}>Your answer: {show(it.response, it.type)}</Text>
            {!it.is_correct ? (
              <Text style={[s.val, { color: colors.ok }]}>Correct answer: {correct(it.answer, it.type)}</Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 18, gap: 12, paddingBottom: 40 },
  h1: { fontSize: 20, fontFamily: fonts.semibold, color: colors.text },
  h2: { fontSize: 17, fontFamily: fonts.semibold, color: colors.text, marginTop: 6 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 22, marginTop: 8 },
  big: { fontSize: 42, fontFamily: fonts.bold, color: colors.text },
  muted: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  val: { fontSize: 14, fontFamily: fonts.regular, color: colors.text, marginTop: 4 },
  rev: {
    backgroundColor: colors.card, borderWidth: 1, borderLeftWidth: 4, borderColor: colors.border,
    borderRadius: radius.md, padding: 14,
  },
  q: { fontSize: 14.5, fontFamily: fonts.medium, color: colors.text },
});