# GTI700 - Laboratoire 1 : IoT et services web

Ce laboratoire consiste à construire un système simple d'acquisition et d'affichage de données de température et d'humidité, avec :

- un backend Node.js qui expose des API REST,
- un frontend web qui affiche les valeurs actuelles, la moyenne, l'historique et des graphiques,
- une architecture inspirée de l'IoT avec un Raspberry Pi pour le backend et éventuellement un second Raspberry Pi ou un ordinateur pour le frontend.

## 1. Structure du projet

- `backend.js` : serveur principal du backend sur le port 8080
- `frontend.js` : serveur du frontend sur le port 8889
- `sensor.js` : module d'acquisition (capteur réel via `messages.py`/`humid.py` ou simulation)
- `public/index.html` : page web d'affichage
- `package.json` : configuration du projet Node.js

### 1.1 Module d'acquisition des capteurs (partie 1)

`sensor.js` est le module JavaScript qui obtient les données du capteur DHT11 et conserve :

- la dernière valeur de température et d'humidité lue ;
- un historique de 720 mesures horodatées (une heure à raison d'une mesure aux 3 secondes).

Sur le Raspberry Pi, il lance `messages.py` (qui réutilise le pilote `humid.py`) et lit son flux JSON.
Ailleurs, ou avec `SENSOR_MODE=sim`, il génère des valeurs simulées.

Le module peut être exécuté seul et imprime chaque lecture dans la console (tâche 1.1) :

```bash
node sensor.js
```

La fréquence d'acquisition peut être modifiée avec `SENSOR_INTERVAL_MS` (défaut : 3000 ms).

## 2. Installation

1. Ouvrir un terminal dans le dossier du projet.
2. Installer les dépendances :

```bash
npm install
```

## 3. Lancer le backend

Dans le dossier du projet :

```bash
node backend.js
```

Le backend écoute sur :

```text
http://localhost:8080
```

### Endpoints disponibles

- Température actuelle :
  ```text
  http://localhost:8080/capteurs/temp
  ```

- Historique des 5 dernières températures :
  ```text
  http://localhost:8080/capteurs/temp/5
  ```

- Moyenne des 30 dernières températures :
  ```text
  http://localhost:8080/capteurs/temp/30/moy
  ```

- Humidité actuelle :
  ```text
  http://localhost:8080/capteurs/hum
  ```

- Historique des 5 dernières humidités :
  ```text
  http://localhost:8080/capteurs/hum/5
  ```

- Moyenne des 30 dernières humidités :
  ```text
  http://localhost:8080/capteurs/hum/30/moy
  ```

## 4. Lancer le frontend

Ouvrir un second terminal et lancer :

```bash
node frontend.js
```

Le frontend écoute sur :

```text
http://localhost:8889/affichage
```

Ouvrir cette adresse dans le navigateur pour voir le tableau de bord.

## 5. Vérification rapide

Vérifier que le backend répond bien :

```bash
curl http://localhost:8080/capteurs/temp
```

Vérifier que le frontend s'affiche :

```bash
curl http://localhost:8889/affichage
```

## 6. Déploiement avec Raspberry Pi

Configuration utilisée : le **backend tourne sur le Raspberry Pi** et le **frontend sur l'ordinateur**.
Le capteur DHT11 est branché sur la broche **GPIO22**.

### Backend sur le Raspberry Pi

- Le Pi exécute `backend.js`, qui lit le capteur DHT11 sur GPIO22 via `sensor.js` → `messages.py` → `humid.py`.
- Il expose les API REST sur le port 8080.
- Il doit être accessible sur le réseau local.

```text
Raspberry Pi (backend)
  -> capteur DHT11 sur GPIO22
  -> node backend.js
  -> http://<ip-pi>:8080/capteurs/...
```

Trouver l'adresse IP du Pi :

```bash
hostname -I
```

Puis démarrer le backend sur le Pi :

```bash
node backend.js
```

### Frontend sur l'ordinateur

- L'ordinateur exécute `frontend.js` et sert la page HTML sur le port 8889.
- La page interroge le backend du Pi avec `fetch`.
- L'adresse du backend est définie par `BACKEND_URL` dans `frontend.js` (actuellement
  `http://10.196.122.36:8080`). Elle peut être remplacée par la variable d'environnement
  `BACKEND_URL` sans modifier le code.

Sur Windows (PowerShell) :

```powershell
$env:BACKEND_URL = "http://<ip-pi>:8080"
node frontend.js
```

Sur Linux/macOS :

```bash
BACKEND_URL="http://<ip-pi>:8080" node frontend.js
```

Puis ouvrir :

```text
http://localhost:8889/affichage
```

`frontend.js` expose l'adresse via `/config.js`, donc il n'est pas nécessaire de modifier
`public/index.html`. Après une modification de `frontend.js`, il faut **redémarrer**
`node frontend.js` et faire un rafraîchissement forcé du navigateur (`Ctrl+Shift+R`).

La page affiche l'adresse du backend utilisée sous le titre, ce qui permet de vérifier
rapidement qu'elle pointe vers le bon appareil.

### Lecture du vrai capteur

Le module `sensor.js` lance automatiquement `messages.py` (qui réutilise `humid.py`) lorsque
le système est un Raspberry Pi (Linux). Le pilote lit le DHT11 sur **GPIO22**. Il lit les lignes
JSON produites sur la sortie standard, met à jour l'historique et la dernière valeur, puis le
backend expose ces données avec la même structure d'API. Sur un autre système (ou avec
`SENSOR_MODE=sim`), des valeurs simulées sont utilisées.

### Vérification depuis l'ordinateur

```bash
curl http://<ip-pi>:8080/capteurs/temp
curl http://<ip-pi>:8080/capteurs/hum
```

Si ces commandes échouent, vérifier que le Pi et l'ordinateur sont sur le même réseau et que
le port 8080 n'est pas bloqué par un pare-feu.

## 7. Notes importantes

- Les valeurs affichées en local peuvent être simulées ; pour le vrai laboratoire, on remplace la simulation par des lectures réelles du capteur.
- Le frontend doit rafraîchir automatiquement toutes les 3 secondes.
- Il faut gérer les erreurs de connexion si le backend est indisponible.
- Le serveur doit rester disponible sur le réseau local.

## 8. Remise du laboratoire

- Les fichiers du projet doivent être soumis selon les consignes du cours.
- Le travail doit être organisé de manière professionnelle.
- Le code doit être cohérent, lisible et fonctionnel.
- Il faut respecter les contraintes de déploiement et les APIs demandées par l'énoncé.

## 9. Référence rapide

Sur le Raspberry Pi (backend + capteur sur GPIO22) :

```bash
npm install
node backend.js
```

Sur l'ordinateur (frontend) :

```powershell
npm install
$env:BACKEND_URL = "http://<ip-pi>:8080"
node frontend.js
```

Puis ouvrir :

```text
http://localhost:8889/affichage
```

---

Ce README décrit l'exécution locale ainsi que le déploiement avec le backend sur le Raspberry Pi
et le frontend sur l'ordinateur.
