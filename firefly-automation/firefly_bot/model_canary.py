"""Executa um canário isolado para um modelo do Firefly."""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sqlite3
import time
from pathlib import Path

from .config import Config
from .job_store import JobStore
from .logging_utils import configure_logging
from .worker import Worker


PROMPT = (
    "Use the first frame exactly. Create a realistic documentary shot of hidden water pipes "
    "under a quiet street. Subtle camera push-in. Blue infrastructure stays stable. "
    "Yellow water flow pulses gently through the pipes. No text. No logos."
)


def _insert_canary(
    config: Config,
    job_id: int,
    model: str,
    resolution: str,
    aspect_ratio: str,
    duration: int,
    image_path: Path,
    name: str,
) -> None:
    conn = sqlite3.connect(config.db_path)
    try:
        now = time.time()
        with conn:
            conn.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
            conn.execute(
                """
                INSERT INTO jobs (
                    id, prompt, image_path, status, attempts, updated_at, model,
                    resolution, aspect_ratio, duration_seconds, generate_audio, name
                ) VALUES (?, ?, ?, 'pending', 0, ?, ?, ?, ?, ?, 0, ?)
                """,
                (
                    job_id,
                    PROMPT,
                    str(image_path.resolve()),
                    now,
                    model,
                    resolution,
                    aspect_ratio,
                    duration,
                    name,
                ),
            )
            conn.execute(
                "UPDATE system_state SET status = ?, reason = NULL, updated_at = ? WHERE singleton = 1",
                ("running", now),
            )
    finally:
        conn.close()


def _read_job(config: Config, job_id: int) -> dict[str, object]:
    conn = sqlite3.connect(config.db_path)
    conn.row_factory = sqlite3.Row
    try:
        row = conn.execute(
            "SELECT id, name, status, attempts, model, duration_seconds, error, output_path FROM jobs WHERE id = ?",
            (job_id,),
        ).fetchone()
        return dict(row) if row else {"id": job_id, "status": "MISSING"}
    finally:
        conn.close()


def main() -> int:
    parser = argparse.ArgumentParser(prog="python -m firefly_bot.model_canary")
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--model", required=True)
    parser.add_argument("--resolution", default="1080p")
    parser.add_argument("--aspect-ratio", default="16:9")
    parser.add_argument("--duration", type=int, default=5)
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--job-id", type=int, default=-9001)
    parser.add_argument("--name", default=None)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    configure_logging()
    config = Config.from_root(args.root.resolve())
    name = args.name or f"MODEL_CANARY_{args.model.upper().replace(' ', '_').replace('.', '_')}"
    _insert_canary(
        config,
        args.job_id,
        args.model,
        args.resolution,
        args.aspect_ratio,
        args.duration,
        args.image,
        name,
    )
    logger = logging.getLogger("firefly_bot.model_canary")
    store = JobStore(config.db_path)
    store.initialize()
    exit_code = asyncio.run(Worker(config, store, logger).run_batch(1))
    row = _read_job(config, args.job_id)
    result = {
        "schema": "firefly.model-canary.v1",
        "model": args.model,
        "resolution": args.resolution,
        "aspect_ratio": args.aspect_ratio,
        "duration_seconds": args.duration,
        "worker_exit_code": exit_code,
        "job": row,
        "captured_at": time.time(),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if row.get("status") == "done" else 1


if __name__ == "__main__":
    raise SystemExit(main())
