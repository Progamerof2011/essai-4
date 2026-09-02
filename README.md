# Trajet — compagnon mobilité maison ↔ lycée

Tout ce dont tu as besoin est dans ce dossier. Rien ne nécessite un PC.

## Ce que c'est réellement

Une **PWA** (Progressive Web App) : une appli qui vit dans une page web,
mais qui s'installe sur ton écran d'accueil, s'ouvre en plein écran comme
une vraie appli, fonctionne hors-ligne, et ne demande ni Play Store ni
compilation Android. C'est la solution la plus simple pour développer,
modifier et "installer" une appli 100 % depuis un téléphone — une vraie
chaîne de compilation Android (SDK + Gradle) serait beaucoup plus lourde
et fragile pour un usage personnel.

**Ce que ça change concrètement pour toi :**
- Pas d'APK à générer, pas d'Android Studio.
- Tout le code (`index.html`, `app.js`, `manifest.json`, `sw.js`) est déjà prêt à l'emploi.
- Tu peux modifier `app.js` directement dans n'importe quel éditeur de texte sur ton PC, puis `git add / git commit / git push` pour republier — pas de compilation, la mise à jour est visible en quelques secondes.

## Étape 1 — Mettre l'appli en ligne (depuis ton PC, avec git)

Il faut que les fichiers soient servis en HTTPS pour que l'installation et le mode hors-ligne fonctionnent. Depuis un PC avec `git` installé, c'est le chemin le plus direct :

1. Décompresse `trajet-app.zip` : tu dois obtenir un dossier `compagnon-mobilite/` contenant `index.html`, `app.js`, `manifest.json`, `sw.js`, `icons/`, `gateway/` et `README.md`.
2. Crée un dépôt vide sur GitHub, par exemple `trajet-app` (ne coche ni README ni .gitignore à la création, pour partir d'un dépôt totalement vide).
3. Ouvre un terminal dans le dossier `compagnon-mobilite/` et lance :
   ```
   git init
   git add index.html app.js manifest.json sw.js icons README.md
   git commit -m "Première version de l'appli"
   git branch -M main
   git remote add origin https://github.com/TON-PSEUDO/trajet-app.git
   git push -u origin main
   ```
   (Le dossier `gateway/` n'est volontairement pas ajouté ici : il part dans un second dépôt, voir étape 4.)
4. Sur GitHub, va dans **Settings → Pages** du dépôt, choisis la branche `main` comme source, dossier `/ (root)`, puis enregistre.
5. Après une à deux minutes, ton appli est en ligne à une adresse du type `https://ton-pseudo.github.io/trajet-app/`.

*(Si tu préfères éviter la ligne de commande : GitHub Desktop permet de faire les mêmes étapes — cloner le dépôt vide, glisser les fichiers dans le dossier local, "Commit" puis "Push" — en interface graphique.)*

## Étape 2 — Installer l'appli sur ton téléphone

L'installation reste une action côté téléphone, puisque c'est lui que tu veux utiliser au quotidien :

1. Ouvre l'URL obtenue à l'étape 1 dans Chrome sur Android.
2. Menu (⋮) → **Ajouter à l'écran d'accueil** / **Installer l'application**.
3. L'icône apparaît sur ton écran d'accueil, l'appli s'ouvre en plein écran.

## Étape 3 — Clé API SNCF (horaires, retards, suppressions)

1. Va sur `https://numerique.sncf.com/startup/api/` depuis ton PC.
2. Crée un compte gratuit, récupère ta clé API.
3. Dans l'appli sur ton téléphone → **Réglages → SNCF**, colle la clé (tu peux aussi te l'envoyer par un message à toi-même pour la copier-coller facilement).

## Étape 4 — La passerelle Pronote (dossier `gateway/`)

Pronote n'a pas d'API officielle. La bibliothèque `pronotepy` (open source,
activement maintenue) est la méthode la plus fiable pour s'y connecter.
Comme c'est du Python, ça ne peut pas tourner directement dans le
navigateur : il faut un tout petit service qui fait le pont entre Pronote
et ton appli. C'est le seul élément qui s'approche d'un "serveur", mais :
- il ne stocke **aucune** donnée (pas de base de données) ;
- il ne fait que relayer ton emploi du temps du jour à la demande ;
- il est protégé par un jeton que tu choisis toi-même.

**Déploiement (gratuit, depuis ton PC, via Render.com) :**

1. Crée un second dépôt GitHub, par exemple `passerelle-pronote`. Depuis un terminal dans le dossier `gateway/` :
   ```
   git init
   git add main.py requirements.txt render.yaml
   git commit -m "Passerelle Pronote"
   git branch -M main
   git remote add origin https://github.com/TON-PSEUDO/passerelle-pronote.git
   git push -u origin main
   ```
2. Crée un compte gratuit sur `render.com` (connexion possible directement avec ton compte GitHub).
3. "New → Web Service", connecte le dépôt `passerelle-pronote`.
4. Render détecte `render.yaml` : renseigne les variables demandées :
   - `PRONOTE_URL` : l'adresse de ton Pronote (ex. `https://0123456a.index-education.net/pronote/eleve.html`, visible dans la barre d'adresse quand tu es connecté sur le site Pronote de ton lycée).
   - `PRONOTE_USERNAME` / `PRONOTE_PASSWORD` : tes identifiants Pronote.
   - `ACCESS_TOKEN` : invente une longue chaîne aléatoire (ce sera ton mot de passe pour protéger la passerelle).
5. Déploie. Render te donne une URL du type `https://passerelle-pronote.onrender.com`.
6. Dans l'appli → **Réglages → Pronote**, renseigne cette URL et le même jeton.

*Si tu préfères ne pas exposer tes identifiants Pronote à un hébergeur tiers, choisis "Je rentre mon emploi du temps à la main" — dis-le moi et j'ajoute un écran de saisie manuelle des cours à l'appli.*

## Ce qu'il faut savoir sur les notifications

Sans backend ni serveur de notifications push (exclu par tes contraintes
de simplicité et de confidentialité), les alertes de retard/suppression
ne fonctionnent que **quand l'appli est ouverte à l'écran** : elle vérifie
les perturbations toutes les 5 minutes tant qu'elle est affichée. Une
vraie notification en arrière-plan nécessiterait un serveur qui tourne en
permanence — exactement ce que tu voulais éviter.

## Ce qui est déjà fonctionnel dans ce livrable

- Écran de configuration initial (maison, gare, lycée, trajets).
- Détection du premier/dernier vrai cours (hors trous et cours annulés).
- Choix de l'heure d'arrivée avec marge minimale de 10 min imposée.
- Algorithme de sélection du meilleur train (aller et retour).
- Récupération horaires/retards/suppressions SNCF.
- Météo (Open-Meteo, sans clé requise).
- Localisation avec bascule manuelle Maison/Lycée.
- Cache local + indicateur "donnée non actualisée" hors-ligne.
- Stockage 100 % local (`localStorage`), aucun compte, aucune base distante.

## Prochaines améliorations possibles (dis-moi si tu veux que je les fasse)

- Écran de saisie manuelle de l'emploi du temps (sans passerelle Pronote).
- Vérification automatique périodique en arrière-plan via Periodic Background Sync (support encore limité sur Android/Chrome).
- Résolution automatique du nom de gare vers un identifiant SNCF avec autocomplétion dans les réglages.
