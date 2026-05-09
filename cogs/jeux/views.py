from __future__ import annotations

import asyncio
import random
import discord

from .constants import (
    JOIN_TIMEOUT, HOUSE_CUT,
    MIN_PLAYERS, MAX_PLAYERS,
    GAME_NAMES, GAME_DESCS, PIRATES,
    COLOR_LOBBY, COLOR_WIN, COLOR_LOSS, COLOR_WAIT,
    ALPHABET_LETTERS, ALPHABET_CATEGORIES, ANSWER_TIMEOUT,
    PASSE_PENALTY, PASSE_REWARD, VOTE_TIMEOUT, DEFIS,
)


def fmt(n: int) -> str:
    return f"{n:,}".replace(",", " ")


# ══════════════════════════════════════════════════════════════════════
# LOBBY — commun à tous les jeux
# ══════════════════════════════════════════════════════════════════════

class LobbyView(discord.ui.View):
    """
    Phase de recrutement.
    - Seuls les membres dans le même salon vocal peuvent rejoindre.
    - L'hôte peut lancer manuellement ou annuler.
    - Auto-lancement après JOIN_TIMEOUT si assez de joueurs.
    """

    def __init__(self, host: discord.Member, game_type: str, mise: int,
                 bot, voice_channel_id: int):
        super().__init__(timeout=JOIN_TIMEOUT + 10)
        self.host             = host
        self.game_type        = game_type
        self.mise             = mise
        self.bot              = bot
        self.voice_channel_id = voice_channel_id
        self.players: list[discord.Member] = [host]
        self.started          = False
        self.cancelled        = False
        self.message: discord.Message | None = None

    # ── helpers ───────────────────────────────────────────────────────

    def _in_voice(self, member: discord.Member) -> bool:
        return (
            member.voice is not None
            and member.voice.channel is not None
            and member.voice.channel.id == self.voice_channel_id
        )

    def build_embed(self, countdown: int | None = None) -> discord.Embed:
        pot   = self.mise * len(self.players)
        house = int(pot * HOUSE_CUT)
        lines = [
            f"📋 *{GAME_DESCS[self.game_type]}*",
            "",
            f"💰 **Mise :** `{fmt(self.mise)}` ฿ par joueur",
            f"💎 **Cagnotte nette :** `{fmt(pot - house)}` ฿  *(maison : {fmt(house)} ฿)*",
            "",
            f"**👥 Joueurs ({len(self.players)}/{MAX_PLAYERS[self.game_type]}) :**",
        ]
        for p in self.players:
            crown = " 👑" if p == self.host else ""
            lines.append(f"> {p.mention}{crown}")

        if countdown is not None:
            lines.append(f"\n⏳ Lancement automatique dans **{countdown}s**…")
        else:
            lines.append(f"\n*🔊 Tu dois être dans le salon vocal pour rejoindre.*")

        e = discord.Embed(
            title=f"🎮 {GAME_NAMES[self.game_type]} — Rejoins !",
            description="\n".join(lines),
            color=COLOR_LOBBY,
        )
        e.set_footer(
            text=f"Min. {MIN_PLAYERS[self.game_type]} joueurs · Hôte : {self.host.display_name}"
        )
        return e

    # ── boutons ───────────────────────────────────────────────────────

    @discord.ui.button(label="Rejoindre 🎮", style=discord.ButtonStyle.success, row=0)
    async def btn_join(self, interaction: discord.Interaction, _: discord.ui.Button):
        if interaction.user in self.players:
            await interaction.response.send_message("❌ Tu es déjà inscrit.", ephemeral=True)
            return
        if not self._in_voice(interaction.user):
            await interaction.response.send_message(
                "❌ Tu dois être dans le **même salon vocal** que l'hôte pour rejoindre.",
                ephemeral=True,
            )
            return
        if len(self.players) >= MAX_PLAYERS[self.game_type]:
            await interaction.response.send_message("❌ Lobby plein.", ephemeral=True)
            return
        wallet = self.bot.get_berrys(str(interaction.user.id))
        if wallet < self.mise:
            await interaction.response.send_message(
                f"❌ Il te faut **{fmt(self.mise)}** ฿ (tu as `{fmt(wallet)}` ฿).",
                ephemeral=True,
            )
            return
        self.players.append(interaction.user)
        await interaction.response.edit_message(embed=self.build_embed())

    @discord.ui.button(label="Lancer ▶️", style=discord.ButtonStyle.primary, row=0)
    async def btn_start(self, interaction: discord.Interaction, _: discord.ui.Button):
        if interaction.user != self.host:
            await interaction.response.send_message("❌ Seul l'hôte peut lancer.", ephemeral=True)
            return
        if len(self.players) < MIN_PLAYERS[self.game_type]:
            await interaction.response.send_message(
                f"❌ Il faut au moins **{MIN_PLAYERS[self.game_type]}** joueurs.", ephemeral=True
            )
            return
        await interaction.response.defer()
        await self._launch()

    @discord.ui.button(label="Annuler ❌", style=discord.ButtonStyle.danger, row=0)
    async def btn_cancel(self, interaction: discord.Interaction, _: discord.ui.Button):
        if interaction.user != self.host:
            await interaction.response.send_message("❌ Seul l'hôte peut annuler.", ephemeral=True)
            return
        self.cancelled = True
        self.stop()
        await interaction.response.edit_message(
            embed=discord.Embed(title="❌ Jeu annulé par l'hôte.", color=COLOR_LOSS),
            view=None,
        )

    # ── timeout automatique ───────────────────────────────────────────

    async def on_timeout(self):
        if self.started or self.cancelled:
            return
        if len(self.players) >= MIN_PLAYERS[self.game_type]:
            await self._launch()
        else:
            self.cancelled = True
            if self.message:
                try:
                    await self.message.edit(
                        embed=discord.Embed(
                            title="⌛ Temps écoulé",
                            description="Pas assez de joueurs — partie annulée.",
                            color=COLOR_LOSS,
                        ),
                        view=None,
                    )
                except Exception:
                    pass

    # ── lancement ─────────────────────────────────────────────────────

    async def _launch(self):
        if self.started:
            return
        self.started = True
        self.stop()

        # Prélever les mises — on n'inclut que ceux qui peuvent payer
        paid: list[discord.Member] = []
        for p in self.players:
            if self.bot.spend_berrys(str(p.id), self.mise):
                paid.append(p)
            else:
                # On signale silencieusement et on saute ce joueur
                try:
                    await p.send(
                        f"❌ Tu n'avais pas assez de Berries pour participer à la partie "
                        f"*{GAME_NAMES[self.game_type]}* et tu as été retiré."
                    )
                except discord.Forbidden:
                    pass

        if len(paid) < MIN_PLAYERS[self.game_type]:
            for p in paid:  # remboursement
                self.bot.add_berrys(str(p.id), self.mise, track=None)
            if self.message:
                await self.message.edit(
                    embed=discord.Embed(
                        title="❌ Annulé",
                        description="Pas assez de joueurs solvables pour démarrer.",
                        color=COLOR_LOSS,
                    ),
                    view=None,
                )
            return

        self.players = paid
        pot   = self.mise * len(paid)
        house = int(pot * HOUSE_CUT)
        net   = pot - house

        dispatch = {
            "jackpot":    _run_jackpot,
            "course":     _run_course,
            "tournoi":    _run_tournoi,
            "devinette":  _run_devinette,
            "alphabet":   _run_alphabet,
            "passeoupas": _run_passe_ou_pas,
        }
        await dispatch[self.game_type](self.message, self.players, self.mise, net, self.bot)


