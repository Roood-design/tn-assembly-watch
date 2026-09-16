"""Step 3 — chunk word-level ASR into speaker-agnostic segments.

Whisper returns thousands of tiny word tokens. The dashboard needs coarser
units — one segment per "speaking turn" of roughly 30–90 seconds. Since we
don't have diarization in this MVP, we use pause-based segmentation: split
whenever there's a silence gap greater than SILENCE_GAP, and force-split
if a segment exceeds MAX_SECONDS.

This is intentionally simple. When real diarization is added in Phase 3,
this step will be replaced by "one segment per diarization turn."
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable

from ..config import Config, sitting_cache
from ..schemas import RawSegment, Word


def _flush(words: list[Word], idx: int) -> RawSegment:
    text = " ".join(w.text for w in words).strip()
    return RawSegment(
        id=f"seg_{idx:04d}",
        start_seconds=words[0].start,
        end_seconds=words[-1].end,
        text=text,
    )


def segment_words(words: list[Word], cfg: Config) -> list[RawSegment]:
    """Group words into segments by silence gaps and length caps."""
    if not words:
        return []

    max_secs = cfg.segment_max_seconds
    gap = cfg.segment_silence_gap_seconds

    segments: list[RawSegment] = []
    current: list[Word] = [words[0]]

    for prev, w in zip(words, words[1:]):
        silence = w.start - prev.end
        length_so_far = w.end - current[0].start
        split_on_silence = silence >= gap and length_so_far >= 20   # small floor to avoid micro-segments
        split_on_length = length_so_far >= max_secs

        if split_on_silence or split_on_length:
            segments.append(_flush(current, len(segments) + 1))
            current = [w]
        else:
            current.append(w)

    if current:
        segments.append(_flush(current, len(segments) + 1))

    return segments


def segment(words: list[Word], sitting_id: str, cfg: Config) -> list[RawSegment]:
    cache = sitting_cache(sitting_id)
    out = cache / "segments_raw.json"
    if out.exists():
        raw = json.loads(out.read_text())
        return [RawSegment(**s) for s in raw]
    segs = segment_words(words, cfg)
    out.write_text(json.dumps([s.to_dict() for s in segs], indent=2))
    return segs
