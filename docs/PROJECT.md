# Cahier des charges — learn-estv

Plateforme d'apprentissage personnelle et modulaire : piano d'abord, puis guitare, langues, programmation et sujets « classiques ». Chaque sujet s'apprend de plusieurs façons selon la nature de ce qu'on apprend (lire, jouer, entendre, dire, écrire…).

Projet perso : un admin (moi), quelques comptes créés à la main, des invités en lecture/pratique. Pas de clients, pas de monétisation. Quand une option est « propre mais lourde », on choisit la simple.

---

## 1. Principes

1. **Un socle, des modules.** Le socle gère contenu, progression, séances, stats et IA. Tout ce qui est spécifique (lecture de notes, oreille, play-along, flashcards…) est un module d'activité.
2. **Élément + facettes.** On ne suit pas « une note » mais « lire Do4 », « jouer Do4 », « reconnaître Do4 à l'oreille » : chaque facette a son propre suivi de répétition espacée.
3. **Un format de contenu unique.** Seed, éditeur et Mistral produisent tous des *packs* au même format, validés par le même schéma.
4. **Les entrées sont abstraites.** Clavier virtuel, MIDI et micro émettent les mêmes événements de note ; un exercice ignore d'où vient la note.
5. **Simple d'abord.** SQLite, modules dans le code, pas de quotas ni de modération.

## 2. Utilisateurs