# ══════════════════════════════════════════════════════════════════════
# JACKPOT
# ══════════════════════════════════════════════════════════════════════

async def _run_jackpot(msg: discord.Message, players: list[discord.Member],
                       mise: int, pot: int, bot):
    await msg.edit(embed=discord.Embed(
        title="🎰 Jackpot — Le tirage tourne…",
        description=(
            "🥁🥁🥁\n\n"
            + " ".join(p.mention for p in players)
            + f"\n\n💎 Cagnotte : **{fmt(pot)}** ฿"
        ),
        color=COLOR_WAIT,
    ), view=None)
    await asyncio.sleep(3)

    winner = random.choice(players)
    bot.add_berrys(str(winner.id), pot, track="earned")

    lines = []
    for p in players:
        if p == winner:
            lines.append(f"🏆 **{p.mention}** — **+{fmt(pot)}** ฿ 🎉")
        else:
            lines.append(f"💸 {p.mention} — `-{fmt(mise)}` ฿")

    await msg.edit(embed=discord.Embed(
        title=f"🎰 JACKPOT — {winner.display_name.upper()} GAGNE !",
        description="\n".join(lines) + f"\n\n💰 Cagnotte remportée : **{fmt(pot)}** ฿",
        color=COLOR_WIN,
    ))


