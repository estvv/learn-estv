# Expressions régulières
> Décrire la forme d'un texte, le chercher, le découper.

@@ lesson regex | Les regex

Une **regex** décrit une forme de texte, entre deux barres :

```js-run
console.log(/chat/.test('un chat noir'));
console.log('a1b22'.match(/\d+/g));           // g : toutes les trouvailles
console.log('2026-11-23'.split(/-/), 'a  b'.replace(/\s+/g, ' '));
```

### Les briques

| | |
|---|---|
| `.` | n'importe quel caractère (sauf retour à la ligne) |
| `\d` `\w` `\s` | chiffre ; lettre, chiffre ou `_` ; espace |
| `\D` `\W` `\S` | le contraire |
| `[abc]` `[a-z]` `[^abc]` | un de ceux-là ; de a à z ; aucun de ceux-là |
| `^` `$` `\b` | début ; fin ; bord de mot |
| `x?` `x*` `x+` | 0 ou 1 ; 0 ou plus ; 1 ou plus |
| `x{3}` `x{2,4}` `x{2,}` | exactement 3 ; de 2 à 4 ; au moins 2 |
| `a\|b` | a ou b |
| `(…)` `(?:…)` `(?<nom>…)` | groupe ; sans capture ; nommé |
| `(?=…)` `(?!…)` `(?<=…)` | suivi de ; pas suivi de ; précédé de |

Les caractères `. * + ? ( ) [ ] { } ^ $ | \ /` s'échappent avec `\`.

Drapeaux : `g` toutes, `i` sans casse, `m` `^` et `$` à chaque ligne, `s` le point accepte `\n`, `u` Unicode (`\p{L}` : toute lettre).

### Capturer

```js-run
const m = 'né le 23/11/1990'.match(/(?<jour>\d{2})\/(?<mois>\d{2})\/(?<an>\d{4})/);
console.log(m[0], m[1], m.groups.an, m.index);
console.log('rien'.match(/\d/)); // null si rien n'est trouvé

for (const t of 'a=1, b=2'.matchAll(/(\w)=(\d)/g)) console.log(t[1], t[2]);
console.log('Ada Lovelace'.replace(/(\w+) (\w+)/, '$2, $1'));
console.log('prix: 5'.replace(/\d/, (n) => n * 2));
```

### Gourmand ou paresseux

`+` et `*` prennent le **plus** possible ; avec `?` derrière, le moins possible :

```js-run
console.log('<b>a</b>'.match(/<.+>/)[0], '<b>a</b>'.match(/<.+?>/)[0]);
```

### Attention

Une regex `g` gardée dans une variable se souvient de sa position (`lastIndex`) : `test` peut alterner vrai et faux. N'utilise pas `g` avec `test`. Pour construire une regex à partir d'un texte : `new RegExp(RegExp.escape(texte), 'i')`.

Pour valider un e-mail ou lire du HTML, une regex simple ne suffit jamais vraiment : reste modeste.

@@ code codes | Valider des formats | js
Écris trois fonctions qui renvoient un booléen. Tout le texte doit correspondre.

- `estHeure(t)` : `'00:00'` à `'23:59'`
- `estCouleur(t)` : `#` suivi de 3 ou 6 chiffres hexadécimaux, en majuscules ou minuscules
- `estIdentifiant(t)` : 3 à 16 lettres, chiffres ou `_`, en commençant par une lettre
@starter

@test `estHeure`
expect(['00:00', '23:59', '9:30', '24:00', '12:60', 'x12:00'].map(estHeure)).toEqual([true, true, false, false, false, false]);
@test `estCouleur`
expect(['#fff', '#A1b2C3', '#ffff', 'fff', '#ggg', '#fff '].map(estCouleur)).toEqual([true, true, false, false, false, false]);
@test `estIdentifiant`
expect(['ada_36', 'ab', '1abc', 'a'.repeat(17), 'a-b-c'].map(estIdentifiant)).toEqual([true, false, false, false, false]);
@hint
L'heure : `([01]\d|2[0-3])`. N'oublie ni `^` ni `$`.
@solution
const estHeure = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const estCouleur = (t) => /^#([\da-f]{3}|[\da-f]{6})$/i.test(t);
const estIdentifiant = (t) => /^[a-z]\w{2,15}$/i.test(t);

@@ code extraire-mentions | Extraire | js
`mentions(texte)` renvoie les noms mentionnés avec `@` (lettres, chiffres, `_`), sans le `@`, sans doublon, dans l'ordre. Une adresse e-mail n'est pas une mention : le `@` ne doit pas être précédé d'un caractère de mot.
@starter
function mentions(texte) {
}
@test Trouve les mentions
expect(mentions('Salut @ada et @linus_t, merci @ada !')).toEqual(['ada', 'linus_t']);
@test Ignore les e-mails
expect(mentions('écris à moi@site.fr')).toEqual([]);
@test Aucune
expect(mentions('rien ici')).toEqual([]);
@hint
`(?<!\w)` : « pas précédé d'un caractère de mot ». `matchAll` donne les groupes.
@solution
function mentions(texte) {
  return [...new Set([...texte.matchAll(/(?<!\w)@(\w+)/g)].map((m) => m[1]))];
}

@@ code camel | camelCase et kebab-case | js
- `versCamel('ma-super-variable')` → `'maSuperVariable'`
- `versKebab('maSuperVariable')` → `'ma-super-variable'`
@starter

@test `versCamel`
expect(['ma-super-variable', 'simple', 'a-b'].map(versCamel)).toEqual(['maSuperVariable', 'simple', 'aB']);
@test `versKebab`
expect(['maSuperVariable', 'simple', 'aB'].map(versKebab)).toEqual(['ma-super-variable', 'simple', 'a-b']);
@hint
`replace` avec une fonction : `(tout, lettre) => lettre.toUpperCase()`.
@solution
const versCamel = (t) => t.replace(/-(\w)/g, (_, lettre) => lettre.toUpperCase());
const versKebab = (t) => t.replace(/[A-Z]/g, (lettre) => `-${lettre.toLowerCase()}`);

