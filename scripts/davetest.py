"""Diagnostic DAVE (chiffrement de bout en bout de la voix Discord) : rejoint Central 46, attend la fin de l'échange de
clés, affiche l'état de la session davey (ready / can_encrypt / status) et essaie de chiffrer un paquet opus factice,
puis repart. Ne joue aucun son, sauf si un mp3 est donné en argument. Usage sur la VM : sudo /opt/brams-bot/.venv/bin/python scripts/davetest.py"""
import asyncio
import os
import sys

import discord
from dotenv import load_dotenv

load_dotenv("/opt/brams-bot/.env")
CHANNEL_ID = 1554871712137347164

intents = discord.Intents.default()
intents.voice_states = True
intents.guilds = True
client = discord.Client(intents=intents)


def etat(st):
    s = st.dave_session
    return {"version": st.dave_protocol_version, "ready": getattr(s, "ready", None),
            "session.can_encrypt": getattr(s, "can_encrypt", None), "status": str(getattr(s, "status", None)),
            "epoch": getattr(s, "epoch", None), "discordpy.can_encrypt": st.can_encrypt}


@client.event
async def on_error(event, *args, **kwargs):
    import traceback
    traceback.print_exc()


@client.event
async def on_ready():
    ch = client.get_channel(CHANNEL_ID)
    print("membres :", [m.name for m in ch.members])
    vc = await ch.connect(timeout=15)
    st = vc._connection
    for t in ((0.2, 0.6) if len(sys.argv) > 1 else (0.2, 1, 3, 8)):
        await asyncio.sleep(t)
        print(f"t+{t}s", etat(st))
    try:
        out = st.dave_session.encrypt_opus(b"\xf8\xff\xfe" * 20)
        print("encrypt_opus OK :", len(out), "octets (entrée 60)")
    except Exception as e:
        print("encrypt_opus ERREUR :", type(e).__name__, e)
    if len(sys.argv) > 1:  # option : jouer un son pour vérifier à l'oreille (chemin du mp3)
        if not discord.opus.is_loaded():
            import ctypes.util
            discord.opus.load_opus(ctypes.util.find_library("opus") or "libopus.so.0")
        done = asyncio.Event()
        loop = asyncio.get_running_loop()
        vc.play(discord.FFmpegPCMAudio(sys.argv[1], options="-vn"), after=lambda e: loop.call_soon_threadsafe(done.set))
        await asyncio.wait_for(done.wait(), timeout=30)
        print("son joué :", sys.argv[1])
    await vc.disconnect()
    await client.close()


client.run(os.environ["DISCORD_TOKEN"], log_handler=None)
