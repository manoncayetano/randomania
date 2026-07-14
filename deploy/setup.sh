#!/bin/bash
# Installation complète de randomania sur une VM Oracle Linux 9 fraîche (Oracle Cloud Free Tier).
# À lancer une seule fois, en te connectant à la VM en SSH :
#   bash setup.sh
set -e

REPO_URL="https://github.com/manoncayetano/randomania.git"
APP_DIR="/opt/randomania"

echo "=== Mise à jour du système ==="
sudo dnf update -y || echo "Mise a jour ignoree (pas assez de memoire), on continue avec les paquets necessaires"
sudo dnf install -y python3 python3-pip git curl firewalld policycoreutils-python-utils

echo "=== Pare-feu (ouverture HTTP/HTTPS) ==="
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload

echo "=== Installation de Caddy ==="
sudo dnf install -y 'dnf-command(copr)'
sudo dnf copr enable -y @caddy/caddy
sudo dnf install -y caddy

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

echo "=== Frontend : dossier d'accueil (le contenu réel arrive via le déploiement automatique GitHub Actions) ==="
mkdir -p "$APP_DIR/frontend/dist"
if [ ! -f "$APP_DIR/frontend/dist/index.html" ]; then
  echo "<html><body><p>Installation en cours, reviens dans quelques minutes.</p></body></html>" > "$APP_DIR/frontend/dist/index.html"
fi

echo "=== Service systemd (démarrage auto + redémarrage si crash) ==="
sudo cp "$APP_DIR/deploy/randomania-backend.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable randomania-backend
sudo systemctl restart randomania-backend

echo "=== Autorisation du redémarrage sans mot de passe (nécessaire pour le déploiement automatique) ==="
sudo tee /etc/sudoers.d/randomania-deploy > /dev/null <<'SUDOERS'
opc ALL=(root) NOPASSWD: /bin/systemctl restart randomania-backend
opc ALL=(root) NOPASSWD: /bin/systemctl restart caddy
opc ALL=(root) NOPASSWD: /bin/restorecon -Rv /opt/randomania/frontend/dist
SUDOERS
sudo chmod 440 /etc/sudoers.d/randomania-deploy

echo "=== SELinux : autoriser Caddy à servir les fichiers et à contacter le backend ==="
sudo setsebool -P httpd_can_network_connect 1
sudo semanage fcontext -a -t httpd_sys_content_t "${APP_DIR}/frontend/dist(/.*)?" || true
sudo restorecon -Rv "${APP_DIR}/frontend/dist"

echo "=== Config Caddy (HTTPS automatique via nip.io) ==="
IP=$(curl -s ifconfig.me)
IP_DASH=$(echo "$IP" | tr '.' '-')
sudo sed "s/{{DOMAIN}}/${IP_DASH}.nip.io/" "$APP_DIR/deploy/Caddyfile" | sudo tee /etc/caddy/Caddyfile > /dev/null
sudo systemctl enable --now caddy
sudo systemctl restart caddy

echo ""
echo "=== Terminé ! ==="
echo "Ton adresse : https://${IP_DASH}.nip.io"
echo ""
echo "Pense à créer les comptes utilisateurs :"
echo "  cd $APP_DIR/backend && source venv/bin/activate"
echo "  python scripts/gerer_utilisateurs.py creer audrey Audrey 'TonMotDePasse'"
echo "  python scripts/gerer_utilisateurs.py creer manon Manon 'SonMotDePasse'"
