# Libretto Digitale dei Canti

Digital songbook for the liturgical songs of the Unità Pastorale Don Ennio Melioli.
Parishioners scan a QR code in church and get the song list for today's Mass, plus
a searchable index of every song with optional chords, transposition and PDF scores.

- **Live site:** <https://up-donenniomelioli.vercel.app>
- **Stack:** React 19 + React Router 7 SPA built with Vite, TypeScript, Vitest.
  Deployed on Vercel with one serverless function (`api/today.ts`) backed by
  Upstash Redis for the daily "Messa di oggi" set.

Most contributions are **songs** (new songs, corrections, chords). Read
[Songs](#songs) carefully before opening a song PR: the format is strict and
the rules below are what reviewers check.

Non-technical contributors don't need to open PRs: the Italian
[song submission manual](docs/manuale-canti/manuale-invio-canti.md) explains
how to send a song ready to be added.

---

## Contents

- [Develop](#develop)
- [Project structure](#project-structure)
- [Songs](#songs)
  - [Song file](#song-file)
  - [Id and filename](#id-and-filename)
  - [Title](#title)
  - [`songNumber`](#songnumber)
  - [Body format](#body-format)
  - [Chords](#chords)
  - [PDF scores](#pdf-scores)
  - [Adding a song](#adding-a-song)
  - [Editing a song](#editing-a-song)
  - [Removing a song](#removing-a-song)
- [Code contributions](#code-contributions)
- [Pull requests](#pull-requests)
- [Notes for AI coding agents](#notes-for-ai-coding-agents)
- [Deploy (Vercel)](#deploy-vercel)
- [Documentation](#documentation)

---

## Develop

Developed and tested with Node 24.

```bash
npm install
npm run dev      # app at http://localhost:5173 (also regenerates chord-ids.json)
npm test         # Vitest suite
npm run lint     # ESLint
npm run build    # type-check (tsc -b) + production build (also regenerates chord-ids.json)
```

The song pages, index and landing page work with no configuration. The
`/admin` page and the "Messa di oggi" section call `/api/today`, which the Vite
dev server runs locally (see `vite.config.ts`). For that you need a
`.env.local` (git-ignored) with:

```bash
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
ADMIN_PASSWORD=...
```

Use your own free Upstash database for local work, never the production one.

---

## Project structure

```
api/
  today.ts              GET/POST the "Messa di oggi" set (Upstash Redis)
src/
  data/
    songs/<id>.ts       one file per song (auto-loaded by songs/index.ts)
    song-ids.json       allow-list of song ids accepted by the API — keep in sync
    chord-ids.json      GENERATED from public/chords/*.pdf — do not edit by hand
    types.ts            Song type
  lib/                  pure logic: chordpro parser, transpose, slugify, schema…
  components/           SongBody (renders lyrics + chords), SongCombobox…
  pages/                Landing, SongIndex, SongPage, Admin
  styles/               design tokens and global CSS
public/
  chords/<id>.pdf       optional PDF score for a song
scripts/
  generate-chord-ids.ts runs on predev/prebuild
docs/
  manuale-admin/        Italian user manual for /admin
  manuale-canti/        Italian manual for submitting songs
```

Routes: `/` (landing + Messa di oggi), `/canti` (index), `/canti/:id` (song),
`/admin` (unlinked, password-protected on save).

---

## Songs

### Song file

Every song is a TypeScript module at `src/data/songs/<id>.ts`. The index
(`src/data/songs/index.ts`) picks up every file automatically via
`import.meta.glob` and sorts by title; there is no list to register in, except
[`song-ids.json`](#id-and-filename).

Template — copy it exactly (2-space indent, double-quoted strings, body in a
template literal):

```ts
import type { Song } from '../types.ts'

const song: Song = {
  id: "ecco-quel-che-abbiamo",
  title: "ECCO QUEL CHE ABBIAMO",
  songNumber: 244,
  body: `RIT.
[La]Ecco quel che ab[Do#m]biamo, nulla [Re]ci appartiene [La]ormai.
Ecco i [Fa#m]frutti della [Do#m]terra, che [Re]Tu moltipliche[Mi]rai.

[Fa#m]Solo una goccia hai messo [Do#m]fra le mani mie,
solo una goccia che Tu [Fa#m]ora chiedi a me.`,
}

export default song
```

Fields (`src/data/types.ts`):

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Equal to the filename without `.ts`. See below. |
| `title` | yes | Shown in index, search, song page, admin. |
| `songNumber` | no | Number in the legacy printed songbook. Shown as a chip. |
| `body` | yes | Lyrics with inline chords. See [Body format](#body-format). |

Don't add other fields. If you think the model needs a new field (author,
category, liturgical season…), open an issue first.

### Id and filename

- For a **new** song, `id` = `slugify(title)` (`src/lib/slugify.ts`):
  lowercase, accents stripped, every run of non-alphanumerics → `-`.
  `"ALLELUIA (PER LA FESTA DELL’AMORE)"` → `alleluia-per-la-festa-dell-amore`.
- Filename = `<id>.ts`. `id` field = filename. Always.
- **Add the id to `src/data/song-ids.json`.** The API rejects any id not in
  that list, so a song missing from it shows on the site but **cannot be
  selected and saved in `/admin`**. Insert it next to related ids; order is not
  significant. A test (`src/data/songs/index.test.ts`) fails if the list and
  the song files drift apart, or if an `id` doesn't match its filename.
- **Never change the id of an existing song**, even if you change its title.
  Ids are stored in the saved Messa di oggi lists (Redis), name the PDF score
  and appear in shared links. A few existing ids don't match their current
  title's slug (`gloria`, `salmo-148`): that is intended.
- Ids must be unique. If the slug collides with an existing song, the title
  needs a distinguishing suffix (see below).

### Title

- **ALL CAPS**, with proper accented capitals (`È`, `À`, `É`…), no trailing
  period.
- Songs that share a name get a distinguishing suffix **in parentheses**:
  author, community, collection, or first words.
  `ALLELUIA (GEN)`, `AGNELLO DI DIO (RNS)`, `SANTO (A DUE VOCI)`,
  `ATTINGERETE ACQUA CON GIOIA (ISAIA 12)`.
- Use the name people actually search for. Search matches any substring of the
  title, case- and accent-insensitive.
- Search the existing songs first — duplicates under a slightly different title
  will be rejected.

### `songNumber`

Only for songs that were in the legacy printed songbook, with that number.
Omit the field entirely otherwise; never invent numbers or reuse one.

### Body format

The body is parsed line by line by `src/lib/chordpro.ts` and rendered by
`src/components/SongBody.tsx`. These rules come straight from that code:

| Rule | Why |
|---|---|
| One source line = one displayed line. One verse per line. | Lines are rendered as-is; long lines wrap badly on phones. |
| One empty line between stanzas. No empty lines inside a stanza, no runs of empty lines. | Each empty line renders as vertical space. |
| No leading or trailing empty line — start the body right after the opening backtick and close it right after the last character. | They render as extra space. |
| Refrain: `RIT.` **alone on its line**, then the refrain text, then an empty line. | `RIT.` (regex `^\s*RIT\.?\s*$`, case-insensitive) becomes the refrain label; every line until the next empty line is styled as refrain. Forgetting the empty line styles the next stanza as refrain. |
| Write the refrain **in full** every time it is sung. Never a bare `RIT.` as a "repeat" marker. | People read from phones; they shouldn't scroll back. |
| Write stanzas in sung order, repeated stanzas in full. No stanza numbers (`1.`, `Strofa 2`). | Numbers would be shown as lyrics. |
| Performance notes in **round brackets**, usually on their own line: `(lettura versetto)`, `(solo chitarre)`, `(rientrano tutti)`. | Anything in `[square brackets]` is parsed as a chord. |
| Alternating voices: line prefix `U:` (men), `D:` (women); a note like `(U + D insieme)` for both. The prefix applies until the next one. | Existing convention. |
| Normal sentence case and the punctuation of the official source. Only the title is ALL CAPS. | Consistency. |
| No HTML, Markdown, emoji or ChordPro directives (`{title:}`, `{soc}`…). | Not parsed; shown literally. |
| Escape `` ` `` as `` \` `` and `${` as `\${` inside the body. | It's a JS template literal. |

### Chords

Chords are optional. A correct lyrics-only song is better than one with
guessed chords. When the body contains at least one `[...]`, the song page
shows the **Accordi** toggle and the **Tono − +** transposition controls
automatically.

**Placement**

- Inline ChordPro brackets, immediately before the syllable where the chord
  changes, no space: `L’anima [Fa]mia ma[Fa7+]gnifica il Si[Fa6]gnore`.
  Mid-word is correct.
- A chord after the last word goes at the end of the line: `Si[Fa4]gnore.[Fa]`.
- Several chords on one syllable: `[Sol][Sol4]gloria`.
- A line made **only** of chords separated by spaces is an intro/interlude:
  `[Do] [Mim] [Do] [Re7] [Sol]`. It is hidden when chords are off.
- **Never** copy "chords on the line above" layouts; move every chord inline.
- If a song has chords, they must cover the **whole** song, including every
  repeated refrain.
- Write chords in the key the song is actually played in.

**Notation** — Italian note names, capitalised: `Do Re Mi Fa Sol La Si`.
English (`C`…`B`) is also understood by the transposer, but use Italian for
consistency and never mix the two in one song.

| Chord | Write | Examples |
|---|---|---|
| Major | root | `[Do]` `[Sol]` |
| Minor | root + `m` | `[Lam]` `[Fa#m]` |
| Sharp / flat | `#` / lowercase `b` | `[Fa#]` `[Sib]` `[Mib]` |
| Seventh | `7` | `[La7]` `[Mim7]` |
| Major seventh | `7+` | `[Fa7+]` `[Do7+]` |
| Suspended 4th | `4` | `[Re4]` `[La4]` |
| Sixth / ninth | `6` / `9` | `[Fa6]` `[Re9]` |
| Slash bass | `/` + bass note | `[Do/Mi]` `[Sib/Do]` |

Not allowed (they break transposition or are legacy notation):
`[La-]` → `[Lam]`; `[Fa+7]` → `[Fa7]`; `[Sol/4]` → `[Sol][Sol4]`;
lowercase roots like `[la7]`; any non-chord text in brackets like
`[INTRO: …]` → `(intro: …)`.

Transposition (`src/lib/transpose.ts`) shifts the root and the slash bass and
keeps the suffix untouched, always spelling with sharps. If you touch the
parser or transposer, add tests in `src/lib/*.test.ts`.

### PDF scores

- Put the file at `public/chords/<id>.pdf` (same id as the song).
- `npm run dev` / `npm run build` regenerate `src/data/chord-ids.json` and
  warn about PDFs without a matching song. **Commit the regenerated
  `chord-ids.json`**; don't edit it by hand.
- The song page then shows a **Spartito** view (alongside **Testo** /
  **Accordi** if the body has inline chords).
- Keep PDFs readable on a phone and reasonably small. Only add scores you have
  the right to publish; state the source in the PR.

### Adding a song

1. Check it doesn't already exist (`/canti` on the live site, or grep
   `src/data/songs/`).
2. Compute the id with `slugify(title)`; create `src/data/songs/<id>.ts` from
   the template.
3. Add the id to `src/data/song-ids.json`.
4. Optionally add `public/chords/<id>.pdf` and run `npm run chord-ids`.
5. `npm test && npm run build`, then check the page at
   `http://localhost:5173/canti/<id>` with chords on and off and on a phone-sized
   viewport.
6. Open a PR (see [Pull requests](#pull-requests)), citing the source of the
   lyrics.

### Editing a song

- Change only what the PR is about. Don't reformat other lines, re-indent the
  file, or "fix" other songs in the same PR.
- Keep the `id`. Changing the `title` is fine but say so in the PR — it moves
  the song in the index.
- Adding chords to an existing song is an edit: same file, chords inline,
  whole song.

### Removing a song

Delete `src/data/songs/<id>.ts`, its entry in `song-ids.json` and any
`public/chords/<id>.pdf`, and explain why in the PR. Saved Messa di oggi lists
that contain it drop it silently on the next load, so removal is visible to
admins.

---

## Code contributions

- TypeScript (keep `tsc -b` clean, no `any` escapes), function components, no new runtime dependencies without
  discussing it in an issue first.
- Match the surrounding style: 2-space indent, single quotes in code, no
  semicolons, small pure helpers in `src/lib/` with colocated `*.test.ts`.
- Colours, spacing and motion go through the tokens in
  `src/styles/tokens.css`; support light and dark themes.
- The UI is in **Italian** and used mostly on phones by non-technical
  people: keep text short, touch targets large, and test at phone width.
- Every behaviour change needs tests (Vitest + Testing Library).
- The API contract is validated in `src/lib/todaySchema.ts`; the list of
  churches lives in `src/lib/churches.ts`. Changes there affect data already
  stored in production Redis — describe the migration in the PR.
- If you change something documented in the user manuals under `docs/`,
  update the manual in the same PR.

---

## Pull requests

Before opening a PR:

- [ ] `npm test` passes.
- [ ] `npm run build` passes (it type-checks).
- [ ] `npm run lint` passes.
- [ ] Song PRs follow every rule in [Songs](#songs), and the new ids are in
      `song-ids.json`.
- [ ] Regenerated `chord-ids.json` is committed if you added/removed a PDF.
- [ ] You checked the result in the browser.

PR rules:

- **One topic per PR.** One song, or a small batch of songs of the same kind
  (e.g. "add chords to the four Alleluia"). Never mix songs and code.
- **Commit messages:** [Conventional Commits](https://www.conventionalcommits.org/),
  scoped like the history: `feat(songs): add "ALLELUIA (GEN)"`,
  `fix(songs): correct chords in "MAGNIFICAT (LOMBARDI)"`,
  `fix(admin): …`, `docs(admin): …`. Sign off your commits (`git commit -s`).
- **Description:** what changed, why, and for songs the **source** of lyrics
  and chords (songbook, publisher, recording).
- Only submit lyrics and scores you are allowed to share. Liturgical songs are
  often copyrighted; when in doubt, ask in an issue first.
- Don't commit build output (`dist/`), env files, editor folders or
  `.DS_Store`.

---

## Notes for AI coding agents

If you are an LLM preparing a change for this repo, these are hard rules:

1. **Read before writing.** Open `src/data/types.ts`, `src/lib/chordpro.ts`
   and two or three existing songs before creating or editing one. Copy the
   template in [Song file](#song-file) exactly.
2. **Song files:** `id` === filename === `slugify(title)` for new songs; the
   new id **must** be added to `src/data/song-ids.json`. Never rename an
   existing id.
3. **Never invent content.** No lyrics from memory, no guessed chords, no
   invented `songNumber`. If the user didn't give you the text or chords,
   leave them out and say so.
4. **Body rules are not stylistic:** `RIT.` alone on a line, an empty line after
   every refrain and between stanzas, refrains written out in full, notes in
   `( )`, only chords in `[ ]`, Italian chord notation with the suffixes in
   the table above.
5. **Don't hand-edit** `src/data/chord-ids.json`; run `npm run chord-ids`.
6. **Minimal diffs.** Don't reformat, re-indent, reorder or "normalise"
   unrelated songs or code. One topic per PR.
7. **Verify** with `npm test`, `npm run lint` and `npm run build` and report
   the real output.
   Don't claim a song "renders correctly" unless you looked at it.

---

## Deploy (Vercel)

Maintainers only.

1. Import the repo into Vercel.
2. Add the **Upstash** integration (Marketplace) — it sets
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. Add an `ADMIN_PASSWORD` environment variable.
4. Deploy. The QR codes around the church point at the deployment root URL.

Set today's songs at `/admin` (enter the admin password).

---

## Documentation

- [Manuale admin — "Messa di oggi"](docs/manuale-admin/manuale-libretto-canti-digitale.md)
  (Italian, for parish admins) — also as [PDF](docs/manuale-admin/manuale-libretto-canti-digitale.pdf).
- [Manuale per proporre canti](docs/manuale-canti/manuale-invio-canti.md)
  (Italian, for anyone sending songs without opening a PR).
