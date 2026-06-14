"""Lecture seule : schema (colonnes) de toutes les tables crew_* existantes."""
import os, psycopg2
conn = psycopg2.connect(os.environ["SUPABASE_URL"])
conn.set_session(readonly=True, autocommit=True)
cur = conn.cursor()
cur.execute("""
  SELECT table_name, column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name LIKE 'crew%'
  ORDER BY table_name, ordinal_position;
""")
lines, cur_t = [], None
for t, c, dt, nul, dflt in cur.fetchall():
    if t != cur_t:
        lines.append(f"\n=== {t} ===")
        cur_t = t
    d = f" DEFAULT {dflt}" if dflt else ""
    lines.append(f"  {c:24} {dt:14} {'NULL' if nul=='YES' else 'NOT NULL'}{d}")
out = "\n".join(lines)
with open("crew_schema_out.txt","w",encoding="utf-8") as f: f.write(out)
print("wrote crew_schema_out.txt,", len(lines), "lines")
cur.close(); conn.close()
