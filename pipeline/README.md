# Ingestion pipeline

Turns a single YouTube URL of a TN Assembly sitting into a
`data/sittings/YYYY-MM-DD.json` file that the site can render.

## Stages

```
YouTube URL
    │  yt-dlp + ffmpeg
    ▼
audio.mp3 (mono 16 kHz, 64 kbps)
    │  Groq Whisper large-v3-turbo
    ▼
words.json (word-level timestamps)
    │  silence-based chunking (see steps/segment.py)
    ▼
segments_raw.json (~30–90 s per segment)
    │  Claude Haiku 4.5 (rubric-based)
    ▼
classifications/<seg>.json (per-segment)
    │  aggregate + MLA-roster match
    ▼
data/sittings/YYYY-MM-DD.json  ← what the site reads
```

Each stage caches its intermediate under `pipeline/cache/<sitting_id>/`.
Re-running only re-does what's missing, so an interrupted or partial run
resumes cheaply.

## Set up

Prerequisites: **Python 3.9+**, **ffmpeg** on your `PATH`. Install ffmpeg
via `brew install ffmpeg` on macOS or your OS package manager.

```bash
cd pipeline
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env    # fill in GROQ_API_KEY and ANTHROPIC_API_KEY
```

Get keys:
- Groq — <https://console.groq.com/keys> (used for Whisper ASR)
- Anthropic — <https://console.anthropic.com/> (used for classification)

## Run

From the repo root:

```bash
pipeline/.venv/bin/python -m pipeline.ingest \
  --sitting-id 17-tn-la-2026-09-08 \
  --date 2026-09-08 \
  --session 2 --sitting-number 25 \
  --youtube "https://www.youtube.com/watch?v=EXAMPLE"
```

The site (`npm run dev`) will pick up the new file on next rebuild.

## Cost model

For a ~4-hour sitting:

| Stage | Service | Approx cost |
|---|---|---|
| Transcription | Groq Whisper large-v3-turbo | ~$0.40 |
| Classification | Claude Haiku 4.5 (200 segments × ~500 tokens in / 100 tokens out) | ~$0.15 |
| Storage / compute | free (local) | $0 |
| **Total** | | **~$0.55 per sitting** |

At one sitting per weekday, that's ~$12/month.

## What's not automated yet (Phase 3)

- **Speaker diarization.** We rely on the LLM's `speaker_hint` field, which
  is often blank in the middle of a long speech. Adding pyannote.audio
  (runs on GPU via Modal) is the fix.
- **Voiceprint enrollment** of the 234 MLAs, so diarization clusters can
  be automatically labelled with real names.
- **Mood series** derived from audio RMS + overlap ratio. Empty for now;
  the frontend just doesn't render the chart if the array is empty.
- **Official proceedings integration** — bills, questions, list of business
  from `assembly.tn.gov.in`. Currently the `official` block is empty.

## Tuning

Segmentation heuristics live in `config.py`
(`segment_max_seconds`, `segment_silence_gap_seconds`). If segments come
out too fine-grained, raise `segment_silence_gap_seconds`. If they come
out too coarse and unreadable, lower `segment_max_seconds`.

## Re-running from a specific stage

To re-run classification only (e.g. after tuning the system prompt):

```bash
rm -rf pipeline/cache/<sitting_id>/classifications
pipeline/.venv/bin/python -m pipeline.ingest ...   # same args
```

To reprocess from scratch:

```bash
rm -rf pipeline/cache/<sitting_id>
```
