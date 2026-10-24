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

The app does not have a final brand name yet. Refer to it simply as "App".

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

### 3. Profile – Third Screen

The third screen provides simple personal account functionality.

Requirements:
- Account registration and login.
- Manage basic account settings.
- Access saved events.
- Keep profiles private and minimal.
- Do not build a social network with followers, public friend lists, or unnecessary social features.

### 4. Event Detail Pages

Every event should have its own detail page.

Requirements:
- Event title, description, location, and date.
- Music genre and event category.
- Ticket information or external ticket links.
- Current and past event media.
- Live impressions uploaded by visitors.
- Access to relevant organizer information.

### 5. Live Snaps – 24-Hour Content

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

Do not claim a feature is complete unless it has actually been implemented and appropriately verified.

## Overall Product Goal

The core experience should answer one simple question:

"We want to go out tonight. Where is something happening near us right now?"

Everything we build should contribute to making that experience faster, simpler, and more exciting.