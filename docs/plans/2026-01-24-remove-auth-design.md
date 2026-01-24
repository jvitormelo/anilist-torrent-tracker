# Design: Remove OAuth and Transition to Public Username Tracking

Date: 2026-01-24
Topic: Authentication & UI Simplification

## Overview

This design outlines the transition from an OAuth-based authentication system to a simplified public username tracking system for the AniList Torrent Tracker. The goal is to improve onboarding speed and privacy while focusing on the core feature: tracking currently watching anime.

## Proposed Changes

### 1. Data Fetching Strategy

- **From:** Authenticated requests using `Authorization: Bearer <token>` and `Viewer` GraphQL queries.
- **To:** Public requests using `userName` as a variable in `mediaList` GraphQL queries.
- **Impact:** Only public AniList profiles will be trackable. Private profiles will no longer work.

### 2. User Interface Overhaul

- **Authentication:** Replace the OAuth "Sign in with AniList" button with a text input for the AniList username.
- **Dashboard:**
  - Remove "Notifications" and "Latest Downloads" tabs.
  - Remove "Global Chat" and "Online Users" counter.
  - Set "Currently Watching" as the primary and only view.
- **Navigation:** Simplify the header and remove any community-related components.

### 3. State Management

- **Storage:** Use `localStorage` key `anilist_username` instead of `anilist_token`.
- **Session:** Removing the need for callback routes and token management.

## Components to be Modified

- `server/index.ts`: Update GraphQL queries and remove auth headers.
- `src/components/AuthenticationCard.tsx`: Add username input.
- `src/routes/index.tsx`: Update logic to use `anilist_username` and remove tabs/community features.

## Components to be Removed

- `src/routes/auth.anilist.callback.tsx`
- `src/components/GlobalChat.tsx` (references will be removed)
- `src/components/OnlineUsersCounter.tsx` (references will be removed)

## Success Criteria

- Users can enter a username and see their "Currently Watching" list without signing in.
- No OAuth redirection occurs.
- The UI is focused solely on the watch list.
- The application remains functional and builds without errors.
