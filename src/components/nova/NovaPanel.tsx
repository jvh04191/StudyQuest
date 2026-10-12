import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { NovaOrb } from '@/components/art/NovaOrb';
import { Icon } from '@/components/ui/Icon';
import { Button, IconButton, Pill, T } from '@/components/ui/primitives';
import { haptic, useCalmMotion } from '@/lib/feedback';
import { actionLabel, useNova, type NovaAction, type NovaMsg } from '@/store/novaStore';
import { useStore } from '@/store/useStore';
import { color as C, font, radius, size, space } from '@/theme/tokens';

export function RichText({ text, color = C.text }: { text: string; color?: string }) {
  const lines = text.split('\n');
  return (
    <View style={{ gap: 6 }}>
      {lines.map((line, i) => {
        if (!line.trim()) return null;
        const bullet = /^\s*[-•]\s+/.test(line);
        const body = line.replace(/^\s*[-•]\s+/, '');
        const parts = body.split(/(\*\*[^*]+\*\*)/g);
        const content = (
          <Text style={{ fontFamily: font.body, fontSize: size.md - 1, lineHeight: 22, color, flex: bullet ? 1 : undefined }}>
            {parts.map((p, j) =>
              p.startsWith('**') && p.endsWith('**') ? (
                <Text key={j} style={{ fontFamily: font.bodyBold }}>
                  {p.slice(2, -2)}
                </Text>
              ) : (
                p
              ),
            )}
          </Text>
        );
        return bullet ? (
          <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
            <Text style={{ color: C.teal, fontFamily: font.bodyBold, lineHeight: 22 }}>•</Text>
            {content}
          </View>
        ) : (
          <View key={i}>{content}</View>
        );
      })}
    </View>
  );
}

function Message({ m }: { m: NovaMsg }) {
  const saveCards = useNova((s) => s.saveCards);
  const removeDraft = useNova((s) => s.removeDraftCard);
  const deckTitle = useStore((s) => (m.cardsDeckId ? s.decks.find((d) => d.id === m.cardsDeckId)?.title : undefined));
  const calm = useCalmMotion();
  const mine = m.role === 'user';
  return (
    <Animated.View
      entering={calm ? undefined : FadeInDown.duration(220)}
      style={{ alignSelf: mine ? 'flex-end' : 'stretch', maxWidth: mine ? '88%' : '100%', gap: 6 }}>
      {!mine && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: font.bodySemi, fontSize: size.xs, color: C.textMuted }}>Nova</Text>
          {m.tag === 'demo' && <Pill label="Demo · not AI" tint={C.gold} bg={C.goldSoft} style={{ height: 20 }} />}
          {m.tag === 'error' && <Pill label="Couldn’t answer" tint={C.coral} bg={C.coralSoft} style={{ height: 20 }} />}
        </View>
      )}
      <View
        style={{
          backgroundColor: mine ? C.tealSoft : m.tag === 'error' ? C.coralSoft : C.surface2,
          borderRadius: radius.lg,
          borderTopRightRadius: mine ? 6 : radius.lg,
          borderTopLeftRadius: mine ? radius.lg : 6,
          paddingHorizontal: space.lg,
          paddingVertical: space.md,
          borderWidth: 1,
          borderColor: mine ? 'rgba(56,214,198,0.25)' : C.line,
        }}>
        <RichText text={m.text} />
      </View>
      {m.cards && (
        <View style={{ gap: 8, padding: space.md, backgroundColor: C.surface1, borderRadius: radius.md, borderWidth: 1, borderColor: C.line }}>
          {m.cards.map((c, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T v="bodyStrong" style={{ fontSize: size.sm }}>{c.front}</T>
                <T v="small">{c.back}</T>
              </View>
              {!m.cardsSaved && <IconButton icon="close" label={`Remove card: ${c.front}`} size={32} onPress={() => removeDraft(m.id, i)} />}
            </View>
          ))}
          {m.cardsSaved ? (
            <Pill label={`Added to ${deckTitle ?? 'deck'}`} icon="check" tint={C.teal} bg={C.tealSoft} />
          ) : (
            <Button small icon="plus" label={`Add ${m.cards.length} to ${deckTitle ?? 'deck'}`} disabled={!m.cards.length} onPress={() => saveCards(m.id)} />
          )}
        </View>
      )}
    </Animated.View>
  );
}

