"""Tests du binôme vocal : même salon obligatoire (bug Douglas).

Lance-les avec `python tests/test_wrapped_math.py` ou `pytest tests`.
wrapped_math est importe depuis utils/ ajoute au sys.path, et non via le
package utils : utils/__init__.py importe config, qui a besoin des variables
d'environnement du bot. Les calculs testes ici sont purs.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "utils"))

from wrapped_math import (
    overlap_same_channel,
    best_binome,
    membership_ok,
    hour_vibe,
    sort_sessions,
    group_by_channel,
    overlap_grouped,
    clamp_sessions,
    percentile_for,
    MEMBERSHIP_DAYS,
)


def test_same_channel_counts():
    a = [(0, 3600, "111")]
    b = [(0, 3600, "111")]
    assert abs(overlap_same_channel(a, b) - 1.0) < 1e-6


def test_different_channel_is_zero():
    # Douglas en vocal ailleurs au même moment : 0
    user = [(0, 10 * 3600, "sunny")]
    douglas = [(0, 10 * 3600, "grand-line")]
    assert overlap_same_channel(user, douglas) == 0.0


def test_missing_channel_is_zero():
    a = [(0, 7200, None)]
    b = [(0, 7200, "111")]
    assert overlap_same_channel(a, b) == 0.0
    assert overlap_same_channel([(0, 7200, None)], [(0, 7200, None)]) == 0.0


def test_partial_same_channel():
    # 2h ensemble dans sunny, Douglas aussi 8h dans un autre salon
    user = [(0, 2 * 3600, "sunny"), (2 * 3600, 4 * 3600, "sunny")]
    berat = [(3600, 3 * 3600, "sunny")]
    douglas = [(0, 12 * 3600, "afk-or-other")]
    assert abs(overlap_same_channel(user, berat) - 2.0) < 1e-6
    assert overlap_same_channel(user, douglas) == 0.0
    pick = best_binome("u", user, {
        "berat": (berat, "Berat", None),
        "doug": (douglas, "Douglas", None),
    })
    assert pick is not None
    assert pick["username"] == "Berat"
    assert pick["hours"] == 2.0


def test_douglas_always_online_does_not_win():
    user = [(100, 100 + 3 * 3600, "crew")]
    real = [(100, 100 + 3 * 3600, "crew")]
    doug = [(0, 20 * 3600, "lobby")]  # 20h ailleurs, chevauche en TEMPS mais pas en salon
    pick = best_binome("me", user, {
        "doug": (doug, "Douglas", None),
        "ami": (real, "VraiNakama", None),
    })
    assert pick["username"] == "VraiNakama"


def test_below_one_hour_ignored():
    a = [(0, 1800, "x")]
    b = [(0, 1800, "x")]
    assert best_binome("a", a, {"b": (b, "X", None)}) is None


def test_membership():
    now = 2_000_000_000
    assert membership_ok(now - MEMBERSHIP_DAYS * 86400, now) is True
    assert membership_ok(now - (MEMBERSHIP_DAYS - 1) * 86400, now) is False
    assert membership_ok(None, now) is False


def test_night_owl():
    # 23h-3h Paris (UTC+2) = 21h-1h UTC
    # timestamp 0 = 1970-01-01 00:00 UTC = 01:00 Paris → night
    night = [(0, 4 * 3600, "c")]
    v = hour_vibe(night, tz_offset_hours=2)
    assert v["vibe"] == "night_owl"


def test_sort_sessions_mixed_channel_types():
    # Les writers ne stockent pas tous le salon pareil : fermeture au restart et
    # /ajouter_vocal ecrivent None, le reste ecrit str, du legacy peut porter un int.
    # A bornes egales, un tri sur le tuple entier comparait ces types -> TypeError.
    rows = [(100.0, 500.0, None), (100.0, 500.0, "42"), (100.0, 500.0, 42)]
    out = sort_sessions(rows)
    assert len(out) == 3
    assert [ (r[0], r[1]) for r in out ] == [(100.0, 500.0)] * 3


def test_sort_sessions_is_chronological():
    rows = [(300.0, 400.0, "a"), (100.0, 900.0, None), (100.0, 200.0, "b")]
    out = sort_sessions(rows)
    assert [ (r[0], r[1]) for r in out ] == [(100.0, 200.0), (100.0, 900.0), (300.0, 400.0)]


def test_overlap_grouped_equals_overlap_same_channel():
    # best_binome regroupait les sessions de l'appelant a chaque candidat (O(N^2)).
    # La version pre-groupee doit rendre exactement le meme resultat.
    a = [(0, 2 * 3600, "sunny"), (3 * 3600, 5 * 3600, "grand-line")]
    for b in (
        [(3600, 4 * 3600, "sunny")],
        [(0, 6 * 3600, "grand-line")],
        [(0, 6 * 3600, "ailleurs")],
        [(0, 6 * 3600, None)],
        [],
    ):
        assert overlap_grouped(group_by_channel(a), b) == overlap_same_channel(a, b)


def test_best_binome_without_any_channel_returns_none():
    # Aucune session avec salon -> aucun duo possible, sans parcourir les candidats.
    mine = [(0, 10 * 3600, None)]
    others = {"x": ([(0, 10 * 3600, "sunny")], "X", None)}
    assert best_binome("me", mine, others) is None


def test_clamp_sessions_keeps_last_24h():
    # seconds_since plafonne deja chaque session a 24h, _wr_sessions ne le faisait
    # pas : un join_time corrompu de 30j donnait 720h dans le classement.
    day = 86400.0
    out = clamp_sessions([(0.0, 30 * day, "c")], day)
    assert out == [(29 * day, 30 * day, "c")]


def test_clamp_sessions_leaves_normal_sessions_alone():
    rows = [(0.0, 3600.0, "a"), (100.0, 100.0 + 6 * 3600, "b")]
    assert clamp_sessions(rows, 86400.0) == rows


def test_clamp_sessions_does_not_inflate_overlap():
    day = 86400.0
    fantome = clamp_sessions([(0.0, 30 * day, "c")], day)
    vrai = clamp_sessions([(0.0, 2 * 3600, "c")], day)
    # le fantome ne partage plus 2h avec une session du debut de fenetre
    assert overlap_same_channel(fantome, vrai) == 0.0


def test_percentile_none_when_user_has_no_hours():
    # Sans heures on n'est pas classe : renvoyer 100 faisait afficher TOP 100%.
    classement = [("a", 12.0), ("b", 3.0)]
    assert percentile_for("a", classement) == 50
    assert percentile_for("b", classement) == 100
    assert percentile_for("moi", classement) is None
    assert percentile_for("moi", []) is None


def test_percentile_ignores_zero_hour_entries():
    classement = [("a", 12.0), ("moi", 0.0)]
    assert percentile_for("a", classement) == 100
    assert percentile_for("moi", classement) is None


if __name__ == "__main__":
    tests = [fn for name, fn in list(globals().items()) if name.startswith("test_")]
    failed = 0
    for fn in tests:
        try:
            fn()
            print(f"ok  {fn.__name__}")
        except Exception as e:
            failed += 1
            print(f"FAIL {fn.__name__}: {e}")
    raise SystemExit(failed)
