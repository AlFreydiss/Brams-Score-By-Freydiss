from __future__ import annotations
import random
from datetime import datetime, timezone, timedelta

import discord

from . import database as db
from .constants import (
    SEP, GOLD, GREEN, RED, FOOTER, SHOP_ITEMS,
    SLOTS_EMOJIS, SLOTS_WEIGHTS, SLOTS_MULT,
    ROUGE, NOIR, PIRATES,
    PILLAGE_SUCCESS, PILLAGE_MIN, PILLAGE_MAX, PILLAGE_PENALTY, PILLAGE_COOLDOWN,
    INVEST_RATE, INVEST_INTERVAL, INVEST_CAP,
    DAILY_MIN,
)
from .utils import (
    fmt, get_rank, get_next_rank, daily_cap,
    get_earned_today, add_earned_today,
    parse_amount, mk_embed, err_embed, is_owner, deny,
    new_deck, hand_value, fmt_hand,
)


# ══════════════════════════════════════════════════════════════════
#  VUE PRINCIPALE — /bank
# ══════════════════════════════════════════════════════════════════

class BankView(discord.ui.View):
    message: discord.Message | None = None

    def __init__(self, uid: str, guild_id: str, profile: dict):
        super().__init__(timeout=300)
        self.uid      = uid
        self.guild_id = guild_id
        self.profile  = profile

    async def _check(self, i: discord.Interaction) -> bool:
        if not is_owner(self.uid, i):
            await deny(i); return False
        return True

    @discord.ui.button(label="Mini-Jeux", emoji="🎮", style=discord.ButtonStyle.primary, row=0)
    async def btn_jeux(self, i: discord.Interaction, _):
        if not await self._check(i): return
        balance = i.client.get_berrys(self.uid)
        cap     = daily_cap(balance)
        earned  = get_earned_today(self.uid)
        embed   = _minijeux_embed(balance, cap, earned)
        await i.response.edit_message(embed=embed, view=MiniJeuxView(self.uid, self.guild_id, cap))

    @discord.ui.button(label="Revenus Passifs", emoji="💰", style=discord.ButtonStyle.success, row=0)
    async def btn_revenus(self, i: discord.Interaction, _):
        if not await self._check(i): return
        profile = await db.get_or_create(self.uid, self.guild_id)
        embed, view = _revenus_embed_view(self.uid, self.guild_id, profile)
        await i.response.edit_message(embed=embed, view=view)

    @discord.ui.button(label="Pillage", emoji="🏴‍☠️", style=discord.ButtonStyle.danger, row=0)
    async def btn_pillage(self, i: discord.Interaction, _):
        if not await self._check(i): return
        embed = mk_embed("🏴‍☠️ Pillage", f"{SEP}\nChoisis ta cible dans la liste ci-dessous.\n\n"
                         "**Succès :** 40% · Vole 5-15% du solde\n"
                         "**Échec :** Tu perds 10% de ce que tu aurais volé\n"
                         f"**Cooldown :** {PILLAGE_COOLDOWN}h entre chaque pillage\n{SEP}")
        await i.response.edit_message(embed=embed, view=PillageView(self.uid, self.guild_id))

    @discord.ui.button(label="Boutique", emoji="🛒", style=discord.ButtonStyle.secondary, row=1)
    async def btn_boutique(self, i: discord.Interaction, _):
        if not await self._check(i): return
        balance = i.client.get_berrys(self.uid)
        embed   = _boutique_embed(balance)
        await i.response.edit_message(embed=embed, view=BoutiqueView(self.uid, self.guild_id))

    @discord.ui.button(label="Loterie", emoji="🎟️", style=discord.ButtonStyle.secondary, row=1)
    async def btn_loterie(self, i: discord.Interaction, _):
        if not await self._check(i): return
        lotto = await db.ensure_lottery(self.guild_id)
        embed = _loterie_embed(lotto)
        await i.response.edit_message(embed=embed, view=LoterieView(self.uid, self.guild_id, lotto))

    @discord.ui.button(label="Stats & Classement", emoji="📊", style=discord.ButtonStyle.secondary, row=1)
    async def btn_stats(self, i: discord.Interaction, _):
        if not await self._check(i): return
        await i.response.defer()
        profile = await db.get_or_create(self.uid, self.guild_id)
        stats   = await db.get_game_stats(self.uid)
        embed   = _stats_embed(i.user, profile, stats)
        await i.edit_original_response(embed=embed, view=StatsView(self.uid, self.guild_id))

    @discord.ui.button(label="Fermer", emoji="✖️", style=discord.ButtonStyle.secondary, row=2)
    async def btn_fermer(self, i: discord.Interaction, _):
        await i.response.defer()
        await i.delete_original_response()


# ══════════════════════════════════════════════════════════════════
#  MINI-JEUX
# ══════════════════════════════════════════════════════════════════

def _minijeux_embed(balance: int, cap: int, earned: int) -> discord.Embed:
    dispo = max(0, cap - earned)
    e = discord.Embed(title="🎮 Mini-Jeux — Freydiss Bank",
                      description="*Que le meilleur pirate gagne !*", color=GOLD)
    e.add_field(name="💰 En poche",     value=f"**{fmt(balance)}**",             inline=True)
    e.add_field(name="📊 Gains restants/jour", value=f"**{fmt(dispo)}**\n*sur {fmt(cap)}*", inline=True)
    e.add_field(name="​", value="​", inline=True)
    e.add_field(name="🎮 Jeux disponibles", inline=False, value=(
        "🎲 **Dés** — Total > 7 · `×2`\n"
        "🎰 **Slots** — Aligne 3 symboles\n"
        "🃏 **Blackjack** — Bats le croupier\n"
        "🪙 **Pile ou Face** — 50/50 · `×2`\n"
        "✊ **Chifoumi** — vs le bot · `×2`\n"
        "🎡 **Roulette** — Rouge/Noir `×2` · Numéro `×36`\n"
        "☠️ **Course Pirates** — 4 pirates · `×4`\n"
        "🔢 **Devinette** — Devine 1-10 · `×8`"
    ))
    e.set_footer(text=FOOTER)
    return e


