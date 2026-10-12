import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { SubjectArt } from '@/components/art/Art';
import { Icon } from '@/components/ui/Icon';
import { Bar, Button, Field, IconButton, Pill, T, Touchable } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useDeckStats } from '@/lib/hooks';
import { deckStateLabel } from '@/lib/srs';
import { useNova } from '@/store/novaStore';
import { useStore } from '@/store/useStore';
import { color as C, radius, space } from '@/theme/tokens';

export default function Library() {
  const subjects = useStore((s) => s.subjects);
  const decks = useStore((s) => s.decks);
  const addSubject = useStore((s) => s.addSubject);
  const deleteDeck = useStore((s) => s.deleteDeck);
  const deleteSubject = useStore((s) => s.deleteSubject);
  const cards = useStore((s) => s.cards);
  const [confirm, setConfirm] = useState<{ kind: 'deck' | 'subject'; id: string } | null>(null);
  const stats = useDeckStats();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const setContext = useNova((s) => s.setContext);
  useFocusEffect(useCallback(() => setContext({ screen: 'library' }), [setContext]));

  const saveSubject = () => {
    if (!name.trim()) return;
    addSubject(name);
    setName('');
    setAdding(false);
  };

  return (
    <Screen maxWidth={900}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.lg, flexWrap: 'wrap' }}>
        <View style={{ gap: 4, flexShrink: 1 }}>
          <T v="title" accessibilityRole="header">Library</T>
          <T v="small">Your subjects and decks. Add notes or a PDF and Nova turns them into cards you can review before saving.</T>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button kind="secondary" icon="plus" label="New subject" onPress={() => setAdding((v) => !v)} />
          <Button icon="plus" label="New deck" onPress={() => router.push('/create')} />
        </View>
      </View>

      {adding && (
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end', flexWrap: 'wrap', padding: space.lg, borderRadius: radius.lg, backgroundColor: C.surface1, borderWidth: 1, borderColor: C.line }}>
          <Field
            label="Subject name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Chemistry"
            autoFocus
            onSubmitEditing={saveSubject}
            style={{ flex: 1, minWidth: 220 }}
          />
          <Button label="Add subject" disabled={!name.trim()} onPress={saveSubject} />
          <Button kind="ghost" label="Cancel" onPress={() => setAdding(false)} />
        </View>
      )}

      {subjects.map((s) => {
        const ds = decks.filter((d) => d.subjectId === s.id);
        const m = ds.length ? ds.reduce((n, d) => n + stats[d.id].mastery, 0) / ds.length : 0;
        return (
          <View key={s.id} style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <SubjectArt art={s.art} tint={s.color} size={44} />
              <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <T v="heading">{s.name}</T>
                  <T v="small">{ds.length} decks · {Math.round(m * 100)}% mastery</T>
                </View>
                <Bar value={m} height={4} tint={s.color} />
              </View>
              <IconButton
                icon="trash"
                label={`Delete subject ${s.name}`}
                size={40}
                tint={C.coral}
                onPress={() => setConfirm({ kind: 'subject', id: s.id })}
              />
            </View>
            {confirm?.kind === 'subject' && confirm.id === s.id && (
              <ConfirmBar
                title={`Delete ${s.name}?`}
                detail={
                  ds.length
                    ? `This also deletes its ${ds.length} deck${ds.length === 1 ? '' : 's'} and ${Object.values(cards).filter((c) => ds.some((d) => d.id === c.deckId)).length} cards, with their review history. It can’t be undone.`
                    : 'This subject has no decks. It can’t be undone.'
                }
                action="Delete subject"
                onConfirm={() => {
                  deleteSubject(s.id);
                  setConfirm(null);
                }}
                onCancel={() => setConfirm(null)}
              />
            )}
            <View style={{ borderRadius: radius.lg, backgroundColor: C.surface1, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
              {ds.length === 0 && (
                <View style={{ padding: space.lg, gap: space.sm }}>
                  <T v="bodyStrong">No decks yet</T>
                  <T v="small">Paste notes, upload a PDF, or write cards yourself.</T>
                  <Button small icon="plus" label={`Create a ${s.name} deck`} onPress={() => router.push({ pathname: '/create', params: { subject: s.id } })} />
                </View>
              )}
              {ds.map((d, i) => {
                const st = stats[d.id];
                const tone = st.state === 'review' || st.state === 'mastered' ? C.gold : st.state === 'progress' ? C.teal : C.textMuted;
                return (
                  <View key={d.id} style={{ borderTopWidth: i ? 1 : 0, borderColor: C.line }}>
                    {confirm?.kind === 'deck' && confirm.id === d.id ? (
                      <ConfirmBar
                        flat
                        title={`Delete “${d.title}”?`}
                        detail={`Its ${st.total} cards and their review history will be removed. It can’t be undone.`}
                        action="Delete deck"
                        onConfirm={() => {
                          deleteDeck(d.id);
                          setConfirm(null);
                        }}
                        onCancel={() => setConfirm(null)}
                      />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Touchable
                    accessibilityLabel={`${d.title}. ${st.total} cards. ${deckStateLabel[st.state]}.`}
                    onPress={() => router.push(`/deck/${d.id}`)}
                    style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, paddingRight: space.sm }}>
                    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                      <T v="bodyStrong" numberOfLines={1}>{d.title}</T>
                      <T v="caption">
                        {st.total} cards · {st.counts.proven + st.counts.mastered} proven · {Math.round(st.mastery * 100)}% mastery
                        {d.source.kind === 'pdf' ? ' · from PDF' : d.source.kind === 'notes' ? ' · from notes' : ''}
                      </T>
                    </View>
                    {st.due > 0 ? <Pill label={`${st.due} due`} tint={C.gold} bg={C.goldSoft} /> : <Pill label={deckStateLabel[st.state]} tint={tone} />}
                    <Icon name="chevronRight" size={18} color={C.textFaint} />
                  </Touchable>
                        <IconButton
                          icon="trash"
                          label={`Delete deck ${d.title}`}
                          size={40}
                          tint={C.coral}
                          bg="transparent"
                          style={{ marginRight: space.md }}
                          onPress={() => setConfirm({ kind: 'deck', id: d.id })}
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

function ConfirmBar({
  title,
  detail,
  action,
  onConfirm,
  onCancel,
  flat,
}: {
  title: string;
  detail: string;
  action: string;
  onConfirm: () => void;
  onCancel: () => void;
  flat?: boolean;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        gap: space.sm,
        padding: space.lg,
        backgroundColor: C.surface2,
        borderRadius: flat ? 0 : radius.lg,
        borderWidth: flat ? 0 : 1,
        borderLeftWidth: 3,
        borderColor: C.coral,
      }}>
      <T v="bodyStrong">{title}</T>
      <T v="small" style={{ color: C.text }}>{detail}</T>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: 4 }}>
        <Button small kind="danger" icon="trash" label={action} onPress={onConfirm} />
        <Button small kind="secondary" label="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}