export function NovaPanel({ onClose, docked }: { onClose?: () => void; docked?: boolean }) {
  const { messages, busy, mood, ai, context, send } = useNova();
  const novaStyle = useStore((s) => s.player.novaStyle);
  const deck = useStore((s) => (context.deckId ? s.decks.find((d) => d.id === context.deckId) : undefined));
  const active = useStore((s) => s.active);
  const startSession = useStore((s) => s.startSession);
  const missedCount = useStore((s) => new Set(s.history.slice(0, 5).flatMap((h) => h.missed)).size);
  const [text, setText] = useState('');
  const path = usePathname();
  const scroller = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages.length, busy]);

  const studying = context.screen === 'study' && !!context.cardId;
  const actions: NovaAction[] = studying
    ? ['hint', 'simple', 'walk', 'example', 'cards', 'quiz']
    : deck
      ? ['simple', 'quiz', 'example', 'cards', 'missed']
      : ['quiz', 'missed'];

  const runAction = (a: NovaAction) => {
    haptic('light');
    if (a === 'missed' && !(active && !active.recordId) && missedCount > 0) {
      const id = startSession('missed');
      if (id) {
        useNova.setState((s) => ({
          messages: [...s.messages, { id: `m${Date.now()}`, role: 'nova', text: `Starting a practice quest with the concepts you missed recently. I’ll be here if you want a hint.` }],
        }));
        if (!docked) onClose?.();
        if (!path.startsWith('/study')) router.push('/study');
        return;
      }
    }
    send('', a);
  };

  const submit = () => {
    if (!text.trim()) return;
    send(text);
    setText('');
  };

  const contextLine = studying
    ? `Looking at ${deck?.title ?? 'this quest'}${context.position ? ` · ${context.position}` : ''}`
    : deck
      ? `Looking at ${deck.title}`
      : 'Ask about any deck, or let me quiz you';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: C.surface1, borderLeftWidth: docked ? 1 : 0, borderColor: C.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, paddingBottom: space.md }}>
        <NovaOrb size={48} mood={busy ? 'thinking' : mood} styleId={novaStyle} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T v="heading">Nova</T>
            {ai === 'on' && <Pill label="AI tutor" tint={C.teal} bg={C.tealSoft} style={{ height: 22 }} />}
            {ai === 'off' && <Pill label="Demo mode" tint={C.gold} bg={C.goldSoft} style={{ height: 22 }} />}
            {ai === 'checking' && <Pill label="Connecting…" style={{ height: 22 }} />}
          </View>
          <T v="caption" numberOfLines={1}>{contextLine}</T>
        </View>
        {onClose && <IconButton icon={docked ? 'chevronRight' : 'close'} label={docked ? 'Tuck Nova to the side' : 'Close Nova'} onPress={onClose} size={40} />}
      </View>

      <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={{ padding: space.lg, gap: space.lg }} keyboardShouldPersistTaps="handled">
        {messages.length === 0 && (
          <View style={{ gap: space.md }}>
            <RichText
              text={
                studying
                  ? 'I can see the question you’re on. I’ll give hints before answers, so you still get the satisfaction of working it out.'
                  : 'Hi, I’m Nova. Pick an action below or ask me anything about your decks.'
              }
            />
            {ai === 'off' && (
              <View style={{ flexDirection: 'row', gap: 8, padding: space.md, borderRadius: radius.md, backgroundColor: C.goldSoft }}>
                <Icon name="info" size={18} color={C.gold} />
                <Text style={{ flex: 1, fontFamily: font.body, fontSize: size.sm, lineHeight: 20, color: C.text }}>
                  AI isn’t connected, so I’m in demo mode. My replies come only from your saved cards and are labeled. Add a Gemini or Claude API key to the .env file on the computer running Expo to turn on full tutoring.
                </Text>
              </View>
            )}
          </View>
        )}
        {messages.map((m) => (
          <Message key={m.id} m={m} />
        ))}
        {busy && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: font.bodyMedium, fontSize: size.sm, color: C.textMuted }}>Nova is thinking…</Text>
          </View>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.md, paddingBottom: space.lg, borderTopWidth: 1, borderColor: C.line }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
          {actions.map((a) => (
            <Pressable
              key={a}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => runAction(a)}
              style={({ pressed, focused }: { pressed: boolean; focused?: boolean }) => [
                {
                  height: 38,
                  paddingHorizontal: 14,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: C.lineStrong,
                  justifyContent: 'center',
                  backgroundColor: pressed ? C.surface3 : C.surface2,
                  opacity: busy ? 0.5 : 1,
                },
                focused && ({ outlineColor: C.teal, outlineWidth: 2, outlineStyle: 'solid' } as ViewStyle),
              ]}>
              <Text style={{ fontFamily: font.bodySemi, fontSize: size.sm, color: C.text }}>{actionLabel[a]}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={ai === 'on' ? 'Ask Nova anything…' : 'Answer a quiz question, or ask…'}
            placeholderTextColor={C.textFaint}
            selectionColor={C.teal}
            onSubmitEditing={submit}
            returnKeyType="send"
            accessibilityLabel="Message Nova"
            style={{
              flex: 1,
              minHeight: 46,
              maxHeight: 120,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: C.lineStrong,
              backgroundColor: C.bgDeep,
              color: C.text,
              paddingHorizontal: space.lg,
              paddingVertical: 12,
              fontFamily: font.body,
              fontSize: size.md,
            }}
            multiline={false}
          />
          <IconButton icon="send" label="Send to Nova" onPress={submit} bg={text.trim() ? C.teal : C.surface3} tint={text.trim() ? C.onAccent : C.textMuted} size={46} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