class MiniJeuxView(discord.ui.View):
    def __init__(self, uid: str, guild_id: str, cap: int):
        super().__init__(timeout=180)
        self.uid      = uid
        self.guild_id = guild_id
        self.cap      = cap

    def _rem(self) -> int:
        return max(0, self.cap - get_earned_today(self.uid))

    async def _check(self, i):
        if not is_owner(self.uid, i):
            await deny(i); return False
        if self._rem() <= 0:
            await i.response.send_message(embed=err_embed(
                "La Marine a bloqué tes gains pour aujourd'hui !\n"
                f"Limite journalière atteinte (`{fmt(self.cap)}` ฿)."
            ), ephemeral=True)
            return False
        return True

    @discord.ui.button(label="Dés",            emoji="🎲", style=discord.ButtonStyle.primary,   row=0)
    async def btn_des(self, i, _):
        if not await self._check(i): return
        await i.response.send_modal(DesBetModal(self.uid, self.guild_id, self._rem()))

    @discord.ui.button(label="Slots",          emoji="🎰", style=discord.ButtonStyle.primary,   row=0)
    async def btn_slots(self, i, _):
        if not await self._check(i): return
        await i.response.send_modal(SlotsBetModal(self.uid, self.guild_id, self._rem()))

    @discord.ui.button(label="Blackjack",      emoji="🃏", style=discord.ButtonStyle.primary,   row=0)
    async def btn_bj(self, i, _):
        if not await self._check(i): return
        await i.response.send_modal(BlackjackBetModal(self.uid, self.guild_id, self._rem()))

    @discord.ui.button(label="Pile ou Face",   emoji="🪙", style=discord.ButtonStyle.secondary, row=1)
    async def btn_pof(self, i, _):
        if not await self._check(i): return
        await i.response.send_modal(PofBetModal(self.uid, self.guild_id, self._rem()))

    @discord.ui.button(label="Chifoumi",       emoji="✊", style=discord.ButtonStyle.secondary, row=1)
    async def btn_chi(self, i, _):
        if not await self._check(i): return
        await i.response.send_modal(ChifoumiModal(self.uid, self.guild_id, self._rem()))

    @discord.ui.button(label="Roulette",       emoji="🎡", style=discord.ButtonStyle.secondary, row=1)
    async def btn_rou(self, i, _):
        if not await self._check(i): return
        await i.response.send_modal(RouletteBetModal(self.uid, self.guild_id, self._rem()))

    @discord.ui.button(label="Course Pirates", emoji="☠️", style=discord.ButtonStyle.danger,    row=2)
    async def btn_course(self, i, _):
        if not await self._check(i): return
        await i.response.send_modal(CoursesBetModal(self.uid, self.guild_id, self._rem()))

    @discord.ui.button(label="Devinette",      emoji="🔢", style=discord.ButtonStyle.success,   row=2)
    async def btn_dev(self, i, _):
        if not await self._check(i): return
        await i.response.send_modal(DevBetModal(self.uid, self.guild_id, self._rem()))

    @discord.ui.button(label="Retour",         emoji="↩️", style=discord.ButtonStyle.secondary, row=2)
    async def btn_retour(self, i, _):
        if not is_owner(self.uid, i):
            await deny(i); return
        profile = await db.get_or_create(self.uid, self.guild_id)
        balance = i.client.get_berrys(self.uid)
        embed   = await _main_embed(i.client, self.uid, self.guild_id, profile, balance)
        await i.response.edit_message(embed=embed, view=BankView(self.uid, self.guild_id, profile))


async def _game_check(i, uid, amount, rem) -> bool:
    wallet = i.client.get_berrys(uid)
    if amount is None or amount <= 0:
        await i.followup.send(embed=err_embed("Mise invalide, Rookie !"), ephemeral=True); return False
    if wallet < amount:
        await i.followup.send(embed=err_embed(f"Tu n'as pas assez de Berrys !\nSolde : `{fmt(wallet)}` ฿"), ephemeral=True); return False
    if amount > rem:
        await i.followup.send(embed=err_embed(f"Cette mise dépasse ta limite de gains du jour (`{fmt(rem)}` ฿ restants)."), ephemeral=True); return False
    return True


async def _game_win(i, uid, guild_id, amount, game, boost=False):
    gained = amount * 2 if boost else amount
    gained = min(gained, get_earned_today.__module__ and gained)  # no extra cap here
    i.client.add_berrys(uid, gained)
    add_earned_today(uid, gained)
    await db.log_tx(uid, guild_id, f"jeu_{game}", gained, f"Gain {game}")
    return gained


async def _game_loss(i, uid, guild_id, amount, game):
    i.client.spend_berrys(uid, amount)
    await db.log_tx(uid, guild_id, f"jeu_{game}", -amount, f"Perte {game}")


# ── Dés ───────────────────────────────────────────────────────────

class DesBetModal(discord.ui.Modal, title="🎲 Dés — Ta mise"):
    mise = discord.ui.TextInput(label="Montant", placeholder="Ex : 10 000  ou  50k", max_length=15)

    def __init__(self, uid, guild_id, rem):
        super().__init__(); self.uid = uid; self.guild_id = guild_id; self.rem = rem

    async def on_submit(self, i: discord.Interaction):
        await i.response.defer(ephemeral=True)
        amount = parse_amount(self.mise.value, i.client.get_berrys(self.uid))
        if not await _game_check(i, self.uid, amount, self.rem): return
        boost = bool(await db.get_effect(self.uid, "boost_x2"))
        d1, d2 = random.randint(1,6), random.randint(1,6)
        total = d1 + d2
        faces = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣"]
        if total > 7:
            gained = await _game_win(i, self.uid, self.guild_id, amount, "des", boost)
            desc = f"**{faces[d1-1]} + {faces[d2-1]} = {total}** → Total > 7 ✅\n🏆 Tu gagnes **+{fmt(gained)}** !" + (" *(Boost ×2 actif !)*" if boost else "")
            color = GREEN
        else:
            await _game_loss(i, self.uid, self.guild_id, amount, "des")
            desc = f"**{faces[d1-1]} + {faces[d2-1]} = {total}** → Total ≤ 7 ❌\n💀 Tu perds **-{fmt(amount)}** !"
            color = RED
        desc += f"\n{SEP}\n💰 Solde : `{fmt(i.client.get_berrys(self.uid))}` ฿"
        await i.followup.send(embed=mk_embed(f"🎲 Dés — {total}", desc, color), ephemeral=True)


# ── Slots ─────────────────────────────────────────────────────────

class SlotsBetModal(discord.ui.Modal, title="🎰 Slots — Ta mise"):
    mise = discord.ui.TextInput(label="Montant", placeholder="Ex : 25 000", max_length=15)

    def __init__(self, uid, guild_id, rem):
        super().__init__(); self.uid = uid; self.guild_id = guild_id; self.rem = rem

    async def on_submit(self, i: discord.Interaction):
        await i.response.defer(ephemeral=True)
        amount = parse_amount(self.mise.value, i.client.get_berrys(self.uid))
        if not await _game_check(i, self.uid, amount, self.rem): return
        boost = bool(await db.get_effect(self.uid, "boost_x2"))
        reels = random.choices(SLOTS_EMOJIS, weights=SLOTS_WEIGHTS, k=3)
        display = " | ".join(reels)
        if reels[0] == reels[1] == reels[2]:
            mult = SLOTS_MULT[reels[0]] * (2 if boost else 1)
            gained = amount * mult
            i.client.add_berrys(self.uid, gained)
            add_earned_today(self.uid, gained)
            await db.log_tx(self.uid, self.guild_id, "jeu_slots", gained, "Jackpot slots")
            desc = f"**{display}**\n🎉 JACKPOT ! +`{fmt(gained)}` ฿ *(×{mult})*" + (" *(Boost actif !)*" if boost else "")
            color = GREEN
        elif len(set(reels)) == 2:
            refund = amount // 2
            i.client.add_berrys(self.uid, refund)
            await db.log_tx(self.uid, self.guild_id, "jeu_slots", refund, "Slots paire")
            desc = f"**{display}**\n2 identiques — remboursement partiel +`{fmt(refund)}` ฿"
            color = GOLD
        else:
            await _game_loss(i, self.uid, self.guild_id, amount, "slots")
            desc = f"**{display}**\n💀 Rien ne correspond — -`{fmt(amount)}` ฿"
            color = RED
        desc += f"\n{SEP}\n💰 Solde : `{fmt(i.client.get_berrys(self.uid))}` ฿"
        await i.followup.send(embed=mk_embed("🎰 Slots", desc, color), ephemeral=True)


