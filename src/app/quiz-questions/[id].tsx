import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import Header from '../../components/header';
import { Card, Badge } from '../../components/ui';
import { colors, fonts } from '../../lib/theme';

type Q = {
  id: string; position: number;
  type: 'multiple_choice' | 'true_false' | 'identification' | 'matching';
  text: string; points: number; difficulty: string; options: any; answer: any;
};

const answerText = (q: Q): string => {
  if (q.type === 'matching') return (q.options || []).map((p: any) => `${p.left} → ${p.right}`).join('\n');
  if (q.type === 'identification') return String(q.answer ?? '').split('|').join('  /  ');
  return String(q.answer ?? '');
};

export default function QuizQuestions() {
  const router = useRouter();
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const [qs, setQs] = useState<Q[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase
      .from('questions')
      .select('id, position, type, text, points, difficulty, options, answer')
      .eq('quiz_id', id)
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setQs(data as Q[]);
      });
  }, [id]);

  return (
    <View style={s.screen}>
      <Header role="teacher" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.h1}>{title || 'Questions'}</Text>
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        {!qs && !error ? <ActivityIndicator /> : null}
        {qs && qs.length === 0 ? <Text style={s.empty}>This quiz has no questions yet.</Text> : null}

        {qs?.map((q, i) => (
          <Card key={q.id} style={{ gap: 6, padding: 14 }}>
            <Text style={s.q}>{i + 1}. {q.text}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Badge text={q.type.replace('_', ' ')} kind="info" />
              <Badge text={`${q.points} pt${q.points === 1 ? '' : 's'}`} />
              <Badge text={q.difficulty} kind="warn" />
            </View>
            {q.type === 'multiple_choice'
              ? (q.options || []).map((o: string) => (
                  <Text key={o} style={o === q.answer ? s.correct : s.opt}>
                    {o === q.answer ? '✓ ' : '• '}{o}
                  </Text>
                ))
              : (
                <>
                  <Text style={s.label}>{q.type === 'matching' ? 'Pairs' : 'Correct answer'}</Text>
                  <Text style={s.correct}>{answerText(q)}</Text>
                </>
              )}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 18, gap: 12, paddingBottom: 40 },
  h1: { fontSize: 22, fontFamily: fonts.semibold, color: colors.text },
  q: { fontSize: 15, fontFamily: fonts.medium, color: colors.text },
  label: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted, marginTop: 4 },
  opt: { fontSize: 14, fontFamily: fonts.regular, color: colors.text },
  correct: { fontSize: 14, fontFamily: fonts.semibold, color: colors.ok },
  empty: { fontFamily: fonts.regular, color: colors.muted, textAlign: 'center', paddingVertical: 18 },
});