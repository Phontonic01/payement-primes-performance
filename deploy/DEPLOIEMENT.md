# Deploiement Clean Africa — Prime de Performance

## Pre-requis sur le serveur

- Ubuntu/Debian avec Node.js 20+ installe
- Acces reseau au pont-bascule (192.168.120.20)

## Installation (une seule fois)

```bash
# 1. Creer l'utilisateur systeme
sudo useradd -r -m -s /bin/bash cleanAfrica

# 2. Copier le projet
sudo mkdir -p /opt/cleanAfrica-primes
sudo cp -r /chemin/vers/payement-primes-performance/* /opt/cleanAfrica-primes/
sudo chown -R cleanAfrica:cleanAfrica /opt/cleanAfrica-primes

# 3. Installer les dependances
cd /opt/cleanAfrica-primes
sudo -u cleanAfrica npm install --production

# 4. Builder le frontend
sudo -u cleanAfrica npm run build

# 5. Verifier le fichier .env
sudo nano /opt/cleanAfrica-primes/.env
# S'assurer que API_PORT, JWT_SECRET et les infos pont-bascule sont corrects

# 6. Installer le service systemd
sudo cp deploy/cleanAfrica-primes.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable cleanAfrica-primes
sudo systemctl start cleanAfrica-primes
```

## Commandes de gestion

```bash
# Voir le statut
sudo systemctl status cleanAfrica-primes

# Voir les logs en direct
sudo journalctl -u cleanAfrica-primes -f

# Redemarrer
sudo systemctl restart cleanAfrica-primes

# Arreter
sudo systemctl stop cleanAfrica-primes
```

## Acces depuis le reseau

L'application est accessible sur : http://<IP_DU_SERVEUR>:3001

Tous les postes du reseau Clean Africa peuvent y acceder via un navigateur.

## Mise a jour

```bash
cd /opt/cleanAfrica-primes

# Copier les nouveaux fichiers (sauf .env et data/)
# Puis :
sudo -u cleanAfrica npm install --production
sudo -u cleanAfrica npm run build
sudo systemctl restart cleanAfrica-primes
```

## Sauvegarde

La base de donnees SQLite est dans `data/cleanAfrica.db`.
Pensez a la sauvegarder regulierement :

```bash
cp /opt/cleanAfrica-primes/data/cleanAfrica.db /backup/cleanAfrica-$(date +%Y%m%d).db
```
