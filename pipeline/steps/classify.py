"""Step 4 — classify each segment with Claude Haiku 4.5.

For each raw segment we ask the model to place it against the published
rubric (substantive / procedural / praise / attack / uproar / reading),
tag it with 0–4 topics from a controlled vocabulary, guess the segment's
business type, and — if a speaker name is mentioned or obvious from
context — return a speaker_hint that a later manual review can validate
against the MLA roster.

Every call is cached per segment; a re-run only classifies segments that
haven't been done yet, so an interrupted run costs nothing to resume.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from anthropic import Anthropic

from ..config import Config, sitting_cache
from ..schemas import Classification, RawSegment


SYSTEM_PROMPT = """You are classifying segments of the Tamil Nadu Legislative Assembly proceedings for a public dashboard.

For each segment you will output STRICT JSON — no prose, no code fences — matching this schema:
{
  "content_class": one of "substantive" | "procedural" | "praise" | "attack" | "uproar" | "reading",
  "segment_type":  one of "question_hour" | "zero_hour" | "bill" | "papers_laid" | "obituary" | "adjournment" | "demand_for_grants" | "address" | "walkout" | "other",
  "topics":        array of 0 to 4 short lowercase kebab-case tags, e.g. ["cauvery","water","farmers"],
  "speaker_hint":  string with the speaker's name if it can be identified, else null,
  "confidence":    number between 0 and 1
}

Rubric definitions:
- substantive: discussion of policy, facts, budget figures, laws, specific administrative matters
- procedural: motions, points of order, papers laid, Speaker's rulings, adjournments, voting formalities
- praise: extended eulogy of a party leader (living or deceased) that does not advance a policy argument
- attack: personal or ad-hominem criticism of an individual, party, or government that does not engage with policy substance
- uproar: overlapping speech, sloganeering, well-based protest, chair-thumping without a recognised speaker holding the floor
- reading: verbatim reading of a prepared statement, gazette, or bill text without extemporaneous engagement

Bias toward "substantive" when the segment cites specific figures, dates, schemes, or names of policies. Bias toward "praise" when honorific titles ("Puratchi Thalaivar", "Kalaignar", "Amma") and legacy-invocation dominate without policy content. Bias toward "attack" when the segment is aimed at a person or party without engaging their argument.

Output JSON only."""


def _classify_one(text: str, client: Anthropic, model: str) -> Classification:
    resp = client.messages.create(
        model=model,
        max_tokens=400,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": f"Segment transcript:\n\n{text}"}],
    )
    raw = resp.content[0].text.strip()
    # Strip accidental code fences if the model adds them
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    data = json.loads(raw)
    return Classification(
        content_class=data.get("content_class", "substantive"),
        segment_type=data.get("segment_type", "other"),
        topics=list(data.get("topics") or [])[:4],
        speaker_hint=data.get("speaker_hint"),
        confidence=float(data.get("confidence", 0.5)),
    )


def classify(segments: list[RawSegment], sitting_id: str, cfg: Config) -> list[Classification]:
    cache_dir = sitting_cache(sitting_id) / "classifications"
    cache_dir.mkdir(exist_ok=True)
    client = Anthropic(api_key=cfg.require_key("anthropic_api_key"))

    results: list[Classification] = []
    for i, seg in enumerate(segments):
        cache_file = cache_dir / f"{seg.id}.json"
        if cache_file.exists():
            results.append(Classification(**json.loads(cache_file.read_text())))
            continue
        print(f"  classifying {i+1}/{len(segments)} ({seg.id})")
        cls = _classify_one(seg.text, client, cfg.anthropic_model)
        cache_file.write_text(json.dumps(cls.to_dict(), indent=2))
        results.append(cls)
    return results
