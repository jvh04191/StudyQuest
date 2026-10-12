# StudyQuest

Game-like AI study app (inspired by Gizmo) built with Expo SDK 57 / React Native 0.86 and expo-router. Owner: Jason. He runs it on an iPad through Expo Go, served from a Windows PC (`npx expo start`, same Wi-Fi). See `AGENTS.md` for Expo rules (check versioned Expo docs before touching Expo APIs; use `npx expo install` for packages).

## Design: cozy RPG (redesigned from the night-sky look)
Warm parchment + moss green, chunky "press-down" buttons (`boxShadow: 0 4px 0 <lip>`), Young Serif display / Nunito UI / Pixelify Sans numbers. Tokens in `src/theme/tokens.ts` (legacy names like `teal`/`gold`/`coral` are aliases of moss/honey/berry, so prefer `moss`, `honey`, `berry`). Reference: the handoff design bundle (`design_handoff_studyquest_cozy`, HTML mockups). Nova is a leaf-capped lantern sprite (`NovaOrb`); the boss is `FogBoss`.

## Hearts, acorns, chests (new mechanics)
- Player has `hearts` (max 5), `restEndsAt`, `acorns`, `found` (chest cosmetics). Prefs: `heartsMode` (`wait` | `acorns` | `free` | `off`, default `acorns`) and `homeStyle` (`trail` | `board` | `hearth`).
- A quiz item finished incorrectly costs a heart (not the first wrong try). At 0 hearts a 10-minute rest starts and `/rest` shows; `skipRest()` follows the mode (30 acorns / free / none). The active quest stays saved and resumes.
- Finishing a quest (>= 4 answers with XP) pays 20 acorns and creates a treasure chest on the session record (`chest`), opened in `RewardSequence` (`openChest`). Chest-only cosmetics (`CHEST_ITEMS` in `lib/avatar.ts`: Toadstool cap, Berry cloak) are unlocked via `player.found`, not levels. Completing the last daily quest makes a bigger "trail" chest.
- Store persist version is 3 (migration adds hearts/acorns/found and recolours subjects).

## What it does
World map of "lands" (subjects), subjects and decks, notes/PDF to flashcards, flip / multiple-choice / typed questions, spaced repetition, XP and levels (separate from mastery), boss battles, daily quests, animated AI tutor "Nova" (docked panel on wide screens, tucked side tab otherwise), a full avatar creator with level-locked items, persistence, and an explicitly labeled demo mode with no faked AI.

## AI (server-side only)
- Keys live in `.env` (gitignored; copy `.env.example`). Never commit keys or expose them to the client bundle.
- `src/server/ai.ts` is the provider-neutral helper: Claude Messages API (`AI_PROVIDER=anthropic`, tool_use) or Gemini (`AI_PROVIDER=gemini`). Includes retries on 429/5xx/529, Gemini fallback models, friendly errors.
- API routes (`src/app/api/*+api.ts`: status, nova, generate) run on the Expo dev server (`web.output: "server"`). The iPad reaches them via `Constants.expoConfig.hostUri` (`src/lib/ai.ts`).
- `generate` accepts `count: number | 'auto'` (auto = up to 60 cards, one per question/fact). PDF generation timeout is 240s.
- `ANTHROPIC_BASE_URL` / `GEMINI_BASE_URL` overrides exist for testing against mock servers. Real-key paths have only been tested against stand-ins so far.

## Code layout
- `src/app/`: screens (`(tabs)/` index, map, library, player; `study`, `rest`, `create`, `deck/[id]`, `avatar`).
- `src/store/useStore.ts`: zustand + persist (AsyncStorage key `studyquest-v1`, version 2 with `migrate`). `novaStore.ts` holds Nova chat and demo-mode logic.
- `src/lib/`: `srs` (SM-2-like), `progression` (levels start at 50*L*(L-1) XP), `quests`, `avatar` (option lists and level locks), `ai` (client), `feedback`, `hooks`, `util`.
- `src/components/`: `shell/AppShell` (rail >= 700px, tab bar below, docked Nova >= 1000px, floating Nova button otherwise), `art/Avatar` (parametric SVG), `map/` (`WorldMap`, `TopicSheet`), `study/`, `nova/`, `ui/` (`primitives`, `Hearts`). Quest feedback panels render into a bottom dock via `store/dock.ts`. Land names/level titles live in `lib/world.ts`.
- XP anti-farming uses a per-day `cardXp` ledger. Card status: New / Seen / Proven / Mastered.

## Working notes
- Windows PowerShell: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` is needed once for npm. Run all commands inside the project folder.
- Web preview for testing: `npx expo start --web` (port 8081); Playwright works against it.
- Run `npx tsc --noEmit` before calling work done. `npx expo lint` and the `expo install` compatibility check need network access.
- Don't run `npm audit fix --force`.
- Do not fake AI output. Demo mode must stay clearly labeled.
