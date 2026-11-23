# Premiers pas
> Exécuter du code, lire une erreur, comprendre ce que sont JavaScript et TypeScript.

@@ lesson deux-langages | JavaScript et TypeScript

**JavaScript** (JS) est un langage exécuté par tous les navigateurs, et sur serveur par Node.js, Deno ou Bun. **TypeScript** (TS), c'est JavaScript **plus des types** : tu précises quelle sorte de valeur va où, et un outil vérifie tout *avant* l'exécution.

Le même programme dans les deux :

```js-run
function double(n) {
  return n * 2;
}
console.log(double(21));
```

```ts-run
function double(n: number): number {
  return n * 2;
}
console.log(double(21));
```

Deux choses à retenir :

- Tout ce que tu apprends en JavaScript marche en TypeScript.
- Les types **disparaissent** à l'exécution : TypeScript est *compilé* en JavaScript. Les types servent à toi et à ton éditeur, pas à la machine.

Ce parcours mélange les deux : d'abord les valeurs et la syntaxe, avec un coin « En TypeScript » dans les leçons, puis un parcours entier sur le système de types.

> Appuie sur **Exécuter** pour lancer un exemple, et sur **Modifier** pour le changer. Casse des choses, c'est la meilleure façon d'apprendre.

@@ lesson premier-programme | Ton premier programme

Un programme est une suite d'**instructions**, exécutées de haut en bas. `console.log(...)` affiche une valeur :

```js-run
console.log('Bonjour !');
console.log(1 + 1);
console.log('un', 2, true);
```

### Commentaires

Le texte après `//` est ignoré, comme tout ce qui est entre `/*` et `*/` :

```js
// Un commentaire sur une ligne
console.log('affiché'); // à la fin d'une ligne

/* Un commentaire
   sur plusieurs lignes */
```

### Points-virgules et blocs

Une instruction se termine par `;`. JavaScript sait souvent l'ajouter tout seul, mais pas toujours comme tu crois : mets-les. Les accolades `{ }` regroupent des instructions en **bloc**. L'indentation (2 espaces) ne compte pas pour la machine, elle compte pour toi.

JavaScript distingue majuscules et minuscules : `console.Log` n'existe pas.

### Lire une erreur

```js-run
console.log('avant');
console.log(bonjour);
console.log('jamais affiché');
```

`ReferenceError: bonjour is not defined` se lit en deux morceaux : le **type** d'erreur, puis l'explication. Les plus courantes :

| Erreur | Ce qui s'est passé |
|---|---|
| `SyntaxError` | Le code est mal écrit (parenthèse oubliée…) : rien ne s'exécute |
| `ReferenceError` | Ce nom n'existe pas |
| `TypeError` | La valeur ne permet pas cette opération |
| `RangeError` | Une valeur sort des limites permises |

Les messages restent en anglais, comme dans tous les éditeurs : autant s'y habituer.

@@ code bonjour | Dire bonjour | js
Affiche ces deux lignes avec `console.log`, dans cet ordre :

1. le texte `Bonjour !`
2. le résultat de `6 * 7` (laisse JavaScript calculer)

**Exécuter** lance ton code ; **Vérifier** (Ctrl + Entrée) lance les tests.
@starter
// Écris ton code ici
@test La première ligne est « Bonjour ! »
expect($logs[0]).toBe('Bonjour !');
@test La deuxième ligne est 42
expect($logs[1]).toBe('42');
@test Le calcul est fait par JavaScript
expect($source).toMatch(/6\s*\*\s*7/);
@hint
Un texte s'écrit entre guillemets : `'comme ça'`. Un calcul, sans guillemets.
@solution
console.log('Bonjour !');
console.log(6 * 7);

@@ code reparer | Réparer un programme | js
Ce programme contient **trois erreurs**. Lis les messages, corrige, et fais-lui afficher :

```
Debut
10
Fin
```
@starter
console.log('Debut');
Console.log(4 + 6;
console.log(Fin);
@test Les trois lignes sont affichées
expect($logs).toEqual(['Debut', '10', 'Fin']);
@hint
Il y a une majuscule de trop, une parenthèse oubliée et un texte sans guillemets.
@solution
console.log('Debut');
console.log(4 + 6);
console.log('Fin');

@@ predict ordre
Que se passe-t-il ?
```js
console.log('A');
console.log(inconnu);
console.log('B');
```
@answer `A` puis une ReferenceError
@wrong `A`, `B`, puis une ReferenceError
@wrong Rien : une SyntaxError
@wrong `A undefined B`
@why Le programme s'exécute ligne par ligne et s'arrête à la première erreur non gérée.

@@ predict syntaxe
Que se passe-t-il ?
```js-bad
console.log('A');
console.log('B';
```
@answer Rien ne s'affiche : SyntaxError
@wrong `A` puis une SyntaxError
@wrong `A` puis `B`
@wrong Une ReferenceError
@why Une erreur de syntaxe est trouvée à la lecture du fichier : aucune ligne n'est exécutée.

@@ card ts-cest-quoi
Que deviennent les types TypeScript à l'exécution ?
@back
Ils disparaissent : TypeScript est compilé en JavaScript. Les types servent avant, à la vérification.

@@ card commentaires
Comment écrit-on un commentaire d'une ligne ? De plusieurs lignes ?
@back
`// une ligne` et `/* plusieurs lignes */`

@@ defi sapin | Un dessin | js
Affiche ce sapin, avec **exactement** ces espaces, en 5 `console.log` :

```
    *
   ***
  *****
 *******
    |
```
@starter
// Ton sapin ici
@test Cinq lignes
expect($logs).toHaveLength(5);
@test Le bon dessin
expect($logs).toEqual(['    *', '   ***', '  *****', ' *******', '    |']);
@solution
console.log('    *');
console.log('   ***');
console.log('  *****');
console.log(' *******');
console.log('    |');