@@ code journal | Lire un journal, en TypeScript | ts
Chaque ligne d'un journal ressemble à `[2026-11-23] ERREUR: disque plein`. `lire(ligne)` renvoie `{ date, niveau, message }` ou `null` si la ligne n'a pas cette forme. Niveaux possibles : `INFO`, `ERREUR`. Type le retour avec une interface `Ligne` dont `niveau` est `'INFO' | 'ERREUR'`.
@starter
function lire(ligne: string) {
}
@test Une ligne correcte
expect(lire('[2026-11-23] ERREUR: disque plein')).toEqual({ date: '2026-11-23', niveau: 'ERREUR', message: 'disque plein' });
@test Le message peut contenir « : »
expect(lire('[2026-01-02] INFO: heure: 12:30').message).toBe('heure: 12:30');
@test Lignes incorrectes
expect([lire(''), lire('[2026-11-23] DEBUG: x'), lire('[23/11] INFO: x')]).toEqual([null, null, null]);
@types Le type de retour
type _ = [$Expect<$Equal<ReturnType<typeof lire>, Ligne | null>>, $Expect<$Equal<Ligne['niveau'], 'INFO' | 'ERREUR'>>];
@hint
TypeScript ne sait pas ce que contient un groupe : c'est un `string`. Comme la regex garantit la valeur, une assertion est justifiée : `niveau as Ligne['niveau']`.
@solution
interface Ligne {
  date: string;
  niveau: 'INFO' | 'ERREUR';
  message: string;
}

function lire(ligne: string): Ligne | null {
  const m = /^\[(\d{4}-\d{2}-\d{2})\] (INFO|ERREUR): (.*)$/.exec(ligne);
  if (!m) return null;
  const [, date, niveau, message] = m;
  return { date, niveau: niveau as Ligne['niveau'], message };
}

@@ predict gourmand
Qu'affiche ce code ?
```js
console.log('"a" et "b"'.match(/".*"/)[0]);
```
@answer `"a" et "b"`
@wrong `"a"`
@wrong `a`
@wrong `"b"`
@why `*` est gourmand : il va jusqu'au dernier guillemet. Avec `.*?` : le premier morceau.

@@ predict match-null
Qu'affiche ce code ?
```js
console.log('abc'.match(/\d/g));
```
@answer `null`
@wrong `[]`
@wrong `undefined`
@wrong `false`
@why Sans trouvaille, `match` renvoie `null` (d'où le `?? []` fréquent).

@@ predict test-g
Qu'affiche ce code ?
```js
const r = /a/g;
console.log(r.test('a'), r.test('a'));
```
@answer `true false`
@wrong `true true`
@wrong `false true`
@wrong `false false`
@why Avec `g`, la regex reprend après sa dernière trouvaille (`lastIndex`).

@@ card regex-bords
Comment exiger que **tout** le texte corresponde ?
@back
Avec `^` au début et `$` à la fin.

@@ card regex-groupe
Groupe nommé, et comment le lire ?
@back
`/(?<an>\d{4})/` puis `m.groups.an`

@@ defi csv | Lire du CSV | js
`lireCsv(texte)` renvoie un tableau d'objets, d'après la ligne d'en-tête.

- séparateur `,`, lignes `\n` ou `\r\n`, dernière ligne vide ignorée
- un champ entre `"` peut contenir des virgules, des **retours à la ligne**, et des guillemets doublés (`""`)
- un champ manquant donne `''`
@starter
function lireCsv(texte) {
}
@test Simple
expect(lireCsv('nom,age\nAda,36\r\nLinus,21\n')).toEqual([{ nom: 'Ada', age: '36' }, { nom: 'Linus', age: '21' }]);
@test Guillemets
expect(lireCsv('a,b\n"x, y","dit ""oui"""')).toEqual([{ a: 'x, y', b: 'dit "oui"' }]);
@test Retour à la ligne dans un champ
expect(lireCsv('a,b\n"1\n2",z')).toEqual([{ a: '1\n2', b: 'z' }]);
@test Champs vides ou manquants
expect(lireCsv('a,b,c\n,,x\n1')).toEqual([{ a: '', b: '', c: 'x' }, { a: '1', b: '', c: '' }]); expect(lireCsv('a,b\n"",2')).toEqual([{ a: '', b: '2' }]);
@test Seulement l'en-tête
expect([lireCsv('a,b'), lireCsv('a,b\n')]).toEqual([[], []]);
@hint
Une regex « collante » (`y`) qui lit un champ **et** ce qui le suit : `/(?:"((?:[^"]|"")*)"|([^",\r\n]*))(,|\r?\n|$)/y`.
@solution
function lireCsv(texte) {
  const champ = /(?:"((?:[^"]|"")*)"|([^",\r\n]*))(,|\r?\n|$)/y;
  const lignes = [];
  let ligne = [];
  while (champ.lastIndex < texte.length || ligne.length > 0) {
    const m = champ.exec(texte);
    if (!m) throw new SyntaxError('CSV mal formé');
    const [, cite, simple, fin] = m;
    ligne.push(cite === undefined ? simple : cite.replaceAll('""', '"'));
    if (fin !== ',') {
      lignes.push(ligne);
      ligne = [];
      if (fin === '') break;
    }
  }
  const [entete = [], ...donnees] = lignes;
  return donnees.map((l) => Object.fromEntries(entete.map((nom, i) => [nom, l[i] ?? ''])));
}
