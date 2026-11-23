# Les coins du langage
> Symbol, Proxy, templates étiquetés, BigInt, bits, copie immuable.

@@ lesson coins | Les outils moins courants

### Symbol

Une valeur **unique**, utile comme clé qui ne risque aucune collision :

```js-run
const id = Symbol('id');
const o = { [id]: 1, nom: 'x' };
console.log(o[id], Object.keys(o), Symbol('a') === Symbol('a'));
```

Les symboles **bien connus** changent le comportement d'un objet : `Symbol.iterator` (itérable), `Symbol.toPrimitive` (conversion), `Symbol.hasInstance` (`instanceof`)…

```js-run
const prix = { montant: 5, [Symbol.toPrimitive]: (type) => (type === 'string' ? '5 €' : 5) };
console.log(prix + 1, `${prix}`);
```

### Descripteurs de propriétés

Chaque propriété a des réglages : modifiable, visible dans les parcours, reconfigurable.

```js-run
const o = {};
Object.defineProperty(o, 'cache', { value: 1, enumerable: false, writable: false });
console.log(o.cache, Object.keys(o));
const gele = Object.freeze({ a: 1 });
try { gele.a = 2; } catch (e) { console.log(e.message); }
```

### Proxy et Reflect

Un **Proxy** intercepte les opérations sur un objet ; **Reflect** fait l'opération normale :

```js-run
const espion = new Proxy({ a: 1 }, {
  get(cible, cle) {
    console.log('lecture de', cle);
    return Reflect.get(cible, cle);
  },
  set(cible, cle, valeur) {
    if (typeof valeur !== 'number') throw new TypeError('un nombre !');
    return Reflect.set(cible, cle, valeur);
  },
});
espion.a;
espion.a = 5;
console.log(espion.a);
```

C'est la base de la réactivité dans des outils comme Vue.

### Templates étiquetés

Une fonction placée devant un template reçoit les morceaux de texte et les valeurs :

```js-run
const gras = (textes, ...valeurs) => textes.map((t, i) => t + (i < valeurs.length ? `**${valeurs[i]}**` : '')).join('');
console.log(gras`Salut ${'Ada'}, tu as ${36} ans`);
console.log(String.raw`C:\nouveau`); // sans interpréter les \
```

### BigInt

```js-run
console.log(Number.MAX_SAFE_INTEGER, 2 ** 53 === 2 ** 53 + 1); // au-delà : imprécis
console.log(2n ** 64n, 7n / 2n, typeof 1n);
try { 1n + 1; } catch (e) { console.log(e.message); } // pas de mélange
```

### Bits

`&` et, `|` ou, `^` ou exclusif, `~` non, `<<` et `>>` décalages (sur 32 bits) :

```js-run
const LIRE = 1 << 0, ECRIRE = 1 << 1, SUPPRIMER = 1 << 2;
const droits = LIRE | SUPPRIMER;
console.log(droits, (droits & ECRIRE) !== 0, droits.toString(2));
```

### Divers

```js-run
var x = (1, 2, 3);                    // opérateur virgule : la dernière valeur
console.log(x, void 0);               // void : toujours undefined
console.log(globalThis === undefined); // l'objet global, partout
console.log([1, 2, 3].includes(NaN), Number('0x1f'), parseInt('101', 2));
console.log(encodeURIComponent('é & à'), structuredClone({ d: new Date(0) }).d.getTime());
```

Ce que tu peux oublier : `with`, `eval`, `arguments` (remplacé par `...args`), `var`, `==`.

@@ code drapeaux | Des droits en bits | js
Avec `LIRE = 1`, `ECRIRE = 2`, `SUPPRIMER = 4` :

- `donner(droits, d)` : ajoute un droit
- `enlever(droits, d)` : retire un droit
- `aDroit(droits, d)` : booléen
@starter
const LIRE = 1;
const ECRIRE = 2;
const SUPPRIMER = 4;

