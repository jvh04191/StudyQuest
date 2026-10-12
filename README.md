# StudyQuest

A study app for iPad (and iPhone) where studying powers your progress through a constellation of topics. Built with Expo.

- **Learning map**: subjects are regions, topics are stars. They light up as you learn and turn gold once mastered.
- **Quests**: flashcards with flips, multiple-choice and typed questions, hints, a second try on every miss, and spaced review scheduling.
- **Nova**: an AI study companion that knows which question you're on and gives hints before answers.
- **Progress**: XP, levels, daily quests, boss battles, achievements, and cosmetics for your avatar and Nova.
- Starter **Biology** and **Astronomy** decks are included.

## Run it on your iPad

You need a computer (Mac or Windows) and your iPad on the same Wi-Fi.

1. On the computer, install **Node.js LTS** from https://nodejs.org.
2. On the iPad, install **Expo Go** from the App Store. Keep it updated: this project uses Expo SDK 57.
3. Open a terminal in this folder and run:
   ```
   npm install
   npx expo start
   ```
4. Point the iPad's **Camera** at the QR code in the terminal and tap the banner. StudyQuest opens in Expo Go.

If the iPad can't connect (school or work Wi-Fi often blocks it), run `npx expo start --tunnel` instead.

Keep the terminal running while you study: the computer serves the app and Nova. Your decks and progress are saved on the iPad.

## Turn on Nova's AI (optional)

Without a key, Nova runs in a clearly labeled **demo mode**. It gives hints and explanations from your saved cards and can quiz you, but it doesn't make anything up.

Nova works with **Google Gemini** or **Anthropic Claude**. To turn on full tutoring, card generation from notes, and PDF reading:

1. Get a key: Gemini at https://aistudio.google.com/apikey, or Claude at https://console.anthropic.com.
2. Copy `.env.example` to `.env`.
3. For Gemini, paste the key after `GEMINI_API_KEY=`. For Claude, set `AI_PROVIDER=anthropic` and fill in `ANTHROPIC_API_KEY=`.
4. Stop Expo (Ctrl+C) and run `npx expo start` again.

Default models are `gemini-3.8-flash` and `claude-sonnet-5-5`. Change them with `GEMINI_MODEL` or `ANTHROPIC_MODEL`.

The key is only read by the server routes in `src/app/api/` and is never bundled into the app.

## Project layout

```
src/app/(tabs)/      Home, Map, Library, Player
src/app/study.tsx    Quest session, rewards, results
src/app/deck/[id]    Deck detail and card editing
src/app/create.tsx   New deck from notes, PDF or by hand
src/app/api/         Server routes for Nova and card generation (API key stays here)
src/components/      Map, Nova, study views, art, UI kit
src/store/           Saved app state, spaced review, XP and quest logic
src/data/seed.ts     Starter Biology and Astronomy decks
```

## Later: TestFlight or the App Store

You need an Apple Developer account ($99/year). Expo's cloud builds the iPad app, so you don't need a Mac:

```
npx eas-cli@latest build -p ios
npx eas-cli@latest submit -p ios
```

A standalone build can't reach your computer, so Nova's server routes must be hosted too, for example with `npx eas-cli@latest deploy` (EAS Hosting). See https://docs.expo.dev/router/web/api-routes/.
