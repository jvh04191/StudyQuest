import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hardenChoices } from '@/lib/ai';
import { startQuest } from '@/components/map/TopicSheet';
import { useLayoutMode } from '@/components/shell/AppShell';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Button, IconButton, Segmented, T } from '@/components/ui/primitives';
import { useCalmMotion } from '@/lib/feedback';
import type { TestMode } from '@/store/types';
import { useStore } from '@/store/useStore';
import { color as C, font, space } from '@/theme/tokens';

const MODES: { id: TestMode; icon: IconName; title: string; desc: string }[] = [
  { id: 'mc', icon: 'target', title: 'Multiple choice', desc: 'Pick the right answer from four options.' },
  { id: 'typed', icon: 'pen', title: 'Active recall', desc: 'Type the answer from memory. The best way to make it stick.' },
  { id: 'tf', icon: 'check', title: 'True or false', desc: 'Decide whether the answer shown for each question is right.' },
  { id: 'blank', icon: 'edit', title: 'Fill in the blank', desc: 'Complete the sentence from memory. Cards without a matching sentence are asked as recall.' },
  { id: 'free', icon: 'sparkle', title: 'Written answers', desc: 'Explain in your own words and Nova grades the meaning. Needs the AI.' },
  { id: 'flash', icon: 'cards', title: 'Flashcards', desc: 'Flip each card and rate how well you knew it.' },
  { id: 'mixed', icon: 'refresh', title: 'Mixed', desc: 'Cycles through choices, true/false, recall and fill-in-the-blank, like a real exam.' },
];

/**
 * Practice test: ask for the whole deck (or part of it) in a chosen style.
 * Tests don't cost hearts; every miss comes back later in the same test.
 */
