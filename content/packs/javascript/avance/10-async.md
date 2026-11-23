# async et await
> Écrire de l'asynchrone comme du code normal.

@@ lesson async | async / await

Dans une fonction `async`, `await` met **cette fonction** en pause jusqu'à ce que la promesse soit finie. Le reste du programme continue.

```js-run
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function tartine() {
  console.log('griller');
  await attendre(50);
  console.log('beurrer');
  return 'tartine';
}
const p = tartine();          // une fonction async renvoie TOUJOURS une promesse
console.log('pendant ce temps');
console.log(await p);         // await est permis en haut d'un module
```

### Les erreurs

Une promesse rejetée devient une exception, donc `try…catch` marche :

```js-run
async function charger() {
  throw new Error('réseau coupé');
}
try {
  await charger();
} catch (e) {
  console.log('attrapé :', e.message);
}
```

Sans `await`, l'erreur **n'est pas** attrapée par ce `try` : la promesse part vivre sa vie.

### L'un après l'autre, ou ensemble ?

```js-run
const lent = (nom) => new Promise((r) => setTimeout(() => r(nom), 100));

let t = performance.now();
const a = await lent('a');    // 100 ms
const b = await lent('b');    // + 100 ms
console.log(a, b, Math.round((performance.now() - t) / 100), 'x 100 ms');

t = performance.now();
const [c, d] = await Promise.all([lent('c'), lent('d')]); // ensemble
console.log(c, d, Math.round((performance.now() - t) / 100), 'x 100 ms');
```

Dans une boucle : `for…of` avec `await` va **un par un** ; `Promise.all(liste.map(async …))` lance tout **ensemble**. `forEach` n'attend **pas** : ne mets jamais `await` dans un `forEach`.

### fetch

Pour appeler une API web :

```js
async function lireUser(id) {
  const reponse = await fetch(`https://api.exemple.fr/users/${id}`);
  if (!reponse.ok) throw new Error(`Erreur ${reponse.status}`); // fetch ne rejette pas sur un 404
  return reponse.json(); // encore une promesse
}

