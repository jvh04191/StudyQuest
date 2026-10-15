import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, View, type ViewStyle } from 'react-native';

import { NovaOrb } from '@/components/art/NovaOrb';
import { goBackOr } from '@/components/map/TopicSheet';
import { CardEditor } from '@/components/study/CardEditor';
import { Icon } from '@/components/ui/Icon';
import { Button, Field, IconButton, Panel, Pill, Segmented, T } from '@/components/ui/primitives';
import { Screen } from '@/components/ui/Screen';
import { fetchPage, generateStudySet, quickExtract } from '@/lib/ai';
import { Bar } from '@/components/ui/primitives';
import { parseImport } from '@/lib/transfer';
import { landName } from '@/lib/world';
import { useNova } from '@/store/novaStore';
import { useStore, type DraftCard } from '@/store/useStore';
import { color as C, font, radius, size, space } from '@/theme/tokens';

type Source = 'notes' | 'pdf' | 'link' | 'manual' | 'import';
interface Draft extends DraftCard {
  keep: boolean;
}

async function readPdfBase64(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (Platform.OS === 'web') {
    const b = (asset as { base64?: string }).base64;
    if (b) return b.includes(',') ? b.split(',')[1] : b;
    if (asset.file) {
      const buf = await asset.file.arrayBuffer();
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    }
    throw new Error('Could not read that file.');
  }
  return new File(asset.uri).base64();
}

