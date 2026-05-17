"""
tests/test_constellation.py

Tests unitaires pour constellation_builder.py.
Tester : layout, rendu (1, 5, 12, 20 membres), performance < 3s.

Usage :
    pip install pytest pytest-asyncio
    pytest tests/test_constellation.py -v
"""
from __future__ import annotations

import asyncio
import tempfile
import time
from pathlib import Path

import pytest

from utils.constellation_builder import (
    _bezier,
    _build_links,
    _compute_layout,
    _ctrl_point,
    _fmt_bounty,
    _make_poster,
    _role_color,
    build_constellation,
    POSTER_H,
    POSTER_W,
    ROLE_LEVEL,
    SCALES,
)
import random


# ── Fixtures ─────────────────────────────────────────────────────────────────

def _member(name: str, role: str = "mousse", bounty: int | None = None,
             links: list | None = None) -> dict:
    return {
        "name":         name,
        "nickname":     f"Le {name}",
        "bounty":       bounty,
        "role":         role,
        "_avatar_bytes": None,
        "links":        links or [],
    }


def _crew(n: int, captain_role: str = "capitaine") -> dict:
    roles = ["second", "navigateur", "sniper", "cuisinier",
             "medecin", "archeologue", "charpentier", "musicien",
             "bretteur", "timonier", "mousse"]
    members = [_member("Capitaine", captain_role, bounty=3_000_000_000)]
    for i in range(n - 1):
        role = roles[i % len(roles)]
        members.append(_member(f"Membre_{i+1}", role, bounty=100_000_000 * (i + 1)))
    return {"name": "TEST CREW", "members": members}


# ── Tests layout ──────────────────────────────────────────────────────────────

class TestComputeLayout:
    def test_empty(self):
        result = _compute_layout([], seed=0)
        assert result == []

    def test_single_member(self):
        members = [_member("Luffy", "capitaine", 3_000_000_000)]
        result  = _compute_layout(members, seed=0)
        pos     = result[0]["_pos"]
        assert pos["scale"] == pytest.approx(1.3)
        assert pos["rot"]   == pytest.approx(0.0)

    def test_two_members(self):
        members = _crew(2)["members"]
        result  = _compute_layout(members, seed=0)
        assert all("_pos" in m for m in result)
        # Les deux doivent être à y identique
        ys = [m["_pos"]["y"] for m in result]
        assert ys[0] == ys[1]

    def test_five_members_levels(self):
        members = _crew(5)["members"]
        result  = _compute_layout(members, seed=42)
        assert all("_pos" in m for m in result)
        # Capitaine au centre
        cap = next(m for m in result if m["role"] == "capitaine")
        assert cap["_pos"]["scale"] == pytest.approx(SCALES[0])

    def test_twelve_members_all_have_pos(self):
        members = _crew(12)["members"]
        result  = _compute_layout(members, seed=1)
        assert all("_pos" in m for m in result)

    def test_twenty_members_mosaic(self):
        members = _crew(20)["members"]
        result  = _compute_layout(members, seed=7)
        assert all("_pos" in m for m in result)
        # En mode mosaïque, toutes les rotations doivent être ±5
        rots = {abs(m["_pos"]["rot"]) for m in result}
        assert rots == {5.0}

    def test_deterministic_with_seed(self):
        members_a = _crew(8)["members"]
        members_b = _crew(8)["members"]
        result_a  = _compute_layout(members_a, seed=99)
        result_b  = _compute_layout(members_b, seed=99)
        for ma, mb in zip(result_a, result_b):
            assert ma["_pos"]["x"] == mb["_pos"]["x"]
            assert ma["_pos"]["y"] == mb["_pos"]["y"]

    def test_no_out_of_bounds(self):
        from utils.constellation_builder import WW, WH
        members = _crew(15)["members"]
        result  = _compute_layout(members, seed=0)
        for m in result:
            pos = m["_pos"]
            assert 0 <= pos["x"] <= WW, f"x={pos['x']} hors canvas"
            assert 0 <= pos["y"] <= WH, f"y={pos['y']} hors canvas"


# ── Tests utilitaires ─────────────────────────────────────────────────────────

class TestUtilities:
    def test_fmt_bounty_none(self):
        assert _fmt_bounty(None) == "??? Berry"

    def test_fmt_bounty_billions(self):
        assert "Md" in _fmt_bounty(3_000_000_000)

    def test_fmt_bounty_millions(self):
        s = _fmt_bounty(500_000_000)
        assert "500" in s and "M" in s

    def test_fmt_bounty_small(self):
        assert "1 000" in _fmt_bounty(1_000)

    def test_role_color_known(self):
        c = _role_color("capitaine")
        assert c == (185, 28, 28)

    def test_role_color_unknown_fallback(self):
        c = _role_color("unknown_role")
        assert isinstance(c, tuple) and len(c) == 3

    def test_bezier_endpoints(self):
        p0, p1, p2 = (0, 0), (100, 200), (200, 0)
        pts = _bezier(p0, p1, p2, n=10)
        assert pts[0]  == p0
        assert pts[-1] == p2
        assert len(pts) == 11

    def test_ctrl_point_returns_tuple(self):
        pt = _ctrl_point((0, 0), (200, 200), 60)
        assert isinstance(pt, tuple) and len(pt) == 2

    def test_build_links_captain_to_officers(self):
        members = [
            _member("Luffy",   "capitaine"),
            _member("Zoro",    "second"),
            _member("Nami",    "navigateur"),
            _member("Usopp",   "mousse"),
        ]
        # Attribuer _pos factice pour le test
        for m in members:
            m["_pos"] = {"x": 0, "y": 0}
        links = _build_links(members)
        types = {lnk["type"] for lnk in links}
        assert "hierarchy" in types
        # Capitaine → second ET navigateur
        hierarchy_tos = {lnk["to"] for lnk in links if lnk["type"] == "hierarchy"}
        assert "Zoro" in hierarchy_tos
        assert "Nami" in hierarchy_tos

    def test_role_level_completeness(self):
        from utils.constellation_builder import ROLE_COLORS
        for role in ROLE_COLORS:
            assert role in ROLE_LEVEL, f"Role '{role}' absent de ROLE_LEVEL"


