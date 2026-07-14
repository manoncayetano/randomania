#!/bin/bash
# Mise à jour rapide (pas de réinstallation système) — utilisé par le déploiement automatique GitHub Actions.
# Le frontend est compilé par GitHub Actions (RAM abondante) et copié déjà prêt dans frontend/dist
# AVANT que ce script tourne : la VM (RAM très limitée) ne fait jamais de build Node.js.
set -e

APP_DIR="/opt/randomania"
cd "$APP_DIR"

echo "=== Récupération du dernier code ==="
git pull

echo "=== Backend : dépendances ==="
cd "$APP_DIR/backend"
source venv/bin/activate
pip install -r requirements.txt --quiet
deactivate

echo "=== SELinux : ré-étiqueter le frontend (fichiers reçus via scp) ==="
sudo restorecon -Rv "${APP_DIR}/frontend/dist"

echo "=== Redémarrage ==="
sudo systemctl restart randomania-backend
sudo systemctl restart caddy

echo "=== Terminé ==="