# ══════════════════════════════════════════════════════════════════════
# COURSE DE PIRATES
# ══════════════════════════════════════════════════════════════════════

class _CourseView(discord.ui.View):
    def __init__(self, players: list[discord.Member]):
        super().__init__(timeout=30)
        self.players = players
        self.choices: dict[int, int] = {}  # player_id → pirate_index
        for i, (emoji, name) in enumerate(PIRATES):
            btn = discord.ui.Button(label=name, emoji=emoji, style=discord.ButtonStyle.primary)
            btn.callback = self._make_cb(i, name, emoji)
            self.add_item(btn)

    def _make_cb(self, idx: int, name: str, emoji: str):
        async def cb(interaction: discord.Interaction):
            if interaction.user not in self.players:
                await interaction.response.send_message(
                    "❌ Tu ne participes pas à ce jeu.", ephemeral=True
                )
                return
            self.choices[interaction.user.id] = idx
            await interaction.response.send_message(
                f"✅ Pari enregistré sur **{emoji} {name}** !", ephemeral=True
            )
        return cb


async def _run_course(msg: discord.Message, players: list[discord.Member],
                      mise: int, pot: int, bot):
    view = _CourseView(players)
    await msg.edit(embed=discord.Embed(
        title="🏁 Course de Pirates — Choisissez votre champion !",
        description=(
            "\n".join(f"{e} **{n}**" for e, n in PIRATES)
            + f"\n\n💰 Cagnotte : **{fmt(pot)}** ฿\n⏳ **30 secondes** pour voter !"
        ),
        color=COLOR_WAIT,
    ), view=view)
    await asyncio.sleep(30)
    view.stop()
    for item in view.children:
        item.disabled = True
    await msg.edit(view=view)
    await asyncio.sleep(1)

    # Résolution
    winner_idx              = random.randint(0, len(PIRATES) - 1)
    winner_emoji, winner_nm = PIRATES[winner_idx]
    winners = [p for p in players if view.choices.get(p.id) == winner_idx]

    race_lines = []
    for i, (e, n) in enumerate(PIRATES):
        bettors    = [p for p in players if view.choices.get(p.id) == i]
        no_bet     = [p for p in players if p.id not in view.choices]
        finish     = "🏆" if i == winner_idx else "  "
        bettor_str = " ".join(p.mention for p in bettors) if bettors else "*personne*"
        race_lines.append(f"{finish} {e} **{n}** — {bettor_str}")

    no_vote = [p for p in players if p.id not in view.choices]
    if no_vote:
        race_lines.append(f"\n⚠️ N'ont pas voté : {' '.join(p.mention for p in no_vote)}")

    if winners:
        gain = pot // len(winners)
        for p in winners:
            bot.add_berrys(str(p.id), gain, track="earned")
        result = (
            f"\n🏆 **{winner_emoji} {winner_nm}** remporte la course !\n"
            + " ".join(p.mention for p in winners)
            + f"\n💰 Chaque gagnant reçoit **+{fmt(gain)}** ฿"
        )
        color = COLOR_WIN
    else:
        result = (
            f"\n🏆 **{winner_emoji} {winner_nm}** remporte la course…\n"
            "💸 Mais personne n'avait parié dessus ! La cagnotte disparaît."
        )
        color = COLOR_LOSS

    await msg.edit(embed=discord.Embed(
        title="🏁 Course terminée !",
        description="\n".join(race_lines) + result,
        color=color,
    ), view=None)


# ══════════════════════════════════════════════════════════════════════
# TOURNOI ÉCLAIR
# ══════════════════════════════════════════════════════════════════════

