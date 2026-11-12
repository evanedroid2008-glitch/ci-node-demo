#!/usr/bin/env bash
set -euo pipefail

. /etc/os-release
if [ "${ID:-}" != "ubuntu" ]; then
  echo "This installer expects Ubuntu; detected ${ID:-unknown}." >&2
  exit 1
fi

if command -v docker >/dev/null 2>&1 && sudo docker compose version >/dev/null 2>&1; then
  sudo systemctl enable --now docker
  sudo docker --version
  sudo docker compose version
  exit 0
fi

sudo apt-get update -y
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
ubuntu_codename="${UBUNTU_CODENAME:-${VERSION_CODENAME}}"
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${ubuntu_codename} stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker --version
sudo docker compose version
