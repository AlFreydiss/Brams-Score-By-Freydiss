#!/usr/bin/env bash
# Installe le bot Brams Score sur une VM Debian 12 (Google Cloud e2-micro, 1 Go RAM).
# Usage (sur la VM) : sudo bash setup-vm.sh   — le fichier .env doit déjà être dans /tmp/brams.env
set -euo pipefail
APP=/opt/brams-bot
REPO=https://github.com/AlFreydiss/Brams-Score-By-Freydiss.git

# 2 Go de swap : 1 Go de RAM est juste pour discord.py + Pillow + matplotlib
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10 && echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf
fi

apt-get update
apt-get install -y --no-install-recommends git ffmpeg python3 python3-venv python3-pip ca-certificates

id brams >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin brams

if [ ! -d "$APP/.git" ]; then
  git clone --branch master --single-branch --depth 50 "$REPO" "$APP"
fi
install -m 600 /tmp/brams.env "$APP/.env" && rm -f /tmp/brams.env
chown -R brams:brams "$APP"

sudo -u brams python3 -m venv "$APP/.venv"
sudo -u brams "$APP/.venv/bin/pip" install --no-cache-dir -q -r "$APP/requirements.txt"

install -m 644 "$APP/deploy/brams-bot.service"    /etc/systemd/system/
install -m 644 "$APP/deploy/brams-update.service" /etc/systemd/system/
install -m 644 "$APP/deploy/brams-update.timer"   /etc/systemd/system/
install -m 755 "$APP/deploy/update.sh"            /usr/local/bin/brams-update
systemctl daemon-reload
systemctl enable --now brams-bot.service brams-update.timer
systemctl --no-pager status brams-bot.service | head -15
