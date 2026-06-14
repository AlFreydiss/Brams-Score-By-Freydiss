"""Lecture seule : dump complet des policies + detection anon-write permissif."""
import os, psycopg2, json

conn = psycopg2.connect(os.environ["SUPABASE_URL"])
conn.set_session(readonly=True, autocommit=True)
cur = conn.cursor()

cur.execute("""
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies WHERE schemaname='public'
    ORDER BY tablename, cmd;
""")
pols = cur.fetchall()

# tables RLS-on avec 0 policy
cur.execute("""
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity
      AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=c.relname)
    ORDER BY c.relname;
""")
zero = [r[0] for r in cur.fetchall()]

WRITE = {"INSERT", "UPDATE", "DELETE", "ALL"}
def permissive_expr(e):
    return e is None or str(e).strip().lower() in ("true", "(true)")

danger = []  # anon/public peut ecrire librement
for t, name, perm, roles, cmd, qual, wc in pols:
    rset = set(roles)
    anon = ("anon" in rset) or ("public" in rset) or (rset == {"public"})
    if cmd in WRITE and anon:
        chk = wc if cmd in ("INSERT",) else (wc if wc is not None else qual)
        if permissive_expr(chk):
            danger.append((t, name, cmd, sorted(rset), wc, qual))

lines = []
lines.append("################ POLICIES PAR TABLE ################")
cur_t = None
for t, name, perm, roles, cmd, qual, wc in pols:
    if t != cur_t:
        lines.append(f"\n=== {t} ===")
        cur_t = t
    lines.append(f"  [{cmd:6}] {name}  roles={sorted(roles)} perm={perm}")
    lines.append(f"           USING={qual}  CHECK={wc}")

lines.append("\n\n################ RLS-ON + 0 POLICY (deny-all anon) ################")
for t in zero:
    lines.append(f"  {t}")

lines.append("\n\n################ ANON/PUBLIC PEUT ECRIRE LIBREMENT (DANGER) ################")
if not danger:
    lines.append("  (aucune)")
for t, name, cmd, roles, wc, qual in danger:
    lines.append(f"  {t:28} [{cmd}] {name} roles={roles} CHECK={wc} USING={qual}")

out = "\n".join(lines)
with open("rls_policies_out.txt", "w", encoding="utf-8") as f:
    f.write(out)
print(f"{len(pols)} policies, {len(zero)} tables RLS-on sans policy, {len(danger)} policies anon-write permissives")
cur.close(); conn.close()