await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ nom: 'Ada' }),
});
```

Le bac à sable n'a pas de réseau : les exercices fournissent un faux `fetch`.

### Annuler

```js-run
const annuleur = new AbortController();
annuleur.signal.addEventListener('abort', () => console.log('annulé'));
annuleur.abort(); // passé à fetch(url, { signal }), coupe la requête
console.log(annuleur.signal.aborted);
```

### Itérer de façon asynchrone

```js-run
async function* pages() {
  for (let i = 1; i <= 3; i++) {
    await new Promise((r) => setTimeout(r, 10));
    yield `page ${i}`;
  }
}
for await (const p of pages()) console.log(p);
```

### En TypeScript

Le retour d'une fonction `async` s'écrit `Promise<T>`. `reponse.json()` est `any` : donne-lui tout de suite un type.

```ts-run
interface User { id: number; nom: string }
async function lire(): Promise<User> {
  const donnees: unknown = await Promise.resolve({ id: 1, nom: 'Ada' });
  return donnees as User; // mieux : vérifier vraiment (voir les projets)
}
console.log((await lire()).nom);
```

@@ code user | Appeler une API | js
`nomDe(id)` appelle `/users/<id>` avec `fetch` et renvoie le `nom` de la réponse JSON. Si la réponse n'est pas `ok`, lance `new Error('Erreur <statut>')`.
@starter
async function nomDe(id) {
}
@setup
globalThis.fetch = async (url) => {
  await new Promise((r) => setTimeout(r, 2));
  if (url === '/users/1') return { ok: true, status: 200, json: async () => ({ id: 1, nom: 'Ada' }), text: async () => '' };
  return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
};
@test Le nom
expect(await nomDe(1)).toBe('Ada');
@test Une erreur 404
await expect(nomDe(9)).toReject('Erreur 404');
@hint
Deux `await` : un pour `fetch`, un pour `.json()`.
@solution
async function nomDe(id) {
  const reponse = await fetch(`/users/${id}`);
  if (!reponse.ok) throw new Error(`Erreur ${reponse.status}`);
  const user = await reponse.json();
  return user.nom;
}

@@ code ensemble | En parallèle | js
`chargerTous(ids)` charge tous les éléments **en même temps** avec `charger(id)` (fournie), et renvoie un tableau dans l'ordre des ids. Les éléments qui échouent valent `null`.
@starter
async function chargerTous(ids) {
}
@setup
globalThis.charger = async (id) => {
  await new Promise((r) => setTimeout(r, 30));
  if (id < 0) throw new Error('absent');
  return `e${id}`;
};
@test Dans l'ordre
expect(await chargerTous([1, 2, 3])).toEqual(['e1', 'e2', 'e3']);
@test Les échecs valent `null`
expect(await chargerTous([1, -5, 3])).toEqual(['e1', null, 'e3']);
@test En même temps
const t = performance.now(); await chargerTous([1, 2, 3, 4, 5]); expect(performance.now() - t).toBeLessThan(100);
@hint
Dans `map`, un callback `async` avec son propre `try…catch`. Ou `charger(id).catch(() => null)`.
@solution
async function chargerTous(ids) {
  return Promise.all(ids.map((id) => charger(id).catch(() => null)));
}

@@ code reessayer-async | Réessayer avec attente | js
`reessayer(f, { fois = 3, delai = 10 } = {})` appelle la fonction asynchrone `f`. En cas d'échec, elle attend `delai` ms, puis le **double** à chaque fois, au plus `fois` essais. Après le dernier échec, elle relance l'erreur **sans attendre**.
@starter
async function reessayer(f, { fois = 3, delai = 10 } = {}) {
}
@test Réussit
let n = 0; expect(await reessayer(async () => { if (++n < 3) throw new Error('x'); return n; })).toBe(3);
@test Abandonne après `fois` essais
let n = 0; await expect(reessayer(async () => { n++; throw new Error(`e${n}`); }, { fois: 2, delai: 1 })).toReject('e2'); expect(n).toBe(2);
@test Attend de plus en plus
const t = performance.now(); await reessayer(async () => { throw 0; }, { fois: 3, delai: 20 }).catch(() => {}); const d = performance.now() - t; expect(d).toBeGreaterThan(50); expect(d).toBeLessThan(110);
@hint
Une boucle `for`, et dans le `catch` : `if (essai === fois) throw e;` avant d'attendre `delai * 2 ** (essai - 1)`.
@solution
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function reessayer(f, { fois = 3, delai = 10 } = {}) {
  for (let essai = 1; ; essai++) {
    try {
      return await f();
    } catch (e) {
      if (essai >= fois) throw e;
      await attendre(delai * 2 ** (essai - 1));
    }
  }
}

@@ code limite | Au plus N à la fois, en TypeScript | ts
`parLots<T, R>(liste, limite, f)` applique la fonction asynchrone `f` à chaque élément, avec **au plus `limite` appels en cours**, et renvoie les résultats dans l'ordre.
@starter
async function parLots(liste, limite, f) {
}
@test Résultats dans l'ordre
expect(await parLots([30, 5, 15], 2, async (ms) => { await $sleep(ms); return ms * 2; })).toEqual([60, 10, 30]);
@test Jamais plus que la limite
let cours = 0; let max = 0; await parLots([1, 2, 3, 4, 5, 6], 2, async () => { max = Math.max(max, ++cours); await $sleep(5); cours--; }); expect(max).toBe(2);
@test Liste vide
expect(await parLots([], 3, async (x) => x)).toEqual([]);
@types Types
const r: Promise<string[]> = parLots([1, 2], 2, async (n) => n.toFixed(1));
// @ts-expect-error
parLots([1], 2, async (s: string) => s);
@hint
Lance `limite` « ouvriers » : chacun prend le prochain indice, traite l'élément, recommence. Attends-les tous avec `Promise.all`.
@solution
async function parLots<T, R>(liste: T[], limite: number, f: (element: T) => Promise<R>): Promise<R[]> {
  const resultats: R[] = [];
  let suivant = 0;
  const ouvrier = async (): Promise<void> => {
    while (suivant < liste.length) {
      const i = suivant++;
      resultats[i] = await f(liste[i]);
    }
  };
  await Promise.all(Array.from({ length: limite }, ouvrier));
  return resultats;
}

@@ predict async-retour
Qu'affiche ce code ?
```js
async function f() { return 1; }
console.log(f() instanceof Promise);
```
@answer `true`
@wrong `false`
@wrong `1`
@wrong `undefined`
@why Une fonction `async` renvoie toujours une promesse.

@@ predict await-ordre
Dans quel ordre ?
```js
async function f() { console.log('a'); await null; console.log('b'); }
f();
console.log('c');
```
@answer `a c b`
@wrong `a b c`
@wrong `c a b`
@wrong `c b a`
@why Le début de la fonction est synchrone ; après `await`, la suite passe en microtâche.

@@ predict foreach-async
Dans quel ordre ?
```js
[1].forEach(async (n) => { await null; console.log(n); });
console.log('fin');
```
@answer `fin 1`
@wrong `1 fin`
@wrong `1`
@wrong `fin`
@why `forEach` n'attend pas les promesses de son callback.

@@ predict try-sans-await
Où va l'erreur ?
```js-bad
async function f() { throw new Error('x'); }
try { f(); } catch { console.log('attrapé'); }
```
@answer Elle n'est pas attrapée
@wrong Elle est attrapée par le `catch`
@wrong Rien : il n'y a pas d'erreur
@wrong Une SyntaxError
@why Sans `await`, la promesse rejetée échappe au `try`.

@@ card await-boucle
Traiter une liste un par un ? Tous ensemble ?
@back
Un par un : `for (const x of liste) await f(x);` — ensemble : `await Promise.all(liste.map(f));`

@@ card fetch-ok
Pourquoi tester `reponse.ok` après `fetch` ?
@back
`fetch` ne rejette que si le réseau échoue ; un 404 ou un 500 est une réponse normale.

@@ defi file-async | File, verrou et annulation | js
- `class File` : `ajouter(x)` et `prendre()` (une promesse du prochain élément ; **attend** s'il n'y en a pas). Premier arrivé, premier servi des deux côtés.
- `class Verrou` : `avec(f)` exécute la fonction asynchrone `f` quand les précédentes sont **finies** (même en échec), et renvoie son résultat.
- `annulable(f, signal)` : appelle `f()` et rejette dès que le `AbortSignal` s'annule, avec sa `reason` ; si le signal est déjà annulé, `f` n'est pas appelée.
@starter

@test File : éléments présents
const f = new File(); f.ajouter(1); f.ajouter(2); expect([await f.prendre(), await f.prendre()]).toEqual([1, 2]);
@test File : attente
const f = new File(); const a = f.prendre(); const b = f.prendre(); f.ajouter('x'); f.ajouter(undefined); f.ajouter('z'); expect([await a, await b, await f.prendre()]).toEqual(['x', undefined, 'z']);
@test Verrou : l'un après l'autre
const v = new Verrou(); const l = []; const t = (n, ms) => v.avec(async () => { l.push(`+${n}`); await $sleep(ms); l.push(`-${n}`); return n; }); expect(await Promise.all([t(1, 10), t(2, 1)])).toEqual([1, 2]); expect(l).toEqual(['+1', '-1', '+2', '-2']);
@test Verrou : un échec ne bloque pas
const v = new Verrou(); const a = v.avec(async () => { throw new Error('x'); }); const b = v.avec(async () => 'ok'); await expect(a).toReject('x'); expect(await b).toBe('ok');
@test Annulable
const c = new AbortController(); const p = annulable(() => $sleep(200), c.signal); setTimeout(() => c.abort(new Error('stop')), 5); await expect(p).toReject('stop'); expect(await annulable(async () => 5, new AbortController().signal)).toBe(5);
@test Déjà annulé
let n = 0; const c = new AbortController(); c.abort(new Error('tard')); await expect(annulable(async () => { n++; }, c.signal)).toReject('tard'); expect(n).toBe(0);
@solution
class File {
  #elements = [];
  #attentes = [];

  ajouter(x) {
    const servir = this.#attentes.shift();
    if (servir) servir(x);
    else this.#elements.push(x);
  }

  async prendre() {
    if (this.#elements.length > 0) return this.#elements.shift();
    return new Promise((resolve) => this.#attentes.push(resolve));
  }
}

class Verrou {
  #derniere = Promise.resolve();

  avec(f) {
    const resultat = this.#derniere.then(f);
    this.#derniere = resultat.catch(() => {});
    return resultat;
  }
}

async function annulable(f, signal) {
  if (signal.aborted) throw signal.reason;
  let arreter;
  const annulation = new Promise((_, reject) => {
    arreter = () => reject(signal.reason);
    signal.addEventListener('abort', arreter);
  });
  try {
    return await Promise.race([f(), annulation]);
  } finally {
    signal.removeEventListener('abort', arreter);
  }
}
