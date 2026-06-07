"""
Generation d'images Flux via Vercel AI Gateway.

Usage:
    py flux_gen.py "ton prompt ici"
    py flux_gen.py "un kraken geant en mode One Piece, style epique" -n 3 --ratio 16:9
    py flux_gen.py "carte de rang Yonkou, dragon de feu, dark premium gold" --model bfl/flux-2-pro

La cle est lue depuis la variable d'env AI_GATEWAY_API_KEY ou depuis le fichier .env.
Les images sont sauvegardees dans flux_output/.
"""

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

BASE_URL = "https://ai-gateway.vercel.sh/v1"
OUTPUT_DIR = Path(__file__).parent / "flux_output"


def load_api_key() -> str:
    key = os.environ.get("AI_GATEWAY_API_KEY")
    if key:
        return key.strip()
    # Fallback: lire .env a la main (pas de dependance python-dotenv)
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("AI_GATEWAY_API_KEY") and "=" in line:
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit(
        "Erreur: AI_GATEWAY_API_KEY introuvable.\n"
        "Ajoute-la dans .env :  AI_GATEWAY_API_KEY=vck_xxx\n"
        "ou en variable d'environnement."
    )


def generate(prompt: str, model: str, n: int, ratio: str, fmt: str, api_key: str):
    body = {
        "model": model,
        "prompt": prompt,
        "n": n,
        "response_format": "b64_json",
        "providerOptions": {
            "blackForestLabs": {"outputFormat": fmt, "aspectRatio": ratio}
        },
    }
    req = urllib.request.Request(
        f"{BASE_URL}/images/generations",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        sys.exit(f"Echec generation ({e.code}): {detail}")
    except urllib.error.URLError as e:
        sys.exit(f"Erreur reseau: {e.reason}")


def main():
    parser = argparse.ArgumentParser(description="Generer des images Flux via Vercel AI Gateway")
    parser.add_argument("prompt", help="Le prompt de l'image")
    parser.add_argument("-n", type=int, default=1, help="Nombre d'images (defaut 1)")
    parser.add_argument("--model", default="bfl/flux-2-pro", help="Modele (defaut bfl/flux-2-pro)")
    parser.add_argument("--ratio", default="1:1", help="Aspect ratio: 1:1, 16:9, 4:3, 9:16... (defaut 1:1)")
    parser.add_argument("--format", dest="fmt", default="png", choices=["png", "jpeg"], help="Format (defaut png)")
    args = parser.parse_args()

    api_key = load_api_key()
    print(f"Generation: {args.n} image(s) | modele={args.model} | ratio={args.ratio}")
    print(f"Prompt: {args.prompt}\n")

    result = generate(args.prompt, args.model, args.n, args.ratio, args.fmt, api_key)
    data = result.get("data") or []
    if not data:
        sys.exit(f"Aucune image renvoyee. Reponse: {json.dumps(result)[:500]}")

    OUTPUT_DIR.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    saved = []
    for i, image in enumerate(data, 1):
        b64 = image.get("b64_json")
        if not b64:
            # Certains modeles renvoient une URL au lieu de base64
            url = image.get("url")
            if url:
                print(f"Image {i}: {url}")
            continue
        out = OUTPUT_DIR / f"flux_{stamp}_{i}.{args.fmt}"
        out.write_bytes(base64.b64decode(b64))
        saved.append(out)
        print(f"  -> {out}  ({out.stat().st_size // 1024} Ko)")

    if saved:
        print(f"\nTermine: {len(saved)} image(s) dans {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
