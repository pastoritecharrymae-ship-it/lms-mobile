import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { supabase } from '../lib/supabase';
import { Badge, Card, Field } from './ui';
import { colors, fonts } from '../lib/theme';

type Quiz = { id: string; title: string; rooms: { name: string } | null };
type Q = { id: string; text: string; type: string; difficulty: string };
type Ans = { question_id: string; is_correct: boolean };

const TYPE: Record<string, string> = {
  multiple_choice: 'Multiple Choice', identification: 'Identification',
  matching: 'Matching Type', true_false: 'True or False',
};

function Bar({ text, pct }: { text: string; pct: number }) {
  return (
    <View style={s.bar}>
      <Text style={s.lbl} numberOfLines={1}>{text}</Text>
      <View style={s.trk}>
        <View style={[s.fill, { width: `${Math.max(0, Math.min(100, pct))}%` as any, backgroundColor: pct >= 75 ? '#43b94f' : '#d05a5a' }]}>
          <Text style={s.fillTxt}>{Math.round(pct)}%</Text>
        </View>
      </View>
    </View>
  );
}

function Donut({ good, bad }: { good: number; bad: number }) {
  const total = good + bad || 1;
  const r = 60, sw = 36, C = 2 * Math.PI * r;
  const g = (good / total) * C;
  return (
    <Svg width={180} height={180} viewBox="0 0 180 180">
      <G rotation={-90} origin="90, 90">
        <Circle cx={90} cy={90} r={r} fill="none" stroke="#d05a5a" strokeWidth={sw} />
        <Circle cx={90} cy={90} r={r} fill="none" stroke="#43b94f" strokeWidth={sw}
          strokeDasharray={`${g} ${C - g}`} />
      </G>
    </Svg>
  );
}

