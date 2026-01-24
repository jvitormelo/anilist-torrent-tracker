# Design: Multi-Episode Search and Download

Date: 2026-01-24
Topic: UI/UX & Download Efficiency

## Overview

Improve the torrent discovery process by allowing users to see and search for all missing episodes at once, rather than just the next one in their progress list.

## Proposed Changes

### 1. MediaListCard Update

- Add a calculation for `missingRange` (from `progress + 1` to `nextAiringEpisode.episode - 1` or `totalEpisodes`).
- Add a UI section for "Missing Episodes" with individual badges for each episode.
- Add a "Search All Missing" button.

### 2. TorrentSection Update

- Modify to support multiple episode results.
- Implement parallel fetching for multiple episodes.
- Group results by episode number in the UI.

### 3. Component Refactoring

- Ensure `TorrentActions` and `TorrentItem` correctly handle the episode context when multiple episodes are displayed.

## Success Criteria

- Users can click an individual episode badge to search for it.
- Users can click "Search All" to fetch torrents for all missing episodes.
- Results are clearly grouped by episode.
- Parallel fetching is used for efficiency.
