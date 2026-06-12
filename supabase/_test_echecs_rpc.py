# Test serveur des RPC echecs (phases 3-4) : simule deux joueurs en
# basculant request.jwt.claims (ce que fait PostgREST avec le JWT).
import os, json, psycopg2

dsn = os.environ["ECHECS_DSN"]
conn = psycopg2.connect(dsn)
conn.autocommit = True
cur = conn.cursor()

A = "11111111-1111-4111-8111-111111111111"
B = "22222222-2222-4222-8222-222222222222"

def as_user(uid):
    cur.execute("select set_config('request.jwt.claims', %s, false)", (json.dumps({"sub": uid, "role": "authenticated"}),))

def rpc(uid, sql, args=()):
    as_user(uid)
    cur.execute(sql, args)
    try: return cur.fetchone()
    except psycopg2.ProgrammingError: return None

ok = True
def check(nom, cond, detail=""):
    global ok
    print(("OK   " if cond else "ECHEC") + " " + nom + (f" -- {detail}" if detail and not cond else ""))
    if not cond: ok = False

# ── setup : 2 faux comptes ──
cur.execute("delete from echecs_file where user_id in (%s,%s)", (A, B))
cur.execute("delete from echecs_parties where blanc_id in (%s,%s) or noir_id in (%s,%s)", (A, B, A, B))
cur.execute("delete from echecs_profils where user_id in (%s,%s)", (A, B))
cur.execute("delete from auth.users where id in (%s,%s)", (A, B))
cur.execute("insert into auth.users (id, email) values (%s,'a@test.brams'),(%s,'b@test.brams')", (A, B))

# ── profils ──
rpc(A, "select echecs_assurer_profil('Luffy', null)")
rpc(B, "select echecs_assurer_profil('Zoro', null)")
cur.execute("select count(*), min(elo), max(elo) from echecs_profils where user_id in (%s,%s)", (A, B))
n, emin, emax = cur.fetchone()
check("profils crees a 1200", n == 2 and emin == 1200 and emax == 1200)

# ── matchmaking ──
r = rpc(A, "select echecs_apparier_ou_attendre('5+0', 1200, 'Luffy', null)")
check("A en file (retour null)", r[0] is None)
r = rpc(B, "select echecs_apparier_ou_attendre('5+0', 1200, 'Zoro', null)")
partie_id = r[0]
check("B apparie -> partie creee", partie_id is not None)
cur.execute("select blanc_id, noir_id, temps_blanc_ms, temps_noir_ms, increment_ms, trait, nb_demi_coups, statut from echecs_parties where id=%s", (partie_id,))
row = cur.fetchone()
check("temps initial 5 min", row[2] == 300000 and row[3] == 300000 and row[4] == 0)
check("file videe", True)
cur.execute("select count(*) from echecs_file where user_id in (%s,%s)", (A, B))
check("file vide apres appariement", cur.fetchone()[0] == 0)
blanc, noir = row[0], row[1]
check("couleurs = les deux joueurs", {blanc, noir} == {A, B})

# ── re-appel : retourne la partie en cours (idempotent) ──
r = rpc(A, "select echecs_apparier_ou_attendre('5+0', 1200, 'Luffy', null)")
check("re-appariement renvoie la partie en cours", str(r[0]) == str(partie_id))

# ── coups : mauvais joueur rejete ──
err = None
try:
    rpc(noir, "select echecs_jouer_coup(%s, 'fen1', 'pgn1', 'e4')", (partie_id,))
except psycopg2.Error as e:
    err = str(e)
    conn.rollback() if not conn.autocommit else None
check("coup du mauvais joueur rejete (pas_ton_tour)", err is not None and "pas_ton_tour" in err)

# ── coups gratuits (2 premiers demi-coups sans decompte) ──
r = rpc(blanc, "select echecs_jouer_coup(%s, 'fen_e4', '1. e4', 'e4')", (partie_id,))
d1 = json.loads(r[0]) if isinstance(r[0], str) else r[0]
check("coup 1 : trait passe noir", d1["trait"] == "noir" and d1["nb_demi_coups"] == 1)
check("coup 1 : temps blanc intact (coup gratuit)", d1["temps_blanc_ms"] == 300000)
r = rpc(noir, "select echecs_jouer_coup(%s, 'fen_e5', '1. e4 e5', 'e5')", (partie_id,))
d2 = json.loads(r[0]) if isinstance(r[0], str) else r[0]
check("coup 2 : temps noir intact (coup gratuit)", d2["temps_noir_ms"] == 300000 and d2["trait"] == "blanc")

# ── fin de partie : mat declare par un participant ──
r = rpc(blanc, "select echecs_terminer(%s, 'blanc', 'mat', 'fen_mat', '1. e4 e5 2. Qh5')", (partie_id,))
d3 = json.loads(r[0]) if isinstance(r[0], str) else r[0]
check("partie terminee (mat, blanc gagne)", d3["statut"] == "termine" and d3["resultat"] == "blanc" and d3["gagnant_id"] in (A, B))

