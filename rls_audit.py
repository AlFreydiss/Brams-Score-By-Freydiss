"""Audit lecture seule : RLS + policies sur les tables public. Aucune écriture."""
import os, psycopg2

dsn = os.environ["SUPABASE_URL"]
conn = psycopg2.connect(dsn)
conn.set_session(readonly=True, autocommit=True)
cur = conn.cursor()

# Tables publiques + flag RLS + nb policies + estimation lignes
cur.execute("""
    SELECT c.relname,
           c.relrowsecurity        AS rls_on,
           c.relforcerowsecurity   AS rls_forced,
           (SELECT count(*) FROM pg_policies p
              WHERE p.schemaname='public' AND p.tablename=c.relname) AS n_policies,
           c.reltuples::bigint      AS est_rows
    FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r'
    ORDER BY c.relrowsecurity, c.relname;
""")
rows = cur.fetchall()
no_rls = [r for r in rows if not r[1]]
with_rls = [r for r in rows if r[1]]

lines = []
lines.append(f"=== {len(rows)} tables public — {len(no_rls)} SANS RLS, {len(with_rls)} AVEC ===")
lines.append("")
lines.append(">>> SANS RLS (lisibles/modifiables via anon) <<<")
for name, rls, forced, npol, est in no_rls:
    warn = "  <-- 0 policy" if npol == 0 else ""
    lines.append(f"  NO-RLS  {name:32} policies={npol:<2} ~{est}{warn}")
lines.append("")
lines.append(">>> AVEC RLS <<<")
for name, rls, forced, npol, est in with_rls:
    flag = " FORCED" if forced else ""
    lines.append(f"  RLS-ON  {name:32} policies={npol:<2}{flag} ~{est}")

out = "\n".join(lines)
print(out)
with open("rls_audit_out.txt", "w", encoding="utf-8") as f:
    f.write(out)

cur.close(); conn.close()