@test `donner`
expect([donner(0, LIRE), donner(1, SUPPRIMER), donner(2, ECRIRE)]).toEqual([1, 5, 2]);
@test `enlever`
expect([enlever(7, ECRIRE), enlever(1, ECRIRE)]).toEqual([5, 1]);
@test `aDroit`
expect([aDroit(5, LIRE), aDroit(5, ECRIRE), aDroit(5, SUPPRIMER)]).toEqual([true, false, true]);
@hint
Enlever : `droits & ~d` (garder tous les bits sauf celui-là).
@solution
const LIRE = 1;
const ECRIRE = 2;
const SUPPRIMER = 4;

const donner = (droits, d) => droits | d;
const enlever = (droits, d) => droits & ~d;
const aDroit = (droits, d) => (droits & d) !== 0;

@@ code proxy-defaut | Un objet à valeurs par défaut | js
`avecDefaut(objet, defaut)` renvoie un Proxy : lire une clé absente donne `defaut`, sans la créer. Écrire marche normalement, et modifie l'objet d'origine.
@starter
function avecDefaut(objet, defaut) {
}
@test Clé présente ou absente
const o = avecDefaut({ a: 1 }, 0); expect([o.a, o.zut]).toEqual([1, 0]);
@test `undefined` est une vraie valeur
expect(avecDefaut({ a: undefined }, 5).a).toBe(undefined);
@test Écrire
const source = {}; const o = avecDefaut(source, 0); o.n++; o.n++; expect(source).toEqual({ n: 2 });
@test Lire ne crée rien
const source = {}; avecDefaut(source, 0).x; expect(Object.keys(source)).toEqual([]);
@hint
Seul le piège `get(cible, cle)` est utile. `Object.hasOwn(cible, cle)` dit si la clé existe.
@solution
function avecDefaut(objet, defaut) {
  return new Proxy(objet, {
    get: (cible, cle) => (Object.hasOwn(cible, cle) ? Reflect.get(cible, cle) : defaut),
  });
}

