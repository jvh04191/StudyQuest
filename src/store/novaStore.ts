import { create } from 'zustand';

import type { NovaMood } from '@/components/art/NovaOrb';
import { askNova, fetchAiStatus, generateStudySet } from '@/lib/ai';
import { levelFromXp } from '@/lib/progression';
import { deckStats } from '@/lib/srs';
import { checkTyped, shuffle, uid } from '@/lib/util';
import type { ID, ItemMode } from './types';
import { useStore, type DraftCard } from './useStore';

export type NovaAction = 'simple' | 'hint' | 'quiz' | 'walk' | 'example' | 'cards' | 'missed';

export interface NovaMsg {
  id: string;
  role: 'user' | 'nova';
  text: string;
  tag?: 'ai' | 'demo' | 'error';
  cards?: DraftCard[];
  cardsDeckId?: ID;
  cardsSaved?: boolean;
}

export interface NovaContext {
  screen: 'home' | 'library' | 'deck' | 'study' | 'map' | 'player' | 'create';
  deckId?: ID;
  cardId?: ID;
  mode?: ItemMode;
  answerVisible?: boolean;
  position?: string;
}

interface NovaState {
  open: boolean;
  ai: 'checking' | 'on' | 'off';
  busy: boolean;
  mood: NovaMood;
  messages: NovaMsg[];
  context: NovaContext;
  demoQuizCard?: ID;
  setOpen: (o: boolean) => void;
  setContext: (c: NovaContext) => void;
  checkAi: () => Promise<void>;
  celebrate: () => void;
  send: (text: string, action?: NovaAction) => Promise<void>;
  saveCards: (msgId: string) => void;
  removeDraftCard: (msgId: string, index: number) => void;
  clear: () => void;
}

const LABEL: Record<NovaAction, string> = {
  simple: 'Explain this simply',
  hint: 'Give me a hint',
  quiz: 'Quiz me',
  walk: 'Walk me through it',
  example: 'Give me an example',
  cards: 'Turn this explanation into flashcards',
  missed: 'Help me practice what I missed',
};
export const actionLabel = LABEL;

let moodTimer: ReturnType<typeof setTimeout> | undefined;

function gatherContext(ctx: NovaContext) {
  const s = useStore.getState();
  const deck = ctx.deckId ? s.decks.find((d) => d.id === ctx.deckId) : undefined;
  const card = ctx.cardId ? s.cards[ctx.cardId] : undefined;
  const recentMissed = [...new Set(s.history.slice(0, 4).flatMap((h) => h.missed))];
  const activeMissed = s.active?.results.filter((r) => !r.correct).map((r) => r.cardId) ?? [];
  const mistakes = [...new Set([...activeMissed, ...recentMissed])]
    .map((id) => s.cards[id])
    .filter(Boolean)
    .slice(0, 5);
  return {
    deck,
    card,
    mistakes,
    payload: {
      learnerLevel: levelFromXp(s.player.xp),
      deck: deck
        ? {
            title: deck.title,
            summary: deck.summary,
            mastery: deckStats(deck, s.cards, s.cardStates).mastery,
            sourceKind: deck.source.kind,
            sourceTitle: deck.source.title,
            sourceText: deck.source.text,
          }
        : undefined,
      card: card
        ? {
            front: card.front,
            back: card.back,
            detail: card.detail,
            hint: card.hint,
            source: card.source,
            answerVisible: !!ctx.answerVisible,
            mode: ctx.mode,
          }
        : undefined,
      mistakes: mistakes.map((m) => ({ front: m.front, back: m.back })),
    },
  };
}

