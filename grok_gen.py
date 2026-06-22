"""
Génération d'images Grok (xAI Aurora) — modèle grok-2-image.

Usage:
    py grok_gen.py "ton prompt" --out nm_poster
    py grok_gen.py "île pirate épique" -n 4 --out batch

La clé est lue depuis XAI_API_KEY (env) ou .env (XAI_API_KEY=xai-...).
Images sauvées dans flux_output/ (mutualisé avec flux_gen.py).

Note xAI : l'API image n'accepte PAS de paramètres taille/ratio/qualité (grok-2-image
génère un format fixe). n max 10 par appel. Retourne b64_json ou url + revised_prompt.
"""
import argparse, base64, json, os, sys, urllib.error, urllib.request
from datetime import datetime
from pathlib import Path

BASE_URL = "https://api.x.ai/v1"
OUTPUT_DIR = Path(__file__).parent / "flux_output"


def load_api_key() -> str:
    key = os.environ.get("XAI_API_KEY")
    if key:
        return key.strip()
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("XAI_API_KEY") and "=" in line:
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("Erreur: XAI_API_KEY introuvable.\nAjoute dans .env :  XAI_API_KEY=xai-xxx")


def generate(prompt, model, n, api_key):
    body = {"model": model, "prompt": prompt, "n": n, "response_format": "b64_json"}
    req = urllib.request.Request(
        f"{BASE_URL}/images/generations",
        data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        sys.exit(f"Echec generation ({e.code}): {e.read().decode('utf-8', errors='replace')}")
    except urllib.error.URLError as e:
        sys.exit(f"Erreur reseau: {e.reason}")


def main():
    ap = argparse.ArgumentParser(description="Generer des images Grok (xAI)")
    ap.add_argument("prompt")
    ap.add_argument("-n", type=int, default=1, help="Nombre d'images (max 10)")
    ap.add_argument("--model", default="grok-2-image-1212")
    ap.add_argument("--out", default=None, help="Nom de sortie (sans extension)")
    args = ap.parse_args()

    api_key = load_api_key()
    print(f"Generation: {args.n} image(s) | modele={args.model}\nPrompt: {args.prompt}\n")
    result = generate(args.prompt, args.model, min(args.n, 10), api_key)
    data = result.get("data") or []
    if not data:
        sys.exit(f"Aucune image. Reponse: {json.dumps(result)[:500]}")

    OUTPUT_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    saved = []
    for i, img in enumerate(data, 1):
        b64 = img.get("b64_json")
        if not b64:
            if img.get("url"):
                print(f"Image {i} (url): {img['url']}")
            continue
        stem = (args.out if len(data) == 1 else f"{args.out}_{i}") if args.out else f"grok_{stamp}_{i}"
        out = OUTPUT_DIR / f"{stem}.png"
        out.write_bytes(base64.b64decode(b64))
        saved.append(out)
        rev = img.get("revised_prompt")
        print(f"  -> {out} ({out.stat().st_size // 1024} Ko)" + (f"\n     revised: {rev[:120]}" if rev else ""))
    if saved:
        print(f"\nTermine: {len(saved)} image(s) dans {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
