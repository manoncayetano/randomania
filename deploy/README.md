# Déploiement sur Oracle Cloud Free Tier (Oracle Linux 9)

## 1. Avant de lancer le script

Dans la console Oracle Cloud, ouvre les ports HTTP/HTTPS pour ta VM :
**Networking → Virtual Cloud Networks → (ta VCN) → Security Lists → Default Security List → Add Ingress Rules**
- Source CIDR `0.0.0.0/0`, protocole TCP, port de destination `80`
- Source CIDR `0.0.0.0/0`, protocole TCP, port de destination `443`

(Le port 22 pour SSH est déjà ouvert par défaut.)

## 2. Connexion à la VM

```
ssh -i /chemin/vers/ta-cle.key opc@<IP_DE_LA_VM>
```

## 3. Récupérer et lancer le script d'installation

```
curl -O https://raw.githubusercontent.com/manoncayetano/randomania/main/deploy/setup.sh
bash setup.sh
```

Le script installe Python et Caddy, récupère le code, configure le service qui fait
tourner le backend en continu, active le HTTPS automatique, et ajuste SELinux (activé
par défaut sur Oracle Linux) pour autoriser Caddy à servir les fichiers et à contacter
le backend. À la fin, il affiche l'adresse à utiliser (`https://xx-xx-xx-xx.nip.io`).

Le frontend n'est **pas** compilé sur la VM (Node.js n'y est même pas installé) : la VM
Always Free a très peu de RAM, et `npm run build` la ferait planter. Le script crée juste
un dossier `frontend/dist` vide (page "installation en cours") — le vrai contenu arrive
via le déploiement automatique GitHub Actions (voir plus bas), qui compile le frontend
sur les machines GitHub (RAM abondante) puis copie juste le résultat sur la VM.

## 4. Récupérer tes données existantes (base, photos, GPX)

Le dépôt GitHub ne contient pas `data/` (exclu volontairement, données personnelles).
Depuis ton PC, copie ton dossier `data/` local vers la VM :

```
scp -i /chemin/vers/ta-cle.key -r "data" opc@<IP_DE_LA_VM>:/opt/randomania/
```

Puis redémarre le backend pour qu'il prenne en compte les données copiées :
```
ssh -i /chemin/vers/ta-cle.key opc@<IP_DE_LA_VM> "sudo systemctl restart randomania-backend"
```

## 5. Créer les comptes utilisateurs (si pas déjà fait via la copie de `data/`)

```
cd /opt/randomania/backend && source venv/bin/activate
python scripts/gerer_utilisateurs.py creer audrey Audrey 'MotDePasse'
python scripts/gerer_utilisateurs.py creer manon Manon 'MotDePasse'
```

## Mettre à jour l'appli après un nouveau push sur GitHub

Automatique : chaque push sur `main` déclenche le workflow GitHub Actions
(`.github/workflows/deploy.yml`), qui compile le frontend sur les machines GitHub,
copie le résultat sur la VM, puis lance `deploy/deploy.sh` (git pull, dépendances
Python, redémarrage des services) — sans jamais faire tourner Node.js sur la VM.

Pour relancer une mise à jour manuellement (sans repasser par GitHub Actions) :
```
ssh -i /chemin/vers/ta-cle.key opc@<IP_DE_LA_VM>
cd /opt/randomania && bash deploy/deploy.sh
```
(Le frontend ne sera alors pas recompilé — seul le backend est mis à jour. Pour un
nouveau frontend, il faut passer par un push GitHub, ou compiler en local et le
copier via `scp`.)
