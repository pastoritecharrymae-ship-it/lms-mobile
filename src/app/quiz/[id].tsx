import { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import Header from '../../components/header';
import { Button, Card } from '../../components/ui';
import { colors, fonts, radius } from '../../lib/theme';

type Question = {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'identification' | 'matching';
  text: string; points: number; options: any;
};

const pad = (n: number) => String(n).padStart(2, '0');

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.choice, selected && s.choiceOn]}>
      <View style={[s.radio, selected && s.radioOn]}>{selected ? <View style={s.dot} /> : null}</View>
      <Text style={s.choiceText}>{label}</Text>
    </Pressable>
  );
}

export default function TakeQuiz() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [course, setCourse] = useState('');
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [left, setLeft] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const sentRef = useRef(false);

  useEffect(() => {
    supabase.rpc('get_quiz_for_student', { p_quiz: id }).then(({ data, error }) => {
      if (error) {
        Alert.alert('Cannot open quiz', error.message);
        return router.back();
      }
      setCourse(data.quiz.course_name || '');
      setTitle(data.quiz.title);
      setQuestions(data.questions);
      const lim = data.quiz.time_limit_minutes;
      if (lim) {
        const end = Date.now() + lim * 60000;
        setLeft(lim * 60);
        timerRef.current = setInterval(() => {
          const l = Math.max(0, Math.round((end - Date.now()) / 1000));
          setLeft(l);
          if (l <= 0) {
            Alert.alert('Time is up', 'Submitting your answers');
            submit();
          }
        }, 1000);
      }
    });
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [id]);

  const setAnswer = (qid: string, v: any) => setAnswers((a) => ({ ...a, [qid]: v }));
  const setMatch = (qid: string, l: string, r: string) =>
    setAnswers((a) => ({ ...a, [qid]: { ...(a[qid] || {}), [l]: r } }));

  async function submit() {
    if (sentRef.current) return;
    sentRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);
    const { error } = await supabase.rpc('submit_attempt', { p_quiz: id, p_answers: answersRef.current });
    setSubmitting(false);
    if (error) {
      sentRef.current = false;
      return Alert.alert('Could not submit', error.message);
    }
    router.replace({ pathname: '/review/[id]', params: { id } } as any);
  }

  function finish() {
    const qs = questions || [];
    const missing = qs.filter((x) => {
      const a = answers[x.id];
      return a == null || a === '' || (x.type === 'matching' && x.options.lefts.some((l: string) => !a[l]));
    }).length;
    const msg = missing
      ? `${missing} question(s) are unanswered. Submit anyway? You cannot retake this quiz.`
      : 'Submit your answers? You cannot retake this quiz.';
    Alert.alert('Finish quiz', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit', onPress: submit },
    ]);
  }

  if (!questions) return <ActivityIndicator style={{ flex: 1 }} />;
  if (questions.length === 0) {
    return (
      <View style={s.screen}>
        <Header role="student" onBack={() => router.back()} />
        <Text style={{ padding: 18, color: colors.muted, fontFamily: fonts.regular }}>This quiz has no questions.</Text>
      </View>
    );
  }

  const x = questions[i];
  const a = answers[x.id];
  const last = i === questions.length - 1;

  return (
    <View style={s.screen}>
      <Header role="student" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={s.body}>
        <Card style={{ gap: 4 }}>
          <View style={s.top}>
            <View style={{ flex: 1 }}>
              <Text style={s.course}>{course}</Text>
              <Text style={s.title}>{title}</Text>
            </View>
            {left !== null ? (
              <Text style={[s.timer, left < 60 && { color: colors.danger }]}>
                Time Limit: {pad(Math.floor(left / 60))}:{pad(left % 60)}
              </Text>
            ) : null}
          </View>
        </Card>

        <Card style={{ gap: 6 }}>
          <Text style={s.q}>
            Q{i + 1} of {questions.length}. {x.text}{' '}
            <Text style={s.pts}>({x.points} pt{x.points == 1 ? '' : 's'})</Text>
          </Text>

          {x.type === 'multiple_choice' &&
            (x.options || []).map((o: any, oi: number) => {
              const val = typeof o === 'string' ? o : String(o?.text ?? o?.label ?? o);
              return (
                <Choice key={val} label={`${String.fromCharCode(65 + oi)}. ${val}`} selected={a === val} onPress={() => setAnswer(x.id, val)} />
              );
            })}

          {x.type === 'true_false' &&
            ['true', 'false'].map((v) => (
              <Choice key={v} label={v === 'true' ? 'True' : 'False'} selected={a === v} onPress={() => setAnswer(x.id, v)} />
            ))}

          {x.type === 'identification' && (
            <TextInput
              style={s.input}
              placeholder="Type your answer"
              placeholderTextColor={colors.muted}
              autoCorrect={false}
              value={a || ''}
              onChangeText={(t) => setAnswer(x.id, t)}
            />
          )}

          {x.type === 'matching' && (
            <>
              <Text style={s.hint}>Match each item with the correct pair.</Text>
              {(x.options?.lefts || []).map((l: string) => (
                <View key={l} style={{ marginTop: 8 }}>
                  <Text style={s.left}>{l}</Text>
                  {(x.options?.rights || []).map((r: string) => (
                    <Choice key={r} label={r} selected={a?.[l] === r} onPress={() => setMatch(x.id, l, r)} />
                  ))}
                </View>
              ))}
            </>
          )}
        </Card>

        <View style={s.nav}>
          {i > 0 ? <Button title="Previous" variant="default" style={{ flex: 1 }} onPress={() => setI(i - 1)} /> : <View style={{ flex: 1 }} />}
          {last ? (
            <Button title={submitting ? 'Submitting...' : 'Finish'} style={{ flex: 1 }} onPress={finish} disabled={submitting} />
          ) : (
            <Button title="Next" style={{ flex: 1 }} onPress={() => setI(i + 1)} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 18, gap: 12, paddingBottom: 40 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  course: { fontSize: 17, fontFamily: fonts.semibold, color: colors.text },
  title: { fontSize: 15, fontFamily: fonts.regular, color: colors.text },
  timer: { fontSize: 13, fontFamily: fonts.medium, color: colors.text },
  q: { fontSize: 15, fontFamily: fonts.medium, color: colors.text, marginBottom: 6 },
  pts: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted },
  hint: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.muted },
  left: { fontSize: 14, fontFamily: fonts.semibold, color: colors.text, marginBottom: 2 },
  input: {
    fontFamily: fonts.regular, fontSize: 14, padding: 11, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, backgroundColor: colors.card, color: colors.text,
  },
  choice: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, marginTop: 4,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
  },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.soft },
  choiceText: { flex: 1, fontSize: 14, fontFamily: fonts.regular, color: colors.text },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  nav: { flexDirection: 'row', gap: 10 },
});