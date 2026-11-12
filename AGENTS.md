This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md


# Project Context – Our Event Discovery App

## What We Are Building

We are developing a mobile application that helps people discover parties, clubs, nightlife, and events nearby.

The app focuses on spontaneity, real-time event discovery, and making nightlife easier to explore, especially in unfamiliar cities.

The app's brand name is "Spots". Always refer to it as "Spots".

Our primary design color is approximately `#c922ab`.

## Core App Features

### 1. Live Radar – Main Screen

The first and most important screen is an interactive radar showing nearby parties and events happening right now.

Requirements:
- Show events within a configurable radius, initially around 20–30 km.
- Display events as interactive markers on the map.
- Tapping a marker opens the event's detail page.
- Support filters such as Techno, House, Hip-Hop, Clubs, House Parties, and other event categories.
- Prioritize current and ongoing events.
- Make the interface fast, intuitive, and visually appealing.

### 2. Explore & Search – Second Screen

The second screen focuses on discovering upcoming events.

Requirements:
- Search for events by name, location, or category.
- Discover events happening this weekend, next week, or in the coming weeks.
- Filter by distance, date, and music genre.
- Display recommended upcoming events.
- Allow users to save interesting events for later.

### 3. Saved – Third Tab

The third tab ("Gemerkt") lists the events the user saved, split into upcoming and past.

### 4. Profile – Fourth Tab

The fourth tab provides simple personal account functionality.

Requirements:
- Account registration and login.
- Manage basic account settings.
- Access saved events.
- Keep profiles private and minimal.
- Do not build a social network with followers, public friend lists, or unnecessary social features.

### 5. Event Detail Pages

Every event should have its own detail page.

Requirements:
- Event title, description, location, and date.
- Music genre and event category.
- Ticket information or external ticket links.
- Current and past event media.
- Live impressions uploaded by visitors.
- Access to relevant organizer information.

### 6. Live Snaps – 24-Hour Content

Users and organizers should be able to upload spontaneous photos and short videos to event pages.

Requirements:
- Snaps remain available for 24 hours.
- Visitors can see the current atmosphere of an event.
- Support photos and short videos.
- Keep the experience lightweight and mobile-friendly.
- Include appropriate privacy and content moderation controls.

## Design Principles

- Mobile-first design.
- Modern, youthful nightlife aesthetic.
- Primary accent color: `#c922ab`.
- Dark backgrounds with clear, readable typography.
- Smooth animations without sacrificing performance.
- Clean navigation and intuitive interactions.
- Avoid cluttered screens and unnecessary functionality.

## Development Rules

- Always inspect the existing project before modifying code.
- Never assume a feature is already implemented without checking.
- Preserve working functionality when adding features.
- Follow the actual project structure and existing architecture.
- Prefer small, understandable, maintainable components.
- Explain significant architectural changes before implementing them.
- Do not install unnecessary dependencies.
- Avoid inventing event data or presenting demo data as real events.
- Handle location permissions and user privacy carefully.
- Do not publicly expose private party addresses without appropriate authorization.
- Prioritize iOS and Android compatibility.
- Use TypeScript where applicable.

## Language

- German is the primary app language. English is planned as a second language.
- There is no translation system yet. Do not introduce one (library, string files, refactor of all texts) without explaining the approach and getting approval first — it is an architectural change.
- Until then: write new user-facing texts in German, keep them short and free of slang that cannot be translated, and avoid building sentences from string fragments (so they can be translated later).
- Talk to the user in German. Commit messages and `PROJECT_STATUS.md` are German too.

## Test Data

- Local test events and test organizers exist only for development: they are clearly labeled with the prefix `TEST ·`, load only when `__DEV__` is true, and are never written to any database or shipped in a release build (see `src/services/testEvents.ts`).
- Never show made-up popularity, ticket sales, or visitor numbers in a release build.

## Database and Supabase – Hard Rules

