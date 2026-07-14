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

Le script installe tout (Python, Node, Caddy), récupère le code, build le frontend,
configure le service qui fait tourner le backend en continu, active le HTTPS
automatique, et ajuste SELinux (activé par défaut sur Oracle Linux) pour autoriser
Caddy à servir les fichiers et à contacter le backend. À la fin, il affiche l'adresse
à utiliser (`https://xx-xx-xx-xx.nip.io`).

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

```
ssh -i /chemin/vers/ta-cle.key opc@<IP_DE_LA_VM>
cd /opt/randomania && bash deploy/setup.sh
```

Le script est idempotent : il met à jour le code, rebuild le frontend, et redémarre
les services, sans toucher à `data/`.