@@ code html | Template étiqueté | js
Étiquette `html` : renvoie le texte complet, en **échappant** les valeurs (`&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;`, `"` → `&quot;`). Les textes écrits dans le template ne sont pas échappés.
@starter
function html(textes, ...valeurs) {
}
@test Sans valeur
expect(html`<b>ok</b>`).toBe('<b>ok</b>');
@test Échappe les valeurs
expect(html`<p>${'<script>'} et ${'"a" & b'}</p>`).toBe('<p>&lt;script&gt; et &quot;a&quot; &amp; b</p>');
@test Les nombres aussi
expect(html`${1}${2}`).toBe('12');
@hint
Remplace `&` en premier, sinon tu échapperas tes propres échappements.
@solution
function echapper(valeur) {
  return String(valeur)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function html(textes, ...valeurs) {
  return textes.map((t, i) => (i < valeurs.length ? t + echapper(valeurs[i]) : t)).join('');
}

@@ code egal | Égalité profonde | js
`egal(a, b)` compare deux valeurs **par contenu** : primitifs (avec `NaN` égal à `NaN`), tableaux et objets simples, imbriqués.
@starter
function egal(a, b) {
  return a === b;
}
@test Primitifs
expect([egal(1, 1), egal('a', 'b'), egal(NaN, NaN), egal(null, undefined), egal(0, false)]).toEqual([true, false, true, false, false]);
@test Tableaux
expect([egal([1, [2]], [1, [2]]), egal([1], [1, 2]), egal([], [])]).toEqual([true, false, true]);
@test Objets
expect([egal({ a: 1, b: { c: 2 } }, { b: { c: 2 }, a: 1 }), egal({ a: 1 }, { a: 1, b: 2 }), egal({ a: undefined }, { b: undefined })]).toEqual([true, false, false]);
@test Tableau et objet, objet et `null`
expect([egal([], {}), egal({}, null), egal(null, {})]).toEqual([false, false, false]);
@hint
`Object.is` d'abord ; si l'un n'est pas un objet (ou vaut `null`), c'est faux ; ensuite, mêmes clés et valeurs égales **récursivement**.
@solution
function egal(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const cles = Object.keys(a);
  return cles.length === Object.keys(b).length
    && cles.every((cle) => Object.hasOwn(b, cle) && egal(a[cle], b[cle]));
}

@@ predict symbol
Qu'affiche ce code ?
```js
const o = { [Symbol('a')]: 1, b: 2 };
console.log(Object.keys(o).length);
```
@answer `1`
@wrong `2`
@wrong `0`
@wrong Une TypeError
@why `Object.keys` ignore les clés symboles.

@@ predict bigint
Qu'affiche ce code ?
```js
console.log(5n / 2n, 1n == 1, 1n === 1);
```
@answer `2n true false`
@wrong `2.5n true true`
@wrong `2n true true`
@wrong Une TypeError
@why La division de BigInt est entière ; `===` compare aussi le type.

@@ predict freeze
Que se passe-t-il (dans un module) ?
```js
const o = Object.freeze({ a: { b: 1 } });
o.a.b = 2;
console.log(o.a.b);
```
@answer `2`
@wrong `1`
@wrong Une TypeError
@wrong `undefined`
@why `Object.freeze` ne gèle que le premier niveau.

@@ card proxy
À quoi sert un Proxy ?
@back
À intercepter les opérations sur un objet (lecture, écriture, suppression…).

@@ card maxsafe
Pourquoi BigInt ?
@back
Les `number` ne sont exacts que jusqu'à 2^53 - 1 (`Number.MAX_SAFE_INTEGER`).

@@ defi observable | Objet observable | js
`observer(objet, f)` renvoie un Proxy **profond** : `f(chemin, nouvelle, ancienne)` est appelée à chaque changement **réel** (`Object.is`), y compris dans les objets et tableaux imbriqués. `chemin` est un texte (`'a.b.0'`).

- supprimer une propriété appelle `f(chemin, undefined, ancienne)`
- lire deux fois le même objet imbriqué donne le **même** Proxy
- un objet ajouté plus tard est observé aussi
- l'objet d'origine est bien modifié
@starter
function observer(objet, f) {
}
@test Simple et imbriqué
const l = []; const source = { a: 1, b: { c: 2 } }; const o = observer(source, (...x) => l.push(x)); o.a = 5; o.b.c = 9; expect([l, source]).toEqual([[['a', 5, 1], ['b.c', 9, 2]], { a: 5, b: { c: 9 } }]);
@test Pas de changement réel
let n = 0; const o = observer({ a: 1, x: NaN }, () => n++); o.a = 1; o.x = NaN; expect(n).toBe(0);
@test Tableaux
const l = []; const o = observer({ t: [1] }, (c, v) => l.push([c, v])); o.t.push(2); o.t[0] = 9; expect(l).toEqual([['t.1', 2], ['t.0', 9]]);
@test Supprimer
const l = []; const o = observer({ a: 1 }, (...x) => l.push(x)); delete o.a; delete o.a; expect([l, 'a' in o]).toEqual([[['a', undefined, 1]], false]);
@test Même Proxy, et objets ajoutés
const l = []; const o = observer({ a: {} }, (c) => l.push(c)); expect(o.a).toBe(o.a); o.z = { y: 1 }; o.z.y = 2; expect(l).toEqual(['z', 'z.y']);
@hint
Garde les Proxy créés dans une `WeakMap` (objet → Proxy). Après un `push`, la longueur est déjà à jour au moment où `length` est écrite : pas de changement réel.
@solution
function observer(objet, f, chemin = '', proxies = new WeakMap()) {
  const connu = proxies.get(objet);
  if (connu) return connu;
  const vers = (cle) => `${chemin}${String(cle)}`;
  const proxy = new Proxy(objet, {
    get(cible, cle, receveur) {
      const valeur = Reflect.get(cible, cle, receveur);
      if (typeof valeur !== 'object' || valeur === null) return valeur;
      return observer(valeur, f, `${vers(cle)}.`, proxies);
    },
    set(cible, cle, valeur, receveur) {
      const existait = Object.hasOwn(cible, cle);
      const ancienne = cible[cle];
      const ok = Reflect.set(cible, cle, valeur, receveur);
      if (!existait || !Object.is(ancienne, valeur)) f(vers(cle), valeur, ancienne);
      return ok;
    },
    deleteProperty(cible, cle) {
      const existait = Object.hasOwn(cible, cle);
      const ancienne = cible[cle];
      const ok = Reflect.deleteProperty(cible, cle);
      if (existait && ok) f(vers(cle), undefined, ancienne);
      return ok;
    },
  });
  proxies.set(objet, proxy);
  return proxy;
}