# ── Pile ou Face ──────────────────────────────────────────────────

class PofBetModal(discord.ui.Modal, title="🪙 Pile ou Face — Ta mise"):
    mise  = discord.ui.TextInput(label="Montant", placeholder="Ex : 5 000", max_length=15)
    choix = discord.ui.TextInput(label="Pile ou Face ?", placeholder="pile  ou  face", max_length=5)

    def __init__(self, uid, guild_id, rem):
        super().__init__(); self.uid = uid; self.guild_id = guild_id; self.rem = rem

    async def on_submit(self, i: discord.Interaction):
        await i.response.defer(ephemeral=True)
        amount = parse_amount(self.mise.value, i.client.get_berrys(self.uid))
        if not await _game_check(i, self.uid, amount, self.rem): return
        pf = self.choix.value.strip().lower()
        if pf not in ("pile","face","p","f"):
            await i.followup.send(embed=err_embed("Réponds 'pile' ou 'face', Rookie !"), ephemeral=True); return
        boost  = bool(await db.get_effect(self.uid, "boost_x2"))
        result = random.choice(["pile","face"])
        win    = (pf in ("pile","p") and result == "pile") or (pf in ("face","f") and result == "face")
        if win:
            gained = await _game_win(i, self.uid, self.guild_id, amount, "pof", boost)
            desc = f"🪙 Résultat : **{result.capitalize()}** ✅\n+`{fmt(gained)}` ฿" + (" *(Boost ×2 !)*" if boost else "")
            color = GREEN
        else:
            await _game_loss(i, self.uid, self.guild_id, amount, "pof")
            desc = f"🪙 Résultat : **{result.capitalize()}** ❌\n-`{fmt(amount)}` ฿"
            color = RED
        desc += f"\n{SEP}\n💰 Solde : `{fmt(i.client.get_berrys(self.uid))}` ฿"
        await i.followup.send(embed=mk_embed("🪙 Pile ou Face", desc, color), ephemeral=True)


# ── Chifoumi ──────────────────────────────────────────────────────

_CHI_EMO = {"pierre": "🪨", "papier": "📄", "ciseaux": "✂️"}
_CHI_WIN = {"pierre": "ciseaux", "papier": "pierre", "ciseaux": "papier"}


class ChifoumiModal(discord.ui.Modal, title="✊ Chifoumi — Ta mise"):
    mise  = discord.ui.TextInput(label="Montant", placeholder="Ex : 15 000", max_length=15)
    choix = discord.ui.TextInput(label="Pierre, Papier ou Ciseaux ?", placeholder="pierre / papier / ciseaux", max_length=10)

    def __init__(self, uid, guild_id, rem):
        super().__init__(); self.uid = uid; self.guild_id = guild_id; self.rem = rem

    async def on_submit(self, i: discord.Interaction):
        await i.response.defer(ephemeral=True)
        amount = parse_amount(self.mise.value, i.client.get_berrys(self.uid))
        if not await _game_check(i, self.uid, amount, self.rem): return
        cv = self.choix.value.strip().lower()
        cv = {"p": "pierre", "pa": "papier", "c": "ciseaux", "r": "pierre"}.get(cv, cv)
        if cv not in _CHI_EMO:
            await i.followup.send(embed=err_embed("Choix invalide ! Tape pierre, papier ou ciseaux."), ephemeral=True); return
        boost  = bool(await db.get_effect(self.uid, "boost_x2"))
        bot_c  = random.choice(list(_CHI_EMO))
        if _CHI_WIN[cv] == bot_c:
            gained = await _game_win(i, self.uid, self.guild_id, amount, "chifoumi", boost)
            desc = f"{_CHI_EMO[cv]} vs {_CHI_EMO[bot_c]} — **Victoire !** ✅\n+`{fmt(gained)}` ฿" + (" *(Boost ×2 !)*" if boost else "")
            color = GREEN
        elif cv == bot_c:
            desc = f"{_CHI_EMO[cv]} vs {_CHI_EMO[bot_c]} — **Égalité** — Mise remboursée"
            color = GOLD
        else:
            await _game_loss(i, self.uid, self.guild_id, amount, "chifoumi")
            desc = f"{_CHI_EMO[cv]} vs {_CHI_EMO[bot_c]} — **Défaite** ❌\n-`{fmt(amount)}` ฿"
            color = RED
        desc += f"\n{SEP}\n💰 Solde : `{fmt(i.client.get_berrys(self.uid))}` ฿"
        await i.followup.send(embed=mk_embed("✊ Chifoumi", desc, color), ephemeral=True)


# ── Roulette ─────────────────────────────────────────────────────

class RouletteBetModal(discord.ui.Modal, title="🎡 Roulette — Ta mise"):
    mise  = discord.ui.TextInput(label="Montant", placeholder="Ex : 20 000", max_length=15)
    pari  = discord.ui.TextInput(label="Pari : rouge / noir / numéro 0-36", placeholder="rouge  ou  noir  ou  17", max_length=5)

    def __init__(self, uid, guild_id, rem):
        super().__init__(); self.uid = uid; self.guild_id = guild_id; self.rem = rem

    async def on_submit(self, i: discord.Interaction):
        await i.response.defer(ephemeral=True)
        amount = parse_amount(self.mise.value, i.client.get_berrys(self.uid))
        if not await _game_check(i, self.uid, amount, self.rem): return
        boost  = bool(await db.get_effect(self.uid, "boost_x2"))
        result = random.randint(0, 36)
        pv     = self.pari.value.strip().lower()
        win, mult = False, 0
        if pv == "rouge":
            win, mult = result in ROUGE, 2
        elif pv == "noir":
            win, mult = result in NOIR, 2
        elif pv.isdigit() and 0 <= int(pv) <= 36:
            win, mult = result == int(pv), 36
        else:
            await i.followup.send(embed=err_embed("Pari invalide ! Tape rouge, noir, ou un numéro 0-36."), ephemeral=True); return
        suffix = f"🎡 La boule s'arrête sur **{result}** {'🔴' if result in ROUGE else '⬛' if result in NOIR else '🟢'}\n"
        if win:
            final_mult = mult * (2 if boost else 1)
            gained     = amount * final_mult
            i.client.add_berrys(self.uid, gained)
            add_earned_today(self.uid, gained)
            await db.log_tx(self.uid, self.guild_id, "jeu_roulette", gained, f"Roulette ×{final_mult}")
            desc  = suffix + f"✅ Gagné ! +`{fmt(gained)}` ฿ *(×{final_mult})*"
            color = GREEN
        else:
            await _game_loss(i, self.uid, self.guild_id, amount, "roulette")
            desc  = suffix + f"❌ Perdu — -`{fmt(amount)}` ฿"
            color = RED
        desc += f"\n{SEP}\n💰 Solde : `{fmt(i.client.get_berrys(self.uid))}` ฿"
        await i.followup.send(embed=mk_embed("🎡 Roulette", desc, color), ephemeral=True)