| Rôle | Peut faire |
|---|---|
| **Invité** (sans compte) | Voir tout le contenu, faire toutes les activités. Progression dans le `localStorage` du navigateur uniquement. Aucune fonction IA. |
| **Compte** (créé par l'admin) | Progression sauvegardée en base, séances, stats, éditeur, Mistral. |
| **Admin** | Idem + gestion des comptes. |

- Auth : identifiant + mot de passe (scrypt), session en cookie httpOnly (pattern de music-estv). Pas d’inscription publique.
- Tout le contenu est public (visible par les invités).

## 3. Modèle de contenu

```
Sujet (Piano)
├── Compétences (arbre)         Lecture › Clé de sol, Oreille › Intervalles…
├── Éléments                    Do4, Do majeur, 猫, Array.map…
│     └── facettes              read · play · hear · say · write · recall…
├── Parcours (Piano débutant)
│     └── Unités
│           └── Étapes          = une activité configurée (module + config)
├── Leçons (Markdown enrichi)
└── Morceaux (piano/guitare)    importés MIDI / MusicXML ou enregistrés
```

- **Sujet** : piano, guitare, japonais, rust… Déclare les *facettes* qui ont du sens pour lui et les *outils* disponibles.
- **Compétence** : nœud d'un arbre par sujet. Un élément est rattaché à une ou plusieurs compétences ; la maîtrise d'une compétence = agrégat des facettes de ses éléments.
- **Élément** : la plus petite unité apprenable. Données libres typées par le sujet (ex. note : `{ midi: 60 }` ; mot : `{ term, reading, translation, lang }`).
- **Facette** : manière d'exercer un élément. Liste ouverte, chaque sujet choisit les siennes.
- **Parcours** : progression guidée, les étapes se débloquent en avançant, mais tout reste accessible en pratique libre.
- **Étape** : référence un module d'activité + sa config (ex. `note-reading`, `{ clefs: ["treble"], range: ["C4","G4"] }`).
- **Leçon** : Markdown avec blocs interactifs intégrés (` ```keyboard `, ` ```staff `, ` ```audio `, ` ```chord ` …), rendus par les modules.

### 3.1 Packs

Format d'échange unique (JSON validé par un schéma Zod partagé front/back) contenant un sujet ou une partie (compétences, éléments, parcours, leçons, cartes, morceaux).

Trois sources, même format :
- **Seed** : packs versionnés dans le repo (`content/packs/*.json`), importés au démarrage (upsert par identifiant stable).
- **Éditeur** : l'app écrit en base au même format ; export/import de pack possible.
- **Mistral** : génère un pack, validé par le schéma, enregistré directement avec un badge « IA » et modifiable ensuite.

Plus une quatrième source, sans stockage : les **générateurs**. Un module peut produire des exercices à l'infini à partir de sa config (note aléatoire dans une tessiture, intervalle aléatoire…).

## 4. Progression

- **SRS par facette** avec FSRS (`ts-fsrs`). Clé : `(user, element, facet)`.
- Chaque activité produit des **événements de révision** : `{ elementId, facet, grade (again/hard/good/easy), responseMs, correct, context }`. Le socle met à jour le FSRS, les stats et la maîtrise ; les modules n'écrivent jamais la progression eux-mêmes.
- **Maîtrise** d'une compétence = moyenne pondérée de la stabilité/rétention des facettes concernées, affichée en %.
- **Gamification sobre** : série de jours pratiqués (sans objectif chiffré), temps pratiqué, graphiques. Pas d'XP ni de badges.
- Seule la pratique dans l'app compte (pas de journal manuel).

## 5. Séances

- **Séance du jour** : je choisis 15 / 30 / 45 min au lancement. Composition : révisions dues → prochaine étape du parcours → pratique ciblée sur les faiblesses → morceau en cours. Algorithme par défaut ; le coach Mistral peut la composer à la place (§8).
- **Accès libre** : tableau de bord avec révisions dues par sujet, parcours, bibliothèque de leçons/activités/morceaux, outils.
- Le temps de séance est mesuré automatiquement (activité au premier plan, pause si inactif).

## 6. Couche d'entrée

Bus d'événements commun : `noteOn(midi, velocity, t)` / `noteOff(midi, t)`, plus `text` et `speech` pour les sujets non musicaux.

| Source | Polyphonie | Notes |
|---|---|---|
| Clavier virtuel | oui | Étendue adaptative (celle de l'exercice, 2 octaves par défaut, 88 touches possibles), clic/tactile. |
| MIDI | oui | Web MIDI API (Chrome/Edge), branché à chaud. |
| Micro | **non** | Détection de hauteur monophonique (`pitchy`, McLeod). Accords non fiables : les activités qui en exigent refusent cette source. |

Chaque source déclare ses capacités (`polyphonic`, `velocity`, `latencyMs`) ; chaque module déclare ce qu'il exige. L'UI ne propose que les sources compatibles. Calibration de latence pour le micro et le MIDI.

## 7. Modules d'activité

Un module = un dossier TypeScript (`frontend/src/modules/<id>/`, + partie backend si besoin) enregistré dans un registre. Interface :

```ts
interface ActivityModule<Config> {
  id: string;                     // "note-reading"
  configSchema: ZodType<Config>;  // validé à l'import de pack et dans l'éditeur
  facets: FacetId[];              // facettes exercées
  inputs: InputRequirement;       // ex. { notes: { polyphonic: false } }
  generate?(config, rng): Exercise[];     // exercices infinis
  Player: Component<{ config, onReview(ev: ReviewEvent), onDone() }>;
  Editor?: Component<{ config, onChange }>; // formulaire dans l'éditeur
}
```

Les **outils** (métronome, clavier, accordeur, enregistreur) suivent le même principe : utilisables seuls (page Outils) et intégrables dans une activité ou une leçon.

### 7.1 Modules V1 (piano)

| Module | Description | Facettes |
|---|---|---|
| `lesson` | Leçon Markdown enrichie | — (marque l'étape comme vue) |
| `flashcards` | Cartes recto/verso, notées par moi ou par saisie | `recall`, `recognize` |
| `quiz` | QCM / saisie courte (réutilisable par tous les sujets) | selon config |
| `note-reading` | Une note sur la portée → la jouer. Clés de sol et fa débloquées progressivement. Mode calme par défaut, mode chrono optionnel (le temps de réponse influe sur la note FSRS). | `read` |
| `keyboard-find` | Nom de note affiché → trouver la touche | `play` |
| `ear` | Notes isolées (relatives à un Do de référence), intervalles (asc./desc.), accords (maj/min → 7e, renversements), dictée mélodique (3 à 8 notes) — répondre par QCM ou en rejouant | `hear` |
| `rhythm` | Taper un rythme affiché au métronome, scoré sur le timing | `rhythm` |
| `play-along` | Jouer un morceau (§7.2) | `perform` |

### 7.2 Play-along

- **Affichage** : partition (portée + curseur) ou notes qui tombent vers le clavier, au choix.
- **Chiffres** : au-dessus des notes qui tombent, le morceau écrit en nombres, une suite par main, sur une grille de temps. Dans chaque partie (A, B…), la première touche jouée vaut 1, la nouvelle suivante 2…, et une touche garde son numéro ; les parties de même lettre partagent leurs numéros. Rien de tout cela n'est stocké : pistes actives, mains (réparties selon ce qui est jouable quand le fichier ne les donne pas de façon crédible, `hands.ts`), niveau et changements faits à la main donnent les notes, qui donnent les numéros (`derive.ts`). Un changement fait à un niveau simplifié reste propre à ce niveau. À ces niveaux, les mains sont réparties à nouveau et les numéros leur sont propres. Les parties sont trouvées automatiquement et se corrigent à la main ; les temps sont suivis un par un quand le jeu ne respecte pas le tempo du fichier.
- **Couleurs** : une par main, au choix et propres à chaque thème (clair, nuit, ou celui de l’appareil), gardées sur l’appareil (`lib/appearance.ts`). Le thème nuit retourne les palettes de Tailwind (`dark.css`) ; le clavier, lui, ne change pas, et une fausse note y est hachurée plutôt que colorée.
- **Styles des notes** (`stage/`) : classique, ou dans le noir néon, cristal, braise, liquide, galaxie, avec particules, barre de LED et lumière sur les touches. Les lueurs sont des images faites une fois ; les particules diminuent toutes seules sur une machine lente.
- **Plein écran** (F) : seulement les paroles, les notes et le clavier.
- **Modes** : *attente* (le morceau s'arrête jusqu'à la bonne note), *tempo réel + score* (justesse + timing, tempo réglable), *boucle* sur une sélection de mesures avec tempo progressif.
- **Prises** : les notes jouées sont toujours enregistrées (pas l'audio). On peut rejouer une prise et la superposer à l'original (notes en avance/retard/fausses). Le score et les conseils du coach s'appuient dessus.
- **Import** : un seul endroit, le fichier dit comment il est lu. MIDI, MusicXML ; partition PDF (symboles SMuFL lus un par un, `score-pdf/`, rien n'est envoyé) ; vidéo de notes qui tombent (clavier trouvé dans l'image, touches qui s'allument, `videoKeys.ts`), sinon son transcrit ; image ou scan lus par une IA, Gemini puis Mistral (`backend/src/ai/`) : numéros (éditeur en chiffres) ou partition (à vérifier).
- **Morceaux** : import MIDI (`@tonejs/midi`), import MusicXML (rendu OpenSheetMusicDisplay, mains et doigtés conservés), ou écrits à la main en chiffres : d'abord le numéro de chaque touche, puis les touches posées au-dessus du clavier ou enregistrées en jouant, par parties, et leur ordre (`shared/src/score.ts`). Les numéros de ces morceaux sont ceux de leur auteur. Un morceau importé se modifie dans le même éditeur (`importedScore.ts` : ses notes gardent leur place exacte, seules celles touchées changent), ou case par case. Vidéo et son : les notes sont calées sur les cases à l’import, ou plus tard dans l’éditeur (`snap.ts`). Un nouveau morceau peut être fait de quelques parties d’un autre, qui ne change pas (`extract.ts`).
- **Karaoké** : les paroles, ligne par ligne, au-dessus des notes. Cherchées sur LRCLIB (titre et artiste envoyés par le serveur, sur demande), collées ou lues dans un `.lrc`, puis calées sur le morceau : une ligne placée déplace les autres, plusieurs donnent le tempo (`lyrics.ts`). Les mots se remplissent selon leurs syllabes et le débit de la chanson : c’est une estimation.

### 7.3 Pédagogie piano

Approche **mixte** : la lecture de notes avance en parallèle de morceaux simples et d'accords dès le début, pour se faire plaisir vite tout en apprenant à lire. Seed initiale : parcours « Piano débutant total » (repérage du clavier, Do central, clé de sol puis fa, premiers rythmes, premiers accords maj/min, morceaux à une puis deux mains).

Notation affichée : **Do (C)** — les deux noms ensemble.

## 8. Mistral

Réservé aux comptes connectés ; désactivé si `MISTRAL_API_KEY` est absente. Modèle configurable (`MISTRAL_MODEL`). Pas de quota. Toutes les réponses structurées passent par le schéma des packs ou un schéma dédié.

- **Génération** : un sujet/parcours entier depuis un prompt (« parcours de japonais pour débutant »), ou dans l'éditeur (« génère 20 cartes sur… », « rédige cette leçon », « ajoute une unité »). Le résultat est enregistré directement avec un badge « IA ».
- **Tuteur** : bouton « Pourquoi c'est faux ? » après une erreur ; chat latéral avec le contexte de la leçon/activité ; chat global avec accès à ma progression.
- **Correction** de réponses libres (traduction, réponse ouverte, code).
- **Coach** : compose la séance du jour, bilan hebdomadaire, conseils après un play-along (passages ratés, timing → exercices ciblés).

## 9. Éditeur

- Formulaires pour la structure (sujets, compétences, éléments, parcours, unités, étapes avec le formulaire `Editor` de chaque module).
- Markdown avec aperçu en direct pour les leçons (blocs interactifs inclus).
- Import/export de pack JSON.
- Boutons de génération Mistral intégrés.

## 10. Stats

- Temps pratiqué par jour/semaine/sujet, heatmap, série.
- Maîtrise par compétence, éléments maîtrisés vs en cours, prévision des révisions.
- Faiblesses : éléments les plus ratés, temps de réaction moyen (lecture de notes).
- Morceaux : historique des scores, tempo atteint.

## 11. Sujets suivants (à valider par le modèle, hors V1)

- **Guitare** : manche, tablatures, accords, accordeur (micro). Réutilise entrée micro/MIDI, `ear`, `rhythm`, `play-along` (affichage tablature).
- **Langues** (n'importe lesquelles) : tout en Unicode, chaque contenu porte un code langue (`ja`, `ru`…) pour la synthèse vocale du navigateur, saisie via l'IME système. Modules spécifiques plus tard (tracé de caractères, prononciation au micro).
- **Programmation** : exercices exécutés dans le navigateur (JS natif, Python via Pyodide, autres via WebAssembly). Rien n'est exécuté sur le VPS.
- **Autres** (culture, maths…) : `lesson` + `flashcards` + `quiz` suffisent.

## 12. Architecture technique

- **Backend** : Node, Express, TypeScript, better-sqlite3 (template des apps estv).
- **Frontend** : React 19, Vite, Tailwind v4, servi par nginx qui proxifie `/api` et `/health` vers `learn-backend-estv:8080`.
- **Audio** : Tone.js ; piano échantillonné (Salamander Grand Piano, libre), samples servis par le frontend.
- **Partitions** : VexFlow pour les portées générées (lecture de notes, oreille, leçons), OpenSheetMusicDisplay pour les morceaux MusicXML.
- **Schémas** : Zod, partagés front/back (dossier `shared/`).
- **SRS** : `ts-fsrs`.
- **Déploiement** : Docker Compose sur `caddy_net`, GitHub Action → SSH → `deploy/deploy.sh` (voir [`DEPLOY.md`](DEPLOY.md)), entrée dans `home-estv`.
- **Ports dev** : backend 3014, override compose 8095.

### 12.1 Modèle de données (première ébauche)

```
users(id, username, password_hash, is_admin, settings_json, created_at)
subjects(id, slug, name, facets_json, source, created_at)          -- source: seed|user|ai
skills(id, subject_id, parent_id, slug, name, position)
elements(id, subject_id, slug, kind, data_json)
element_skills(element_id, skill_id)
paths(id, subject_id, slug, name, description, position)
units(id, path_id, name, position)
steps(id, unit_id, module, config_json, position)
lessons(id, subject_id, slug, title, markdown, source)
pieces(id, subject_id, title, format, data_blob, meta_json)        -- format: midi|musicxml|recorded
reviews(id, user_id, element_id, facet, grade, correct, response_ms, context_json, at)
srs_state(user_id, element_id, facet, fsrs_json, due_at)           -- PK (user, element, facet)
step_progress(user_id, step_id, status, completed_at)
sessions(id, user_id, subject_id, planned_min, started_at, ended_at, active_ms, plan_json)
takes(id, user_id, piece_id, mode, tempo, events_json, score_json, at)
ai_threads(id, user_id, scope, context_json, messages_json, updated_at)
```

Invités : mêmes structures côté client dans le `localStorage` (`reviews`, `srs_state`, `step_progress`), même logique FSRS exécutée dans le navigateur.

## 13. Direction visuelle

DA des apps estv : fond blanc, Plus Jakarta Sans, gris neutres, boutons primaires noirs, champs `rounded-lg` bordés. Couleurs uniquement là où elles portent du sens : juste/faux, main droite/main gauche, facettes. Pensé PC d'abord (grand écran, clavier, MIDI), utilisable sur tablette.

## 14. Lots de livraison

La V1 est tout ce qui suit ; on la livre par lots déployables :

1. **Socle** : auth + invités, schéma de pack + import de seed, registre de modules, couche d'entrée (4 sources), moteur audio, FSRS, `lesson`, `flashcards`, `quiz`.
2. **Piano lecture & oreille** : `note-reading`, `keyboard-find`, `ear`, seed « Piano débutant total » (premières unités), séance du jour (algo), stats de base.
3. **Rythme & morceaux** : métronome, `rhythm`, `play-along` (MIDI, MusicXML, enregistrement), prises et comparaison, stats morceaux.
4. **Éditeur** : formulaires, Markdown, import/export.
5. **Mistral** : génération, tuteur, correction, coach.

## 15. Questions encore ouvertes

- Contenu exact du parcours seed piano (à rédiger avec Mistral/Claude puis relire).
- Faut-il proposer aux invités d'importer leur progression `localStorage` s'ils reçoivent un compte ?
- Hébergement des samples piano (taille, qualité : 1 ou plusieurs vélocités).
