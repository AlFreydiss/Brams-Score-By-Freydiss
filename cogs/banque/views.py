"""
Views, Modals et helpers embed du cog Banque — Interface v2.
Mini-jeux : Dés, Slots, Blackjack, Pile/Face, Pierre-Papier-Ciseaux, Roulette, Course Pirates, Devinette.
"""
from __future__ import annotations

import asyncio
import random
from datetime import datetime, timezone
from typing import TYPE_CHECKING

import discord

from . import database as db
from .constants import (
    TRANSFER_FEE_RATE, TRANSFER_CONFIRM_THRESHOLD, TRANSFER_DAILY_LIMIT,
    CASINO_DAILY_CAP_RATIO,
    SLOTS_EMOJIS, SLOTS_WEIGHTS, SLOTS_MULT,
    ACHIEVEMENTS, COLOR_GAIN, COLOR_LOSS, COLOR_NEUTRAL, COLOR_INFO,
    DAILY_MIN, DAILY_MAX, STREAK_BONUS, STREAK_MAX,
)
from utils.transactions import log_transaction

if TYPE_CHECKING:
    import discord

SEP = "━━━━━━━━━━━━━━━━━━━━━━"

# Roulette — numéros rouges/noirs
_ROUGE = frozenset({1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36})
_NOIR  = frozenset({2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35})

# Course de Pirates
_PIRATES = [
    ("🏴‍☠️", "Luffy"),
    ("⚔️",  "Zoro"),
    ("🍊",  "Nami"),
    ("🍖",  "Sanji"),
]


# ── Helpers ───────────────────────────────────────────────────────

def fmt(n: int) -> str:
    return f"{n:,}".replace(",", " ")


def fmt_rel(dt: datetime) -> str:
    if dt is None:
        return "N/A"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    delta = datetime.now(timezone.utc) - dt
    s = int(delta.total_seconds())
    if s < 60:     return "à l'instant"
    if s < 3600:   return f"il y a {s // 60} min"
    if s < 86400:  return f"il y a {s // 3600}h"
    if s < 172800: return "hier"
    return f"il y a {s // 86400}j"


_CAT_ICON = {
    "vocal": "🎙️", "quiz": "❓", "casino_gain": "🎰", "casino_perte": "🎰",
    "vol_recu": "💼", "vol_perdu": "💼", "achat_boutique": "🛒",
    "transfert_envoye": "📤", "transfert_recu": "📥",
    "duel_gagne": "⚔️", "duel_perdu": "⚔️", "daily": "🎁", "coffre_interet": "📈",
    "depot_coffre": "🔒", "retrait_coffre": "🔓", "autre": "•",
}


def _owner_check(uid: str, interaction: discord.Interaction) -> bool:
    return str(interaction.user.id) == uid


async def _deny(interaction: discord.Interaction) -> None:
    await interaction.response.send_message("⚓ C'est pas ton carnet, matelot !", ephemeral=True)


async def _check_achievements(bot, uid: str, wallet: int, guild: discord.Guild) -> list[str]:
    new: list[str] = []
    unlocked = await db.get_achievements(uid)
    checks = []
    if wallet >= 1_000_000 and "premier_million" not in unlocked:
        checks.append("premier_million")
    if len(unlocked) >= 5 and "collectionneur" not in unlocked:
        checks.append("collectionneur")
    for ach_id in checks:
        if await db.unlock_achievement(uid, ach_id):
            new.append(ach_id)
    return new


def _achievement_embed(ach_ids: list[str]) -> discord.Embed | None:
    if not ach_ids:
        return None
    lines = [f"{ACHIEVEMENTS[a]['emoji']} **{ACHIEVEMENTS[a]['nom']}** — {ACHIEVEMENTS[a]['desc']}"
             for a in ach_ids if a in ACHIEVEMENTS]
    return discord.Embed(title="🏅 Nouveaux achievements !", description="\n".join(lines), color=COLOR_GAIN)


async def _check_casino_bet(interaction: discord.Interaction, uid: str, amount: int, remaining: int) -> bool:
    if amount <= 0:
        await interaction.followup.send("❌ Mise invalide.", ephemeral=True)
        return False
    wallet = interaction.client.get_berrys(uid)
    if wallet < amount:
        await interaction.followup.send(f"❌ Pas assez en poche (`{fmt(wallet)}` ฿).", ephemeral=True)
        return False
    if amount > remaining:
        await interaction.followup.send(f"❌ Cap journalier dépassé — reste `{fmt(remaining)}` ฿.", ephemeral=True)
        return False
    return True


def _parse_amount(raw: str, balance: int) -> int | None:
    try:
        raw = raw.replace(" ", "").replace("฿", "").strip()
        if raw in ("tout", "all", "max"):
            return balance
        if raw.endswith("%"):
            pct = float(raw[:-1])
            return max(0, int(balance * pct / 100))
        return int(float(raw.replace(",", "").replace("k", "000").replace("m", "000000")))
    except (ValueError, AttributeError):
        return None


async def _resolve_member(interaction: discord.Interaction, raw: str) -> discord.Member | None:
    raw = raw.strip("<@!>").replace(" ", "")
    if raw.isdigit():
        m = interaction.guild.get_member(int(raw))
        if m:
            return m
        try:
            return await interaction.guild.fetch_member(int(raw))
        except Exception:
            return None
    raw_lower = raw.lower()
    return next(
        (m for m in interaction.guild.members
         if m.name.lower() == raw_lower or m.display_name.lower() == raw_lower),
        None,
    )


async def _execute_transfer(interaction, uid, target, amount, fee):
    total = amount + fee
    ok = interaction.client.spend_berrys(uid, total)
    if not ok:
        await interaction.followup.send("❌ Solde insuffisant.", ephemeral=True)
        return

    interaction.client.add_berrys(str(target.id), amount, track="earned")
    wallet_from = interaction.client.get_berrys(uid)
    wallet_to   = interaction.client.get_berrys(str(target.id))

    await log_transaction(uid, "depense", "transfert_envoye", amount, f"Transfert → {target.name}", wallet_from)
    await log_transaction(str(target.id), "gain", "transfert_recu", amount, f"Transfert ← {interaction.user.name}", wallet_to)
    await db.unlock_achievement(uid, "premier_transfert")

    settings_to = await db.get_bank_settings(str(target.id))
    if settings_to.get("dm_notifications"):
        try:
            await target.send(embed=discord.Embed(
                title="📥 Transfert reçu !",
                description=(
                    f"**{interaction.user.display_name}** t'a envoyé `{fmt(amount)}` ฿ !\n"
                    f"Ton solde : `{fmt(wallet_to)}` ฿"
                ),
                color=COLOR_GAIN,
            ))
        except discord.Forbidden:
            pass

    await interaction.followup.send(
        embed=discord.Embed(
            title="✅ Virement effectué",
            description=(
                f"{SEP}\n"
                f"Envoyé **`{fmt(amount)}` ฿** à {target.mention}\n"
                f"Frais Marines : `{fmt(fee)}` ฿\n"
                f"{SEP}\n"
                f"💰 Ton solde : `{fmt(wallet_from)}` ฿"
            ),
            color=COLOR_GAIN,
        ),
        ephemeral=True,
    )


# ── Vue principale ────────────────────────────────────────────────