# ── Course Pirates ────────────────────────────────────────────────

class CoursesBetModal(discord.ui.Modal, title="☠️ Course Pirates — Ta mise"):
    mise  = discord.ui.TextInput(label="Montant", placeholder="Ex : 30 000", max_length=15)
    pari  = discord.ui.TextInput(label="Pirate : Luffy / Zoro / Nami / Sanji", placeholder="Luffy", max_length=8)

    def __init__(self, uid, guild_id, rem):
        super().__init__(); self.uid = uid; self.guild_id = guild_id; self.rem = rem

    async def on_submit(self, i: discord.Interaction):
        await i.response.defer(ephemeral=True)
        amount = parse_amount(self.mise.value, i.client.get_berrys(self.uid))
        if not await _game_check(i, self.uid, amount, self.rem): return
        boost   = bool(await db.get_effect(self.uid, "boost_x2"))
        names   = [p[1].lower() for p in PIRATES]
        choix   = self.pari.value.strip().lower()
        if choix not in names:
            await i.followup.send(embed=err_embed("Pirate inconnu ! Choisis : Luffy, Zoro, Nami ou Sanji."), ephemeral=True); return
        winner  = random.choice(PIRATES)
        race    = " · ".join(f"{e} {n}" for e, n in PIRATES)
        if choix == winner[1].lower():
            mult   = 4 * (2 if boost else 1)
            gained = amount * mult
            i.client.add_berrys(self.uid, gained)
            add_earned_today(self.uid, gained)
            await db.log_tx(self.uid, self.guild_id, "jeu_course", gained, f"Course Pirates ×{mult}")
            desc = f"{race}\n🏆 {winner[0]} **{winner[1]}** remporte la course !\n✅ +`{fmt(gained)}` ฿ *(×{mult})*"
            color = GREEN
        else:
            await _game_loss(i, self.uid, self.guild_id, amount, "course")
            desc = f"{race}\n{winner[0]} **{winner[1]}** gagne... pas ton pirate ❌\n-`{fmt(amount)}` ฿"
            color = RED
        desc += f"\n{SEP}\n💰 Solde : `{fmt(i.client.get_berrys(self.uid))}` ฿"
        await i.followup.send(embed=mk_embed("☠️ Course Pirates", desc, color), ephemeral=True)


# ── Devinette ─────────────────────────────────────────────────────

class DevBetModal(discord.ui.Modal, title="🔢 Devinette — Ta mise"):
    mise   = discord.ui.TextInput(label="Montant", placeholder="Ex : 10 000", max_length=15)
    guess  = discord.ui.TextInput(label="Devine un chiffre de 1 à 10", placeholder="7", max_length=2)

    def __init__(self, uid, guild_id, rem):
        super().__init__(); self.uid = uid; self.guild_id = guild_id; self.rem = rem

    async def on_submit(self, i: discord.Interaction):
        await i.response.defer(ephemeral=True)
        amount = parse_amount(self.mise.value, i.client.get_berrys(self.uid))
        if not await _game_check(i, self.uid, amount, self.rem): return
        try: g = int(self.guess.value.strip())
        except: await i.followup.send(embed=err_embed("Entre un chiffre entre 1 et 10."), ephemeral=True); return
        if not 1 <= g <= 10:
            await i.followup.send(embed=err_embed("Le chiffre doit être entre 1 et 10."), ephemeral=True); return
        boost  = bool(await db.get_effect(self.uid, "boost_x2"))
        secret = random.randint(1, 10)
        if g == secret:
            mult   = 8 * (2 if boost else 1)
            gained = amount * mult
            i.client.add_berrys(self.uid, gained)
            add_earned_today(self.uid, gained)
            await db.log_tx(self.uid, self.guild_id, "jeu_devinette", gained, f"Devinette ×{mult}")
            desc = f"Tu as dit **{g}**, le chiffre était **{secret}** ✅\n+`{fmt(gained)}` ฿ *(×{mult})*"
            color = GREEN
        else:
            await _game_loss(i, self.uid, self.guild_id, amount, "devinette")
            desc = f"Tu as dit **{g}**, le chiffre était **{secret}** ❌\n-`{fmt(amount)}` ฿"
            color = RED
        desc += f"\n{SEP}\n💰 Solde : `{fmt(i.client.get_berrys(self.uid))}` ฿"
        await i.followup.send(embed=mk_embed("🔢 Devinette", desc, color), ephemeral=True)


# ── Blackjack ─────────────────────────────────────────────────────

class BlackjackBetModal(discord.ui.Modal, title="🃏 Blackjack — Ta mise"):
    mise = discord.ui.TextInput(label="Montant", placeholder="Ex : 50 000", max_length=15)

    def __init__(self, uid, guild_id, rem):
        super().__init__(); self.uid = uid; self.guild_id = guild_id; self.rem = rem

    async def on_submit(self, i: discord.Interaction):
        await i.response.defer(ephemeral=True)
        amount = parse_amount(self.mise.value, i.client.get_berrys(self.uid))
        if not await _game_check(i, self.uid, amount, self.rem): return
        if not i.client.spend_berrys(self.uid, amount):
            await i.followup.send(embed=err_embed("Solde insuffisant !"), ephemeral=True); return
        deck        = new_deck()
        player_hand = [deck.pop(), deck.pop()]
        dealer_hand = [deck.pop(), deck.pop()]
        pv = hand_value(player_hand)
        if pv == 21:
            gained = int(amount * 1.5)
            i.client.add_berrys(self.uid, amount + gained)
            add_earned_today(self.uid, gained)
            await db.log_tx(self.uid, self.guild_id, "jeu_blackjack", gained, "Blackjack naturel")
            desc = (f"**Ta main :** {fmt_hand(player_hand)} = **21** 🃏\n"
                    f"**Blackjack naturel !** +`{fmt(gained)}` ฿\n{SEP}\n💰 Solde : `{fmt(i.client.get_berrys(self.uid))}` ฿")
            await i.followup.send(embed=mk_embed("🃏 Blackjack — Naturel !", desc, GREEN), ephemeral=True)
            return
        view = BlackjackView(self.uid, self.guild_id, amount, player_hand, dealer_hand, deck)
        embed = view.build_embed()
        msg = await i.followup.send(embed=embed, view=view, ephemeral=True)
        view.message = msg


