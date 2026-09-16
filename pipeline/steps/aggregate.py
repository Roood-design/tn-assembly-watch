"""Step 5 — compute aggregates and emit the final sitting JSON.

Takes raw segments + classifications + (optionally) MLA roster and produces
the Sitting object the frontend expects. Speaker attribution is best-effort:
if the classifier's `speaker_hint` matches an MLA by fuzzy name compare,
we fill in mla_id/party; otherwise the segment ships with the raw hint.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Optional

from ..config import DATA_SITTINGS, REPO_ROOT
from ..schemas import Classification, RawSegment


def _load_mlas() -> list[dict]:
    return json.loads((REPO_ROOT / "data" / "mlas.json").read_text())


def _normalise(name: str) -> str:
    return re.sub(r"[^a-z]", "", name.lower())


def _match_mla(hint: Optional[str], mlas: list[dict]) -> Optional[dict]:
    if not hint:
        return None
    key = _normalise(hint)
    if not key:
        return None
    for m in mlas:
        if _normalise(m["name"]) in key or key in _normalise(m["name"]):
            return m
    return None


def build_sitting(
    *,
    sitting_id: str,
    date: str,
    assembly: int,
    session: int,
    sitting_number: int,
    youtube_id: str,
    duration_seconds: int,
    raw_segments: list[RawSegment],
    classifications: list[Classification],
) -> dict:
    mlas = _load_mlas()
    party_by_id = {m["mla_id"]: m["party"] for m in mlas}
    alliance_by_id = {m["mla_id"]: m["alliance"] for m in mlas}

    speaking_by_party: dict[str, float] = defaultdict(float)
    speaking_by_mla: dict[str, float] = defaultdict(float)
    speaker_name_by_id: dict[str, str] = {}
    content_split: dict[str, float] = defaultdict(float)

    out_segments: list[dict] = []
    for raw, cls in zip(raw_segments, classifications):
        matched = _match_mla(cls.speaker_hint, mlas)
        speaker = {
            "name": (matched or {}).get("name") or cls.speaker_hint or "Unidentified",
            "mla_id": (matched or {}).get("mla_id"),
            "party": (matched or {}).get("party"),
            "role": (matched or {}).get("roles", [None])[0] if matched else None,
        }
        duration = max(0.0, raw.end_seconds - raw.start_seconds)
        if matched:
            speaking_by_mla[matched["mla_id"]] += duration
            speaking_by_party[matched["party"]] += duration
            speaker_name_by_id[matched["mla_id"]] = matched["name"]
        content_split[cls.content_class] += duration

        out_segments.append({
            "id": raw.id,
            "start_seconds": int(raw.start_seconds),
            "end_seconds": int(raw.end_seconds),
            "type": cls.segment_type,
            "speaker": speaker,
            "content_class": cls.content_class,
            "topics": cls.topics,
            "transcript": raw.text,
            "confidence": {"classification": cls.confidence, "asr": None, "speaker_id": None},
        })

    speaking_leaderboard = sorted(
        (
            {
                "mla_id": mid,
                "name": speaker_name_by_id[mid],
                "party": party_by_id[mid],
                "seconds": int(secs),
            }
            for mid, secs in speaking_by_mla.items()
        ),
        key=lambda r: -r["seconds"],
    )

    total_active = int(sum(raw.end_seconds - raw.start_seconds for raw in raw_segments))

    return {
        "sitting_id": sitting_id,
        "date": date,
        "assembly": assembly,
        "session": session,
        "sitting_number": sitting_number,
        "source_mode": "asr",
        "source_notes": "Derived from ASR of the assembly video by the pipeline in pipeline/. Speaker attribution is best-effort via LLM speaker hints matched to the MLA roster; corrections welcome via pull request.",
        "video": {
            "youtube_id": youtube_id,
            "start_offset_seconds": 0,
            "duration_seconds": duration_seconds,
        },
        "official": {
            "list_of_business": [],
            "bills": [],
            "questions_count": {"starred": 0, "unstarred": 0},
        },
        "segments": out_segments,
        "events": [],
        "aggregates": {
            "speaking_time_by_party": {p: int(s) for p, s in speaking_by_party.items()},
            "speaking_time_by_speaker": speaking_leaderboard,
            "content_class_split": {c: int(s) for c, s in content_split.items()},
            "mood_series": [],   # populated by a later step from audio energy + events
            "total_active_seconds": total_active,
        },
    }


def write_sitting(sitting: dict) -> Path:
    DATA_SITTINGS.mkdir(parents=True, exist_ok=True)
    out = DATA_SITTINGS / f"{sitting['date']}.json"
    out.write_text(json.dumps(sitting, indent=2))
    return out
