# Libretto Digitale dei Canti

Digital songbook for the parish liturgical songs. Static React SPA on Vercel with
one serverless function for the daily "Messa di oggi" set.

## Develop

```bash
npm install
npm run dev      # app at http://localhost:5173
npm test         # run the test suite
npm run build    # production build
```

## Songs

Songs are bundled JSON in `src/data/songs/<id>.json` (`{ id, title, body }`).
`body` uses ChordPro inline brackets — `[C]Se il sole non [G]illumi[Am]nasse più`.
Add chords to a song by editing its `body`; the chord toggle appears automatically.

Re-import from the source document with:

```bash
npx tsx scripts/import-docx.ts
```

## Deploy (Vercel)

1. Import the repo into Vercel.
2. Add the **Upstash** integration (Marketplace) — it sets
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. Add an `ADMIN_PASSWORD` environment variable.
4. Deploy. The QR codes around the church should point at the deployment root URL.

Set today's songs at `/admin` (enter the admin password).