class BlackjackView(discord.ui.View):
    message: discord.Message | None = None

    def __init__(self, uid, guild_id, bet, player, dealer, deck):
        super().__init__(timeout=120)
        self.uid      = uid
        self.guild_id = guild_id
        self.bet      = bet
        self.player   = list(player)
        self.dealer   = list(dealer)
        self.deck     = deck
        self.doubled  = False

    def build_embed(self, reveal=False) -> discord.Embed:
        pv = hand_value(self.player)
        dv = hand_value(self.dealer)
        dealer_str = fmt_hand(self.dealer) + f" = {dv}" if reveal else f"{self.dealer[0]['rank']}{self.dealer[0]['suit']} + 🂠"
        desc = (f"**Croupier :** {dealer_str}\n"
                f"**Ta main :** {fmt_hand(self.player)} = **{pv}**\n"
                f"{SEP}\nMise : `{fmt(self.bet)}` ฿")
        color = RED if pv > 21 else GOLD
        return mk_embed("🃏 Blackjack", desc, color)

    async def _end(self, i, result: str):
        for item in self.children:
            item.disabled = True
        dv = hand_value(self.dealer)
        pv = hand_value(self.player)
        if result == "win":
            gained = self.bet * (2 if self.doubled else 1)
            i.client.add_berrys(self.uid, self.bet + gained)
            add_earned_today(self.uid, gained)
            await db.log_tx(self.uid, self.guild_id, "jeu_blackjack", gained, "Blackjack victoire")
            extra = f"✅ Victoire ! +`{fmt(gained)}` ฿"
            color = GREEN
        elif result == "draw":
            i.client.add_berrys(self.uid, self.bet)
            extra = "🤝 Égalité — Mise remboursée"
            color = GOLD
        else:
            await db.log_tx(self.uid, self.guild_id, "jeu_blackjack", -self.bet, "Blackjack défaite")
            extra = f"❌ Défaite — -`{fmt(self.bet)}` ฿"
            color = RED
        dealer_str = fmt_hand(self.dealer) + f" = {dv}"
        desc = (f"**Croupier :** {dealer_str}\n"
                f"**Ta main :** {fmt_hand(self.player)} = **{pv}**\n"
                f"{SEP}\n{extra}\n💰 Solde : `{fmt(i.client.get_berrys(self.uid))}` ฿")
        await i.response.edit_message(embed=mk_embed("🃏 Blackjack — Résultat", desc, color), view=self)

    @discord.ui.button(label="Tirer", emoji="🃏", style=discord.ButtonStyle.primary)
    async def btn_tirer(self, i, _):
        if not is_owner(self.uid, i):
            await deny(i); return
        self.player.append(self.deck.pop())
        pv = hand_value(self.player)
        if pv > 21:
            await self._end(i, "lose"); return
        if pv == 21:
            await self._resolve(i); return
        await i.response.edit_message(embed=self.build_embed(), view=self)

    @discord.ui.button(label="Rester", emoji="✋", style=discord.ButtonStyle.success)
    async def btn_rester(self, i, _):
        if not is_owner(self.uid, i):
            await deny(i); return
        await self._resolve(i)

    @discord.ui.button(label="Doubler", emoji="✖️", style=discord.ButtonStyle.secondary)
    async def btn_doubler(self, i, _):
        if not is_owner(self.uid, i):
            await deny(i); return
        if not i.client.spend_berrys(self.uid, self.bet):
            await i.response.send_message(embed=err_embed("Pas assez de Berrys pour doubler !"), ephemeral=True); return
        self.bet    *= 2
        self.doubled = True
        self.player.append(self.deck.pop())
        pv = hand_value(self.player)
        if pv > 21:
            await self._end(i, "lose"); return
        await self._resolve(i)

    async def _resolve(self, i):
        dv = hand_value(self.dealer)
        while dv < 17:
            self.dealer.append(self.deck.pop())
            dv = hand_value(self.dealer)
        pv = hand_value(self.player)
        if dv > 21 or pv > dv:
            result = "win"
        elif pv == dv:
            result = "draw"
        else:
            result = "lose"
        await self._end(i, result)


# ══════════════════════════════════════════════════════════════════
#  REVENUS PASSIFS
# ══════════════════════════════════════════════════════════════════

def _revenus_embed_view(uid, guild_id, profile):
    invested    = profile.get("invested") or 0
    last_c      = profile.get("last_collect")
    now         = datetime.now(timezone.utc)
    if last_c and isinstance(last_c, datetime):
        elapsed_h = (now - last_c.replace(tzinfo=timezone.utc) if last_c.tzinfo is None else now - last_c).total_seconds() / 3600
    else:
        elapsed_h = 0
    periods     = int(elapsed_h / INVEST_INTERVAL)
    pending     = int(invested * INVEST_RATE * periods)
    next_in_h   = INVEST_INTERVAL - (elapsed_h % INVEST_INTERVAL)
    desc = (
        f"{SEP}\n"
        f"💰 **Montant investi :** `{fmt(invested)}` ฿\n"
        f"📈 **Taux :** {int(INVEST_RATE*100)}% toutes les {INVEST_INTERVAL}h\n"
        f"⏳ **Intérêts en attente :** `{fmt(pending)}` ฿\n"
        f"🕐 **Prochaine collecte dans :** {next_in_h:.1f}h\n"
        f"🏦 **Cap d'investissement :** `{fmt(INVEST_CAP)}` ฿\n"
        f"{SEP}"
    )
    embed = mk_embed("💰 Revenus Passifs", desc)
    view  = RevenusView(uid, guild_id, invested, pending, periods, last_c)
    return embed, view


class RevenusView(discord.ui.View):
    def __init__(self, uid, guild_id, invested, pending, periods, last_collect):
        super().__init__(timeout=180)
        self.uid         = uid
        self.guild_id    = guild_id
        self.invested    = invested
        self.pending     = pending
        self.periods     = periods
        self.last_collect = last_collect

    @discord.ui.button(label="Investir", emoji="💰", style=discord.ButtonStyle.success)
    async def btn_invest(self, i, _):
        if not is_owner(self.uid, i):
            await deny(i); return
        await i.response.send_modal(InvestModal(self.uid, self.guild_id, self.invested))

    @discord.ui.button(label="Collecter", emoji="📥", style=discord.ButtonStyle.primary)
    async def btn_collect(self, i, _):
        if not is_owner(self.uid, i):
            await deny(i); return
        await i.response.defer(ephemeral=True)
        if self.periods < 1 or self.pending <= 0:
            await i.followup.send(embed=err_embed(
                f"Pas encore {INVEST_INTERVAL}h écoulées depuis ta dernière collecte !\n"
                "Reviens plus tard, Rookie."
            ), ephemeral=True); return
        i.client.add_berrys(self.uid, self.pending)
        now = datetime.now(timezone.utc)
        new_last = (self.last_collect or now) + timedelta(hours=self.periods * INVEST_INTERVAL) if self.last_collect else now
        await db.update_invest(self.uid, self.invested, new_last)
        await db.log_tx(self.uid, self.guild_id, "invest_collect", self.pending, f"Collecte intérêts ×{self.periods}")
        desc = (f"✅ Tu as collecté **+`{fmt(self.pending)}` ฿** d'intérêts !\n"
                f"💼 Solde : `{fmt(i.client.get_berrys(self.uid))}` ฿")
        await i.followup.send(embed=mk_embed("📥 Collecte réussie", desc, GREEN), ephemeral=True)

    @discord.ui.button(label="Retour", emoji="↩️", style=discord.ButtonStyle.secondary)
    async def btn_retour(self, i, _):
        if not is_owner(self.uid, i):
            await deny(i); return
        profile = await db.get_or_create(self.uid, self.guild_id)
        balance = i.client.get_berrys(self.uid)
        embed   = await _main_embed(i.client, self.uid, self.guild_id, profile, balance)
        await i.response.edit_message(embed=embed, view=BankView(self.uid, self.guild_id, profile))


