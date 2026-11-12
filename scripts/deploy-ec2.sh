#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$HOME/nodeapp"
cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "Missing $APP_DIR/.env; refusing to deploy without IMAGE_TAG and POSTGRES_PASSWORD." >&2
  exit 1
fi
chmod 600 .env

# Install Docker Engine and the Compose plugin from Docker's official Ubuntu repository when needed.
if ! command -v docker >/dev/null 2>&1 || ! sudo docker compose version >/dev/null 2>&1; then
  bash "$APP_DIR/install-docker-ec2.sh"
fi
sudo systemctl enable --now docker
trap 'sudo docker logout >/dev/null 2>&1 || true' EXIT
if ! command -v curl >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y curl
fi

# Disable the old PM2 startup units and remove PM2-managed processes and package.
for unit in "pm2-${USER}.service" "pm2-root.service"; do
  sudo systemctl disable --now "$unit" >/dev/null 2>&1 || true
  sudo rm -f "/etc/systemd/system/$unit"
done
sudo systemctl daemon-reload

if command -v pm2 >/dev/null 2>&1; then
  pm2 delete all >/dev/null 2>&1 || true
  pm2 kill >/dev/null 2>&1 || true
fi
if sudo sh -c 'command -v pm2 >/dev/null 2>&1'; then
  sudo pm2 delete all >/dev/null 2>&1 || true
  sudo pm2 kill >/dev/null 2>&1 || true
fi
if command -v npm >/dev/null 2>&1; then
  sudo npm uninstall --global pm2 >/dev/null 2>&1 || true
fi
rm -f "$HOME/.pm2/dump.pm2"
sudo rm -f /root/.pm2/dump.pm2

# Required cleanup for the old docker run container; safe on a first deployment.
sudo docker rm -f nodeapp || true

# Pull the immutable commit-tagged image; do not build on EC2.
sudo docker compose pull app db
sudo docker compose up -d --no-build --remove-orphans

for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error http://127.0.0.1:3000/healthz; then
    echo
    sudo docker compose ps
    echo "Compose deployment is healthy."
    exit 0
  fi
  sleep 2
done

sudo docker compose ps
sudo docker compose logs --tail=100 app db
exit 1