export default function QuestionAnalysis() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [quizId, setQuizId] = useState('');
  const [date, setDate] = useState('');
  const [qs, setQs] = useState<Q[]>([]);
  const [attempts, setAttempts] = useState<{ id: string; percentage: number }[]>([]);
  const [ans, setAns] = useState<Ans[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('quizzes').select('id, title, rooms(name)').order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) return setError(error.message);
        const list = (data || []) as unknown as Quiz[];
        setQuizzes(list);
        if (list[0]) setQuizId(list[0].id);
      });
  }, []);

  useEffect(() => {
    if (!quizId) return;
    const okDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
    if (date && !okDate) return;
    (async () => {
      setBusy(true);
      const q = await supabase.from('questions').select('id, text, type, difficulty').eq('quiz_id', quizId).order('position');
      let aq = supabase.from('attempts').select('id, percentage').eq('quiz_id', quizId);
      if (okDate) {
        const d0 = new Date(date + 'T00:00:00');
        const d1 = new Date(d0.getTime() + 864e5);
        aq = aq.gte('submitted_at', d0.toISOString()).lt('submitted_at', d1.toISOString());
      }
      const a = await aq;
      if (q.error || a.error) setError((q.error || a.error)!.message);
      const att = (a.data || []) as { id: string; percentage: number }[];
      const an = att.length
        ? await supabase.from('answers').select('question_id, is_correct').in('attempt_id', att.map((x) => x.id))
        : { data: [] as any[] };
      setQs((q.data || []) as Q[]);
      setAttempts(att);
      setAns((an.data || []) as Ans[]);
      setBusy(false);
    })();
  }, [quizId, date]);

  if (error) return <Text style={{ color: colors.danger, padding: 18 }}>{error}</Text>;
  if (!quizzes) return <ActivityIndicator style={{ flex: 1 }} />;

  const rows = qs.map((x, i) => {
    const a = ans.filter((v) => v.question_id === x.id);
    const c = a.filter((v) => v.is_correct).length;
    const pct = a.length ? Math.round((c / a.length) * 100) : 0;
    return { i, x, n: a.length, c, pct };
  });
  const avgPct = attempts.length ? attempts.reduce((t, a) => t + Number(a.percentage), 0) / attempts.length : 0;
  const totC = ans.filter((a) => a.is_correct).length;
  const totW = ans.length - totC;

  return (
    <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>🧩 Question Analysis</Text>
      {quizzes.length === 0 ? <Text style={s.empty}>No quizzes available to analyse</Text> : null}

      <Text style={s.cardTitle}>Select Quiz</Text>
      <View style={s.chips}>
        {quizzes.map((z) => (
          <Pressable key={z.id} onPress={() => setQuizId(z.id)} style={[s.chip, quizId === z.id && s.chipOn]}>
            <Text style={{ fontSize: 12.5, fontFamily: fonts.regular, color: quizId === z.id ? '#fff' : colors.text }}>
              {z.title} — {z.rooms?.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Field label="Date (optional)" placeholder="YYYY-MM-DD" autoCapitalize="none" value={date} onChangeText={setDate} />

      {busy ? <ActivityIndicator /> : null}

      {quizId && !busy ? (
        <>
          <View style={s.statRow}>
            <Card style={s.stat}><Text style={s.statL}>Total Question</Text><Text style={s.statV}>{qs.length}</Text></Card>
            <Card style={s.stat}><Text style={s.statL}>Total Students</Text><Text style={s.statV}>{attempts.length}</Text></Card>
          </View>
          <View style={s.statRow}>
            <Card style={s.stat}><Text style={s.statL}>Average Percentage</Text><Text style={s.statV}>{Math.round(avgPct * 10) / 10}%</Text></Card>
          </View>

          <Card style={{ gap: 8, alignItems: 'center' }}>
            <Text style={[s.cardTitle, { alignSelf: 'flex-start' }]}>Overall Performance Summary</Text>
            {attempts.length ? (
              <>
                <Donut good={totC} bad={totW} />
                <View style={{ gap: 6 }}>
                  <View style={s.legend}><View style={[s.swatch, { backgroundColor: '#43b94f' }]} /><Text style={s.meta}>Correct answers ({totC})</Text></View>
                  <View style={s.legend}><View style={[s.swatch, { backgroundColor: '#d05a5a' }]} /><Text style={s.meta}>Incorrect answers ({totW})</Text></View>
                </View>
              </>
            ) : (
              <Text style={s.empty}>No submissions{date ? ' on this date' : ''}</Text>
            )}
          </Card>

          <Text style={s.cardTitle}>Question Analytics Breakdown</Text>
          {rows.length === 0 ? <Text style={s.empty}>This quiz has no questions</Text> : null}
          {rows.map((r) => (
            <Card key={r.x.id} style={{ gap: 4, padding: 14 }}>
              <Text style={s.q}>{r.i + 1}. {r.x.text}</Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <Badge text={TYPE[r.x.type] || r.x.type} kind="info" />
                <Badge text={`Set: ${r.x.difficulty}`} />
              </View>
              <Text style={s.meta}>{r.n} answered · {r.c} correct · {r.n - r.c} incorrect</Text>
              {r.n ? <Bar text="% correct" pct={r.pct} /> : null}
            </Card>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  body: { padding: 18, gap: 12, paddingBottom: 40 },
  h1: { fontSize: 28, fontFamily: fonts.semibold, color: colors.text },
  cardTitle: { fontSize: 16, fontFamily: fonts.semibold, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 14 },
  statL: { fontSize: 13, fontFamily: fonts.semibold, color: colors.text },
  statV: { fontSize: 26, fontFamily: fonts.semibold, color: colors.text, marginTop: 4 },
  q: { fontSize: 14.5, fontFamily: fonts.medium, color: colors.text },
  meta: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 28, height: 12 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 5 },
  lbl: { width: 80, fontSize: 12.5, fontFamily: fonts.regular, color: colors.text },
  trk: { flex: 1, height: 20, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.border },
  fill: { height: '100%', justifyContent: 'center', minWidth: 34 },
  fillTxt: { color: '#fff', fontSize: 11, fontFamily: fonts.medium, textAlign: 'center' },
  empty: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', paddingVertical: 12 },
});