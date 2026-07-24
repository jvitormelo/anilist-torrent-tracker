# Project conventions

## Filters live in the URL search params

Any user-facing filter (genre, status, sort, etc.) must be stored in the
route's URL search params, not in local component state. Add the field to the
route's Zod search schema (e.g. `seasonSearchSchema` in
`src/hooks/useSeasonComparison.ts`) and read/write it with TanStack Router's
`useSearch` / `useNavigate`. This keeps filters shareable via URL and preserved
across reloads.
