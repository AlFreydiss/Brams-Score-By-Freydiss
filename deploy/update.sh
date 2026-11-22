#!/usr/bin/env bash
# Remplace l'auto-deploy de Railway : toutes les 3 min, si master a bougé, on tire et on redémarre.
set -euo pipefail
APP=/opt/brams-bot
cd "$APP"
sudo -u brams git fetch -q origin master
LOCAL=$(sudo -u brams git rev-parse HEAD)
REMOTE=$(sudo -u brams git rev-parse origin/master)
[ "$LOCAL" = "$REMOTE" ] && exit 0
OLD_REQ=$(sha1sum requirements.txt)
sudo -u brams git reset -q --hard origin/master
if [ "$OLD_REQ" != "$(sha1sum requirements.txt)" ]; then
  sudo -u brams "$APP/.venv/bin/pip" install --no-cache-dir -q -r requirements.txt
fi
systemctl restart brams-bot.service
echo "brams-bot mis à jour : ${LOCAL:0:7} -> ${REMOTE:0:7}"