async def _run_tournoi(msg: discord.Message, players: list[discord.Member],
                       mise: int, pot: int, bot):
    roster = list(players)
    random.shuffle(roster)
    round_num = 1

    while len(roster) > 1:
        next_round: list[discord.Member] = []
        pairs = [(roster[i], roster[i + 1]) for i in range(0, len(roster) - 1, 2)]
        bye   = roster[-1] if len(roster) % 2 == 1 else None

        # Annonce du round
        annonce = [f"━━━━━━━━━━━━━━━━━━━━━━\n🥊 **Round {round_num}**\n"]
        for a, b in pairs:
            annonce.append(f"⚔️ {a.mention} vs {b.mention}")
        if bye:
            annonce.append(f"⏩ {bye.mention} — **bye** (qualifié automatiquement)")
        await msg.edit(embed=discord.Embed(
            title=f"⚔️ Tournoi — Round {round_num}",
            description="\n".join(annonce),
            color=0xFF4444,
        ), view=None)
        await asyncio.sleep(3)

        # Résolution des duels
        result_lines = [f"━━━━━━━━━━━━━━━━━━━━━━\n📊 **Résultats Round {round_num}**\n"]
        for a, b in pairs:
            da = random.randint(1, 6) + random.randint(1, 6)
            db = random.randint(1, 6) + random.randint(1, 6)
            while da == db:  # pas d'égalité possible
                db = random.randint(1, 6) + random.randint(1, 6)
            winner, loser = (a, b) if da > db else (b, a)
            dw = da if winner == a else db
            dl = db if winner == a else da
            next_round.append(winner)
            result_lines.append(
                f"🎲 **{a.display_name}** `{da}` vs `{db}` **{b.display_name}**\n"
                f"   ✅ {winner.mention} avance"
            )
        if bye:
            next_round.append(bye)
            result_lines.append(f"⏩ {bye.mention} — qualifié automatiquement")

        await msg.edit(embed=discord.Embed(
            title=f"⚔️ Tournoi — Round {round_num} terminé",
            description="\n".join(result_lines),
            color=0xFF4444,
        ))
        await asyncio.sleep(4)
        roster    = next_round
        round_num += 1

    champion = roster[0]
    bot.add_berrys(str(champion.id), pot, track="earned")
    await msg.edit(embed=discord.Embed(
        title=f"🏆 CHAMPION — {champion.display_name.upper()} !",
        description=(
            f"👑 {champion.mention} remporte le tournoi après **{round_num - 1} round(s)** !\n\n"
            f"💰 **+{fmt(pot)}** ฿ remportés !"
        ),
        color=COLOR_WIN,
    ))


# ══════════════════════════════════════════════════════════════════════
# DEVINETTE SECRÈTE
# ══════════════════════════════════════════════════════════════════════

class _DevinetteModal(discord.ui.Modal, title="🎯 Quelle est ta réponse ?"):
    nombre = discord.ui.TextInput(
        label="Un nombre entre 1 et 100",
        placeholder="Ex: 42",
        max_length=3,
    )

    def __init__(self, guesses: dict):
        super().__init__()
        self._guesses = guesses

    async def on_submit(self, interaction: discord.Interaction):
        raw = self.nombre.value.strip()
        if not raw.isdigit() or not (1 <= int(raw) <= 100):
            await interaction.response.send_message(
                "❌ Entre un nombre entre **1** et **100**.", ephemeral=True
            )
            return
        self._guesses[interaction.user.id] = int(raw)
        await interaction.response.send_message(
            f"✅ Estimation **{raw}** enregistrée — bonne chance !", ephemeral=True
        )


class _DevinetteView(discord.ui.View):
    def __init__(self, players: list[discord.Member], guesses: dict):
        super().__init__(timeout=30)
        self._players = players
        self._guesses = guesses

    @discord.ui.button(label="🎯 Entrer mon estimation", style=discord.ButtonStyle.primary)
    async def btn_guess(self, interaction: discord.Interaction, _: discord.ui.Button):
        if interaction.user not in self._players:
            await interaction.response.send_message(
                "❌ Tu ne participes pas à ce jeu.", ephemeral=True
            )
            return
        if interaction.user.id in self._guesses:
            await interaction.response.send_message(
                f"✅ Tu as déjà joué **{self._guesses[interaction.user.id]}** !", ephemeral=True
            )
            return
        await interaction.response.send_modal(_DevinetteModal(self._guesses))