- Production project: `yhnxdeypkbzyjappuzmv`. Test project ("Spots-Test"): `nfomkdvotqtlyymomksb`.
- Never run SQL, migrations, deployments, imports, or cron changes against **production** without the user's explicit approval for that specific action in the current session.
- New SQL files under `supabase/ops/` are tested locally first (PGlite tests), then only in the test project. Writing a SQL file is not an approval to run it.
- Never change or delete existing event rows, UUIDs, or import metadata as a side effect.
- Never touch `.env.local`, secrets, or the Vault; the app only uses `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Git and Team

- Never work directly on `main`. Use a feature or experiment branch.
- Commit, push, merge, or open pull requests only when the user asks.
- Other team members work on their own branches (for example `Jacint-branch`). Do not modify, rebase, or delete other people's branches.
- Ownership:
  - **Jacint – backend**: `supabase/` (SQL, migrations, Edge Functions), Goabase import and cron, database schema and RLS.
  - **Noyan – design**: `src/constants/theme.ts`, `src/components/ui/`, the visual design of screens and components.
- Changes in these areas are allowed when the user asks for them. In the summary, always say which owner's area was touched (for example "betrifft Jacints Backend") so the team can coordinate. Before larger rewrites in someone else's area (new structure, deleting or replacing their files), ask first.
- The contract between app and backend is documented in `docs/ORGANIZER_ARCHITECTURE.md`; do not break it silently.

## Working as a Team (two people, two chats)

Jacint and Noyan work in parallel, each with their own Claude chat on their own computer and their own branch.

**Who is talking?** At the start of a chat the user says „ich bin Jacint“ or „ich bin Noyan“. Work only in that person's area. If it is not clear who is writing, ask before changing files.

**Jacint – Backend & Daten**
- `supabase/` (SQL in `supabase/ops/`, Edge Functions, `config.toml`), imports (Goabase, Ticketmaster, OpenStreetMap), cron, database schema, RLS, SQL tests in `tests/`.
- Data access in the app: `src/services/`, `src/lib/`, `src/hooks/` (loading and mapping data), `src/features/accounts/`, admin backend calls.
- Website backend: contact form and `supabase/ops/23_partner_requests.sql`.
- Only Jacint runs SQL in Spots-Test and deploys Edge Functions. Production only with explicit approval from both.
- Branches: `backend/<thema>`.
- New screens or fields needed for data: build only the simple, functional UI and note it for Noyan („Design offen für Noyan“).

**Noyan – Design & Oberfläche**
- `src/constants/theme.ts`, `src/components/ui/`, the look of all screens and components (`src/screens/`, `src/components/`), icons, animations, `app.json` visuals (icon, splash).
- Website design: `website/src/styles/`, `website/src/components/`, layout and texts of `website/src/pages/`.
- No SQL, no Supabase changes, no Edge Functions, no changes to how data is loaded. If the design needs new data, write it down for Jacint („Daten nötig von Jacint“).
- Branches: `design/<thema>`.

**Shared files – keep changes small, coordinate first**
- Screens use both data (Jacint) and design (Noyan): Jacint changes data hooks/props, Noyan changes layout and styles. Do not restructure a screen in the other person's area without asking.
- `PROJECT_STATUS.md`: only change the lines about your own work; never rewrite the whole file. On merge conflicts keep both sides.
- Progress files: one per person and topic (e.g. `docs/FORTSCHRITT-<thema>.md`), not one shared file.
- SQL file numbers: before creating a new file, check `supabase/ops/` on `main` and on open branches for the next free number.

**Workflow**
- Always branch from the latest `main`; run `git pull origin main` regularly and before opening a pull request.
- Small pull requests into `main`; the other person takes a quick look before merging.
- In every summary, name the area that was touched (e.g. „betrifft Jacints Backend“, „betrifft Noyans Design“).

## Project Progress and Continuity

Maintain a `PROJECT_STATUS.md` file in the project root.

Use this file to document:
- Features already implemented.
- Features currently in development.
- Known bugs and technical limitations.
- Important architecture decisions.
- Next recommended development steps.

At the beginning of a new development task, inspect the actual codebase and the project status file.

After completing meaningful changes, update the project status file so future coding sessions can understand the current state.

Keep `PROJECT_STATUS.md` short (about 60–80 lines): it describes only the **current** state. Replace outdated statements instead of adding contradicting ones. Move finished rounds and long reports to `docs/history/`.

Do not claim a feature is complete unless it has actually been implemented and appropriately verified.

## Overall Product Goal

The core experience should answer one simple question:

"We want to go out tonight. Where is something happening near us right now?"

Everything we build should contribute to making that experience faster, simpler, and more exciting.