class InvestModal(discord.ui.Modal, title="💰 Investir des Berrys"):
    montant = discord.ui.TextInput(label="Montant à investir", placeholder="Ex : 500 000 ou 1m", max_length=15)

    def __init__(self, uid, guild_id, current_invested):
        super().__init__()
        self.uid              = uid
        self.guild_id         = guild_id
        self.current_invested = current_invested

    async def on_submit(self, i: discord.Interaction):
        await i.response.defer(ephemeral=True)
        wallet = i.client.get_berrys(self.uid)
        amount = parse_amount(self.montant.value, wallet)
        if not amount or amount <= 0:
            await i.followup.send(embed=err_embed("Montant invalide !"), ephemeral=True); return
        if wallet < amount:
            await i.followup.send(embed=err_embed(f"Solde insuffisant (`{fmt(wallet)}` ฿) !"), ephemeral=True); return
        if self.current_invested + amount > INVEST_CAP:
            reste = max(0, INVEST_CAP - self.current_invested)
            await i.followup.send(embed=err_embed(
                f"Cap d'investissement atteint !\nTu peux encore investir `{fmt(reste)}` ฿ (cap : `{fmt(INVEST_CAP)}` ฿)."
            ), ephemeral=True); return
        i.client.spend_berrys(self.uid, amount)
        new_invested = self.current_invested + amount
        await db.update_invest(self.uid, new_invested, datetime.now(timezone.utc))
        await db.log_tx(self.uid, self.guild_id, "invest", -amount, "Investissement")
        desc = (f"✅ **`{fmt(amount)}` ฿** placés !\n"
                f"💰 Total investi : `{fmt(new_invested)}` ฿\n"
                f"📈 Rapportera `{fmt(int(new_invested*INVEST_RATE))}` ฿ toutes les {INVEST_INTERVAL}h\n"
                f"{SEP}\n💼 Solde : `{fmt(i.client.get_berrys(self.uid))}` ฿")
        await i.followup.send(embed=mk_embed("💰 Investissement confirmé", desc, GREEN), ephemeral=True)


# ══════════════════════════════════════════════════════════════════
#  PILLAGE
# ══════════════════════════════════════════════════════════════════

class PillageView(discord.ui.View):
    def __init__(self, uid: str, guild_id: str):
        super().__init__(timeout=120)
        self.uid      = uid
        self.guild_id = guild_id
        self._target: discord.Member | None = None

    @discord.ui.select(cls=discord.ui.UserSelect, placeholder="Choisis ta cible...", min_values=1, max_values=1, row=0)
    async def cible_select(self, i: discord.Interaction, select: discord.ui.UserSelect):
        if not is_owner(self.uid, i):
            await deny(i); return
        self._target = select.values[0]
        desc = (f"**Cible :** {self._target.mention}\n"
                f"**Succès :** 40% de chance\n"
                f"**Gain potentiel :** 5-15% de son solde\n\n"
                f"⚠️ En cas d'échec, tu perds 10% de ce que tu aurais volé.\n"
                f"Appuie sur **Attaquer** pour lancer le pillage !")
        await i.response.edit_message(
            embed=mk_embed("🏴‍☠️ Confirmer le pillage ?", desc),
            view=self,
        )

    @discord.ui.button(label="Attaquer !", emoji="⚔️", style=discord.ButtonStyle.danger, row=1)
    async def btn_attaque(self, i: discord.Interaction, _):
        if not is_owner(self.uid, i):
            await deny(i); return
        if self._target is None:
            await i.response.send_message(embed=err_embed("Sélectionne d'abord une cible !"), ephemeral=True); return
        await i.response.defer(ephemeral=True)

        target_uid = str(self._target.id)
        if target_uid == self.uid:
            await i.followup.send(embed=err_embed("Tu ne peux pas te piller toi-même !"), ephemeral=True); return
        if self._target.bot:
            await i.followup.send(embed=err_embed("Les bots n'ont pas de Berrys à voler."), ephemeral=True); return

        profile = await db.get_or_create(self.uid, self.guild_id)
        pillage_last = profile.get("pillage_last")
        if pillage_last:
            if pillage_last.tzinfo is None:
                pillage_last = pillage_last.replace(tzinfo=timezone.utc)
            elapsed_h = (datetime.now(timezone.utc) - pillage_last).total_seconds() / 3600
            if elapsed_h < PILLAGE_COOLDOWN:
                reste = PILLAGE_COOLDOWN - elapsed_h
                await i.followup.send(embed=err_embed(
                    f"Cooldown de pillage actif !\nReviens dans **{reste:.1f}h**, Rookie."
                ), ephemeral=True); return

        shield = await db.get_effect(target_uid, "shield")
        if shield:
            await i.followup.send(embed=mk_embed(
                "🛡️ Cible protégée !",
                f"{self._target.mention} est protégé par le **Bouclier de Bartholomew** !\nImpossible de le piller.",
                RED
            ), ephemeral=True); return

        target_balance = i.client.get_berrys(target_uid)
        steal_pct = random.uniform(PILLAGE_MIN, PILLAGE_MAX)
        steal_amt = int(target_balance * steal_pct)

        await db.set_pillage_cooldown(self.uid)

        if random.random() < PILLAGE_SUCCESS:
            steal_amt = min(steal_amt, target_balance)
            if steal_amt > 0:
                i.client.spend_berrys(target_uid, steal_amt)
                i.client.add_berrys(self.uid, steal_amt)
                await db.log_tx(self.uid, self.guild_id, "pillage_gain", steal_amt, f"Pillage de {self._target.name}")
                await db.log_tx(target_uid, self.guild_id, "pillage_perte", -steal_amt, f"Pillé par {i.user.name}")
            desc = (f"🎉 **Succès !** Tu as pillé {self._target.mention} !\n"
                    f"Butin : **+`{fmt(steal_amt)}` ฿** *(soit {steal_pct*100:.0f}% de son solde)*\n"
                    f"{SEP}\n💰 Ton solde : `{fmt(i.client.get_berrys(self.uid))}` ฿")
            color = GREEN
            try:
                await self._target.send(embed=mk_embed(
                    "🏴‍☠️ Tu as été pillé !",
                    f"**{i.user.display_name}** t'a attaqué et volé **`{fmt(steal_amt)}` ฿** !\n"
                    f"Achète un **Bouclier de Bartholomew** 🛡️ dans la boutique pour te protéger.",
                    RED
                ))
            except Exception:
                pass
        else:
            penalty = int(steal_amt * PILLAGE_PENALTY)
            penalty = min(penalty, i.client.get_berrys(self.uid))
            if penalty > 0:
                i.client.spend_berrys(self.uid, penalty)
                await db.log_tx(self.uid, self.guild_id, "pillage_echec", -penalty, f"Pillage raté sur {self._target.name}")
            desc = (f"💀 **Échec !** {self._target.mention} a repoussé ton attaque !\n"
                    f"Pénalité : **-`{fmt(penalty)}` ฿**\n"
                    f"{SEP}\n💰 Ton solde : `{fmt(i.client.get_berrys(self.uid))}` ฿")
            color = RED
            try:
                await self._target.send(embed=mk_embed(
                    "⚔️ Tentative de pillage repoussée !",
                    f"**{i.user.display_name}** a tenté de te piller mais a échoué ! Tu es sauf. 💪",
                    GREEN
                ))
            except Exception:
                pass

        await i.followup.send(embed=mk_embed("🏴‍☠️ Résultat du pillage", desc, color), ephemeral=True)

    @discord.ui.button(label="Retour", emoji="↩️", style=discord.ButtonStyle.secondary, row=1)
    async def btn_retour(self, i, _):
        if not is_owner(self.uid, i):
            await deny(i); return
        profile = await db.get_or_create(self.uid, self.guild_id)
        balance = i.client.get_berrys(self.uid)
        embed   = await _main_embed(i.client, self.uid, self.guild_id, profile, balance)
        await i.response.edit_message(embed=embed, view=BankView(self.uid, self.guild_id, profile))