async def _run_devinette(msg: discord.Message, players: list[discord.Member],
                         mise: int, pot: int, bot):
    secret  = random.randint(1, 100)
    guesses: dict[int, int] = {}
    view    = _DevinetteView(players, guesses)

    await msg.edit(embed=discord.Embed(
        title="🎯 Devinette Secrète",
        description=(
            f"Le bot a choisi un nombre entre **1** et **100**.\n"
            f"Clique sur le bouton pour entrer ton estimation — **30 secondes !**\n\n"
            f"💰 Cagnotte : **{fmt(pot)}** ฿\n"
            f"*Le plus proche remporte tout.*"
        ),
        color=0x3498DB,
    ), view=view)

    await asyncio.sleep(30)
    view.stop()
    for item in view.children:
        item.disabled = True
    await msg.edit(view=view)
    await asyncio.sleep(1)

    valid = [(p, guesses[p.id]) for p in players if p.id in guesses]
    no_ans = [p for p in players if p.id not in guesses]

    if not valid:
        await msg.edit(embed=discord.Embed(
            title=f"🎯 Devinette — Le nombre était **{secret}** !",
            description="😶 Personne n'a répondu. La cagnotte est perdue.",
            color=COLOR_LOSS,
        ), view=None)
        return

    valid.sort(key=lambda x: abs(x[1] - secret))
    best_diff = abs(valid[0][1] - secret)
    tied      = [(p, g) for p, g in valid if abs(g - secret) == best_diff]

    lines = []
    for p, g in valid:
        diff = abs(g - secret)
        icon = "🏆" if diff == best_diff else "  "
        arrow = "🎯" if diff == 0 else ("📈" if g > secret else "📉")
        lines.append(f"{icon} {p.mention} → **{g}** {arrow} *(écart : {diff})*")
    for p in no_ans:
        lines.append(f"  {p.mention} → *pas de réponse*")

    gain = pot // len(tied)
    for p, _ in tied:
        bot.add_berrys(str(p.id), gain, track="earned")

    if len(tied) == 1:
        win_str = f"🏆 {tied[0][0].mention} gagne **+{fmt(gain)}** ฿ !"
    else:
        win_str = (
            f"🤝 Égalité parfaite ! "
            + " ".join(p.mention for p, _ in tied)
            + f" reçoivent chacun **+{fmt(gain)}** ฿"
        )

    await msg.edit(embed=discord.Embed(
        title=f"🎯 Le nombre secret était… **{secret}** !",
        description="\n".join(lines) + f"\n\n{win_str}",
        color=COLOR_WIN,
    ), view=None)


# ══════════════════════════════════════════════════════════════════════
# JEU DE L'ALPHABET
# ══════════════════════════════════════════════════════════════════════

class _AlphabetModal(discord.ui.Modal, title="🔤 Donne ton mot !"):
    word = discord.ui.TextInput(
        label="Ton mot",
        placeholder="Ex: Ananas",
        max_length=50,
    )

    def __init__(self, parent_view: "_AlphabetTurnView"):
        super().__init__()
        self._parent = parent_view

    async def on_submit(self, interaction: discord.Interaction):
        w = self.word.value.strip()
        await interaction.response.send_message(f"✅ **{w}** envoyé !", ephemeral=True)
        self._parent.answer = w
        self._parent.answered.set()


class _AlphabetTurnView(discord.ui.View):
    def __init__(self, current_player: discord.Member):
        super().__init__(timeout=ANSWER_TIMEOUT)
        self.current_player = current_player
        self.answer: str | None = None
        self.answered = asyncio.Event()

    @discord.ui.button(label="Répondre ✍️", style=discord.ButtonStyle.primary)
    async def btn_answer(self, interaction: discord.Interaction, _: discord.ui.Button):
        if interaction.user != self.current_player:
            await interaction.response.send_message("❌ Ce n'est pas ton tour !", ephemeral=True)
            return
        await interaction.response.send_modal(_AlphabetModal(self))

    async def on_timeout(self):
        self.answered.set()