# ── Tests poster PIL ──────────────────────────────────────────────────────────

class TestMakePoster:
    def test_correct_size(self):
        m   = _member("Test", "capitaine", 1_000_000)
        rng = random.Random(0)
        img = _make_poster(m, (185, 28, 28), rng)
        assert img.size == (POSTER_W, POSTER_H)
        assert img.mode == "RGBA"

    def test_no_image_bytes(self):
        m   = _member("Sans Photo", "mousse")
        rng = random.Random(1)
        img = _make_poster(m, (139, 69, 19), rng)
        assert img is not None

    def test_with_fake_image_bytes(self):
        from PIL import Image as PILImage
        import io
        fake_img = PILImage.new("RGBA", (100, 100), (255, 0, 0, 255))
        buf = io.BytesIO()
        fake_img.save(buf, format="PNG")
        m = _member("Avec Photo", "second", 500_000_000)
        m["_avatar_bytes"] = buf.getvalue()
        rng = random.Random(2)
        img = _make_poster(m, (30, 58, 138), rng)
        assert img.size == (POSTER_W, POSTER_H)

    def test_long_name_truncated(self):
        m   = _member("A" * 30, "mousse")
        rng = random.Random(3)
        img = _make_poster(m, (139, 69, 19), rng)
        assert img is not None  # ne doit pas lever d'exception


# ── Tests performance (async) ────────────────────────────────────────────────

class TestPerformance:
    """Tests de génération complète — peuvent prendre quelques secondes."""

    @pytest.mark.asyncio
    async def test_one_member_under_3s(self):
        crew = _crew(1)
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            path = f.name
        t0  = time.monotonic()
        out = await build_constellation(crew, path, seed=0)
        dur = time.monotonic() - t0
        assert Path(out).exists(), "Fichier non généré"
        assert dur < 3.0, f"Trop lent : {dur:.2f}s"
        Path(out).unlink(missing_ok=True)

    @pytest.mark.asyncio
    async def test_five_members_under_3s(self):
        crew = _crew(5)
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            path = f.name
        t0  = time.monotonic()
        out = await build_constellation(crew, path, seed=42)
        dur = time.monotonic() - t0
        assert Path(out).exists()
        assert dur < 3.0, f"Trop lent : {dur:.2f}s"
        size_mb = Path(out).stat().st_size / (1024 * 1024)
        assert size_mb < 2.0, f"Fichier trop lourd : {size_mb:.2f} MB"
        Path(out).unlink(missing_ok=True)

    @pytest.mark.asyncio
    async def test_twelve_members_under_3s(self):
        crew = _crew(12)
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            path = f.name
        t0  = time.monotonic()
        out = await build_constellation(crew, path, seed=7)
        dur = time.monotonic() - t0
        assert Path(out).exists()
        assert dur < 3.0, f"Trop lent : {dur:.2f}s"
        Path(out).unlink(missing_ok=True)

    @pytest.mark.asyncio
    async def test_twenty_members_under_5s(self):
        crew = _crew(20)
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            path = f.name
        t0  = time.monotonic()
        out = await build_constellation(crew, path, seed=99)
        dur = time.monotonic() - t0
        assert Path(out).exists()
        assert dur < 5.0, f"Trop lent : {dur:.2f}s"
        size_mb = Path(out).stat().st_size / (1024 * 1024)
        assert size_mb < 2.0, f"Fichier trop lourd : {size_mb:.2f} MB"
        Path(out).unlink(missing_ok=True)

    @pytest.mark.asyncio
    async def test_reproducible_with_same_seed(self):
        crew = _crew(5)
        with (
            tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f1,
            tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f2,
        ):
            path1, path2 = f1.name, f2.name
        await build_constellation(crew, path1, seed=12345)
        await build_constellation(_crew(5), path2, seed=12345)
        b1 = Path(path1).read_bytes()
        b2 = Path(path2).read_bytes()
        # Les fichiers doivent être identiques (même seed)
        assert b1 == b2, "Résultats non identiques avec même seed"
        Path(path1).unlink(missing_ok=True)
        Path(path2).unlink(missing_ok=True)

    @pytest.mark.asyncio
    async def test_no_links_option(self):
        crew = _crew(5)
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            path = f.name
        out = await build_constellation(crew, path, show_links=False, seed=0)
        assert Path(out).exists()
        Path(out).unlink(missing_ok=True)

    @pytest.mark.asyncio
    async def test_empty_crew_raises(self):
        with pytest.raises(ValueError, match="vide"):
            await build_constellation({"name": "Vide", "members": []},
                                       "/tmp/should_not_exist.png", seed=0)