class BanqueView(discord.ui.View):
    message: discord.Message | None = None

    def __init__(self, uid: str, target: discord.Member, account: dict, guild_id: str):
        super().__init__(timeout=300)
        self.uid      = uid
        self.target   = target
        self.account  = account
        self.guild_id = guild_id

    async def interaction_check(self, interaction: discord.Interaction) -> bool:
        if not _owner_check(self.uid, interaction):
            await _deny(interaction)
            return False
        return True

    async def on_timeout(self) -> None:
        for item in self.children:
            item.disabled = True
        try:
            await self.message.edit(view=self)
        except Exception:
            pass

    # ── Row 0 : Finances ──────────────────────────────────────────
    @discord.ui.button(label="Coffre", emoji="🔒", style=discord.ButtonStyle.primary, row=0)
    async def btn_coffre(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.defer(ephemeral=True)
        wallet = interaction.client.get_berrys(self.uid)
        vault  = self.account.get("vault") or 0
        embed  = discord.Embed(
            title="🔒 Coffre-Fort",
            description=(
                f"{SEP}\n"
                f"💰 **En poche :** `{fmt(wallet)}` ฿\n"
                f"🔒 **Coffre :** `{fmt(vault)}` ฿\n"
                f"{SEP}\n"
                f"📈 Intérêts : **0.5%/j** (libre) · **1%/j** (7j) · **2%/j** (30j)\n"
                f"Dépose pour faire fructifier tes Berries !"
            ),
            color=COLOR_INFO,
        )
        view = CoffreView(self.uid, self.account)
        msg  = await interaction.followup.send(embed=embed, view=view, ephemeral=True)
        view.message = msg

    @discord.ui.button(label="Virement", emoji="🔁", style=discord.ButtonStyle.secondary, row=0)
    async def btn_virement(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.send_modal(TransfertModal(self.uid))

    @discord.ui.button(label="Historique", emoji="📜", style=discord.ButtonStyle.secondary, row=0)
    async def btn_historique(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.defer(ephemeral=True)
        rows, total_pages = await db.get_history(self.uid, "tous", 0)
        view  = HistoriqueView(self.uid, "tous", 0, total_pages)
        embed = view.build_embed(rows)
        msg   = await interaction.followup.send(embed=embed, view=view, ephemeral=True)
        view.message = msg

    # ── Row 1 : Jeux & Récompenses ────────────────────────────────
    @discord.ui.button(label="Mini-Jeux", emoji="🎮", style=discord.ButtonStyle.danger, row=1)
    async def btn_jeux(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.defer(ephemeral=True)
        wallet  = interaction.client.get_berrys(self.uid)
        lost    = await db.get_casino_lost_today(self.uid)
        cap     = int(wallet * CASINO_DAILY_CAP_RATIO)
        embed   = _build_minijeux_embed(wallet, cap, lost)
        view    = MiniJeuxView(self.uid, self.guild_id, cap, lost)
        msg     = await interaction.followup.send(embed=embed, view=view, ephemeral=True)
        view.message = msg

    @discord.ui.button(label="Daily 🎁", emoji="🎁", style=discord.ButtonStyle.success, row=1)
    async def btn_daily(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.defer(ephemeral=True)
        montant, streak, already = await db.claim_daily(self.uid, self.guild_id)
        if already:
            await interaction.followup.send(
                embed=discord.Embed(
                    title="⏳ Daily déjà réclamé",
                    description="Reviens demain pour ton prochain daily !",
                    color=COLOR_NEUTRAL,
                ),
                ephemeral=True,
            )
            return
        interaction.client.add_berrys(self.uid, montant, track="earned")
        await log_transaction(self.uid, "gain", "daily", montant, f"Daily x{streak}j",
                              interaction.client.get_berrys(self.uid))
        new = await _check_achievements(interaction.client, self.uid,
                                        interaction.client.get_berrys(self.uid), interaction.guild)
        if streak >= 14:
            await db.unlock_achievement(self.uid, "streaker")
        mult = min(1.0 + max(0, streak - 1) * STREAK_BONUS, STREAK_MAX)
        await interaction.followup.send(
            embed=discord.Embed(
                title="🎁 Daily réclamé !",
                description=(
                    f"{SEP}\n"
                    f"🎉 **+`{fmt(montant)}` ฿** reçus !\n"
                    f"🔗 Streak : **{streak} jour(s)** × **{mult:.1f}**\n"
                    f"💰 Solde : `{fmt(interaction.client.get_berrys(self.uid))}` ฿\n"
                    f"{SEP}"
                ),
                color=COLOR_GAIN,
            ),
            ephemeral=True,
        )
        if new:
            ach_e = _achievement_embed(new)
            if ach_e:
                await interaction.followup.send(embed=ach_e, ephemeral=True)

    @discord.ui.button(label="Classement", emoji="📊", style=discord.ButtonStyle.secondary, row=1)
    async def btn_classement(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.defer(ephemeral=True)
        await _send_leaderboard(interaction, self.uid)

    # ── Row 2 : Succès, Paramètres, Fermer ────────────────────────
    @discord.ui.button(label="Succès", emoji="🏅", style=discord.ButtonStyle.secondary, row=2)
    async def btn_succes(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.defer(ephemeral=True)
        achs  = await db.get_achievements(self.uid)
        embed = _build_succes_embed(achs)
        await interaction.followup.send(embed=embed, ephemeral=True)

    @discord.ui.button(label="Paramètres", emoji="⚙️", style=discord.ButtonStyle.secondary, row=2)
    async def btn_params(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.defer(ephemeral=True)
        settings = await db.get_bank_settings(self.uid)
        view     = ParamsView(self.uid, settings)
        embed    = _build_params_embed(settings)
        msg      = await interaction.followup.send(embed=embed, view=view, ephemeral=True)
        view.message = msg

    @discord.ui.button(label="Fermer", emoji="❌", style=discord.ButtonStyle.danger, row=2)
    async def btn_fermer(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.defer()
        await interaction.delete_original_response()


# ── Coffre sub-view ───────────────────────────────────────────────

class CoffreView(discord.ui.View):
    message: discord.Message | None = None

    def __init__(self, uid: str, account: dict):
        super().__init__(timeout=120)
        self.uid     = uid
        self.account = account

    @discord.ui.button(label="Déposer", emoji="💰", style=discord.ButtonStyle.primary)
    async def btn_depot(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction):
            await _deny(interaction); return
        await interaction.response.send_modal(DepotModal(self.uid, self.account))

    @discord.ui.button(label="Retirer", emoji="💸", style=discord.ButtonStyle.secondary)
    async def btn_retrait(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction):
            await _deny(interaction); return
        await interaction.response.send_modal(RetraitModal(self.uid, self.account))


# ── Modal Dépôt ───────────────────────────────────────────────────

class DepotModal(discord.ui.Modal, title="💰 Dépôt au coffre-fort"):
    montant = discord.ui.TextInput(
        label="Montant à déposer",
        placeholder="Ex: 500000 — ou 'tout', '50%'",
        max_length=20,
    )
    verrouillage = discord.ui.TextInput(
        label="Verrouillage (optionnel)",
        placeholder="0 = libre  |  7 = 7 jours (+1%/j)  |  30 = 30 jours (+2%/j)",
        required=False,
        max_length=2,
    )

    def __init__(self, uid: str, account: dict):
        super().__init__()
        self.uid     = uid
        self.account = account

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        wallet = interaction.client.get_berrys(self.uid)
        amount = _parse_amount(self.montant.value.strip().lower(), wallet)
        if amount is None or amount <= 0:
            await interaction.followup.send("❌ Montant invalide.", ephemeral=True); return
        if wallet < amount:
            await interaction.followup.send(f"❌ Pas assez en poche (`{fmt(wallet)}` ฿).", ephemeral=True); return

        raw_lock = (self.verrouillage.value or "0").strip()
        lock_days = int(raw_lock) if raw_lock.isdigit() and int(raw_lock) in (0, 7, 30) else 0

        if not interaction.client.spend_berrys(self.uid, amount):
            await interaction.followup.send("❌ Solde insuffisant.", ephemeral=True); return

        await db.deposit_vault(self.uid, str(interaction.guild_id), amount, lock_days)
        new_vault = (self.account.get("vault") or 0) + amount
        await log_transaction(self.uid, "depense", "depot_coffre", amount,
            f"Dépôt coffre{' verrouillé ' + str(lock_days) + 'j' if lock_days else ''}",
            interaction.client.get_berrys(self.uid))

        desc = f"✅ `{fmt(amount)}` ฿ déposés au coffre."
        if lock_days:
            taux = 1 if lock_days == 7 else 2
            desc += f"\n🔒 Verrouillé **{lock_days} jours** (+{taux}%/j)."
        desc += f"\n\n💰 Poche : `{fmt(interaction.client.get_berrys(self.uid))}` ฿\n🔒 Coffre : `{fmt(new_vault)}` ฿"

        await interaction.followup.send(
            embed=discord.Embed(title="🔒 Dépôt effectué", description=desc, color=COLOR_INFO),
            ephemeral=True,
        )


# ── Modal Retrait ─────────────────────────────────────────────────

class RetraitModal(discord.ui.Modal, title="💸 Retrait du coffre-fort"):
    montant = discord.ui.TextInput(
        label="Montant à retirer",
        placeholder="Ex: 200000 — ou 'tout', '50%'",
        max_length=20,
    )

    def __init__(self, uid: str, account: dict):
        super().__init__()
        self.uid     = uid
        self.account = account

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        vault  = self.account.get("vault") or 0
        amount = _parse_amount(self.montant.value.strip().lower(), vault)
        if amount is None or amount <= 0:
            await interaction.followup.send("❌ Montant invalide.", ephemeral=True); return

        ok, err = await db.withdraw_vault(self.uid, str(interaction.guild_id), amount)
        if not ok:
            await interaction.followup.send(f"❌ {err}", ephemeral=True); return

        interaction.client.add_berrys(self.uid, amount, track=None)
        await log_transaction(self.uid, "gain", "retrait_coffre", amount,
            "Retrait coffre", interaction.client.get_berrys(self.uid))

        await interaction.followup.send(
            embed=discord.Embed(
                title="🔓 Retrait effectué",
                description=(
                    f"✅ `{fmt(amount)}` ฿ retirés du coffre.\n\n"
                    f"💰 Poche : `{fmt(interaction.client.get_berrys(self.uid))}` ฿\n"
                    f"🔒 Coffre restant : `{fmt(vault - amount)}` ฿"
                ),
                color=COLOR_GAIN,
            ),
            ephemeral=True,
        )


# ── Modal Transfert ───────────────────────────────────────────────

class TransfertModal(discord.ui.Modal, title="🔁 Virement de Berries"):
    destinataire = discord.ui.TextInput(
        label="Destinataire",
        placeholder="@mention ou ID Discord",
        max_length=30,
    )
    montant = discord.ui.TextInput(
        label="Montant à envoyer",
        placeholder="Ex: 500000 — ou 'tout', '50%'",
        max_length=20,
    )

    def __init__(self, uid: str):
        super().__init__()
        self.uid = uid

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        wallet = interaction.client.get_berrys(self.uid)
        amount = _parse_amount(self.montant.value.strip().lower(), wallet)
        if amount is None or amount <= 0:
            await interaction.followup.send("❌ Montant invalide.", ephemeral=True); return

        target = await _resolve_member(interaction, self.destinataire.value.strip())
        if target is None:
            await interaction.followup.send("❌ Membre introuvable.", ephemeral=True); return
        if str(target.id) == self.uid:
            await interaction.followup.send("❌ Tu ne peux pas te virer à toi-même.", ephemeral=True); return
        if target.bot:
            await interaction.followup.send("❌ Les bots n'ont pas de compte.", ephemeral=True); return

        fee   = max(1, int(amount * TRANSFER_FEE_RATE))
        total = amount + fee
        if wallet < total:
            await interaction.followup.send(
                f"❌ Solde insuffisant (besoin de `{fmt(total)}` ฿ avec frais `{fmt(fee)}` ฿).",
                ephemeral=True,
            ); return

        sent_today = await db.get_transfer_total_today(self.uid)
        if sent_today + amount > TRANSFER_DAILY_LIMIT:
            reste = max(0, TRANSFER_DAILY_LIMIT - sent_today)
            await interaction.followup.send(
                f"❌ Limite journalière atteinte. Reste : `{fmt(reste)}` ฿.", ephemeral=True
            ); return

        settings = await db.get_bank_settings(self.uid)
        if settings.get("confirm_large_transfers", True) and amount >= TRANSFER_CONFIRM_THRESHOLD:
            view = ConfirmTransfertView(self.uid, target, amount, fee)
            embed = discord.Embed(
                title="⚠️ Confirmation requise",
                description=(
                    f"Tu t'apprêtes à envoyer **`{fmt(amount)}` ฿** à {target.mention}.\n"
                    f"Frais Marines : **`{fmt(fee)}` ฿** (2%)\n"
                    f"**Total débité : `{fmt(total)}` ฿**"
                ),
                color=0xFFA500,
            )
            msg = await interaction.followup.send(embed=embed, view=view, ephemeral=True)
            view.message = msg
        else:
            await _execute_transfer(interaction, self.uid, target, amount, fee)


class ConfirmTransfertView(discord.ui.View):
    message: discord.Message | None = None

    def __init__(self, uid, target, amount, fee):
        super().__init__(timeout=60)
        self.uid    = uid
        self.target = target
        self.amount = amount
        self.fee    = fee

    @discord.ui.button(label="Confirmer", emoji="✅", style=discord.ButtonStyle.success)
    async def btn_confirm(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction):
            await _deny(interaction); return
        await interaction.response.defer(ephemeral=True)
        await _execute_transfer(interaction, self.uid, self.target, self.amount, self.fee)
        self.stop()

    @discord.ui.button(label="Annuler", emoji="❌", style=discord.ButtonStyle.danger)
    async def btn_cancel(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction):
            await _deny(interaction); return
        await interaction.response.send_message("❌ Virement annulé.", ephemeral=True)
        self.stop()


# ── Mini-Jeux embed + vue ─────────────────────────────────────────

def _build_minijeux_embed(wallet: int, cap: int, lost: int) -> discord.Embed:
    dispo = max(0, cap - lost)
    return discord.Embed(
        title="🎮 Mini-Jeux — Freydiss Bank",
        description=(
            f"{SEP}\n"
            f"💰 **En poche :** `{fmt(wallet)}` ฿\n"
            f"🎲 **Cap casino/jour :** `{fmt(cap)}` ฿  ·  dispo : `{fmt(dispo)}` ฿\n"
            f"{SEP}\n"
            f"🎲 **Dés** — Parie > 7, mise x2\n"
            f"🎰 **Slots** — Aligne 3 symboles One Piece\n"
            f"🃏 **Blackjack** — Bats le croupier à 21\n"
            f"🪙 **Pile ou Face** — 50/50, mise x2\n"
            f"🪨 **Pierre-Papier-Ciseaux** — vs le bot, mise x2\n"
            f"🎡 **Roulette** — Rouge/Noir x2 · Numéro x36\n"
            f"🏴‍☠️ **Course Pirates** — 4 pirates, le tien gagne x4 ?\n"
            f"🔢 **Devinette** — Devine 1-10, mise x8\n"
            f"{SEP}"
        ),
        color=COLOR_NEUTRAL,
    )


class MiniJeuxView(discord.ui.View):
    message: discord.Message | None = None

    def __init__(self, uid: str, guild_id: str, cap: int, lost_today: int):
        super().__init__(timeout=180)
        self.uid        = uid
        self.guild_id   = guild_id
        self.cap        = cap
        self.lost_today = lost_today

    def _rem(self) -> int:
        return max(0, self.cap - self.lost_today)

    # ── Row 0 : Casino classique ──────────────────────────────────
    @discord.ui.button(label="Dés", emoji="🎲", style=discord.ButtonStyle.primary, row=0)
    async def btn_des(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction): await _deny(interaction); return
        await interaction.response.send_modal(DesBetModal(self.uid, self.guild_id, self._rem()))

    @discord.ui.button(label="Slots", emoji="🎰", style=discord.ButtonStyle.primary, row=0)
    async def btn_slots(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction): await _deny(interaction); return
        await interaction.response.send_modal(SlotsBetModal(self.uid, self.guild_id, self._rem()))

    @discord.ui.button(label="Blackjack", emoji="🃏", style=discord.ButtonStyle.primary, row=0)
    async def btn_bj(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction): await _deny(interaction); return
        await interaction.response.send_modal(BlackjackBetModal(self.uid, self.guild_id, self._rem()))

    # ── Row 1 : Nouveaux jeux ─────────────────────────────────────
    @discord.ui.button(label="Pile/Face", emoji="🪙", style=discord.ButtonStyle.secondary, row=1)
    async def btn_pof(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction): await _deny(interaction); return
        await interaction.response.send_modal(PofBetModal(self.uid, self.guild_id, self._rem()))

    @discord.ui.button(label="Pierre-Papier-Ciseaux", emoji="🪨", style=discord.ButtonStyle.secondary, row=1)
    async def btn_ppc(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction): await _deny(interaction); return
        await interaction.response.send_modal(PpcBetModal(self.uid, self.guild_id, self._rem()))

    @discord.ui.button(label="Roulette", emoji="🎡", style=discord.ButtonStyle.secondary, row=1)
    async def btn_roulette(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction): await _deny(interaction); return
        await interaction.response.send_modal(RouletteBetModal(self.uid, self.guild_id, self._rem()))

    # ── Row 2 : Course + Devinette + Fermer ───────────────────────
    @discord.ui.button(label="Course Pirates", emoji="🏴‍☠️", style=discord.ButtonStyle.danger, row=2)
    async def btn_course(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction): await _deny(interaction); return
        await interaction.response.send_modal(CoursesBetModal(self.uid, self.guild_id, self._rem()))

    @discord.ui.button(label="Devinette", emoji="🔢", style=discord.ButtonStyle.danger, row=2)
    async def btn_devinette(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction): await _deny(interaction); return
        await interaction.response.send_modal(DevBetModal(self.uid, self.guild_id, self._rem()))

    @discord.ui.button(label="Fermer", emoji="❌", style=discord.ButtonStyle.secondary, row=2)
    async def btn_fermer(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.defer()
        await interaction.delete_original_response()


# ── Dés ───────────────────────────────────────────────────────────

class DesBetModal(discord.ui.Modal, title="🎲 Dés — Mise"):
    mise = discord.ui.TextInput(label="Montant de la mise", placeholder="Ex: 10 000", max_length=15)

    def __init__(self, uid, guild_id, remaining):
        super().__init__()
        self.uid = uid; self.guild_id = guild_id; self.remaining = remaining

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        wallet = interaction.client.get_berrys(self.uid)
        amount = _parse_amount(self.mise.value.strip().lower(), wallet)
        if not await _check_casino_bet(interaction, self.uid, amount or 0, self.remaining): return

        d1, d2 = random.randint(1, 6), random.randint(1, 6)
        total  = d1 + d2
        faces  = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"]
        win    = total > 7

        interaction.client.spend_berrys(self.uid, amount)
        if win:
            interaction.client.add_berrys(self.uid, amount * 2, track=None)
            await log_transaction(self.uid, "gain", "casino_gain", amount, f"Dés ({d1}+{d2}={total})", interaction.client.get_berrys(self.uid))
            desc  = f"🟢 **Gagné !** +`{fmt(amount)}` ฿"
            color = COLOR_GAIN
        else:
            await log_transaction(self.uid, "depense", "casino_perte", amount, f"Dés ({d1}+{d2}={total})", interaction.client.get_berrys(self.uid))
            desc  = f"🔴 **Perdu.** -`{fmt(amount)}` ฿"
            color = COLOR_LOSS
            if amount >= 1_000_000:
                await db.unlock_achievement(self.uid, "flambeur")

        await interaction.followup.send(
            embed=discord.Embed(
                title=f"🎲  {faces[d1-1]} + {faces[d2-1]} = **{total}** {'> 7 ✅' if win else '≤ 7 ❌'}",
                description=desc + f"\n💰 Solde : `{fmt(interaction.client.get_berrys(self.uid))}` ฿",
                color=color,
            ),
            ephemeral=True,
        )


# ── Slots ─────────────────────────────────────────────────────────

class SlotsBetModal(discord.ui.Modal, title="🎰 Slots — Mise"):
    mise = discord.ui.TextInput(label="Montant de la mise", placeholder="Ex: 5 000", max_length=15)

    def __init__(self, uid, guild_id, remaining):
        super().__init__()
        self.uid = uid; self.guild_id = guild_id; self.remaining = remaining

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        wallet = interaction.client.get_berrys(self.uid)
        amount = _parse_amount(self.mise.value.strip().lower(), wallet)
        if not await _check_casino_bet(interaction, self.uid, amount or 0, self.remaining): return

        reels   = random.choices(SLOTS_EMOJIS, weights=SLOTS_WEIGHTS, k=3)
        display = " | ".join(reels)

        interaction.client.spend_berrys(self.uid, amount)
        if reels[0] == reels[1] == reels[2]:
            mult = SLOTS_MULT[reels[0]]
            gain = amount * mult
            interaction.client.add_berrys(self.uid, amount + gain, track=None)
            await log_transaction(self.uid, "gain", "casino_gain", gain, f"Slots jackpot {reels[0]}", interaction.client.get_berrys(self.uid))
            await db.unlock_achievement(self.uid, "jackpot")
            desc  = f"🎊 **JACKPOT ×{mult} !** +`{fmt(gain)}` ฿"
            color = COLOR_GAIN
        else:
            await log_transaction(self.uid, "depense", "casino_perte", amount, f"Slots {display}", interaction.client.get_berrys(self.uid))
            if amount >= 1_000_000:
                await db.unlock_achievement(self.uid, "flambeur")
            desc  = f"😞 Rien… -`{fmt(amount)}` ฿"
            color = COLOR_LOSS

        await interaction.followup.send(
            embed=discord.Embed(
                title=f"🎰  {display}",
                description=desc + f"\n💰 Solde : `{fmt(interaction.client.get_berrys(self.uid))}` ฿",
                color=color,
            ),
            ephemeral=True,
        )


# ── Pile ou Face ──────────────────────────────────────────────────

class PofBetModal(discord.ui.Modal, title="🪙 Pile ou Face"):
    mise  = discord.ui.TextInput(label="Montant de la mise", placeholder="Ex: 20 000", max_length=15)
    choix = discord.ui.TextInput(label="Ton choix", placeholder="'pile' ou 'face'", max_length=5)

    def __init__(self, uid, guild_id, remaining):
        super().__init__()
        self.uid = uid; self.guild_id = guild_id; self.remaining = remaining

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        wallet = interaction.client.get_berrys(self.uid)
        amount = _parse_amount(self.mise.value.strip().lower(), wallet)
        if not await _check_casino_bet(interaction, self.uid, amount or 0, self.remaining): return

        raw   = self.choix.value.strip().lower()
        choix = raw if raw in ("pile", "face") else None
        if choix is None:
            await interaction.followup.send("❌ Choisis 'pile' ou 'face'.", ephemeral=True); return

        result = random.choice(["pile", "face"])
        win    = result == choix

        interaction.client.spend_berrys(self.uid, amount)
        if win:
            interaction.client.add_berrys(self.uid, amount * 2, track=None)
            await log_transaction(self.uid, "gain", "casino_gain", amount, f"Pile/Face ({result})", interaction.client.get_berrys(self.uid))
            desc  = f"🟢 **{result.upper()} !** Tu avais `{choix}` — +`{fmt(amount)}` ฿ !"
            color = COLOR_GAIN
        else:
            await log_transaction(self.uid, "depense", "casino_perte", amount, f"Pile/Face ({result})", interaction.client.get_berrys(self.uid))
            if amount >= 1_000_000:
                await db.unlock_achievement(self.uid, "flambeur")
            desc  = f"🔴 **{result.upper()} !** Tu avais `{choix}` — -`{fmt(amount)}` ฿."
            color = COLOR_LOSS

        await interaction.followup.send(
            embed=discord.Embed(
                title=f"🪙 Résultat : **{result.upper()}**",
                description=desc + f"\n💰 Solde : `{fmt(interaction.client.get_berrys(self.uid))}` ฿",
                color=color,
            ),
            ephemeral=True,
        )


# ── Pierre-Papier-Ciseaux ─────────────────────────────────────────

class PpcBetModal(discord.ui.Modal, title="🪨 Pierre-Papier-Ciseaux — Mise"):
    mise = discord.ui.TextInput(label="Montant de la mise", placeholder="Ex: 15 000", max_length=15)

    def __init__(self, uid, guild_id, remaining):
        super().__init__()
        self.uid = uid; self.guild_id = guild_id; self.remaining = remaining

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        wallet = interaction.client.get_berrys(self.uid)
        amount = _parse_amount(self.mise.value.strip().lower(), wallet)
        if not await _check_casino_bet(interaction, self.uid, amount or 0, self.remaining): return

        interaction.client.spend_berrys(self.uid, amount)
        embed = discord.Embed(
            title="🪨 Pierre-Papier-Ciseaux — Choisis !",
            description=f"Mise : `{fmt(amount)}` ฿\nQue joues-tu ?",
            color=COLOR_NEUTRAL,
        )
        view = PpcChoixView(self.uid, self.guild_id, amount)
        msg  = await interaction.followup.send(embed=embed, view=view, ephemeral=True)
        view.message = msg


class PpcChoixView(discord.ui.View):
    message: discord.Message | None = None
    _WINS = {"pierre": "ciseaux", "papier": "pierre", "ciseaux": "papier"}
    _EMO  = {"pierre": "🪨", "papier": "📄", "ciseaux": "✂️"}

    def __init__(self, uid, guild_id, bet):
        super().__init__(timeout=60)
        self.uid = uid; self.guild_id = guild_id; self.bet = bet

    async def _play(self, interaction: discord.Interaction, choix: str):
        bot_c = random.choice(["pierre", "papier", "ciseaux"])
        if choix == bot_c:
            result = "draw"
        elif self._WINS[choix] == bot_c:
            result = "win"
        else:
            result = "lose"

        for item in self.children:
            item.disabled = True

        if result == "win":
            interaction.client.add_berrys(self.uid, self.bet * 2, track=None)
            await log_transaction(self.uid, "gain", "casino_gain", self.bet, f"PPC {choix} vs {bot_c}", interaction.client.get_berrys(self.uid))
            desc  = f"🟢 **Gagné !** +`{fmt(self.bet)}` ฿"
            color = COLOR_GAIN
        elif result == "draw":
            interaction.client.add_berrys(self.uid, self.bet, track=None)
            desc  = f"🟡 **Égalité !** Mise remboursée."
            color = COLOR_NEUTRAL
        else:
            await log_transaction(self.uid, "depense", "casino_perte", self.bet, f"PPC {choix} vs {bot_c}", interaction.client.get_berrys(self.uid))
            desc  = f"🔴 **Perdu.** -`{fmt(self.bet)}` ฿"
            color = COLOR_LOSS

        embed = discord.Embed(
            title=f"{self._EMO[choix]} vs {self._EMO[bot_c]} — {'Victoire' if result == 'win' else 'Égalité' if result == 'draw' else 'Défaite'}",
            description=(
                f"Tu : **{self._EMO[choix]} {choix}** · Bot : **{self._EMO[bot_c]} {bot_c}**\n\n"
                f"{desc}\n💰 Solde : `{fmt(interaction.client.get_berrys(self.uid))}` ฿"
            ),
            color=color,
        )
        await interaction.response.edit_message(embed=embed, view=self)
        self.stop()

    @discord.ui.button(label="Pierre", emoji="🪨", style=discord.ButtonStyle.primary)
    async def btn_pierre(self, i, _): await self._play(i, "pierre")

    @discord.ui.button(label="Papier", emoji="📄", style=discord.ButtonStyle.primary)
    async def btn_papier(self, i, _): await self._play(i, "papier")

    @discord.ui.button(label="Ciseaux", emoji="✂️", style=discord.ButtonStyle.primary)
    async def btn_ciseaux(self, i, _): await self._play(i, "ciseaux")


# ── Roulette ──────────────────────────────────────────────────────

class RouletteBetModal(discord.ui.Modal, title="🎡 Roulette"):
    mise = discord.ui.TextInput(label="Montant de la mise", placeholder="Ex: 30 000", max_length=15)
    pari = discord.ui.TextInput(
        label="Pari",
        placeholder="'rouge', 'noir', ou un numéro 0-36",
        max_length=10,
    )

    def __init__(self, uid, guild_id, remaining):
        super().__init__()
        self.uid = uid; self.guild_id = guild_id; self.remaining = remaining

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        wallet = interaction.client.get_berrys(self.uid)
        amount = _parse_amount(self.mise.value.strip().lower(), wallet)
        if not await _check_casino_bet(interaction, self.uid, amount or 0, self.remaining): return

        raw = self.pari.value.strip().lower()
        if raw in ("rouge", "r"):
            pari_type, mult = "rouge", 2
        elif raw in ("noir", "n"):
            pari_type, mult = "noir", 2
        elif raw.isdigit() and 0 <= int(raw) <= 36:
            pari_type, mult, numero = "numero", 36, int(raw)
        else:
            await interaction.followup.send(
                "❌ Pari invalide — tape `rouge`, `noir` ou un numéro entre `0` et `36`.",
                ephemeral=True,
            ); return

        spin = random.randint(0, 36)
        spin_color = "🟥" if spin in _ROUGE else ("⬛" if spin in _NOIR else "🟩")

        if pari_type == "rouge":
            win = spin in _ROUGE
        elif pari_type == "noir":
            win = spin in _NOIR
        else:
            win = spin == numero

        interaction.client.spend_berrys(self.uid, amount)
        if win:
            gain = amount * mult
            interaction.client.add_berrys(self.uid, amount + gain, track=None)
            await log_transaction(self.uid, "gain", "casino_gain", gain, f"Roulette {raw} ({spin})", interaction.client.get_berrys(self.uid))
            desc  = f"🟢 **Gagné ×{mult} !** +`{fmt(gain)}` ฿"
            color = COLOR_GAIN
        else:
            await log_transaction(self.uid, "depense", "casino_perte", amount, f"Roulette {raw} ({spin})", interaction.client.get_berrys(self.uid))
            if amount >= 1_000_000:
                await db.unlock_achievement(self.uid, "flambeur")
            desc  = f"🔴 **Perdu.** -`{fmt(amount)}` ฿"
            color = COLOR_LOSS

        await interaction.followup.send(
            embed=discord.Embed(
                title=f"🎡 Roulette · {spin_color} **{spin}**",
                description=(
                    f"Ton pari : **{raw}** · Résultat : **{spin}** {spin_color}\n\n"
                    f"{desc}\n💰 Solde : `{fmt(interaction.client.get_berrys(self.uid))}` ฿"
                ),
                color=color,
            ),
            ephemeral=True,
        )


# ── Course de Pirates ─────────────────────────────────────────────

class CoursesBetModal(discord.ui.Modal, title="🏴‍☠️ Course de Pirates — Mise"):
    mise = discord.ui.TextInput(label="Montant de la mise", placeholder="Ex: 25 000", max_length=15)

    def __init__(self, uid, guild_id, remaining):
        super().__init__()
        self.uid = uid; self.guild_id = guild_id; self.remaining = remaining

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        wallet = interaction.client.get_berrys(self.uid)
        amount = _parse_amount(self.mise.value.strip().lower(), wallet)
        if not await _check_casino_bet(interaction, self.uid, amount or 0, self.remaining): return

        interaction.client.spend_berrys(self.uid, amount)
        pirates_str = "  ".join(f"{e} **{n}**" for e, n in _PIRATES)
        embed = discord.Embed(
            title="🏴‍☠️ Course de Pirates — Choisis ton champion !",
            description=(
                f"Mise : `{fmt(amount)}` ฿ · Victoire : **×4**\n\n"
                f"{pirates_str}"
            ),
            color=0xFF6600,
        )
        view = CoursesChoixView(self.uid, self.guild_id, amount)
        msg  = await interaction.followup.send(embed=embed, view=view, ephemeral=True)
        view.message = msg


class CoursesChoixView(discord.ui.View):
    message: discord.Message | None = None

    def __init__(self, uid, guild_id, bet):
        super().__init__(timeout=60)
        self.uid = uid; self.guild_id = guild_id; self.bet = bet
        for i, (emoji, name) in enumerate(_PIRATES):
            btn = discord.ui.Button(label=name, emoji=emoji, style=discord.ButtonStyle.primary, custom_id=f"pirate_{i}")
            btn.callback = self._make_callback(i)
            self.add_item(btn)

    def _make_callback(self, idx: int):
        async def callback(interaction: discord.Interaction):
            winner = random.randint(0, len(_PIRATES) - 1)
            win    = winner == idx
            chosen_e, chosen_n = _PIRATES[idx]
            winner_e, winner_n = _PIRATES[winner]

            for item in self.children:
                item.disabled = True

            if win:
                gain = self.bet * 4
                interaction.client.add_berrys(self.uid, gain, track=None)
                await log_transaction(self.uid, "gain", "casino_gain", self.bet * 3, f"Course {chosen_n}", interaction.client.get_berrys(self.uid))
                desc  = f"🟢 **{chosen_e} {chosen_n} gagne la course !** +`{fmt(self.bet * 3)}` ฿ net"
                color = COLOR_GAIN
            else:
                await log_transaction(self.uid, "depense", "casino_perte", self.bet, f"Course {chosen_n} (gagnant: {winner_n})", interaction.client.get_berrys(self.uid))
                desc  = f"🔴 **{winner_e} {winner_n} gagne !** Tu avais misé sur {chosen_e} {chosen_n}. -`{fmt(self.bet)}` ฿"
                color = COLOR_LOSS

            race = "  ".join(
                f"{'🏆' if i == winner else '▸'} {e} {n}"
                for i, (e, n) in enumerate(_PIRATES)
            )
            embed = discord.Embed(
                title="🏴‍☠️ Course terminée !",
                description=f"{race}\n\n{desc}\n💰 Solde : `{fmt(interaction.client.get_berrys(self.uid))}` ฿",
                color=color,
            )
            await interaction.response.edit_message(embed=embed, view=self)
            self.stop()
        return callback


# ── Devinette ─────────────────────────────────────────────────────

class DevBetModal(discord.ui.Modal, title="🔢 Devinette — 1 à 10"):
    mise    = discord.ui.TextInput(label="Montant de la mise", placeholder="Ex: 10 000", max_length=15)
    numero  = discord.ui.TextInput(label="Ton numéro (1-10)", placeholder="Ex: 7", max_length=2)

    def __init__(self, uid, guild_id, remaining):
        super().__init__()
        self.uid = uid; self.guild_id = guild_id; self.remaining = remaining

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        wallet = interaction.client.get_berrys(self.uid)
        amount = _parse_amount(self.mise.value.strip().lower(), wallet)
        if not await _check_casino_bet(interaction, self.uid, amount or 0, self.remaining): return

        raw = self.numero.value.strip()
        if not raw.isdigit() or not (1 <= int(raw) <= 10):
            await interaction.followup.send("❌ Numéro invalide — tape un chiffre entre 1 et 10.", ephemeral=True); return

        choix = int(raw)
        tirage = random.randint(1, 10)
        win = choix == tirage

        interaction.client.spend_berrys(self.uid, amount)
        if win:
            gain = amount * 8
            interaction.client.add_berrys(self.uid, amount + gain, track=None)
            await log_transaction(self.uid, "gain", "casino_gain", gain, f"Devinette {choix}", interaction.client.get_berrys(self.uid))
            desc  = f"🎯 **Exact ! ×8 !** +`{fmt(gain)}` ฿"
            color = COLOR_GAIN
        else:
            await log_transaction(self.uid, "depense", "casino_perte", amount, f"Devinette {choix} (tirage: {tirage})", interaction.client.get_berrys(self.uid))
            desc  = f"❌ C'était **{tirage}** ! Tu avais {choix}. -`{fmt(amount)}` ฿"
            color = COLOR_LOSS

        nums = " ".join(f"**[{n}]**" if n == tirage else str(n) for n in range(1, 11))
        await interaction.followup.send(
            embed=discord.Embed(
                title="🔢 Devinette",
                description=f"{nums}\n\n{desc}\n💰 Solde : `{fmt(interaction.client.get_berrys(self.uid))}` ฿",
                color=color,
            ),
            ephemeral=True,
        )


# ── Blackjack ─────────────────────────────────────────────────────

_CARD_VALS = {"A": 11, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
              "8": 8, "9": 9, "10": 10, "J": 10, "Q": 10, "K": 10}
_SUITS = ["♠", "♥", "♦", "♣"]


def _new_deck() -> list[dict]:
    deck = [{"rank": r, "suit": s, "val": v}
            for r, v in _CARD_VALS.items() for s in _SUITS] * 2
    random.shuffle(deck)
    return deck


def _hand_value(hand: list[dict]) -> int:
    total = sum(c["val"] for c in hand)
    aces  = sum(1 for c in hand if c["rank"] == "A")
    while total > 21 and aces:
        total -= 10; aces -= 1
    return total


def _display_hand(hand: list[dict]) -> str:
    return "  ".join(f"`{c['rank']}{c['suit']}`" for c in hand)


class BlackjackBetModal(discord.ui.Modal, title="🃏 Blackjack — Mise"):
    mise = discord.ui.TextInput(label="Montant de la mise", placeholder="Ex: 50 000", max_length=15)

    def __init__(self, uid, guild_id, remaining):
        super().__init__()
        self.uid = uid; self.guild_id = guild_id; self.remaining = remaining

    async def on_submit(self, interaction: discord.Interaction):
        await interaction.response.defer(ephemeral=True)
        wallet = interaction.client.get_berrys(self.uid)
        amount = _parse_amount(self.mise.value.strip().lower(), wallet)
        if not await _check_casino_bet(interaction, self.uid, amount or 0, self.remaining): return

        interaction.client.spend_berrys(self.uid, amount)
        deck   = _new_deck()
        player = [deck.pop(), deck.pop()]
        dealer = [deck.pop(), deck.pop()]

        view = BlackjackView(self.uid, self.guild_id, amount, deck, player, dealer)
        msg  = await interaction.followup.send(embed=view.build_embed(), view=view, ephemeral=True)
        view.message = msg


class BlackjackView(discord.ui.View):
    message: discord.Message | None = None

    def __init__(self, uid, guild_id, bet, deck, player, dealer):
        super().__init__(timeout=120)
        self.uid = uid; self.guild_id = guild_id; self.bet = bet
        self.deck = deck; self.player = player; self.dealer = dealer
        self.doubled = False

    def build_embed(self, reveal: bool = False) -> discord.Embed:
        pv = _hand_value(self.player)
        dv = _hand_value(self.dealer)
        d_str = _display_hand(self.dealer) + f"  →  **{dv}**" if reveal else f"`{self.dealer[0]['rank']}{self.dealer[0]['suit']}`  `?`"
        color = COLOR_NEUTRAL if not reveal else (COLOR_GAIN if pv <= 21 and (pv > dv or dv > 21) else COLOR_LOSS)
        return discord.Embed(
            title="🃏 Blackjack",
            description=(
                f"**Croupier :** {d_str}\n"
                f"**Toi :** {_display_hand(self.player)}  →  **{pv}**\n\n"
                f"Mise : `{fmt(self.bet)}` ฿"
            ),
            color=color,
        )

    async def _end_game(self, interaction: discord.Interaction):
        while _hand_value(self.dealer) < 17:
            self.dealer.append(self.deck.pop())
        pv = _hand_value(self.player)
        dv = _hand_value(self.dealer)

        if pv > 21:           result = "bust"
        elif dv > 21 or pv > dv: result = "win"
        elif pv == dv:        result = "push"
        else:                 result = "lose"

        embed = self.build_embed(reveal=True)
        if result == "win":
            interaction.client.add_berrys(self.uid, self.bet * 2, track=None)
            await log_transaction(self.uid, "gain", "casino_gain", self.bet, "Blackjack victoire", interaction.client.get_berrys(self.uid))
            embed.add_field(name="Résultat", value=f"🟢 **Victoire !** +`{fmt(self.bet)}` ฿")
        elif result == "push":
            interaction.client.add_berrys(self.uid, self.bet, track=None)
            embed.add_field(name="Résultat", value="🟡 **Égalité** — mise remboursée")
        else:
            await log_transaction(self.uid, "depense", "casino_perte", self.bet, "Blackjack défaite", interaction.client.get_berrys(self.uid))
            if self.bet >= 1_000_000:
                await db.unlock_achievement(self.uid, "flambeur")
            embed.add_field(name="Résultat", value=f"🔴 **Défaite** — -`{fmt(self.bet)}` ฿")

        embed.add_field(name="Solde", value=f"`{fmt(interaction.client.get_berrys(self.uid))}` ฿", inline=True)
        for item in self.children:
            item.disabled = True
        await interaction.edit_original_response(embed=embed, view=self)
        self.stop()

    @discord.ui.button(label="Tirer", emoji="🃏", style=discord.ButtonStyle.primary)
    async def btn_hit(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction): await _deny(interaction); return
        await interaction.response.defer()
        self.player.append(self.deck.pop())
        if _hand_value(self.player) >= 21:
            await self._end_game(interaction)
        else:
            await interaction.edit_original_response(embed=self.build_embed(), view=self)

    @discord.ui.button(label="Rester", emoji="✋", style=discord.ButtonStyle.success)
    async def btn_stand(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction): await _deny(interaction); return
        await interaction.response.defer()
        await self._end_game(interaction)

    @discord.ui.button(label="Doubler", emoji="✖️", style=discord.ButtonStyle.secondary)
    async def btn_double(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction): await _deny(interaction); return
        await interaction.response.defer()
        if interaction.client.get_berrys(self.uid) < self.bet:
            await interaction.followup.send("❌ Pas assez pour doubler.", ephemeral=True); return
        interaction.client.spend_berrys(self.uid, self.bet)
        self.bet *= 2; self.doubled = True
        self.player.append(self.deck.pop())
        await self._end_game(interaction)


# ── Historique paginé ─────────────────────────────────────────────

_FILTRES = ["tous", "gains", "depenses", "transferts", "casino"]
_FILTRES_LABEL = {
    "tous": "Toutes", "gains": "Gains", "depenses": "Dépenses",
    "transferts": "Transferts", "casino": "Casino",
}


class HistoriqueView(discord.ui.View):
    message: discord.Message | None = None

    def __init__(self, uid, filtre, page, total_pages):
        super().__init__(timeout=180)
        self.uid = uid; self.filtre = filtre; self.page = page; self.total_pages = total_pages
        self._refresh()

    def _refresh(self):
        self.btn_prev.disabled = self.page == 0
        self.btn_next.disabled = self.page >= self.total_pages - 1

    def build_embed(self, rows: list) -> discord.Embed:
        lines = []
        for type_, montant, desc, created_at, cat in rows:
            icon = _CAT_ICON.get(cat, "•")
            sign = "+" if type_ == "gain" else "-"
            col  = "🟢" if type_ == "gain" else "🔴"
            lines.append(f"{col} {icon} `{sign}{fmt(montant)}` ฿ — {desc or 'N/A'} *({fmt_rel(created_at)})*")
        return discord.Embed(
            title=f"📜 Historique — {_FILTRES_LABEL[self.filtre]}",
            description="\n".join(lines) or "*Aucune transaction.*",
            color=COLOR_NEUTRAL,
        ).set_footer(text=f"Page {self.page + 1}/{max(1, self.total_pages)}")

    @discord.ui.select(
        placeholder="Filtrer par type…",
        options=[discord.SelectOption(label=_FILTRES_LABEL[f], value=f) for f in _FILTRES],
        row=0,
    )
    async def select_filtre(self, interaction: discord.Interaction, sel: discord.ui.Select):
        if not _owner_check(self.uid, interaction): await _deny(interaction); return
        await interaction.response.defer()
        self.filtre = sel.values[0]; self.page = 0
        rows, self.total_pages = await db.get_history(self.uid, self.filtre, self.page)
        self._refresh()
        await interaction.edit_original_response(embed=self.build_embed(rows), view=self)

    @discord.ui.button(label="◀", style=discord.ButtonStyle.secondary, row=1)
    async def btn_prev(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction): await _deny(interaction); return
        await interaction.response.defer()
        self.page -= 1
        rows, _ = await db.get_history(self.uid, self.filtre, self.page)
        self._refresh()
        await interaction.edit_original_response(embed=self.build_embed(rows), view=self)

    @discord.ui.button(label="▶", style=discord.ButtonStyle.secondary, row=1)
    async def btn_next(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction): await _deny(interaction); return
        await interaction.response.defer()
        self.page += 1
        rows, _ = await db.get_history(self.uid, self.filtre, self.page)
        self._refresh()
        await interaction.edit_original_response(embed=self.build_embed(rows), view=self)


# ── Classement ────────────────────────────────────────────────────

class ClassementView(discord.ui.View):
    PER_PAGE = 15
    message: discord.Message | None = None
    uid_rank: int = 0

    def __init__(self, entries, uid, page=0):
        super().__init__(timeout=180)
        self.entries  = entries; self.uid = uid; self.page = page
        self.max_page = max(0, (len(entries) - 1) // self.PER_PAGE)
        self._refresh()

    def _refresh(self):
        self.btn_prev.disabled = self.page == 0
        self.btn_next.disabled = self.page >= self.max_page

    def build_embed(self) -> discord.Embed:
        start  = self.page * self.PER_PAGE
        chunk  = self.entries[start:start + self.PER_PAGE]
        medals = ["🥇", "🥈", "🥉"] + [f"{i}." for i in range(4, len(self.entries) + 1)]
        lines  = [f"{medals[start + i]} **{name}** — `{fmt(total)}` ฿" for i, (name, total) in enumerate(chunk)]
        return discord.Embed(
            title=f"🏆 Classement Freydiss Bank ({len(self.entries)} membres)",
            description="\n".join(lines) or "Aucune donnée.",
            color=COLOR_NEUTRAL,
        ).set_footer(text=f"Page {self.page + 1}/{self.max_page + 1}  ·  Ta position : #{self.uid_rank}")

    @discord.ui.button(label="◀", style=discord.ButtonStyle.secondary)
    async def btn_prev(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.defer()
        self.page -= 1; self._refresh()
        await interaction.edit_original_response(embed=self.build_embed(), view=self)

    @discord.ui.button(label="▶", style=discord.ButtonStyle.secondary)
    async def btn_next(self, interaction: discord.Interaction, _: discord.ui.Button):
        await interaction.response.defer()
        self.page += 1; self._refresh()
        await interaction.edit_original_response(embed=self.build_embed(), view=self)


# ── Succès ────────────────────────────────────────────────────────

def _build_succes_embed(unlocked: list[str]) -> discord.Embed:
    lines = []
    for ach_id, ach in ACHIEVEMENTS.items():
        check = "✅" if ach_id in unlocked else "🔒"
        lines.append(f"{check} {ach['emoji']} **{ach['nom']}** — {ach['desc']}")
    return discord.Embed(
        title="🏅 Achievements — Freydiss Bank",
        description="\n".join(lines),
        color=COLOR_NEUTRAL,
    )


# ── Paramètres ────────────────────────────────────────────────────

def _build_params_embed(settings: dict) -> discord.Embed:
    dm  = "✅ Activées" if settings.get("dm_notifications") else "❌ Désactivées"
    cfm = "✅ Activée"  if settings.get("confirm_large_transfers", True) else "❌ Désactivée"
    return discord.Embed(
        title="⚙️ Paramètres Freydiss Bank",
        description=(
            f"**📬 Notifications DM :** {dm}\n"
            f"> Recevoir un DM lors d'un virement ou d'un rang up.\n\n"
            f"**⚠️ Confirmation gros virements :** {cfm}\n"
            f"> Confirmation pour tout virement ≥ 1 000 000 ฿."
        ),
        color=COLOR_INFO,
    )


class ParamsView(discord.ui.View):
    message: discord.Message | None = None

    def __init__(self, uid, settings):
        super().__init__(timeout=120)
        self.uid = uid; self.settings = settings

    @discord.ui.button(label="Toggle Notifs DM", emoji="📬", style=discord.ButtonStyle.secondary)
    async def btn_dm(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction): await _deny(interaction); return
        await interaction.response.defer()
        self.settings["dm_notifications"] = await db.toggle_setting(self.uid, "dm_notifications")
        await interaction.edit_original_response(embed=_build_params_embed(self.settings), view=self)

    @discord.ui.button(label="Toggle Confirmation", emoji="⚠️", style=discord.ButtonStyle.secondary)
    async def btn_confirm(self, interaction: discord.Interaction, _: discord.ui.Button):
        if not _owner_check(self.uid, interaction): await _deny(interaction); return
        await interaction.response.defer()
        self.settings["confirm_large_transfers"] = await db.toggle_setting(self.uid, "confirm_large_transfers")
        await interaction.edit_original_response(embed=_build_params_embed(self.settings), view=self)


# ── Leaderboard ───────────────────────────────────────────────────

async def _send_leaderboard(interaction: discord.Interaction, uid: str) -> None:
    bot   = interaction.client
    guild = interaction.guild
    gids  = [str(m.id) for m in guild.members if not m.bot]
    vaults = await db.get_vaults_for_guild(str(guild.id), gids)

    raw = sorted(
        [
            (
                mid,
                (guild.get_member(int(mid)) or type("_M", (), {"display_name": f"<@{mid}>"})()).display_name,
                bot.get_berrys(mid) + vaults.get(mid, 0),
            )
            for mid in gids
        ],
        key=lambda x: x[2],
        reverse=True,
    )

    pos           = next((i + 1 for i, (mid, _, _t) in enumerate(raw) if mid == uid), 0)
    entries       = [(name, total) for _, name, total in raw]
    view          = ClassementView(entries, uid)
    view.uid_rank = pos
    msg           = await interaction.followup.send(embed=view.build_embed(), view=view, ephemeral=True)
    view.message  = msg
