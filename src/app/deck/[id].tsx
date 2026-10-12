import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Share, View } from 'react-native';

import { SubjectArt } from '@/components/art/Art';
import { goBackOr, startQuest } from '@/components/map/TopicSheet';
import { CardEditor } from '@/components/study/CardEditor';
import { TestSheet } from '@/components/study/TestSheet';
import { Icon } from '@/components/ui/Icon';
import { Bar, Button, Field, IconButton, Panel, Pill, T } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { useDeckStats } from '@/lib/hooks';
import { cardStatus, isDue, statusLabel } from '@/lib/srs';
import { exportTabs } from '@/lib/transfer';
import { relDue } from '@/lib/util';
import { landName } from '@/lib/world';
import { useNova } from '@/store/novaStore';
import type { CardStatus } from '@/store/types';
import { useStore } from '@/store/useStore';
import { color as C, radius, space } from '@/theme/tokens';

const statusTone: Record<CardStatus, { tint: string; bg: string }> = {
  new: { tint: C.textMuted, bg: C.surface3 },
  seen: { tint: C.text, bg: C.surface4 },
  proven: { tint: C.mossInk, bg: C.mossSoft },
  mastered: { tint: C.honeyInk, bg: C.honeySoft },
};

export default function DeckScreen() {
  const { id, test } = useLocalSearchParams<{ id: string; test?: string }>();
  const deck = useStore((s) => s.decks.find((d) => d.id === id));
  const subject = useStore((s) => s.subjects.find((x) => x.id === deck?.subjectId));
  const subjectIndex = useStore((s) => s.subjects.findIndex((x) => x.id === deck?.subjectId));
  const allCards = useStore((s) => s.cards);
  const states = useStore((s) => s.cardStates);
  const { addCards, updateCard, deleteCard, deleteDeck, updateDeck } = useStore.getState();
  const stats = useDeckStats();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(deck?.title ?? '');
  const [filter, setFilter] = useState<CardStatus | 'all'>('all');
  // Opened with ?test=1 right after a deck is made, so the first thing offered is a test.
  const [showTest, setShowTest] = useState(test === '1');
  const [copied, setCopied] = useState(false);
  const setContext = useNova((s) => s.setContext);
  useFocusEffect(useCallback(() => setContext({ screen: 'deck', deckId: id }), [setContext, id]));

  if (!deck || !subject) {
    return (
      <Screen>
        <T v="title">Deck not found</T>
        <T v="body" style={{ color: C.textMuted }}>It may have been deleted.</T>
        <Button label="Back to library" onPress={() => goBackOr('/library')} />
      </Screen>
    );
  }
  const st = stats[deck.id];
  const cards = Object.values(allCards)
    .filter((c) => c.deckId === deck.id)
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const shown = filter === 'all' ? cards : cards.filter((c) => cardStatus(states[c.id]) === filter);

  return (
    <View style={{ flex: 1 }}>
    <Screen maxWidth={860}>
      <Button kind="ghost" small icon="chevronLeft" label="Back" onPress={() => goBackOr('/library')} />
      <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'center' }}>
        <SubjectArt art={subject.art} tint={subject.color} size={64} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <T v="eyebrow" style={{ color: subject.color }}>{landName(subject, subjectIndex)} · {subject.name}</T>
          {renaming ? (
            <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center', flexWrap: 'wrap' }}>
              <Field value={title} onChangeText={setTitle} autoFocus accessibilityLabel="Deck title" style={{ flex: 1, minWidth: 200 }} />
              <Button small label="Save" disabled={!title.trim()} onPress={() => { updateDeck(deck.id, { title: title.trim() }); setRenaming(false); }} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <T v="title" style={{ flexShrink: 1 }}>{deck.title}</T>
              <IconButton icon="edit" label="Rename deck" size={36} onPress={() => { setTitle(deck.title); setRenaming(true); }} />
            </View>
          )}
        </View>
      </View>

      {deck.summary ? (
        <Panel style={{ gap: 6 }}>
          <T v="caption">Summary</T>
          <T v="body">{deck.summary}</T>
          {deck.source.kind !== 'seed' && deck.source.kind !== 'manual' && (
            <T v="caption">Made from {deck.source.kind === 'pdf' ? 'PDF' : 'your notes'}{deck.source.title ? `: ${deck.source.title}` : ''}</T>
          )}
        </Panel>
      ) : null}

      <View style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <T v="small">Mastery</T>
          <T v="small" style={{ color: C.text }}>{Math.round(st.mastery * 100)}%</T>
        </View>
        <Bar value={st.mastery} tint={st.state === 'mastered' ? C.honey : C.moss} height={12} />
        <T v="caption">
          Seen means you’ve reviewed a card. Proven means you answered it correctly on the first try without a hint. Mastered means you proved it and still remember it after a week or more.
        </T>
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <Button icon="target" label="Test yourself" disabled={!cards.length} onPress={() => setShowTest(true)} />
        <Button kind="secondary" icon="play" label={st.due ? `Start quest · ${st.due} due` : 'Start quest'} disabled={!cards.length} onPress={() => startQuest('quest', { deckIds: [deck.id] })} />
        <Button kind="secondary" icon="cards" label="Match game" disabled={cards.length < 3} onPress={() => router.push({ pathname: '/match', params: { id: deck.id } })} />
        <Button kind="secondary" icon="plus" label="Add card" onPress={() => { setAdding(true); setEditing(null); }} />
        <Button
          kind="ghost"
          icon="upload"
          label={copied ? 'Copied!' : 'Export'}
          disabled={!cards.length}
          onPress={async () => {
            const text = exportTabs(cards);
            try {
              if (Platform.OS === 'web') {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } else {
                await Share.share({ title: deck.title, message: text });
              }
            } catch {}
          }}
        />
        <Button
          kind="secondary"
          icon="sparkle"
          label="Ask Nova"
          onPress={() => {
            setContext({ screen: 'deck', deckId: deck.id });
            useNova.getState().setOpen(true);
          }}
        />
      </View>

      {adding && (
        <CardEditor
          saveLabel="Add card"
          onCancel={() => setAdding(false)}
          onSave={(c) => {
            addCards(deck.id, [c]);
            setAdding(false);
          }}
        />
      )}

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {(['all', 'new', 'seen', 'proven', 'mastered'] as const).map((f) => {
          const n = f === 'all' ? st.total : st.counts[f];
          const on = filter === f;
          return (
            <Button key={f} small kind={on ? 'secondary' : 'ghost'} label={`${f === 'all' ? 'All' : statusLabel[f]} · ${n}`} onPress={() => setFilter(f)} accessibilityLabel={`Show ${f} cards, ${n}`} />
          );
        })}
      </View>

      <View style={{ gap: space.sm }}>
        {shown.length === 0 && <T v="small">No cards here yet.</T>}
        {shown.map((c) =>
          editing === c.id ? (
            <CardEditor
              key={c.id}
              initial={c}
              onCancel={() => setEditing(null)}
              onSave={(patch) => {
                updateCard(c.id, patch);
                setEditing(null);
              }}
            />
          ) : (
            <View key={c.id} style={{ flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: 20, backgroundColor: C.surface1, borderWidth: 1.5, borderColor: C.panelBorder, boxShadow: `0 3px 0 ${C.panelShadow}`, marginBottom: 3, alignItems: 'flex-start' }}>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <T v="bodyStrong">{c.front}</T>
                <T v="small">{c.back}</T>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {(() => {
                    const s = states[c.id];
                    const status = cardStatus(s);
                    return (
                      <>
                        <Pill label={statusLabel[status]} tint={statusTone[status].tint} bg={statusTone[status].bg} />
                        {isDue(s) ? <Pill icon="clock" label="Due now" tint={C.berryInk} bg={C.berrySoft} /> : s?.seen ? <Pill icon="clock" label={`Review ${relDue(s.due)}`} /> : null}
                        {c.source?.page ? <Pill icon="doc" label={`p. ${c.source.page}`} /> : null}
                      </>
                    );
                  })()}
                </View>
              </View>
              <IconButton icon="edit" label={`Edit card: ${c.front}`} size={38} onPress={() => { setEditing(c.id); setAdding(false); }} />
              <IconButton icon="trash" label={`Delete card: ${c.front}`} size={38} tint={C.coral} onPress={() => deleteCard(c.id)} />
            </View>
          ),
        )}
      </View>

      <View style={{ marginTop: space.xl, gap: space.sm }}>
        {confirmDelete ? (
          <Panel style={{ gap: space.md, borderColor: C.berry, backgroundColor: C.berrySoft }}>
            <T v="bodyStrong">Delete “{deck.title}” and its {cards.length} cards?</T>
            <T v="small">This removes the deck and its review history. It can’t be undone.</T>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button kind="danger" icon="trash" label="Delete deck" onPress={() => { deleteDeck(deck.id); goBackOr('/library'); }} />
              <Button kind="ghost" label="Keep it" onPress={() => setConfirmDelete(false)} />
            </View>
          </Panel>
        ) : (
          <Button kind="ghost" small icon="trash" label="Delete deck" onPress={() => setConfirmDelete(true)} />
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Icon name="info" size={14} color={C.textFaint} />
        <T v="caption" style={{ color: C.textFaint }}>Deleting a single card happens right away.</T>
      </View>
    </Screen>
    {showTest && <TestSheet deckId={deck.id} intro={test === '1' ? 'Your deck is ready' : undefined} onClose={() => setShowTest(false)} />}
    </View>
  );
}
