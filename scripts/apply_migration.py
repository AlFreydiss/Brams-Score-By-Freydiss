"""Applique un fichier .sql a la base via le DSN SUPABASE_URL (railway run -- py -3 ...).
Usage: py -3 scripts/apply_migration.py <chemin.sql>
Lecture en utf-8-sig pour tolerer un BOM PowerShell."""
import os, sys, psycopg2

if len(sys.argv) < 2:
    raise SystemExit("usage: apply_migration.py <fichier.sql>")
path = sys.argv[1]
sql = open(path, encoding="utf-8-sig").read()

conn = psycopg2.connect(os.environ["SUPABASE_URL"])
conn.autocommit = True
cur = conn.cursor()
cur.execute(sql)
print("migration OK:", path)
cur.close()
conn.close()
