#!/bin/bash
# Installation complète de randomania sur une VM Ubuntu fraîche (Oracle Cloud Free Tier).
# À lancer une seule fois, en te connectant à la VM en SSH :
#   bash setup.sh
set -e

REPO_URL="https://github.com/manoncayetano/randomania.git"
APP_DIR="/opt/randomania"

echo "=== Mise à jour du système ==="
sudo apt-get update
sudo apt-get install -y python3-venv python3-pip git curl ufw

echo "=== Pare-feu (ouverture HTTP/HTTPS/SSH) ==="
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo "=== Installation de Node.js ==="
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "=== Installation de Caddy ==="
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update
sudo apt-get install -y caddy

echo "=== Récupération du code ==="
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR" && git pull
else
  sudo mkdir -p "$APP_DIR"
  sudo chown "$USER":"$USER" "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

echo "=== Backend : environnement virtuel ==="
cd "$APP_DIR/backend"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -c "from db.init_db import init_db; init_db()"
deactivate

echo "=== Frontend : build ==="
cd "$APP_DIR/frontend"
npm install
npm run build

echo "=== Service systemd (démarrage auto + redémarrage si crash) ==="
sudo cp "$APP_DIR/deploy/randomania-backend.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable randomania-backend
sudo systemctl restart randomania-backend

echo "=== Config Caddy (HTTPS automatique via nip.io) ==="
IP=$(curl -s ifconfig.me)
IP_DASH=$(echo "$IP" | tr '.' '-')
sudo sed "s/{{DOMAIN}}/${IP_DASH}.nip.io/" "$APP_DIR/deploy/Caddyfile" | sudo tee /etc/caddy/Caddyfile > /dev/null
sudo systemctl restart caddy

echo ""
echo "=== Terminé ! ==="
echo "Ton adresse : https://${IP_DASH}.nip.io"
echo ""
echo "Pense à créer les comptes utilisateurs :"
echo "  cd $APP_DIR/backend && source venv/bin/activate"
echo "  python scripts/gerer_utilisateurs.py creer audrey Audrey 'TonMotDePasse'"
echo "  python scripts/gerer_utilisateurs.py creer manon Manon 'SonMotDePasse'"
