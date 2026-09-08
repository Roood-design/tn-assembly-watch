# TN Assembly Watch

A public, post-EOD dashboard for Tamil Nadu Legislative Assembly sittings. Timeline, speakers, topics, mood — every claim links back to the exact minute of the assembly video.

## Status

Early MVP. Frontend is rendering against mock data for one sample sitting. The ingestion pipeline (audio → transcript → segments) is Phase 2.

## Stack

- **Frontend** — Astro (SSG) + React islands for interactive charts
- **Data** — JSON files committed to this repo, per sitting
- **Video** — YouTube iframe with deep-linking
- **Charts** — Recharts + custom D3 for the timeline ribbon
- **State** — Nanostores for cross-component playback sync

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:4321/>.

## Project structure

```
src/
  pages/
    index.astro                # Calendar landing
    sitting/[id].astro         # Per-sitting dashboard
    about.astro                # Methodology + rubric
  components/
    TimelineRibbon.tsx         # D3-based session timeline
    SpeakingTimeDonut.tsx      # Party & speaker breakdowns
    VideoPlayer.tsx            # YouTube iframe with programmatic seek
    TranscriptViewer.tsx       # Scroll-synced transcript
  stores/
    playback.ts                # Nanostores atom for current playback time
data/
  mlas.json                    # MLA roster
  sittings/                    # One JSON file per sitting
```

## Methodology

The content-classification rubric (`substantive` / `procedural` / `praise` / `attack` / `uproar` / `reading`) is documented at `/about` on the running site. It is a draft — corrections welcome via pull request.

## Contributing

This project is deliberately open. If you spot a misattribution or misclassification in a sitting's data:

1. Open the sitting's JSON in `data/sittings/`
2. Correct it
3. Open a PR

## License

Data and code are released under a permissive licence to encourage reuse by journalists, researchers, and civil-society groups. (Licence file TBD.)