async def _run_alphabet(msg: discord.Message, players: list[discord.Member],
                        mise: int, pot: int, bot):
    cat_emoji, category = random.choice(ALPHABET_CATEGORIES)
    alive = list(players)
    random.shuffle(alive)
    turn_idx   = 0
    letter_idx = 0
    letters    = list(ALPHABET_LETTERS)

    await msg.edit(embed=discord.Embed(
        title="🔤 Jeu de l'Alphabet",
        description=(
            f"Catégorie : **{cat_emoji} {category}**\n"
            f"Chaque joueur donne un mot commençant par la lettre du tour.\n"
            f"Rate ou temps écoulé → éliminé. Dernier debout gagne.\n\n"
            f"💰 Cagnotte : **{fmt(pot)}** ฿\n\nC'est parti dans **3 secondes** !"
        ),
        color=COLOR_WAIT,
    ), view=None)
    await asyncio.sleep(3)

    while len(alive) > 1 and letter_idx < len(letters):
        letter  = letters[letter_idx]
        current = alive[turn_idx % len(alive)]

        players_list = "\n".join(
            f"{'▶️' if p == current else '  '} {p.mention}" for p in alive
        )
        view = _AlphabetTurnView(current)
        await msg.edit(embed=discord.Embed(
            title=f"🔤 Lettre **{letter}** — {cat_emoji} {category}",
            description=(
                f"{current.mention} c'est **ton tour** !\n"
                f"Donne un mot commençant par **{letter}** dans **{cat_emoji} {category}**\n"
                f"⏳ **{ANSWER_TIMEOUT}s** pour répondre !\n\n"
                f"**Joueurs restants ({len(alive)}) :**\n{players_list}"
            ),
            color=COLOR_WAIT,
        ), view=view)

        try:
            await asyncio.wait_for(view.answered.wait(), timeout=ANSWER_TIMEOUT + 2)
        except asyncio.TimeoutError:
            pass

        view.stop()
        for item in view.children:
            item.disabled = True

        valid = (
            view.answer is not None
            and len(view.answer.strip()) > 0
            and view.answer.strip().upper()[0] == letter
        )

        if valid:
            await msg.edit(embed=discord.Embed(
                title=f"🔤 ✅ Bonne réponse !",
                description=(
                    f"{current.mention} répond **{view.answer}** — lettre **{letter}** validée ! 🎉\n\n"
                    f"Prochain dans **2s**…"
                ),
                color=COLOR_WIN,
            ), view=None)
            await asyncio.sleep(2)
            turn_idx += 1
        else:
            reason = (
                f"**{view.answer}** ne commence pas par **{letter}**"
                if view.answer
                else "temps écoulé"
            )
            alive.remove(current)
            await msg.edit(embed=discord.Embed(
                title=f"🔤 ❌ {current.display_name} éliminé !",
                description=(
                    f"{current.mention} est éliminé — {reason} !\n\n"
                    f"**Survivants ({len(alive)}) :**\n"
                    + ("\n".join(p.mention for p in alive) if alive else "*aucun*")
                ),
                color=COLOR_LOSS,
            ), view=None)
            await asyncio.sleep(3)

        letter_idx += 1

    if len(alive) == 1:
        winner = alive[0]
        bot.add_berrys(str(winner.id), pot, track="earned")
        await msg.edit(embed=discord.Embed(
            title=f"🔤 CHAMPION — {winner.display_name.upper()} !",
            description=(
                f"👑 {winner.mention} est le dernier survivant !\n"
                f"💰 **+{fmt(pot)}** ฿ remportés !"
            ),
            color=COLOR_WIN,
        ), view=None)
    elif alive:
        gain = pot // len(alive)
        for p in alive:
            bot.add_berrys(str(p.id), gain, track="earned")
        await msg.edit(embed=discord.Embed(
            title="🔤 Toutes les lettres jouées !",
            description=(
                f"**Survivants :** {' '.join(p.mention for p in alive)}\n"
                f"💰 Chacun reçoit **+{fmt(gain)}** ฿ !"
            ),
            color=COLOR_WIN,
        ), view=None)
    else:
        await msg.edit(embed=discord.Embed(
            title="🔤 Tout le monde éliminé !",
            description="💸 La cagnotte est perdue.",
            color=COLOR_LOSS,
        ), view=None)


# ══════════════════════════════════════════════════════════════════════
# PASSE OU PAS
# ══════════════════════════════════════════════════════════════════════

class _PasseChoiceView(discord.ui.View):
    """Shown to the current player — Passe or accept the challenge."""

    def __init__(self, current_player: discord.Member):
        super().__init__(timeout=20)
        self.current_player = current_player
        self.choice: str | None = None
        self._event = asyncio.Event()

    @discord.ui.button(label="Passe 🚫", style=discord.ButtonStyle.danger)
    async def btn_passe(self, interaction: discord.Interaction, _: discord.ui.Button):
        if interaction.user != self.current_player:
            await interaction.response.send_message("❌ Ce n'est pas ton tour !", ephemeral=True)
            return
        self.choice = "passe"
        await interaction.response.defer()
        self._event.set()
        self.stop()

    @discord.ui.button(label="Je le fais ✅", style=discord.ButtonStyle.success)
    async def btn_joue(self, interaction: discord.Interaction, _: discord.ui.Button):
        if interaction.user != self.current_player:
            await interaction.response.send_message("❌ Ce n'est pas ton tour !", ephemeral=True)
            return
        self.choice = "joue"
        await interaction.response.defer()
        self._event.set()
        self.stop()

    async def on_timeout(self):
        if not self.choice:
            self.choice = "passe"
        self._event.set()


