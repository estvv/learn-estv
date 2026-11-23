# learn-estv

Plateforme d'apprentissage perso et générale : n'importe quel sujet (instruments, langues, programmation, culture…), en commençant par le piano. Chaque sujet s'apprend de plusieurs façons (lire, jouer, entendre, dire…), avec répétition espacée (FSRS) par facette. Spécification complète : [`docs/PROJECT.md`](docs/PROJECT.md).

Les invités ont accès à tout, leur progression reste dans le navigateur. Les comptes sont créés par l'admin et sauvegardent la progression.

## Stack

- npm workspaces : `shared/` (schémas Zod des packs, FSRS, notes de musique, utilisés par le front et le back), `backend/`, `frontend/`
- Backend : Node, Express 5, better-sqlite3, bundlé avec esbuild
- Frontend : React 19, Vite, Tailwind v4, Tone.js (piano Salamander), pitchy (micro), Web MIDI
- Contenu de départ : `content/packs/` (JSON ou dossiers Markdown, voir [`content/packs/README.md`](content/packs/README.md)), importé au démarrage quand il change

## Mise en route sur le VPS

```bash
cd ~/projects && git clone git@github.com:estvv/learn-estv.git && cd learn-estv
cp .env.example .env
docker compose up -d --build
docker compose exec backend npm run create-admin -- <identifiant>   # affiche le mot de passe généré (modifiable dans « Mon compte »)
```

Puis ajouter le bloc de `Caddyfile.snippet` dans le Caddyfile, recharger Caddy, et ajouter l'app dans `home-estv`.

## Déploiement automatique

Chaque push sur `main` est testé, puis mis en ligne sur le VPS avec la base de données (sauvegarde, répétition sur une copie, retour automatique en cas d'échec). Mise en place : `deploy/setup.sh`, tutoriel dans [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Dev local

Sur l'hôte (Node ≥ 22) :

```bash
npm install
make backend    # API sur :3014, base dans data/learn.db
make frontend   # http://localhost:5173
make admin NAME=estv
```

Ou avec Docker : `cp docker-compose.override.example.yml docker-compose.override.yml && docker compose up` → http://127.0.0.1:8095.

Tests et typage : `npm test` et `npm run typecheck`.

## Ajouter un module d'activité

1. Schéma de config dans `shared/src/modules/index.ts` (+ entrée dans `moduleConfigSchemas`) : le backend valide les packs avec.
2. Dossier `frontend/src/modules/<id>/` exportant un `ActivityModule` (`Player`, éventuellement `reviewConfig`).
3. Une ligne dans `frontend/src/modules/registry.ts`.

## Boîtes à outils

Ce qui est propre à une famille de sujets vit dans `frontend/src/toolkits/<id>/` : entrées, son, blocs Markdown interactifs, panneau de réglages. Aujourd'hui `music` (piano échantillonné, clavier à l'écran/ordinateur/MIDI/micro, blocs ```` ```keyboard ```` et ```` ```play ````). Et `code` (éditeur CodeMirror, TypeScript dans un worker, exécution dans un worker jetable, blocs ```` ```js-run ```` et ```` ```ts-run ````, bac à sable) : rien n'est exécuté sur le serveur. Un nouveau toolkit (ex. `speech` pour les langues) s'ajoute dans `frontend/src/toolkits/index.ts` ; ses réglages apparaissent automatiquement dans **Réglages**.

## Partition → MIDI

`tools/sheet2midi.py` lit une partition (PDF, photo/scan, ou MusicXML) et produit un `.mid` à importer dans **Morceaux**, plus le `.musicxml` reconnu (importable aussi, garde mieux les deux mains). Il faut [uv](https://docs.astral.sh/uv/) ; les dépendances s'installent toutes seules.

```sh
uv run tools/sheet2midi.py partition.pdf               # -> partition.mid + partition.musicxml
uv run tools/sheet2midi.py p1.jpg p2.jpg -o morceau.mid --bpm 90
```

Moteur : [Audiveris](https://github.com/Audiveris/audiveris/releases) s'il est installé (le plus fiable), sinon oemer (premier lancement : ~150 Mo de modèles). Plus la partition est nette (PDF exporté de MuseScore, scan 300 dpi), meilleur est le résultat ; corriger le `.musicxml` dans MuseScore si besoin.

## Crédits

Samples de piano : [Salamander Grand Piano](https://archive.org/details/SalamanderGrandPianoV3) par Alexander Holm, licence CC-BY 3.0 (version allégée de Tone.js).
