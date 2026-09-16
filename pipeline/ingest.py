"""CLI entrypoint for the ingestion pipeline.

Usage:
    python pipeline/ingest.py \
        --sitting-id 17-tn-la-2026-09-08 \
        --date 2026-09-08 \
        --assembly 17 --session 2 --sitting-number 25 \
        --youtube "https://www.youtube.com/watch?v=<id>"

Each stage caches its intermediate under pipeline/cache/<sitting_id>/, so
re-running only redoes what was missing (or was invalidated by deleting
the corresponding cache file).
"""
from __future__ import annotations

import argparse
import sys
from urllib.parse import parse_qs, urlparse

from .config import load_config
from .steps.download import download_audio
from .steps.transcribe import transcribe
from .steps.segment import segment
from .steps.classify import classify
from .steps.aggregate import build_sitting, write_sitting


def _youtube_id_from_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.hostname in ("youtu.be", "www.youtu.be"):
        return parsed.path.lstrip("/")
    if parsed.hostname and "youtube.com" in parsed.hostname:
        qs = parse_qs(parsed.query)
        if "v" in qs:
            return qs["v"][0]
    return url   # assume a bare id


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Ingest one TN Assembly sitting.")
    ap.add_argument("--sitting-id", required=True, help="e.g. 17-tn-la-2026-09-08")
    ap.add_argument("--date", required=True, help="YYYY-MM-DD")
    ap.add_argument("--assembly", type=int, default=17)
    ap.add_argument("--session", type=int, required=True)
    ap.add_argument("--sitting-number", type=int, required=True)
    ap.add_argument("--youtube", required=True, help="Full YouTube URL or bare video id")
    args = ap.parse_args(argv)

    cfg = load_config()
    yt_id = _youtube_id_from_url(args.youtube)
    yt_url = f"https://www.youtube.com/watch?v={yt_id}"

    print(f"[1/5] downloading audio for {yt_id} ...")
    audio_path, video_meta = download_audio(yt_url, args.sitting_id)
    duration = int(video_meta.get("duration_seconds") or 0)
    print(f"      → {audio_path.name} ({duration}s, {video_meta.get('title')})")

    print(f"[2/5] transcribing ({cfg.groq_whisper_model}) ...")
    words = transcribe(audio_path, args.sitting_id, cfg)
    print(f"      → {len(words)} words")

    print(f"[3/5] segmenting ...")
    raw_segments = segment(words, args.sitting_id, cfg)
    print(f"      → {len(raw_segments)} segments")

    print(f"[4/5] classifying with {cfg.anthropic_model} ...")
    classifications = classify(raw_segments, args.sitting_id, cfg)
    print(f"      → {len(classifications)} classifications")

    print(f"[5/5] building sitting JSON ...")
    sitting = build_sitting(
        sitting_id=args.sitting_id,
        date=args.date,
        assembly=args.assembly,
        session=args.session,
        sitting_number=args.sitting_number,
        youtube_id=yt_id,
        duration_seconds=duration,
        raw_segments=raw_segments,
        classifications=classifications,
    )
    out = write_sitting(sitting)
    print(f"      → {out.relative_to(out.parents[2])}")

    print("\nDone. Rebuild the site or run `npm run dev` to see the new sitting.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
