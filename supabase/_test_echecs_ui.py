# Tests UI Phases 1-2 : règles via la vraie interface (hotseat) + IA Stockfish.
from playwright.sync_api import sync_playwright
import sys, time

URL = "http://localhost:5173/echecs"
errs, ok = [], True

def check(nom, cond, detail=""):
    global ok
    print(("OK   " if cond else "ECHEC") + " " + nom + (f" -- {detail}" if detail and not cond else ""))
    if not cond: ok = False

# Coordonnées d'une case (orientation blanche) dans le plateau
FILES = "abcdefgh"
def case_xy(box, case):
    f = FILES.index(case[0]); r = int(case[1])
    return box["x"] + (f + 0.5) * box["width"] / 8, box["y"] + (8 - r + 0.5) * box["height"] / 8

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.on("pageerror", lambda e: errs.append(str(e)))
    reponses_ko = []
    pg.on("response", lambda r: reponses_ko.append(f"{r.status} {r.url}") if r.status >= 400 and "stockfish" in r.url else None)

    pg.goto(URL, wait_until="domcontentloaded")
    pg.wait_for_timeout(3500)

    # ── Hub visible ──
    check("hub echecs charge", pg.locator("text=Échecs").first.is_visible())
    pg.screenshot(path=r"C:\Users\Feydi\Desktop\brams-web-clone\supabase\_echecs_hub.png")

    # ── Phase 1 : hotseat ──
    pg.locator("text=2 joueurs locaux").first.click(force=True)
    pg.wait_for_timeout(1200)
    wrap = pg.locator('[data-testid="plateau-wrap"]')
    wrap.wait_for(state="visible", timeout=8000)
    box = wrap.bounding_box()
    check("plateau affiche", box is not None and box["width"] > 200)

    def clic(case):
        x, y = case_xy(box, case)
        pg.mouse.click(x, y)
        pg.wait_for_timeout(260)

    def etat(expr):
        return pg.evaluate(f"window.__echecsPartie && ({expr})")

    def jouer_api(san_list):
        for san in san_list:
            r = pg.evaluate(f"!!window.__echecsPartie.jouerSan('{san}')")
            if not r: return san
            pg.wait_for_timeout(40)
        return None

    # clic-clic : 1. e4
    clic("e2"); clic("e4")
    check("clic-clic e2-e4 joue", etat("__echecsPartie.historique.length === 1"))
    # coup illégal rejeté : e4-e6 direct
    clic("e4"); clic("e6")
    check("coup illegal rejete (e4-e6)", etat("__echecsPartie.historique.length === 1"))

    # prise en passant via l'UI : 1...a6 2. e5 d5 3. exd6 e.p.
    rate = jouer_api(["a6", "e5", "d5"])
    check("mise en place en passant", rate is None, rate)
    clic("e5"); clic("d6")
    check("prise EN PASSANT jouee par clic", etat("__echecsPartie.dernierCoup && __echecsPartie.dernierCoup.flags.includes('e')"))

    # roque côté roi (blanc) via l'UI : libère f1/g1 puis O-O
    pg.evaluate("window.__echecsPartie.reinitialiser()")
    pg.wait_for_timeout(200)
    rate = jouer_api(["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"])
    check("mise en place roque", rate is None, rate)
    clic("e1"); clic("g1")
    check("PETIT ROQUE joue par clic (O-O)", etat("__echecsPartie.dernierCoup && __echecsPartie.dernierCoup.san === 'O-O'"))

    # grand roque (noir) : via API pour aller vite
    rate = jouer_api(["d6", "d3", "Be6", "Be3", "Qd7", "Qd2"])
    check("mise en place grand roque noir", rate is None, rate)
    clic("e8"); clic("c8")
    check("GRAND ROQUE noir joue par clic (O-O-O)", etat("__echecsPartie.dernierCoup && __echecsPartie.dernierCoup.san === 'O-O-O'"))

    # promotion avec SOUS-PROMOTION cavalier via le sélecteur
    pg.evaluate("window.__echecsPartie.reinitialiser()")
    pg.wait_for_timeout(200)
    rate = jouer_api(["h4", "g5", "hxg5", "Nf6", "g6", "Ne4", "g7", "Nc5"])
    check("mise en place promotion", rate is None, rate)
    clic("g7"); clic("g8")
    selecteur = pg.locator('button[title="Cavalier"]')
    check("selecteur de promotion affiche", selecteur.is_visible())
    pg.screenshot(path=r"C:\Users\Feydi\Desktop\brams-web-clone\supabase\_echecs_promo.png")
    selecteur.click()
    pg.wait_for_timeout(300)
    check("SOUS-PROMOTION cavalier (=N)", etat("__echecsPartie.dernierCoup && __echecsPartie.dernierCoup.san.includes('=N')"))

    # mat du berger → modale de fin
    pg.evaluate("window.__echecsPartie.reinitialiser()")
    pg.wait_for_timeout(200)
    rate = jouer_api(["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6"])
    check("mise en place mat du berger", rate is None, rate)
    clic("h5"); clic("f7")
    check("MAT du berger detecte", etat("__echecsPartie.fin.terminee && __echecsPartie.fin.cause === 'mat' && __echecsPartie.fin.resultat === 'blanc'"))
    pg.wait_for_timeout(800)
    check("modale de fin affichee", pg.locator("text=Échec et mat").is_visible())
    pg.screenshot(path=r"C:\Users\Feydi\Desktop\brams-web-clone\supabase\_echecs_mat.png")
    pg.locator("text=Fermer").click()

    # pat (plus court pat connu, 10 coups) — via API
    pg.evaluate("window.__echecsPartie.reinitialiser()")
    pg.wait_for_timeout(200)
    rate = jouer_api(["e3", "a5", "Qh5", "Ra6", "Qxa5", "h5", "Qxc7", "Rah6", "h4", "f6", "Qxd7+", "Kf7", "Qxb7", "Qd3", "Qxb8", "Qh7", "Qxc8", "Kg6", "Qe6"])
    check("PAT detecte (cause pat, nulle)", etat("__echecsPartie.fin.terminee && __echecsPartie.fin.cause === 'pat' && __echecsPartie.fin.resultat === 'nulle'"))

    # triple répétition
    pg.evaluate("window.__echecsPartie.reinitialiser()")
    pg.wait_for_timeout(200)
    rate = jouer_api(["Nf3", "Nf6", "Ng1", "Ng8", "Nf3", "Nf6", "Ng1", "Ng8"])
    check("TRIPLE REPETITION detectee", etat("__echecsPartie.fin.terminee && __echecsPartie.fin.cause === 'repetition'"))

    # ── Phase 2 : solo vs IA (Mousse) ──
    pg.goto(URL, wait_until="domcontentloaded")
    pg.wait_for_timeout(2200)
    pg.locator("text=Contre l'IA").first.click(force=True)
    pg.wait_for_timeout(800)
    pg.locator("text=Mousse").first.click(force=True)
    pg.locator("text=♔ Blancs").first.click(force=True)
    pg.locator("text=Hisser les voiles").first.click(force=True)
    pg.wait_for_timeout(1500)
    wrap = pg.locator('[data-testid="plateau-wrap"]')
    wrap.wait_for(state="visible", timeout=8000)
    box = wrap.bounding_box()
    t0 = time.time()
    clic("e2"); clic("e4")
    check("mon coup joue contre l'IA", etat("__echecsPartie.historique.length >= 1"))
    # l'IA doit répondre avec un coup LEGAL (appliqué par chess.js)
    repondu = False
    while time.time() - t0 < 12:
        if pg.evaluate("window.__echecsPartie.historique.length >= 2"):
            repondu = True; break
        pg.wait_for_timeout(250)
    check("l'IA (Stockfish worker) repond en <12 s", repondu)
    check("le coup de l'IA est legal (applique par chess.js)", etat("__echecsPartie.historique.length >= 2"))
    # UI pas gelée : un evaluate répond instantanément
    t1 = time.time()
    pg.evaluate("1+1")
    check("UI non gelee (worker separe)", time.time() - t1 < 1)
    check("stockfish charge sans 404", not reponses_ko, str(reponses_ko))
    pg.screenshot(path=r"C:\Users\Feydi\Desktop\brams-web-clone\supabase\_echecs_ia.png")

    print()
    print("pageerrors:", errs if errs else "aucune")
    if errs: ok = False
    b.close()

print("RESULTAT GLOBAL :", "TOUT OK" if ok else "ECHECS DETECTES")
sys.exit(0 if ok else 1)