export const useNova = create<NovaState>()((set, get) => ({
  open: false,
  ai: 'checking',
  busy: false,
  mood: 'idle',
  messages: [],
  context: { screen: 'home' },

  setOpen: (open) => set({ open }),
  setContext: (context) => {
    const prev = get().context;
    if (
      prev.screen === context.screen &&
      prev.deckId === context.deckId &&
      prev.cardId === context.cardId &&
      prev.answerVisible === context.answerVisible &&
      prev.position === context.position &&
      prev.mode === context.mode
    )
      return;
    set({ context });
  },
  checkAi: async () => {
    set({ ai: 'checking' });
    const on = await fetchAiStatus();
    set({ ai: on ? 'on' : 'off' });
  },
  celebrate: () => {
    clearTimeout(moodTimer);
    set({ mood: 'celebrating' });
    moodTimer = setTimeout(() => set({ mood: 'idle' }), 2600);
  },
  clear: () => set({ messages: [], demoQuizCard: undefined }),

  send: async (rawText, action) => {
    const st = get();
    if (st.busy) return;
    const text = rawText.trim() || (action ? LABEL[action] : '');
    if (!text) return;
    const userMsg: NovaMsg = { id: uid('m'), role: 'user', text };
    set({ messages: [...st.messages, userMsg], busy: true, mood: 'thinking' });
    const { deck, card, mistakes, payload } = gatherContext(st.context);
    const push = (m: Omit<NovaMsg, 'id' | 'role'>) => {
      clearTimeout(moodTimer);
      set((s) => ({ messages: [...s.messages, { id: uid('m'), role: 'nova', ...m }], busy: false, mood: 'explaining' }));
      moodTimer = setTimeout(() => set({ mood: 'idle' }), 2200);
    };

    try {
      if (action === 'cards') {
        const lastNova = [...st.messages].reverse().find((m) => m.role === 'nova' && m.tag === 'ai');
        const material = lastNova?.text ?? (card ? `${card.front}\n${card.back}\n${card.detail}` : deck?.summary);
        if (st.ai !== 'on') {
          push({ tag: 'demo', text: 'Turning explanations into flashcards needs the AI connection, which is off right now. You can still add cards by hand from the deck page.' });
          return;
        }
        if (!material || !deck) {
          push({ tag: 'demo', text: 'Open a deck or ask me to explain something first, then I can turn that explanation into cards for the deck.' });
          return;
        }
        const res = await generateStudySet({ mode: 'explanation', text: material, deckTitle: deck.title, count: 4 });
        push({
          tag: 'ai',
          text: `Here are ${res.cards.length} cards from ${lastNova ? 'my last explanation' : 'this card'}. Remove any you don’t want, then add them to ${deck.title}.`,
          cards: res.cards,
          cardsDeckId: deck.id,
        });
        return;
      }

      if (st.ai === 'on') {
        const history = [...st.messages, userMsg].map((m) => ({ role: m.role, text: m.text }));
        const res = await askNova({ action, messages: history, context: payload });
        push({ tag: 'ai', text: res.reply });
        return;
      }

      // ----- Demo mode: answers come only from the card and deck data, never invented. -----
      if (st.demoQuizCard && !action) {
        const qc = useStore.getState().cards[st.demoQuizCard];
        set({ demoQuizCard: undefined });
        if (qc) {
          const verdict = checkTyped(text, [qc.back, ...qc.aliases]);
          push({
            tag: 'demo',
            text:
              verdict === 'wrong'
                ? `Not quite. The answer is **${qc.back}**. ${qc.detail}`
                : `${verdict === 'exact' ? 'Correct!' : 'Close enough — check the spelling.'} **${qc.back}**. ${qc.detail}`,
          });
          return;
        }
      }
      switch (action) {
        case 'hint':
          push({
            tag: 'demo',
            text: card?.hint ? `Hint from your card: ${card.hint}` : card ? 'This card has no saved hint. Try recalling what the question’s key term reminds you of.' : 'Open a question in a quest and I can show its hint.',
          });
          return;
        case 'simple':
        case 'walk':
          if (card && !st.context.answerVisible) {
            push({ tag: 'demo', text: `I’ll keep the answer hidden for now. ${card.hint ? `Here’s a nudge: ${card.hint}` : ''} Answer the question, then ask again and I’ll show the full explanation saved on the card.` });
          } else if (card) {
            push({ tag: 'demo', text: `From the card: **${card.back}**. ${card.detail}${deck?.summary ? `\n\nTopic overview: ${deck.summary}` : ''}` });
          } else if (deck?.summary) {
            push({ tag: 'demo', text: `Overview of ${deck.title}: ${deck.summary}` });
          } else {
            push({ tag: 'demo', text: 'Choose a deck or start a quest, and I can show its explanations.' });
          }
          return;
        case 'example':
          push({ tag: 'demo', text: `Writing new examples needs the AI connection, which is off. ${card?.detail ? `Here’s what your card says: ${card.detail}` : ''}` });
          return;
        case 'quiz': {
          const s = useStore.getState();
          const pool = Object.values(s.cards).filter((c) => (deck ? c.deckId === deck.id : s.cardStates[c.id]?.seen));
          const pick = shuffle(pool)[0];
          if (!pick) {
            push({ tag: 'demo', text: 'There are no cards to quiz you on yet.' });
            return;
          }
          set({ demoQuizCard: pick.id });
          push({ tag: 'demo', text: `${pick.front}\n\nType your answer below.` });
          return;
        }
        case 'missed':
          push({
            tag: 'demo',
            text: mistakes.length
              ? `You recently missed:\n${mistakes.map((m) => `- ${m.front} → **${m.back}**`).join('\n')}\n\nUse “Practice what you missed” on the home screen to run these as a quest.`
              : 'You have no recent mistakes. Nice work.',
          });
          return;
        default:
          push({
            tag: 'demo',
            text: 'My AI connection is off, so I can’t answer open questions yet. I can still give hints, show card explanations and quiz you from your decks. To turn on AI, add a Gemini or Claude API key to the project’s .env file and restart Expo.',
          });
      }
    } catch (e) {
      clearTimeout(moodTimer);
      set((s) => ({
        busy: false,
        mood: 'idle',
        messages: [...s.messages, { id: uid('m'), role: 'nova', tag: 'error', text: e instanceof Error ? e.message : 'Something went wrong. Try again.' }],
      }));
    }
  },

  saveCards: (msgId) => {
    const m = get().messages.find((x) => x.id === msgId);
    if (!m?.cards?.length || !m.cardsDeckId || m.cardsSaved) return;
    useStore.getState().addCards(m.cardsDeckId, m.cards);
    set((s) => ({ messages: s.messages.map((x) => (x.id === msgId ? { ...x, cardsSaved: true } : x)) }));
  },
  removeDraftCard: (msgId, index) =>
    set((s) => ({
      messages: s.messages.map((x) => (x.id === msgId && x.cards ? { ...x, cards: x.cards.filter((_, i) => i !== index) } : x)),
    })),
}));
