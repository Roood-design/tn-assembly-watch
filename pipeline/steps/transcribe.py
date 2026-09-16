"""Step 2 — transcribe the audio via Groq Whisper large-v3-turbo.

Groq's transcription endpoint accepts files up to 25 MB. A 4-hour assembly
sitting at 64 kbps mono is ~110 MB, so we chunk the mp3 into ~15-minute
pieces with ffmpeg, transcribe each, then stitch back into a single
word-timestamp stream with global (sitting-relative) timestamps.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Iterable

import requests

from ..config import Config, sitting_cache
from ..schemas import Word


def _split_audio(audio_path: Path, chunk_minutes: int, out_dir: Path) -> list[tuple[Path, float]]:
    """Split audio into N-minute chunks with ffmpeg. Returns list of (path, start_offset_seconds)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    pattern = out_dir / "chunk_%03d.mp3"
    cmd = [
        "ffmpeg", "-y", "-i", str(audio_path),
        "-f", "segment", "-segment_time", str(chunk_minutes * 60),
        "-c", "copy", str(pattern),
        "-loglevel", "error",
    ]
    subprocess.run(cmd, check=True)
    chunks = sorted(out_dir.glob("chunk_*.mp3"))
    return [(p, i * chunk_minutes * 60) for i, p in enumerate(chunks)]


def _transcribe_chunk(chunk_path: Path, offset: float, cfg: Config) -> list[Word]:
    """POST one chunk to Groq. Response includes word-level timestamps."""
    with chunk_path.open("rb") as f:
        files = {"file": (chunk_path.name, f, "audio/mpeg")}
        data = {
            "model": cfg.groq_whisper_model,
            "response_format": "verbose_json",
            "timestamp_granularities[]": "word",
            "language": "en",   # Whisper will translate Tamil → English automatically for the MVP
        }
        headers = {"Authorization": f"Bearer {cfg.require_key('groq_api_key')}"}
        r = requests.post(cfg.groq_endpoint, headers=headers, files=files, data=data, timeout=300)
    r.raise_for_status()
    payload = r.json()
    words: list[Word] = []
    for w in payload.get("words") or []:
        words.append(Word(
            start=float(w["start"]) + offset,
            end=float(w["end"]) + offset,
            text=w["word"].strip(),
        ))
    return words


def transcribe(audio_path: Path, sitting_id: str, cfg: Config) -> list[Word]:
    cache = sitting_cache(sitting_id)
    words_json = cache / "words.json"
    if words_json.exists():
        raw = json.loads(words_json.read_text())
        return [Word(**w) for w in raw]

    chunk_dir = cache / "chunks"
    chunks = _split_audio(audio_path, cfg.chunk_minutes, chunk_dir)

    all_words: list[Word] = []
    for i, (path, offset) in enumerate(chunks):
        print(f"  transcribing chunk {i+1}/{len(chunks)} (offset {int(offset)}s)")
        all_words.extend(_transcribe_chunk(path, offset, cfg))

    words_json.write_text(json.dumps([w.to_dict() for w in all_words], indent=2))
    return all_words
