import { useState } from 'react';
import { View, Text, Modal, Pressable, Share, StyleSheet, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '../lib/supabase';
import { Button, Field } from './ui';
import { colors, fonts } from '../lib/theme';

export default function InviteModal({
  visible, onClose, roomId, roomName, code, onAdded,
}: {
  visible: boolean; onClose: () => void; roomId: string;
  roomName: string; code: string; onAdded: () => void;
}) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function add() {
    const em = email.trim().toLowerCase();
    if (!em) return Alert.alert('Missing', 'Enter the student email');
    setBusy(true);
    const p = await supabase
      .from('profiles')
      .select('id, role, status, full_name')
      .ilike('email', em)
      .maybeSingle();
    if (p.error || !p.data) {
      setBusy(false);
      return Alert.alert('Not found', 'No account uses that email.');
    }
    if (p.data.role !== 'student') {
      setBusy(false);
      return Alert.alert('Not a student', 'That account is not a student.');
    }
    const { error } = await supabase
      .from('room_students')
      .insert({ room_id: roomId, student_id: p.data.id });
    setBusy(false);
    if (error) {
      return Alert.alert(
        'Could not add',
        error.code === '23505' ? 'That student is already in this room.' : error.message
      );
    }
    setEmail('');
    Alert.alert('Added', `${p.data.full_name || em} joined the room.`);
    onAdded();
  }

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.modal}>
          <Text style={s.title}>Invite Students</Text>
          <Text style={s.hint}>Share this room code. Students enter it on their dashboard to join.</Text>

          <View style={s.codebox}>
            <Text style={s.code} selectable>{code}</Text>
            <Pressable style={s.copy} onPress={copy}>
              <Text style={s.copyT}>{copied ? 'Copied' : 'Copy'}</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => Share.share({ message: `Join my room "${roomName}" with the code ${code}` })}>
            <Text style={s.link}>Share code…</Text>
          </Pressable>

          <Field
            label="Or add a student by email"
            placeholder="student@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <View style={s.actions}>
            <Button title="Close" variant="default" onPress={onClose} />
            <Button title={busy ? '...' : 'Add student'} onPress={add} disabled={busy} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,20,40,0.5)', justifyContent: 'center', padding: 18 },
  modal: { backgroundColor: colors.card, borderRadius: 14, padding: 22, gap: 12 },
  title: { fontSize: 22, fontFamily: fonts.semibold, color: colors.text },
  hint: { fontSize: 13, fontFamily: fonts.regular, color: colors.muted },
  codebox: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 10,
    paddingVertical: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  code: { fontSize: 30, fontFamily: fonts.bold, letterSpacing: 4, color: colors.text },
  copy: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  copyT: { fontSize: 13, fontFamily: fonts.medium, color: colors.text },
  link: { fontSize: 13, fontFamily: fonts.medium, color: colors.primary, textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
});