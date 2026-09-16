"""Central configuration for the ingestion pipeline.

Loads secrets from pipeline/.env, defines cache paths, and exposes constants
shared across steps. Everything that changes based on environment lives here
so no step reaches into os.environ directly.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

PIPELINE_ROOT = Path(__file__).resolve().parent
REPO_ROOT = PIPELINE_ROOT.parent
CACHE_ROOT = PIPELINE_ROOT / "cache"
DATA_SITTINGS = REPO_ROOT / "data" / "sittings"

load_dotenv(PIPELINE_ROOT / ".env")


@dataclass(frozen=True)
class Config:
    groq_api_key: str
    anthropic_api_key: str

    # Groq Whisper
    groq_whisper_model: str = "whisper-large-v3-turbo"
    groq_endpoint: str = "https://api.groq.com/openai/v1/audio/transcriptions"

    # Anthropic classifier
    anthropic_model: str = "claude-haiku-4-5"

    # Audio chunking — Groq's Whisper file-size cap is 25 MB per request.
    # An mp3 at 64 kbps runs ~28 MB per hour; we chunk at 15 min to stay under.
    chunk_minutes: int = 15

    # Segmenter defaults
    segment_max_seconds: int = 90
    segment_silence_gap_seconds: float = 1.2

    def require_key(self, name: str) -> str:
        val = getattr(self, name)
        if not val:
            raise RuntimeError(
                f"{name.upper()} is not set. Copy pipeline/.env.example to "
                f"pipeline/.env and fill it in."
            )
        return val


def load_config() -> Config:
    return Config(
        groq_api_key=os.getenv("GROQ_API_KEY", ""),
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
    )


def sitting_cache(sitting_id: str) -> Path:
    p = CACHE_ROOT / sitting_id
    p.mkdir(parents=True, exist_ok=True)
    return p
