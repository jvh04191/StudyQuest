import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Button, Field, IconButton, T, Touchable } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useDeckStats } from '@/lib/hooks';
import { deckStateLabel } from '@/lib/srs';
import { landName } from '@/lib/world';
import { useNova } from '@/store/novaStore';
import { useStore } from '@/store/useStore';
import { color as C, font, space } from '@/theme/tokens';

export default function Library() {
  const subjects = useStore((s) => s.subjects);
  const decks = useStore((s) => s.decks);
  const addSubject = useStore((s) => s.addSubject);
  const deleteSubject = useStore((s) => s.deleteSubject);
  const cards = useStore((s) => s.cards);
  const [confirm, setConfirm] = useState<string | null>(null);
  const stats = useDeckStats();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string | null>(null);
  const setContext = useNova((s) => s.setContext);
  useFocusEffect(useCallback(() => setContext({ screen: 'library' }), [setContext]));

  const saveSubject = () => {
    if (!name.trim()) return;
    addSubject(name);
    setName('');
    setAdding(false);
  };

  const q = query.trim().toLowerCase();
  const groups = useMemo(
    () =>
      subjects
        .map((s, i) => ({
          s,
          i,
          ds: decks.filter((d) => d.subjectId === s.id && (!q || d.title.toLowerCase().includes(q) || (d.summary ?? '').toLowerCase().includes(q))),
        }))
        .filter((g) => (!filter || g.s.id === filter) && (!q || g.ds.length)),
    [subjects, decks, q, filter],
  );

  return (
    <Screen maxWidth={900}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.lg }}>
        <View>
          <T v="eyebrow" style={{ color: C.textFaint }}>{decks.length} decks</T>
          <T v="title" accessibilityRole="header" style={{ marginTop: 4 }}>Library</T>
        </View>
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Button small kind="secondary" icon="plus" label="New land" accessibilityLabel="New subject" onPress={() => setAdding((v) => !v)} />
          <Button small kind="gold" icon="plus" label="New deck" onPress={() => router.push('/create')} />
        </View>
      </View>

      {/* search */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, paddingHorizontal: 14, backgroundColor: C.surface1, borderWidth: 1.5, borderColor: C.panelBorder, borderRadius: 15, boxShadow: 'inset 0 2px 0 rgba(0,0,0,0.03)' }}>
        <Icon name="search" size={20} color={C.textFaint} strokeWidth={2.1} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search your decks"
          placeholderTextColor={C.textFaint}
          selectionColor={C.moss}
          accessibilityLabel="Search your decks"
          style={{ flex: 1, minWidth: 0, fontFamily: font.bodyBold, fontSize: 15, color: C.text, outlineStyle: 'none' } as never}
        />
      </View>

      {/* land filter chips */}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {[{ id: null as string | null, label: 'All' }, ...subjects.map((s, i) => ({ id: s.id as string | null, label: landName(s, i) }))].map((c) => {
          const on = filter === c.id;
          return (
            <Pressable
              key={c.id ?? 'all'}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setFilter(on ? null : c.id)}
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? C.moss : C.surface1, borderWidth: 1.5, borderColor: on ? C.moss : C.panelBorder }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 13.5, color: on ? '#FFFFFF' : C.textMuted }}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {adding && (
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end', flexWrap: 'wrap', padding: space.lg, borderRadius: 20, backgroundColor: C.surface1, borderWidth: 1.5, borderColor: C.panelBorder, boxShadow: `0 4px 0 ${C.panelShadow}`, marginBottom: 4 }}>
          <Field label="Subject name" value={name} onChangeText={setName} placeholder="e.g. Chemistry" autoFocus onSubmitEditing={saveSubject} style={{ flex: 1, minWidth: 220 }} />
          <Button label="Add subject" disabled={!name.trim()} onPress={saveSubject} />
          <Button kind="ghost" label="Cancel" onPress={() => setAdding(false)} />
        </View>
      )}

      {groups.length === 0 && (
        <View style={{ alignItems: 'center', gap: 6, padding: space.xl }}>
          <T v="bodyStrong">No decks match “{query}”</T>
          <T v="small">Try a different word, or brew a new deck with Nova.</T>
        </View>
      )}

      {groups.map(({ s, i, ds }) => {
        const count = decks.filter((d) => d.subjectId === s.id).length;
        return (
          <View key={s.id} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: s.color }} />
              <Text style={{ fontFamily: font.display, fontSize: 19, color: C.text }}>{landName(s, i)}</Text>
              <Text style={{ flex: 1, fontFamily: font.bodyBold, fontSize: 13, color: C.textMuted }}>{s.name} · {count}</Text>
              <IconButton icon="trash" label={`Delete subject ${s.name}`} size={36} tint={C.berry} bg="transparent" style={{ borderColor: 'transparent', boxShadow: 'none' }} onPress={() => setConfirm(s.id)} />
            </View>
            {confirm === s.id && (
              <ConfirmBar
                title={`Delete ${s.name}?`}
                detail={
                  count
                    ? `This also deletes its ${count} deck${count === 1 ? '' : 's'} and ${Object.values(cards).filter((c) => decks.some((d) => d.subjectId === s.id && d.id === c.deckId)).length} cards, with their review history. It can’t be undone.`
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
            {ds.length === 0 ? (
              <View style={{ padding: space.lg, gap: space.sm, borderRadius: 20, backgroundColor: C.surface1, borderWidth: 1.5, borderColor: C.panelBorder, borderStyle: 'dashed' }}>
                <T v="bodyStrong">No decks yet</T>
                <T v="small">Paste notes, upload a PDF, or write cards yourself.</T>
                <Button small icon="plus" label={`Create a ${s.name} deck`} onPress={() => router.push({ pathname: '/create', params: { subject: s.id } })} />
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {ds.map((d) => {
                  const st = stats[d.id];
                  const bar = st.state === 'mastered' ? C.honey : s.color;
                  return (
                    <Touchable
                      key={d.id}
                      accessibilityLabel={`${d.title}. ${st.total} cards. ${deckStateLabel[st.state]}.`}
                      onPress={() => router.push(`/deck/${d.id}`)}
                      style={{
                        width: 170,
                        flexGrow: 0,
                        minHeight: 132,
                        flexDirection: 'row',
                        backgroundColor: C.surface1,
                        borderWidth: 1.5,
                        borderColor: C.panelBorder,
                        borderTopLeftRadius: 8,
                        borderBottomLeftRadius: 8,
                        borderTopRightRadius: 18,
                        borderBottomRightRadius: 18,
                        boxShadow: `0 4px 0 ${C.panelShadow}`,
                        overflow: 'hidden',
                        marginBottom: 4,
                      }}>
                      <View style={{ width: 14, backgroundColor: s.color, boxShadow: 'inset -3px 0 0 rgba(0,0,0,0.15)', justifyContent: 'space-between', paddingVertical: 12 }}>
                        <View style={{ height: 2, backgroundColor: 'rgba(255,249,238,0.55)' }} />
                        <View style={{ height: 2, backgroundColor: 'rgba(255,249,238,0.55)' }} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, paddingVertical: 12, paddingLeft: 13, paddingRight: 12, gap: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6, alignItems: 'flex-start' }}>
                          <Text style={{ flex: 1, fontFamily: font.display, fontSize: 15.5, lineHeight: 19, color: C.text }}>{d.title}</Text>
                          {st.state === 'mastered' && <Icon name="crown" size={18} color={C.honeyShadow} fill={C.honeyLight} strokeWidth={2} />}
                        </View>
                        <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: C.textMuted }}>
                          {st.total} cards · {deckStateLabel[st.state]}
                          {d.source.kind === 'pdf' ? ' · PDF' : d.source.kind === 'notes' ? ' · notes' : ''}
                        </Text>
                        <View style={{ flex: 1 }} />
                        <View style={{ height: 7, borderRadius: 5, backgroundColor: C.bgDeep, overflow: 'hidden' }}>
                          <View style={{ height: '100%', width: `${Math.round(st.mastery * 100)}%`, backgroundColor: bar, borderRadius: 5 }} />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontFamily: font.pixelMed, fontSize: 12, color: C.textMuted }}>{Math.round(st.mastery * 100)}%</Text>
                          <Text style={{ fontFamily: font.pixelMed, fontSize: 12, color: st.due ? C.berry : C.textMuted }}>{st.due ? `${st.due} due` : ''}</Text>
                        </View>
                      </View>
                    </Touchable>
                  );
                })}
              </View>
            )}
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
}: {
  title: string;
  detail: string;
  action: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ gap: space.sm, padding: space.lg, backgroundColor: C.berrySoft, borderRadius: 20, borderWidth: 1.5, borderColor: C.berry }}>
      <T v="bodyStrong" style={{ color: C.berryInk }}>{title}</T>
      <T v="small" style={{ color: C.berryInk }}>{detail}</T>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: 4 }}>
        <Button small kind="danger" icon="trash" label={action} onPress={onConfirm} />
        <Button small kind="secondary" label="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}
