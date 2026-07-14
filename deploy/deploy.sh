#!/bin/bash
# Mise à jour rapide (pas de réinstallation système) — utilisé par le déploiement automatique GitHub Actions.
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

echo "=== Frontend : build ==="
cd "$APP_DIR/frontend"
npm install --silent
npm run build

echo "=== Redémarrage du backend ==="
sudo systemctl restart randomania-backend

echo "=== Terminé ==="