class _VoteView(discord.ui.View):
    """Other players vote on whether the challenged player succeeded."""

    def __init__(self, voters: list[discord.Member]):
        super().__init__(timeout=VOTE_TIMEOUT)
        self.voters = voters
        self.votes: dict[int, bool] = {}
        self._event = asyncio.Event()

    def _register(self, uid: int, value: bool):
        self.votes[uid] = value
        if len(self.votes) >= len(self.voters):
            self._event.set()

    @discord.ui.button(label="👍 Oui", style=discord.ButtonStyle.success)
    async def btn_oui(self, interaction: discord.Interaction, _: discord.ui.Button):
        if interaction.user not in self.voters:
            await interaction.response.send_message("❌ Tu ne votes pas ici.", ephemeral=True)
            return
        self._register(interaction.user.id, True)
        await interaction.response.send_message("✅ Vote **Oui** enregistré !", ephemeral=True)

    @discord.ui.button(label="👎 Non", style=discord.ButtonStyle.danger)
    async def btn_non(self, interaction: discord.Interaction, _: discord.ui.Button):
        if interaction.user not in self.voters:
            await interaction.response.send_message("❌ Tu ne votes pas ici.", ephemeral=True)
            return
        self._register(interaction.user.id, False)
        await interaction.response.send_message("✅ Vote **Non** enregistré !", ephemeral=True)

    async def on_timeout(self):
        self._event.set()


