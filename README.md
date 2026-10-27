# GTI700 - Laboratoire 1 : IoT et services web

Ce laboratoire consiste à construire un système simple d'acquisition et d'affichage de données de température et d'humidité, avec :

- un backend Node.js qui expose des API REST,
- un frontend web qui affiche les valeurs actuelles, la moyenne, l'historique et des graphiques,
- une architecture inspirée de l'IoT avec un Raspberry Pi pour le backend et éventuellement un second Raspberry Pi ou un ordinateur pour le frontend.

## 1. Structure du projet

- `backend.js` : serveur principal du backend sur le port 8080
- `frontend.js` : serveur du frontend sur le port 8889
- `sensor.js` : logique simulant l'acquisition de données de température et d'humidité
- `public/index.html` : page web d'affichage
- `package.json` : configuration du projet Node.js

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

Quand vous aurez le Raspberry Pi, le système doit être divisé comme suit :

### Backend sur Raspberry Pi A

- Le Pi A exécute le serveur Node.js qui lit les données du capteur.
- Il expose les API REST sur le port 8080.
- Il doit être accessible sur le réseau local.

Exemple d'architecture :

```text
Raspberry Pi A (backend)
  -> capteur de température/humidité
  -> node backend.js
  -> http://<ip-pi-a>:8080/capteurs/...
```

### Frontend sur Raspberry Pi B ou ordinateur B

- Le Pi B ou l'ordinateur B exécute le serveur Node.js du frontend.
- Il sert la page HTML sur le port 8889.
- La page consomme les données du backend à travers des requêtes HTTP (fetch/AJAX).

Exemple d'architecture :

```text
Raspberry Pi B / ordinateur B
  -> node frontend.js
  -> http://<ip-pi-b>:8889/affichage
```

### Exemple de configuration réelle

Dans le frontend, le backend est configuré par défaut comme ceci :

```js
const BACKEND = 'http://localhost:8080';
```

Quand le backend est déployé sur un autre appareil, il faut remplacer cette valeur par l'adresse IP du Raspberry Pi A :

```js
const BACKEND = 'http://192.168.1.25:8080';
```

### Démarrage sur Raspberry Pi

Sur le Raspberry Pi A :

```bash
node backend.js
```

Sur le Raspberry Pi B / ordinateur B :

```bash
node frontend.js
```

### Lecture du vrai capteur

Au lieu de `sensor.js` qui génère des valeurs aléatoires, il faudra remplacer cette partie par un module qui lit les données du capteur réel du Raspberry Pi.

Typiquement :

- utiliser les broches GPIO du Raspberry Pi,
- lire le capteur de température et d'humidité,
- enregistrer les valeurs dans un historique,
- exposer les APIs avec la même structure qu'ici.

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

```bash
npm install
node backend.js
node frontend.js
```

Puis ouvrir :

```text
http://localhost:8889/affichage
```

---

Ce README sert de base pour exécuter le projet localement et pour préparer le déploiement sur Raspberry Pi quand le matériel sera disponible.