# ── ELO : premiere finalisation ──
r = rpc(noir, "select echecs_finaliser_partie(%s)", (partie_id,))
e1 = json.loads(r[0]) if isinstance(r[0], str) else r[0]
check("deltas opposes et K=40 (1200 vs 1200 -> +20/-20)", e1["delta_blanc"] == 20 and e1["delta_noir"] == -20, str(e1))
cur.execute("select elo, parties, victoires, defaites, nulles from echecs_profils where user_id=%s", (blanc,))
pb = cur.fetchone()
cur.execute("select elo, parties, victoires, defaites, nulles from echecs_profils where user_id=%s", (noir,))
pn = cur.fetchone()
check("profil gagnant 1220 / 1V", pb == (1220, 1, 1, 0, 0), str(pb))
check("profil perdant 1180 / 1D", pn == (1180, 1, 0, 1, 0), str(pn))

# ── idempotence ──
r = rpc(blanc, "select echecs_finaliser_partie(%s)", (partie_id,))
e2 = json.loads(r[0]) if isinstance(r[0], str) else r[0]
check("double finalisation sans effet", e2.get("deja_traite") is True and e2["delta_blanc"] == 20)
cur.execute("select elo from echecs_profils where user_id=%s", (blanc,))
check("elo inchange apres double appel", cur.fetchone()[0] == 1220)

# ── revanche : couleurs inversees, idempotente ──
r = rpc(blanc, "select echecs_revanche(%s)", (partie_id,))
rev_id = r[0]
check("revanche creee", rev_id is not None)
r2 = rpc(noir, "select echecs_revanche(%s)", (partie_id,))
check("revanche idempotente (meme id)", str(r2[0]) == str(rev_id))
cur.execute("select blanc_id, noir_id, blanc_elo, noir_elo, statut from echecs_parties where id=%s", (rev_id,))
rv = cur.fetchone()
check("couleurs inversees", rv[0] == noir and rv[1] == blanc)
check("elos a jour dans la revanche", {rv[2], rv[3]} == {1220, 1180}, str(rv))

# ── abandon sur la revanche ──
r = rpc(rv[0], "select echecs_abandonner(%s)", (rev_id,))
d4 = json.loads(r[0]) if isinstance(r[0], str) else r[0]
check("abandon : l'appelant perd", d4["statut"] == "abandonnee" and d4["cause"] == "abandon" and d4["gagnant_id"] == rv[1])

# ── reclamer_temps : rien ne tombe si temps restant ──
r = rpc(A, "select echecs_apparier_ou_attendre('1+0', 1200, 'Luffy', null)")
r = rpc(B, "select echecs_apparier_ou_attendre('1+0', 1200, 'Zoro', null)")
p2 = r[0]
cur.execute("select blanc_id from echecs_parties where id=%s", (p2,))
b2 = cur.fetchone()[0]
n2 = B if b2 == A else A
rpc(b2, "select echecs_jouer_coup(%s, 'f', 'p', 'e4')", (p2,))
rpc(n2, "select echecs_jouer_coup(%s, 'f', 'p', 'e5')", (p2,))
r = rpc(b2, "select echecs_reclamer_temps(%s)", (p2,))
d5 = json.loads(r[0]) if isinstance(r[0], str) else r[0]
check("pas de drapeau si temps restant", d5["statut"] == "en_cours")
# simule un drapeau : on antidate dernier_coup_at de 2 minutes (cadence 1+0)
cur.execute("update echecs_parties set dernier_coup_at = now() - interval '2 minutes' where id=%s", (p2,))
r = rpc(n2, "select echecs_reclamer_temps(%s)", (p2,))
d6 = json.loads(r[0]) if isinstance(r[0], str) else r[0]
check("drapeau valide par le serveur", d6["statut"] == "termine" and d6["cause"] == "temps")
check("le joueur au trait perd au temps", d6["resultat"] == ("noir" if d6["trait"] == "blanc" else "blanc"))

# ── nulle sur accord (3e partie) ──
rpc(A, "select echecs_apparier_ou_attendre('3+2', 1200, 'Luffy', null)")
r = rpc(B, "select echecs_apparier_ou_attendre('3+2', 1200, 'Zoro', null)")
p3 = r[0]
r = rpc(A, "select echecs_nulle_accord(%s)", (p3,))
d7 = json.loads(r[0]) if isinstance(r[0], str) else r[0]
check("nulle sur accord", d7["statut"] == "termine" and d7["resultat"] == "nulle" and d7["cause"] == "nulle_accord")
r = rpc(B, "select echecs_finaliser_partie(%s)", (p3,))
e3 = json.loads(r[0]) if isinstance(r[0], str) else r[0]
check("nulle : deltas compensent l'ecart d'elo", e3["delta_blanc"] + e3["delta_noir"] <= 1, str(e3))
cur.execute("select nulles from echecs_profils where user_id=%s", (A,))
check("compteur nulles incremente", cur.fetchone()[0] >= 1)

# ── increment : cadence 3+2 -> increment_ms=2000 ──
cur.execute("select increment_ms from echecs_parties where id=%s", (p3,))
check("increment 3+2 = 2000 ms", cur.fetchone()[0] == 2000)

# ── nettoyage ──
as_user(A)
cur.execute("select set_config('request.jwt.claims', '', false)")
cur.execute("delete from echecs_parties where blanc_id in (%s,%s) or noir_id in (%s,%s)", (A, B, A, B))
cur.execute("delete from echecs_file where user_id in (%s,%s)", (A, B))
cur.execute("delete from echecs_profils where user_id in (%s,%s)", (A, B))
cur.execute("delete from auth.users where id in (%s,%s)", (A, B))
conn.close()
print()
print("RESULTAT GLOBAL :", "TOUT OK" if ok else "DES ECHECS (sans jeu de mots)")
raise SystemExit(0 if ok else 1)
