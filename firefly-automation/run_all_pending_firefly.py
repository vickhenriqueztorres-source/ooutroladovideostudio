import sqlite3
import subprocess
import sys
import time
from pathlib import Path

base = Path("/Volumes/Macintosh HD - Dados/Users/macmini/ooutroladovideostudio/firefly-automation")
python_bin = str(base / ".venv" / "bin" / "python")
db_path = base / "data" / "firefly_jobs.db"
guide_path = base / "guia_vila_rica_18_restantes.json"

subprocess.run([python_bin, "main.py", "--feed-guide", str(guide_path)], cwd=str(base), check=True)

max_rounds = 15
for round_idx in range(1, max_rounds + 1):
    conn = sqlite3.connect(str(db_path))
    conn.execute("UPDATE system_state SET status='running'")
    conn.execute(
        "UPDATE jobs SET status='pending', attempts=0 WHERE id >= 9 AND status NOT IN ('done')"
    )
    conn.commit()
    pending = conn.execute(
        "SELECT id, name FROM jobs WHERE id >= 9 AND status != 'done' ORDER BY id"
    ).fetchall()
    conn.close()

    if not pending:
        print("TODOS OS 24 TAKES DO FIREFLY FORAM CONCLUÍDOS COM SUCESSO!")
        break

    concurrency = min(4, len(pending))
    print(f"\n=== RODADA {round_idx}: {len(pending)} takes pendentes (concurrency={concurrency}) ===")
    print("Pendentes:", [p[1] for p in pending])

    subprocess.run(
        [python_bin, "main.py", "worker-once", "--concurrency", str(concurrency)],
        cwd=str(base),
    )
    time.sleep(3)
