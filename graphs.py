import io
from datetime import datetime, timedelta, timezone

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


def make_activity_graph(
    vocal_by_day: dict,
    msg_by_day: dict,
    title: str = "Activité des 7 derniers jours",
) -> io.BytesIO:
    days = [
        (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%d/%m")
        for i in range(6, -1, -1)
    ]
    vocal_hours = [vocal_by_day.get(d, 0) / 3600 for d in days]
    msg_counts = [msg_by_day.get(d, 0) for d in days]

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 6), facecolor="#2b2d31")
    fig.suptitle(title, color="white", fontsize=14, fontweight="bold")

    for ax, values, color, ylabel, subtitle, fmt in (
        (ax1, vocal_hours, "#5865f2", "Heures",   "🎙️ Temps vocal (h)", lambda v: f"{v:.1f}h"),
        (ax2, msg_counts,  "#57f287", "Messages", "💬 Messages",         lambda v: str(int(v))),
    ):
        ax.set_facecolor("#313338")
        bars = ax.bar(days, values, color=color, alpha=0.85, width=0.6)
        ax.set_ylabel(ylabel, color="white")
        ax.set_title(subtitle, color=color, fontsize=11)
        ax.tick_params(colors="white")
        for spine in ax.spines.values():
            spine.set_edgecolor("#4f545c")
        offset = 0.05 if ylabel == "Heures" else 0.3
        for bar, val in zip(bars, values):
            if val > 0:
                ax.text(
                    bar.get_x() + bar.get_width() / 2,
                    bar.get_height() + offset,
                    fmt(val), ha="center", va="bottom", color="white", fontsize=8,
                )

    plt.tight_layout()
    return _export(fig)


def make_peak_hours_graph(hour_counts: dict) -> io.BytesIO:
    values = [hour_counts.get(h, 0) for h in range(24)]
    peak = max(values, default=0)
    colors = ["#5865f2" if v == peak and peak > 0 else "#4f545c" for v in values]

    fig, ax = plt.subplots(figsize=(12, 4), facecolor="#2b2d31")
    ax.set_facecolor("#313338")
    ax.bar([f"{h}h" for h in range(24)], values, color=colors, alpha=0.9, width=0.7)
    ax.set_title("🕐 Heures de pointe du serveur (7 derniers jours)", color="white", fontsize=13, fontweight="bold")
    ax.set_xlabel("Heure (UTC)", color="white")
    ax.set_ylabel("Minutes d'activité vocale", color="white")
    ax.tick_params(colors="white", labelsize=8)
    for spine in ax.spines.values():
        spine.set_edgecolor("#4f545c")

    plt.tight_layout()
    return _export(fig)


def _export(fig) -> io.BytesIO:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=120)
    buf.seek(0)
    plt.close(fig)
    return buf
