# Packs

Un pack est un fichier JSON, ou un **dossier** quand il y a beaucoup de texte et de code :

```
javascript/
  pack.json              sujet, facettes, parcours (sans unités)
  bases/01-demarrer.md   une unité par fichier, dans le dossier de son parcours
```

Le contenu est importé au démarrage du backend quand il a changé. Les identifiants d'étape (`@@ code id`) servent à la progression : ne pas les renommer.

## Une unité

```
# Nom de l'unité
> Description

@@ lesson id | Titre
Markdown. Blocs de code colorés : js, ts, jsx, tsx, html, css. Exécutables :
js-run, ts-run, web-run et web-ts-run (la page, une ligne ---, le script), react-run.

@@ code id | Titre | js
Consigne. Langage : js, ts, jsx ou tsx. Avec un fichier .html ou du JSX,
l'exercice a un aperçu et le DOM ; sinon il tourne dans un worker.
@starter [fichier] [readonly]   code de départ (le premier fichier est celui testé)
@test Nom                       code de test, exécuté à la suite du fichier
@types Nom                      code qui doit compiler (TypeScript)
@part Titre                     étape d'un mini-projet ; les @test suivants lui appartiennent
@hint                           indice
@setup                          code caché exécuté avant (faux fetch…)
@solution [fichier]             solution complète

@@ defi id | Titre | js        comme code, plus dur et facultatif, à la fin de l'unité

@@ predict id                   question « que fait ce code ? »
@answer / @wrong / @why

@@ card id                      carte : recto, puis @back
```

Les questions et les cartes d'une unité forment ses étapes « Lire du code » et « À retenir », et entrent dans les révisions.

Dans les tests web : `$click`, `$type`, `$key`, `$submit`, `$fire`, `$text`, `$texts`, `$until`, et `$mount(<X />)` pour React (tous asynchrones sauf `$text` et `$texts`). Le composant exporté par défaut s'affiche dans l'aperçu.

Dans tous les tests : `expect(x)` (`toBe`, `toEqual`, `toThrow`, `toReject`…), `$logs` (lignes affichées), `$source` (code sans commentaires), `$capture(f)`, `$sleep(ms)` ; dans les `@types` : `$Expect<$Equal<A, B>>`.

`npm test -w frontend` vérifie tout : chaque solution réussit, chaque départ échoue, les exemples compilent et les réponses aux questions sont les bonnes.

## Image du sujet

`frontend/public/subjects/<id>.png`, 960×600, avec sa source dans `CREDITS.md`. Sans image : une tuile de couleur avec l’initiale.