export function TestSheet({ deckId, onClose, intro }: { deckId: string; onClose: () => void; intro?: string }) {
  const deck = useStore((s) => s.decks.find((d) => d.id === deckId));
  const total = useStore((s) => Object.values(s.cards).filter((c) => c.deckId === deckId).length);
  const withChoices = useStore((s) => Object.values(s.cards).filter((c) => c.deckId === deckId && c.distractors.filter(Boolean).length >= 2).length);
  const [mode, setMode] = useState<TestMode>('mixed');
  const [count, setCount] = useState<'10' | '20' | 'all'>('all');
  const [hard, setHard] = useState(true);
  const [mins, setMins] = useState<'0' | '5' | '10' | '20'>('0');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const { rail } = useLayoutMode();
  const insets = useSafeAreaInsets();
  const calm = useCalmMotion();
  if (!deck) return null;

  const n = count === 'all' ? total : Math.min(total, Number(count));
  const noChoices = (mode === 'mc' || mode === 'mixed') && withChoices < total;
  const usesChoices = mode === 'mc' || mode === 'mixed' || mode === 'tf';

  const begin = async () => {
    if (usesChoices && hard && !err) {
      const st = useStore.getState();
      const todo = Object.values(st.cards).filter((c) => c.deckId === deckId && !c.hardChoices);
      if (todo.length) {
        setBusy(true);
        try {
          for (let i = 0; i < todo.length; i += 25) {
            const { choices } = await hardenChoices(todo.slice(i, i + 25).map((c) => ({ id: c.id, front: c.front, back: c.back })));
            useStore.getState().setHardChoices(choices);
          }
        } catch (e) {
          setBusy(false);
          setErr(e instanceof Error ? e.message : 'Could not make the choices trickier.');
          return;
        }
        setBusy(false);
      }
    }
    onClose();
    startQuest('test', { deckIds: [deckId], testMode: mode, count: count === 'all' ? undefined : Number(count), minutes: Number(mins) || undefined });
  };

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: rail ? 'center' : 'flex-end', alignItems: 'center', zIndex: 50 }}>
      <Animated.View entering={calm ? undefined : FadeIn.duration(160)} exiting={calm ? undefined : FadeOut.duration(140)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: C.scrim }} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        entering={calm ? undefined : SlideInDown.duration(300)}
        exiting={calm ? undefined : SlideOutDown.duration(180)}
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '92%',
          backgroundColor: C.surface1,
          borderRadius: 28,
          borderBottomLeftRadius: rail ? 28 : 0,
          borderBottomRightRadius: rail ? 28 : 0,
          borderWidth: 1.5,
          borderColor: C.panelBorder,
          padding: space.xl,
          paddingBottom: space.xl + (rail ? 0 : insets.bottom),
          gap: space.lg,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}>
            <T v="eyebrow" style={{ color: C.textFaint }}>{intro ?? 'Practice test'}</T>
            <T v="title" style={{ fontSize: 24, lineHeight: 29 }}>Test yourself</T>
            <T v="small">{deck.title} · {total} cards</T>
          </View>
          <IconButton icon="close" label="Close" onPress={onClose} size={40} />
        </View>

        <ScrollView style={{ flexShrink: 1, minHeight: 120 }} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {MODES.map((m) => {
            const on = m.id === mode;
            return (
              <Pressable
                key={m.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setMode(m.id)}
                style={({ focused }: { pressed: boolean; focused?: boolean }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: on ? C.moss : C.panelBorder,
                    backgroundColor: on ? C.mossSoft : C.surface1,
                    boxShadow: `0 3px 0 ${on ? C.mossLine2 : C.panelShadow}`,
                    marginBottom: 3,
                  },
                  focused && { outlineColor: C.moss, outlineWidth: 2, outlineStyle: 'solid' as const },
                ]}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: on ? C.moss : C.bgDeep, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={m.icon} size={20} color={on ? '#FFFFFF' : C.textMuted} strokeWidth={2.1} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.bodyBold, fontSize: 15, color: on ? C.mossInk : C.text }}>{m.title}</Text>
                  <Text style={{ fontFamily: font.body, fontSize: 12.5, lineHeight: 17, color: C.textMuted }}>{m.desc}</Text>
                </View>
                {on && <Icon name="check" size={20} color={C.moss} strokeWidth={2.6} />}
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: C.textMuted }}>How many questions</Text>
          <Segmented<'10' | '20' | 'all'>
            label="How many questions"
            value={count}
            onChange={setCount}
            options={[
              { value: '10', label: '10' },
              { value: '20', label: '20' },
              { value: 'all', label: `All ${total}` },
            ]}
          />
        </View>

        {noChoices && (
          <T v="caption" style={{ color: C.honeyInk }}>
            {total - withChoices} of {total} cards have no wrong answers to choose from, so those are asked as recall instead.
          </T>
        )}

        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: C.textMuted }}>Time limit</Text>
          <Segmented<'0' | '5' | '10' | '20'>
            label="Time limit"
            value={mins}
            onChange={setMins}
            options={[
              { value: '0', label: 'None' },
              { value: '5', label: '5 min' },
              { value: '10', label: '10 min' },
              { value: '20', label: '20 min' },
            ]}
          />
        </View>

        {usesChoices && (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: hard }}
            onPress={() => { setHard(!hard); setErr(''); }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 26, borderRadius: 13, padding: 3, backgroundColor: hard ? C.moss : C.bgDeep, alignItems: hard ? 'flex-end' : 'flex-start' }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: C.text }}>Hard choices</Text>
              <Text style={{ fontFamily: font.body, fontSize: 12.5, lineHeight: 17, color: C.textMuted }}>Wrong answers are near-misses that look like the right one. Uses the AI once per deck.</Text>
            </View>
          </Pressable>
        )}

        {err ? <T v="caption" style={{ color: C.berry }}>{err} You can start with the normal choices instead.</T> : null}

        <Button
          full
          icon="play"
          label={busy ? 'Making the choices trickier…' : err ? 'Start with normal choices' : `Start test · ${n} question${n === 1 ? '' : 's'}`}
          disabled={!total || busy}
          onPress={begin}
        />
        <T v="caption" style={{ textAlign: 'center' }}>No hearts are lost in a test. Anything you miss comes back before it ends.</T>
      </Animated.View>
    </View>
  );
}