export default function Create() {
  const params = useLocalSearchParams<{ subject?: string }>();
  const subjects = useStore((s) => s.subjects);
  const addSubject = useStore((s) => s.addSubject);
  const addDeck = useStore((s) => s.addDeck);
  const ai = useNova((s) => s.ai);
  const setContext = useNova((s) => s.setContext);
  useFocusEffect(useCallback(() => setContext({ screen: 'create' }), [setContext]));

  const [subjectId, setSubjectId] = useState<string>(params.subject ?? subjects[0]?.id ?? '');
  const [newSubject, setNewSubject] = useState('');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState<Source>('notes');
  const [notes, setNotes] = useState('');
  const [pdf, setPdf] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [count, setCount] = useState<'auto' | '10' | '20' | '30' | '50'>('auto');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [summary, setSummary] = useState('');
  const [origin, setOrigin] = useState<'ai' | 'rules' | 'manual' | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [addingManual, setAddingManual] = useState(false);
  const [pasted, setPasted] = useState('');
  const [url, setUrl] = useState('');

  const loadLink = async () => {
    setError(null);
    setBusy('Reading that page…');
    try {
      const p = await fetchPage(url.trim());
      setNotes(p.text);
      if (!title.trim() && p.title) setTitle(p.title.slice(0, 60));
      setSource('notes');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that page.');
    } finally {
      setBusy(null);
    }
  };

  const readImport = () => {
    setError(null);
    const cards = parseImport(pasted);
    if (!cards.length) {
      setError('No cards were found. Each line needs a question and an answer separated by a tab or a comma.');
      return;
    }
    setDrafts(cards.map((c) => ({ ...c, keep: true })));
    setSummary('');
    setOrigin('manual');
  };

  const subjectName = subjects.find((s) => s.id === subjectId)?.name ?? newSubject;

  const generate = async () => {
    setError(null);
    setBusy(source === 'pdf' ? 'Nova is reading your PDF. Longer files can take a minute…' : 'Nova is turning your notes into cards…');
    try {
      const res =
        source === 'pdf'
          ? await generateStudySet({ mode: 'pdf', pdfBase64: await readPdfBase64(pdf!), fileName: pdf!.name, subject: subjectName, deckTitle: title, count: count === 'auto' ? 'auto' : Number(count) })
          : await generateStudySet({ mode: 'notes', text: notes, subject: subjectName, deckTitle: title, count: count === 'auto' ? 'auto' : Number(count) });
      if (!res.cards.length) throw new Error('No cards came back. Try adding more detail to your material.');
      setDrafts(res.cards.map((c) => ({ ...c, keep: true })));
      setSummary(res.summary);
      if (!title.trim() && res.title) setTitle(res.title);
      setOrigin('ai');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const extract = () => {
    setError(null);
    const cards = quickExtract(notes);
    if (!cards.length) {
      setError('No “term: definition” or “X is Y.” lines were found. Try formatting notes that way, or write cards yourself.');
      return;
    }
    setDrafts(cards.map((c) => ({ ...c, keep: true })));
    setSummary('');
    setOrigin('rules');
  };

  const pickPdf = async () => {
    setError(null);
    const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (r.canceled) return;
    const a = r.assets[0];
    if (a.size && a.size > 20 * 1024 * 1024) {
      setError('That PDF is over 20 MB. Try a smaller file or split it.');
      return;
    }
    setPdf(a);
    if (!title.trim()) setTitle(a.name.replace(/\.pdf$/i, ''));
  };

  const kept = drafts.filter((d) => d.keep);
  const canSave = (subjectId || newSubject.trim()) && title.trim() && kept.length > 0;

  const save = () => {
    let sid = subjectId;
    if (!sid) sid = addSubject(newSubject).id;
    const deck = addDeck({
      subjectId: sid,
      title,
      summary: summary.trim() || undefined,
      source:
        source === 'pdf' && pdf
          ? { kind: 'pdf', title: pdf.name }
          : origin === 'manual'
            ? { kind: 'manual' }
            : { kind: 'notes', title: 'Pasted notes', text: notes.trim().slice(0, 30000) },
      cards: kept.map(({ keep: _k, ...c }) => c),
    });
    router.replace({ pathname: '/deck/[id]', params: { id: deck.id, test: '1' } });
  };

  return (
    <Screen maxWidth={820}>
      <Button kind="ghost" small icon="chevronLeft" label="Back" onPress={() => goBackOr('/library')} />
      <View style={{ gap: 4 }}>
        <T v="eyebrow" style={{ color: C.textFaint }}>Library</T>
        <T v="title" accessibilityRole="header">Brew a new deck</T>
        <T v="small">Add your material, review the cards, then save. Nothing is saved until you choose to.</T>
      </View>

      <Panel style={{ gap: space.lg }}>
        <T v="heading">1. Which land?</T>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {subjects.map((s) => {
            const on = s.id === subjectId;
            return (
              <Pressable
                key={s.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setSubjectId(s.id)}
                style={({ focused }: { pressed: boolean; focused?: boolean }) => [
                  { flexDirection: 'row', alignItems: 'center', gap: 8, height: 42, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1.5, borderColor: on ? C.moss : C.panelBorder, backgroundColor: on ? C.mossSoft : C.surface1 },
                  focused && ({ outlineColor: C.moss, outlineWidth: 2, outlineStyle: 'solid' } as ViewStyle),
                ]}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
                <T v="bodyStrong" style={{ fontSize: size.sm }}>{landName(s, subjects.indexOf(s))}</T>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: !subjectId }}
            onPress={() => setSubjectId('')}
            style={{ height: 42, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1.5, borderColor: !subjectId ? C.moss : C.lineStrong, backgroundColor: !subjectId ? C.mossSoft : 'transparent', borderStyle: 'dashed', justifyContent: 'center' }}>
            <T v="bodyStrong" style={{ fontSize: size.sm }}>New land</T>
          </Pressable>
        </View>
        {!subjectId && <Field label="Name of the new land" value={newSubject} onChangeText={setNewSubject} placeholder="e.g. Chemistry" />}
        <Field label="Deck title" value={title} onChangeText={setTitle} placeholder="e.g. The Krebs Cycle" />
      </Panel>

      <Panel style={{ gap: space.lg }}>
        <T v="heading">2. Your material</T>
        <Segmented<Source>
          label="Material type"
          value={source}
          onChange={(v) => {
            setSource(v);
            setError(null);
          }}
          options={[
            { value: 'notes', label: 'Notes', icon: 'doc' },
            { value: 'pdf', label: 'PDF', icon: 'upload' },
            { value: 'link', label: 'Link', icon: 'doc' },
            { value: 'manual', label: 'By hand', icon: 'pen' },
            { value: 'import', label: 'Import', icon: 'upload' },
          ]}
        />

        {ai === 'off' && source !== 'manual' && source !== 'import' && source !== 'link' && (
          <View style={{ flexDirection: 'row', gap: 10, padding: space.md, borderRadius: radius.md, backgroundColor: C.goldSoft }}>
            <Icon name="info" size={18} color={C.gold} />
            <T v="small" style={{ flex: 1, color: C.text }}>
              {source === 'pdf'
                ? 'Reading PDFs needs the AI connection, which is off. Add a Gemini or Claude API key to the .env file on the computer running Expo, or paste the text as notes instead.'
                : 'AI generation is off. You can still use Quick extract, which pulls cards from “term: definition” lines using simple rules (not AI).'}
            </T>
          </View>
        )}

        {source === 'link' && (
          <View style={{ gap: space.md }}>
            <T v="small">Paste the address of an article, Wikipedia page or study guide. Nova reads the text, then you can brew cards from it. Pages that need a login can’t be read.</T>
            <Field label="Web address" value={url} onChangeText={setUrl} placeholder="https://en.wikipedia.org/wiki/Mitosis" autoCapitalize="none" autoCorrect={false} />
            <Button icon="upload" label="Read this page" disabled={url.trim().length < 4 || !!busy} onPress={loadLink} />
          </View>
        )}

        {source === 'import' && (
          <View style={{ gap: space.md }}>
            <T v="small">Paste cards from Quizlet (Export), Anki (Notes in Plain Text), a spreadsheet CSV, or copied out of Gizmo. Gizmo has no export button, so open the deck there, select the cards and copy them. Use one card per line (question, then answer, separated by a tab or comma), or one card per block with the question on the first line and the answer under it. No AI needed.</T>
            <Field value={pasted} onChangeText={setPasted} multiline inputStyle={{ minHeight: 200 }} accessibilityLabel="Cards to import" placeholder={'Osmosis\tMovement of water across a membrane\nMitosis\tCell division that makes identical cells'} />
            <Button icon="check" label="Read cards" disabled={pasted.trim().length < 3} onPress={readImport} />
          </View>
        )}

        {source !== 'manual' && source !== 'import' && source !== 'link' && ai === 'on' && (
          <View style={{ gap: space.sm }}>
            <T v="bodyStrong">How many cards</T>
            <Segmented
              label="How many cards"
              value={count}
              onChange={setCount}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: '10', label: '10' },
                { value: '20', label: '20' },
                { value: '30', label: '30' },
                { value: '50', label: '50' },
              ]}
            />
            <T v="caption">Auto makes one card for every question or key fact, so a quiz with 18 questions becomes 18 cards.</T>
          </View>
        )}

        {source === 'notes' && (
          <>
            <Field
              value={notes}
              onChangeText={setNotes}
              multiline
              inputStyle={{ minHeight: 200 }}
              accessibilityLabel="Your notes"
              placeholder={'Paste lecture notes, a textbook section or your own summary.\n\nTip: lines like “Osmosis: movement of water across a membrane” also work with Quick extract.'}
            />
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Button icon="sparkle" label="Brew cards with Nova" disabled={ai !== 'on' || notes.trim().length < 40 || !!busy} onPress={generate} />
              <Button kind="secondary" label="Quick extract (not AI)" disabled={notes.trim().length < 10 || !!busy} onPress={extract} />
            </View>
            {notes.trim().length > 0 && notes.trim().length < 40 && ai === 'on' && <T v="caption">Add a few more sentences so Nova has enough to work with.</T>}
          </>
        )}

        {source === 'pdf' && (
          <View style={{ gap: space.md }}>
            {pdf ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: C.surface2 }}>
                <Icon name="doc" size={22} color={C.teal} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T v="bodyStrong" numberOfLines={1}>{pdf.name}</T>
                  <T v="caption">{pdf.size ? `${(pdf.size / 1024 / 1024).toFixed(1)} MB` : 'PDF'} · not processed yet</T>
                </View>
                <IconButton icon="close" label="Remove PDF" size={36} onPress={() => setPdf(null)} />
              </View>
            ) : (
              <Button kind="secondary" icon="upload" label="Choose a PDF" onPress={pickPdf} />
            )}
            <Button icon="sparkle" label="Brew cards with Nova" disabled={ai !== 'on' || !pdf || !!busy} onPress={generate} />
          </View>
        )}

        {source === 'manual' && (
          <View style={{ gap: space.md }}>
            {addingManual ? (
              <CardEditor
                saveLabel="Add to draft"
                onCancel={() => setAddingManual(false)}
                onSave={(c) => {
                  setDrafts((d) => [...d, { ...c, keep: true }]);
                  setOrigin('manual');
                  setAddingManual(false);
                }}
              />
            ) : (
              <Button kind="secondary" icon="plus" label={drafts.length ? 'Add another card' : 'Write a card'} onPress={() => setAddingManual(true)} />
            )}
          </View>
        )}

        {busy && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: C.surface2 }} accessibilityLiveRegion="polite">
            <NovaOrb size={52} mood="thinking" styleId="ember" />
            <View style={{ flex: 1, gap: 8 }}>
              <T v="body">{busy}</T>
              <BrewBar />
            </View>
          </View>
        )}
        {error && (
          <View style={{ flexDirection: 'row', gap: 10, padding: space.md, borderRadius: radius.md, backgroundColor: C.coralSoft }} accessibilityLiveRegion="assertive">
            <Icon name="info" size={18} color={C.coral} />
            <T v="small" style={{ flex: 1, color: C.text }}>{error}</T>
          </View>
        )}
      </Panel>

      {drafts.length > 0 && (
        <Panel style={{ gap: space.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, flexWrap: 'wrap' }}>
            <T v="heading">3. Review before saving</T>
            {origin === 'ai' && <Pill icon="sparkle" label="Made by Nova (AI)" tint={C.teal} bg={C.tealSoft} />}
            {origin === 'rules' && <Pill label="Quick extract · not AI" tint={C.gold} bg={C.goldSoft} />}
          </View>
          {origin !== 'manual' && (
            <Field label="Summary" value={summary} onChangeText={setSummary} multiline inputStyle={{ minHeight: 90 }} placeholder="Optional summary shown on the deck page" />
          )}
          <T v="small">Uncheck any card you don’t want. Tap edit to fix wording before saving.</T>
          {drafts.map((d, i) =>
            editing === i ? (
              <CardEditor
                key={i}
                initial={d}
                onCancel={() => setEditing(null)}
                onSave={(c) => {
                  setDrafts((all) => all.map((x, j) => (j === i ? { ...x, ...c } : x)));
                  setEditing(null);
                }}
              />
            ) : (
              <View key={i} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start', padding: space.md, borderRadius: radius.md, backgroundColor: d.keep ? C.surface2 : 'transparent', borderWidth: 1, borderColor: C.panelBorder, opacity: d.keep ? 1 : 0.55 }}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: d.keep }}
                  accessibilityLabel={`Keep card: ${d.front}`}
                  onPress={() => setDrafts((all) => all.map((x, j) => (j === i ? { ...x, keep: !x.keep } : x)))}
                  hitSlop={10}
                  style={{ width: 26, height: 26, borderRadius: 7, borderWidth: 1.5, borderColor: d.keep ? C.teal : C.lineStrong, backgroundColor: d.keep ? C.teal : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                  {d.keep && <Icon name="check" size={16} color={C.onAccent} strokeWidth={2.6} />}
                </Pressable>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <T v="bodyStrong">{d.front}</T>
                  <T v="small">{d.back}</T>
                  {d.source?.quote || d.source?.page ? (
                    <T v="caption" style={{ fontFamily: font.body }}>
                      {d.source.page ? `p. ${d.source.page} · ` : ''}
                      {d.source.quote ? `“${d.source.quote}”` : ''}
                    </T>
                  ) : null}
                </View>
                <IconButton icon="edit" label={`Edit card: ${d.front}`} size={36} onPress={() => setEditing(i)} />
              </View>
            ),
          )}
          <Button icon="check" label={`Save deck · ${kept.length} card${kept.length === 1 ? '' : 's'}`} disabled={!canSave} onPress={save} />
          {!title.trim() && <T v="caption">Add a deck title to save.</T>}
        </Panel>
      )}
    </Screen>
  );
}

/** Indeterminate progress while Nova brews: a moss bar that keeps creeping forward. */
function BrewBar() {
  const [v, setV] = useState(0.08);
  useEffect(() => {
    const t = setInterval(() => setV((x) => (x >= 0.92 ? 0.92 : x + (1 - x) * 0.06)), 600);
    return () => clearInterval(t);
  }, []);
  return <Bar value={v} height={10} />;
}
