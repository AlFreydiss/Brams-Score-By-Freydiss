"""
Batch de generation des assets visuels Brams Community via Flux (AI Gateway).
Lance flux_gen.py pour chaque asset, en serie (evite les timeouts du parallele).

    py flux_batch.py            # tout
    py flux_batch.py ranks      # seulement les fonds de rang
    py flux_batch.py site       # seulement les visuels site
"""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
GEN = HERE / "flux_gen.py"

# Style commun: dark premium gold, univers One Piece, fond utilisable en CARTE
# (atmospherique, pas de personnage central qui bloque l'avatar/texte, pas de texte).
STYLE = ("dark premium cinematic, very dark near-black base color #08090D, "
         "gold accents #BFA46A, no text, no watermark, no people, "
         "atmospheric establishing background with empty space for overlay, ultra detailed, 8k")

RANKS = [
    ("pirate_bg", "16:9",
     "sunrise over a calm vast ocean, a lone small pirate ship sailing toward a golden horizon, "
     "warm amber dawn light, hopeful rookie departure mood, " + STYLE),
    ("shichibukai_bg", "16:9",
     "a regal dark stone hall overlooking a moonlit sea, government warlord banners in shadow, "
     "deep teal and gold ambience, cold prestige and authority mood, " + STYLE),
    ("amiral_bg", "16:9",
     "a towering stormy sky over the sea pierced by beams of indigo and violet light, distant lightning, "
     "absolute justice aura, heavy imposing atmosphere, purple and gold tones, " + STYLE),
    ("yonkou_bg", "16:9",
     "a raging crimson storm over a black ocean, emperor of the sea aura, red and gold lightning, "
     "overwhelming dominant menacing power, embers in the air, " + STYLE),
    ("roi_des_pirates_bg", "16:9",
     "the end of the grand line, a radiant golden throne of treasure under a glowing crown of light, "
     "ultimate majestic pirate king mood, rays of intense gold, legendary, " + STYLE),
]

SITE = [
    ("site_hero_landscape", "16:9",
     "epic cinematic hero banner for an anime community website, a pirate crew in dramatic silhouette "
     "standing on a ship deck facing a vast night ocean, huge golden sun low on the horizon, mist, "
     "sense of adventure and belonging, " + STYLE),
    ("site_hero_vertical", "9:16",
     "vertical mobile story visual for an anime community, a majestic ship sailing a starry night ocean, "
     "golden moon, mysterious epic atmosphere, cinematic vertical composition, " + STYLE),
    ("site_texture_gold", "16:9",
     "abstract luxury background texture, dark near-black with subtle flowing gold particles and soft bokeh, "
     "very minimal, premium section background, " + STYLE),
]


def run(name, ratio, prompt):
    print(f"\n===== {name} ({ratio}) =====", flush=True)
    r = subprocess.run([sys.executable, str(GEN), prompt, "--ratio", ratio, "--out", name],
                       cwd=str(HERE))
    return r.returncode == 0


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else "all"
    jobs = []
    if which in ("all", "ranks"):
        jobs += RANKS
    if which in ("all", "site"):
        jobs += SITE
    ok, fail = [], []
    for name, ratio, prompt in jobs:
        (ok if run(name, ratio, prompt) else fail).append(name)
    print("\n========== RESUME ==========")
    print(f"OK   ({len(ok)}): {', '.join(ok)}")
    if fail:
        print(f"FAIL ({len(fail)}): {', '.join(fail)}")


if __name__ == "__main__":
    main()