# ══════════════════════════════════════════════════════════════════
#  BOUTIQUE
# ══════════════════════════════════════════════════════════════════

def _boutique_embed(balance: int) -> discord.Embed:
    lines = "\n".join(
        f"{it['emoji']} **{it['name']}** — `{fmt(it['price'])}` ฿\n> {it['desc']}"
        for it in SHOP_ITEMS
    )
    e = mk_embed("🛒 Boutique Pirate", f"{SEP}\n{lines}\n{SEP}\n💰 Ton solde : `{fmt(balance)}` ฿")
    return e


class BoutiqueView(discord.ui.View):
    def __init__(self, uid: str, guild_id: str):
        super().__init__(timeout=180)
        self.uid      = uid
        self.guild_id = guild_id
        for item in SHOP_ITEMS:
            self.add_item(_ShopButton(uid, guild_id, item))
        retour_btn = discord.ui.Button(label="Retour", emoji="↩️", style=discord.ButtonStyle.secondary, row=3)
        async def _retour(i):
            if not is_owner(uid, i):
                await deny(i); return
            profile = await db.get_or_create(uid, guild_id)
            balance = i.client.get_berrys(uid)
            embed   = await _main_embed(i.client, uid, guild_id, profile, balance)
            await i.response.edit_message(embed=embed, view=BankView(uid, guild_id, profile))
        retour_btn.callback = _retour
        self.add_item(retour_btn)


