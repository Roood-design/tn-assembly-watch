"""Step 1 — download audio from a YouTube URL.

Uses yt-dlp to fetch the best audio-only stream, converts to a mono 16 kHz
mp3 (Whisper's happy path) via ffmpeg, and writes it to the sitting's cache
folder as `audio.mp3`. Idempotent — a second run with an existing audio.mp3
returns immediately.
"""
from __future__ import annotations

import json
from pathlib import Path

import yt_dlp

from ..config import sitting_cache


def download_audio(youtube_url: str, sitting_id: str) -> tuple[Path, dict]:
    """Return (audio_path, metadata). metadata carries duration + title."""
    cache = sitting_cache(sitting_id)
    audio_path = cache / "audio.mp3"
    meta_path = cache / "video_meta.json"

    if audio_path.exists() and meta_path.exists():
        return audio_path, json.loads(meta_path.read_text())

    opts = {
        "format": "bestaudio/best",
        "outtmpl": str(cache / "audio.%(ext)s"),
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "64",   # 64 kbps mono keeps chunks under Groq's 25 MB cap
            },
            {"key": "FFmpegMetadata"},
        ],
        "postprocessor_args": ["-ac", "1", "-ar", "16000"],
        "quiet": True,
        "no_warnings": True,
    }

    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(youtube_url, download=True)

    meta = {
        "youtube_id": info.get("id"),
        "title": info.get("title"),
        "duration_seconds": int(info.get("duration") or 0),
        "channel": info.get("channel"),
        "upload_date": info.get("upload_date"),
    }
    meta_path.write_text(json.dumps(meta, indent=2))
    return audio_path, meta
