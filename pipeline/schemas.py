"""Python dataclasses that mirror the TypeScript types in src/types.ts.

Kept minimal — just the fields the pipeline reads or writes. When the TS
schema changes, this file follows.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Optional


# --- word-level ASR output (Whisper) ---

@dataclass
class Word:
    start: float
    end: float
    text: str

    def to_dict(self) -> dict:
        return {"start": self.start, "end": self.end, "text": self.text}


# --- pipeline-internal segment (before classification) ---

@dataclass
class RawSegment:
    id: str
    start_seconds: float
    end_seconds: float
    text: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "start_seconds": self.start_seconds,
            "end_seconds": self.end_seconds,
            "text": self.text,
        }


# --- classification result (per segment) ---

ContentClass = Literal[
    "substantive", "procedural", "praise", "attack", "uproar", "reading"
]

SegmentType = Literal[
    "question_hour", "zero_hour", "bill", "papers_laid", "obituary",
    "adjournment", "demand_for_grants", "address", "walkout", "other",
]


@dataclass
class Classification:
    content_class: ContentClass
    segment_type: SegmentType
    topics: list[str]
    speaker_hint: Optional[str] = None   # LLM's best guess at speaker name
    confidence: float = 0.5

    def to_dict(self) -> dict:
        return {
            "content_class": self.content_class,
            "segment_type": self.segment_type,
            "topics": self.topics,
            "speaker_hint": self.speaker_hint,
            "confidence": self.confidence,
        }