class _ShopButton(discord.ui.Button):
    def __init__(self, uid, guild_id, item):
        super().__init__(label=item["name"], emoji=item["emoji"],
                         style=discord.ButtonStyle.primary, row=SHOP_ITEMS.index(item) // 2)
        self.uid      = uid
        self.guild_id = guild_id
        self.item     = item

    async def callback(self, i: discord.Interaction):
        if not is_owner(self.uid, i):
            await deny(i); return
        price   = self.item["price"]
        balance = i.client.get_berrys(self.uid)
        if balance < price:
            await i.response.send_message(
                embed=err_embed(f"Tu n'as pas assez de Berrys, Rookie !\nPrix : `{fmt(price)}` ฿ · Solde : `{fmt(balance)}` ฿"),
                ephemeral=True
            ); return
        view = ConfirmAchatView(self.uid, self.guild_id, self.item)
        await i.response.send_message(
            embed=mk_embed("⚠️ Confirmation d'achat",
                           f"{self.item['emoji']} **{self.item['name']}** — `{fmt(price)}` ฿\n> {self.item['desc']}\n\nConfirmer l'achat ?"),
            view=view, ephemeral=True
        )


class ConfirmAchatView(discord.ui.View):
    def __init__(self, uid, guild_id, item):
        super().__init__(timeout=60)
        self.uid      = uid
        self.guild_id = guild_id
        self.item     = item

    @discord.ui.button(label="Confirmer", emoji="✅", style=discord.ButtonStyle.success)
    async def btn_ok(self, i, _):
        if not is_owner(self.uid, i):
            await deny(i); return
        await i.response.defer(ephemeral=True)
        price = self.item["price"]
        if not i.client.spend_berrys(self.uid, price):
            await i.followup.send(embed=err_embed("Solde insuffisant !"), ephemeral=True); return
        if self.item["duration_h"] > 0:
            await db.add_effect(self.uid, self.guild_id, self.item["id"], self.item["duration_h"])
        if self.item["id"] == "lottery_ticket":
            lotto = await db.ensure_lottery(self.guild_id)
            await db.add_ticket(lotto["id"], self.uid, price)
        await db.log_tx(self.uid, self.guild_id, f"achat_{self.item['id']}", -price, f"Achat {self.item['name']}")
        desc = (f"✅ **{self.item['emoji']} {self.item['name']}** acheté !\n"
                + (f"Actif pendant **{self.item['duration_h']}h**\n" if self.item["duration_h"] else "")
                + f"{SEP}\n💰 Solde : `{fmt(i.client.get_berrys(self.uid))}` ฿")
        await i.followup.send(embed=mk_embed("🛒 Achat confirmé", desc, GREEN), ephemeral=True)

    @discord.ui.button(label="Annuler", emoji="❌", style=discord.ButtonStyle.secondary)
    async def btn_cancel(self, i, _):
        await i.response.edit_message(embed=mk_embed("❌ Achat annulé", "Aucun Berry dépensé."), view=None)


# ══════════════════════════════════════════════════════════════════
#  LOTERIE
# ══════════════════════════════════════════════════════════════════

def _loterie_embed(lotto: dict) -> discord.Embed:
    holders = lotto.get("ticket_holders") or []
    tickets  = len(holders)
    pot      = lotto.get("pot") or 0
    desc = (f"{SEP}\n"
            f"🎟️ **Tickets vendus :** {tickets}\n"
            f"💰 **Jackpot actuel :** `{fmt(pot)}` ฿\n"
            f"🕐 **Tirage :** automatique toutes les 24h\n"
            f"🎯 **Prix d'un ticket :** `50 000` ฿\n"
            f"{SEP}\n*Achète des tickets pour augmenter tes chances !*")
    return mk_embed("🎟️ Loterie — Freydiss Bank", desc)


class LoterieView(discord.ui.View):
    def __init__(self, uid: str, guild_id: str, lotto: dict):
        super().__init__(timeout=180)
        self.uid      = uid
        self.guild_id = guild_id
        self.lotto    = lotto

    @discord.ui.button(label="Acheter un ticket", emoji="🎟️", style=discord.ButtonStyle.success)
    async def btn_ticket(self, i, _):
        if not is_owner(self.uid, i):
            await deny(i); return
        await i.response.defer(ephemeral=True)
        price = 50_000
        if not i.client.spend_berrys(self.uid, price):
            await i.followup.send(embed=err_embed(f"Il te faut `{fmt(price)}` ฿ pour un ticket !"), ephemeral=True); return
        lotto = await db.ensure_lottery(self.guild_id)
        await db.add_ticket(lotto["id"], self.uid, price)
        await db.log_tx(self.uid, self.guild_id, "loterie_ticket", -price, "Ticket loterie")
        holders = (lotto.get("ticket_holders") or []) + [self.uid]
        desc    = (f"🎟️ Ticket acheté ! Tu as maintenant **{holders.count(self.uid)}** ticket(s).\n"
                   f"💰 Jackpot : `{fmt((lotto.get('pot') or 0) + price)}` ฿\n"
                   f"Bonne chance, pirate ! ☠️")
        await i.followup.send(embed=mk_embed("🎟️ Ticket acheté !", desc, GREEN), ephemeral=True)

    @discord.ui.button(label="Retour", emoji="↩️", style=discord.ButtonStyle.secondary)
    async def btn_retour(self, i, _):
        if not is_owner(self.uid, i):
            await deny(i); return
        profile = await db.get_or_create(self.uid, self.guild_id)
        balance = i.client.get_berrys(self.uid)
        embed   = await _main_embed(i.client, self.uid, self.guild_id, profile, balance)
        await i.response.edit_message(embed=embed, view=BankView(self.uid, self.guild_id, profile))


# ══════════════════════════════════════════════════════════════════
#  STATS & CLASSEMENT
# ══════════════════════════════════════════════════════════════════

def _stats_embed(user: discord.Member, profile: dict, game_stats: dict) -> discord.Embed:
    total_earned = profile.get("total_earned") or 0
    total_lost   = profile.get("total_lost") or 0
    bounty       = profile.get("bounty") or 0
    rank         = get_rank(total_earned)

    total_games = sum(v["wins"] + v["losses"] for v in game_stats.values())
    total_wins  = sum(v["wins"] for v in game_stats.values())
    winrate     = (total_wins / total_games * 100) if total_games else 0

    lines = []
    for gtype, stats in game_stats.items():
        name = gtype.replace("jeu_", "").capitalize()
        wr   = stats["wins"] / (stats["wins"] + stats["losses"]) * 100 if (stats["wins"] + stats["losses"]) > 0 else 0
        lines.append(f"• **{name}** — {stats['wins']}V / {stats['losses']}D · WR {wr:.0f}%")

    game_lines = "\n".join(lines) if lines else "*Aucune partie jouée.*"
    desc = (
        f"{SEP}\n"
        f"{rank['emoji']} **{rank['name']}** · Prime : `{fmt(bounty)}` ฿\n"
        f"{SEP}\n"
        f"📈 **Total gagné :** `{fmt(total_earned)}` ฿\n"
        f"📉 **Total perdu :** `{fmt(total_lost)}` ฿\n"
        f"🎮 **Parties jouées :** {total_games} · WR global : {winrate:.0f}%\n"
        f"{SEP}\n"
        f"**Détail par jeu :**\n{game_lines}\n{SEP}"
    )
    e = mk_embed(f"📊 Stats de {user.display_name}", desc, rank["color"])
    e.set_thumbnail(url=user.display_avatar.url)
    return e


class StatsView(discord.ui.View):
    def __init__(self, uid: str, guild_id: str):
        super().__init__(timeout=180)
        self.uid      = uid
        self.guild_id = guild_id

    @discord.ui.button(label="Classement", emoji="🏆", style=discord.ButtonStyle.primary)
    async def btn_lb(self, i, _):
        if not is_owner(self.uid, i):
            await deny(i); return
        await i.response.defer(ephemeral=True)
        guild   = i.guild
        members = [str(m.id) for m in guild.members if not m.bot]
        rows    = await db.get_leaderboard(self.guild_id, members)
        lines   = []
        for idx, row in enumerate(rows, 1):
            member = guild.get_member(int(row["user_id"]))
            name   = member.display_name if member else f"<@{row['user_id']}>"
            medal  = ["🥇","🥈","🥉"].get(idx-1, f"**{idx}.**") if idx <= 3 else f"**{idx}.**"
            lines.append(f"{medal} {name} — `{fmt(row['total_earned'])}` ฿")
        desc = "\n".join(lines) if lines else "*Aucun pirate dans le classement.*"
        await i.followup.send(embed=mk_embed("🏆 Top 10 — Freydiss Bank", f"{SEP}\n{desc}\n{SEP}"), ephemeral=True)

    @discord.ui.button(label="Retour", emoji="↩️", style=discord.ButtonStyle.secondary)
    async def btn_retour(self, i, _):
        if not is_owner(self.uid, i):
            await deny(i); return
        profile = await db.get_or_create(self.uid, self.guild_id)
        balance = i.client.get_berrys(self.uid)
        embed   = await _main_embed(i.client, self.uid, self.guild_id, profile, balance)
        await i.response.edit_message(embed=embed, view=BankView(self.uid, self.guild_id, profile))


# ══════════════════════════════════════════════════════════════════
#  EMBED PRINCIPAL
# ══════════════════════════════════════════════════════════════════

async def _main_embed(bot, uid: str, guild_id: str, profile: dict, balance: int) -> discord.Embed:
    total_earned = profile.get("total_earned") or 0
    bounty       = profile.get("bounty") or 0
    rank         = get_rank(total_earned)
    next_r       = get_next_rank(total_earned)
    day_stats    = await db.get_day_stats(uid, guild_id)
    invested     = profile.get("invested") or 0

    if next_r:
        prog     = min((total_earned - rank["threshold"]) / max(1, next_r["threshold"] - rank["threshold"]), 1.0)
        filled   = int(prog * 12)
        prog_bar = "█" * filled + "░" * (12 - filled)
        next_str = f"`{fmt(next_r['threshold'] - total_earned)}` ฿ → {next_r['emoji']} **{next_r['name']}**"
        prog_str = f"`{prog_bar}` {int(prog*100)}%"
    else:
        prog_str = "`████████████` **MAX**"
        next_str = "🌟 Rang maximum atteint !"

    desc = (
        f"{SEP}\n"
        f"💰 **Solde :** `{fmt(balance)}` ฿\n"
        f"📈 **Investi :** `{fmt(invested)}` ฿\n"
        f"☠️ **Prime :** `{fmt(bounty)}` ฿\n"
        f"{SEP}\n"
        f"{rank['emoji']} **{rank['name']}**\n"
        f"{prog_str}\n"
        f"🎯 {next_str}\n"
        f"{SEP}\n"
        f"📊 **Aujourd'hui :** +`{fmt(day_stats.get('earned',0))}` ฿ / -`{fmt(day_stats.get('lost',0))}` ฿\n"
        f"{SEP}"
    )
    e = discord.Embed(title="🏴‍☠️ FREYDISS BANK", description=desc, color=rank["color"])
    e.set_footer(text=FOOTER)
    return e