async def _run_passe_ou_pas(msg: discord.Message, players: list[discord.Member],
                             mise: int, pot: int, bot):
    base_order  = list(players)
    random.shuffle(base_order)
    n_rounds    = len(players) * 2
    turn_order  = (base_order * 2)[:n_rounds]
    passe_cost  = max(1_000, int(mise * PASSE_PENALTY))
    reward      = max(1_000, int(mise * PASSE_REWARD))
    successes   = {p.id: 0 for p in players}
    pot_current = pot

    await msg.edit(embed=discord.Embed(
        title="🃏 Passe ou Pas — C'est parti !",
        description=(
            f"**{n_rounds} rounds** · défis en vocal !\n\n"
            f"🚫 **Passe** → `-{fmt(passe_cost)}` ฿ de ta poche au pot\n"
            f"✅ **Je le fais** → le groupe vote pendant **{VOTE_TIMEOUT}s**\n"
            f"   • Majorité **Oui** → **+{fmt(reward)}** ฿ du pot\n"
            f"   • Majorité **Non** ou égalité → `-{fmt(passe_cost)}` ฿ au pot\n\n"
            f"💰 Cagnotte de départ : **{fmt(pot_current)}** ฿\n\n"
            "Début dans **3 secondes** !"
        ),
        color=COLOR_WAIT,
    ), view=None)
    await asyncio.sleep(3)

    for rnd, current in enumerate(turn_order, 1):
        defi   = random.choice(DEFIS)
        voters = [p for p in players if p != current]

        choice_view = _PasseChoiceView(current)
        await msg.edit(embed=discord.Embed(
            title=f"🃏 Round {rnd}/{n_rounds} — {current.display_name}",
            description=(
                f"**Défi de {current.mention} :**\n"
                f">>> {defi}\n\n"
                f"💰 Cagnotte : **{fmt(pot_current)}** ฿\n"
                f"⏳ **20s** pour décider !"
            ),
            color=COLOR_WAIT,
        ), view=choice_view)

        try:
            await asyncio.wait_for(choice_view._event.wait(), timeout=22)
        except asyncio.TimeoutError:
            choice_view.choice = "passe"

        choice_view.stop()
        for item in choice_view.children:
            item.disabled = True

        if choice_view.choice != "joue":
            wallet   = bot.get_berrys(str(current.id))
            deducted = min(passe_cost, wallet)
            if deducted > 0:
                bot.spend_berrys(str(current.id), deducted)
                pot_current += deducted
            await msg.edit(embed=discord.Embed(
                title=f"🃏 Round {rnd}/{n_rounds} — Passe 🚫",
                description=(
                    f"{current.mention} **passe** le défi.\n"
                    f"💸 `-{fmt(deducted)}` ฿ → pot\n\n"
                    f"💰 Cagnotte : **{fmt(pot_current)}** ฿"
                ),
                color=COLOR_LOSS,
            ), view=None)
            await asyncio.sleep(2)
            continue

        # Défi accepté → vote des autres
        vote_view = _VoteView(voters)
        await msg.edit(embed=discord.Embed(
            title=f"🃏 Round {rnd}/{n_rounds} — Vote ! 🗳️",
            description=(
                f"{current.mention} **tente le défi** 💪\n\n"
                f"**{defi}**\n\n"
                f"**{current.display_name}** a-t-il réussi ? Votez !\n"
                f"⏳ **{VOTE_TIMEOUT}s** — "
                + " ".join(p.mention for p in voters)
            ),
            color=0x9B59B6,
        ), view=vote_view)

        try:
            await asyncio.wait_for(vote_view._event.wait(), timeout=VOTE_TIMEOUT + 2)
        except asyncio.TimeoutError:
            pass

        vote_view.stop()
        for item in vote_view.children:
            item.disabled = True

        oui = sum(1 for v in vote_view.votes.values() if v)
        non = sum(1 for v in vote_view.votes.values() if not v)

        if oui > non:
            actual_reward = min(reward, pot_current)
            pot_current  -= actual_reward
            bot.add_berrys(str(current.id), actual_reward, track="earned")
            successes[current.id] += 1
            await msg.edit(embed=discord.Embed(
                title=f"🃏 Round {rnd}/{n_rounds} — Réussi ! 🎉",
                description=(
                    f"👍 **OUI !** ({oui}✅ vs {non}❌)\n"
                    f"{current.mention} remporte **+{fmt(actual_reward)}** ฿ du pot !\n\n"
                    f"💰 Cagnotte : **{fmt(pot_current)}** ฿"
                ),
                color=COLOR_WIN,
            ), view=None)
        else:
            wallet   = bot.get_berrys(str(current.id))
            deducted = min(passe_cost, wallet)
            if deducted > 0:
                bot.spend_berrys(str(current.id), deducted)
                pot_current += deducted
            label = "👎 **NON !**" if non > oui else "🤝 **Égalité**"
            await msg.edit(embed=discord.Embed(
                title=f"🃏 Round {rnd}/{n_rounds} — Échec",
                description=(
                    f"{label} ({oui}✅ vs {non}❌)\n"
                    f"{current.mention} paie **-{fmt(deducted)}** ฿ au pot.\n\n"
                    f"💰 Cagnotte : **{fmt(pot_current)}** ฿"
                ),
                color=COLOR_LOSS,
            ), view=None)
        await asyncio.sleep(3)

    # Classement final — meilleur score remporte la cagnotte restante
    sorted_players = sorted(players, key=lambda p: -successes[p.id])
    max_s   = successes[sorted_players[0].id]
    winners = [p for p in players if successes[p.id] == max_s]

    score_lines = "\n".join(
        f"{'🏆' if p in winners else '  '} {p.mention} — **{successes[p.id]}** réussite{'s' if successes[p.id] != 1 else ''}"
        for p in sorted_players
    )

    if pot_current > 0 and max_s > 0:
        gain = pot_current // len(winners)
        for w in winners:
            bot.add_berrys(str(w.id), gain, track="earned")
        end_desc = score_lines + f"\n\n💰 Cagnotte **{fmt(pot_current)}** ฿ → **+{fmt(gain)}** ฿ par gagnant !"
    else:
        end_desc = score_lines + (
            "\n\n💸 Personne n'a réussi de défi — cagnotte perdue."
            if max_s == 0 else
            "\n\n💰 Cagnotte vide !"
        )

    title = (
        f"🃏 FIN — {winners[0].display_name.upper()} GAGNE !"
        if len(winners) == 1
        else "🃏 FIN — ÉGALITÉ !"
    )
    await msg.edit(embed=discord.Embed(
        title=title,
        description=end_desc,
        color=COLOR_WIN if max_s > 0 else COLOR_LOSS,
    ), view=None)
