# Promesses et boucle d'événements
> Pourquoi JavaScript n'attend pas, et comment enchaîner.

@@ lesson boucle | La boucle d'événements

JavaScript n'a qu'**un seul fil** d'exécution : il fait une chose à la fois. Pour ne pas bloquer pendant une attente (réseau, minuterie…), il **programme une fonction pour plus tard** et continue.

```js-run
console.log('1');
setTimeout(() => console.log('3 : plus tard'), 0);
console.log('2');
```

Même avec un délai de 0, la fonction passe **après** tout le code en cours. L'ordre :

1. le code synchrone, jusqu'au bout ;
2. toutes les **microtâches** (les `.then` des promesses, la suite d'un `await`) ;
3. **une** tâche (minuterie, clic…), puis retour en 2.

```js-run
setTimeout(() => console.log('tâche'), 0);
Promise.resolve().then(() => console.log('microtâche'));
console.log('synchrone');
```

Conséquence : une longue boucle bloque tout, y compris l'affichage et les clics.

@@ lesson promesses | Les promesses

Une **promesse** est une valeur qui arrivera plus tard. Elle est *en attente*, puis **tenue** (avec une valeur) ou **rejetée** (avec une erreur), une fois pour toutes.

```js-run
const attendre = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

attendre(50)
  .then(() => 'prêt')
  .then((texte) => console.log(texte));
console.log('je n\'attends pas');
```

### Enchaîner

`.then(f)` renvoie une **nouvelle** promesse : la valeur renvoyée par `f` devient la suivante. Si `f` renvoie une promesse, on l'attend. Une erreur saute jusqu'au premier `.catch` :

```js-run
Promise.resolve(2)
  .then((n) => n * 10)
  .then((n) => { throw new Error(`aïe ${n}`); })
  .then(() => console.log('sauté'))
  .catch((e) => { console.log('attrapé :', e.message); return 'reparti'; })
  .then((x) => console.log(x))
  .finally(() => console.log('fin'));
```

N'oublie pas le `return` dans un `.then` avec accolades : sans lui, la suite reçoit `undefined` sans attendre.

### En créer une

```js
new Promise((resolve, reject) => {
  // resolve(valeur) quand c'est bon, reject(new Error('…')) sinon
});
```

Seulement pour envelopper du code à callbacks. Si tu as déjà une promesse, enchaîne-la.

### Plusieurs à la fois

| | Réussit quand | Échoue quand |
|---|---|---|
| `Promise.all` | toutes réussissent | une échoue |
| `Promise.allSettled` | toutes sont finies | jamais |
| `Promise.race` | la première finie réussit | la première finie échoue |
| `Promise.any` | une réussit | toutes échouent |

```js-run
const apres = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
Promise.all([apres(30, 'a'), apres(10, 'b')]).then((l) => console.log(l)); // ordre gardé
Promise.race([apres(30, 'lent'), apres(10, 'rapide')]).then((v) => console.log(v));
Promise.allSettled([apres(5, 1), Promise.reject(new Error('non'))])
  .then((l) => console.log(l.map((r) => r.status)));
```

### En TypeScript

`Promise<T>` : une promesse d'un `T`. Pour un constructeur, précise-le : `new Promise<string>((resolve) => …)`.

@@ code attendre | Une minuterie en promesse | js
`attendre(ms, valeur)` renvoie une promesse tenue avec `valeur` au bout de `ms` millisecondes.
@starter
function attendre(ms, valeur) {
}
@test Renvoie une promesse
expect(attendre(1)).toBeInstanceOf(Promise);
@test Donne la valeur
expect(await attendre(5, 'ok')).toBe('ok');
@test Attend vraiment
const t = performance.now(); await attendre(40); expect(performance.now() - t).toBeGreaterThan(30);
@solution
function attendre(ms, valeur) {
  return new Promise((resolve) => setTimeout(() => resolve(valeur), ms));
}

@@ code chaine | Enchaîner avec then | js
`chargerProfil(id)` est fournie : elle donne un profil `{ nom, amis: [ids] }`, ou rejette. Écris `nomDuPremierAmi(id)` avec `.then` / `.catch` (sans `async`) :

- le nom du premier ami
- `null` s'il n'a pas d'ami
- `'inconnu'` si un chargement échoue
@starter
function nomDuPremierAmi(id) {
}
@setup
const profils = { 1: { nom: 'Ada', amis: [2, 3] }, 2: { nom: 'Linus', amis: [] }, 4: { nom: 'Max', amis: [99] } };
globalThis.chargerProfil = (id) => new Promise((ok, ko) => setTimeout(() => (profils[id] ? ok(profils[id]) : ko(new Error('absent'))), 3));
@test Le premier ami
expect(await nomDuPremierAmi(1)).toBe('Linus');
@test Pas d'ami
expect(await nomDuPremierAmi(2)).toBe(null);
@test Échecs
expect(await nomDuPremierAmi(50)).toBe('inconnu'); expect(await nomDuPremierAmi(4)).toBe('inconnu');
@test Sans async
expect($source).not.toMatch(/async|await/);
@hint
Renvoyer une promesse depuis un `.then` l'enchaîne : `.then((p) => p.amis.length ? chargerProfil(p.amis[0]).then((a) => a.nom) : null)`
@solution
function nomDuPremierAmi(id) {
  return chargerProfil(id)
    .then((profil) => (profil.amis.length ? chargerProfil(profil.amis[0]).then((ami) => ami.nom) : null))
    .catch(() => 'inconnu');
}

@@ code mon-all | Écrire Promise.all | js
`tous(promesses)` fait comme `Promise.all` (sans l'utiliser) : résultats dans l'ordre, rejet dès la première erreur, `[]` pour une liste vide. Les éléments peuvent être de simples valeurs.
@starter
function tous(promesses) {
}
@test Résultats dans l'ordre
expect(await tous([$sleep(15).then(() => 'a'), $sleep(3).then(() => 'b')])).toEqual(['a', 'b']);
@test Valeurs simples et liste vide
expect(await tous([1, Promise.resolve(2)])).toEqual([1, 2]); expect(await tous([])).toEqual([]);
@test Rejet
const ko = Promise.reject(new Error('non')); ko.catch(() => {}); await expect(tous([$sleep(50), ko])).toReject('non');
@test Sans `Promise.all`
expect($source).not.toMatch(/Promise\.all/);
@hint
Compte les promesses restantes ; quand il n'en reste plus, `resolve(resultats)`. `Promise.resolve(x)` transforme une valeur simple en promesse.
@solution
function tous(promesses) {
  return new Promise((resolve, reject) => {
    const resultats = [];
    let restantes = promesses.length;
    if (restantes === 0) resolve(resultats);
    promesses.forEach((p, i) => {
      Promise.resolve(p).then((valeur) => {
        resultats[i] = valeur;
        restantes--;
        if (restantes === 0) resolve(resultats);
      }, reject);
    });
  });
}

@@ code delai | Limite de temps, en TypeScript | ts
`avecLimite(promesse, ms)` renvoie le résultat de la promesse, ou rejette avec `new Error('Trop long')` si elle dépasse `ms`. Elle garde le type : `avecLimite<T>(promesse: Promise<T>, ms: number): Promise<T>`.
@starter
function avecLimite(promesse, ms) {
}
@test Assez rapide
expect(await avecLimite($sleep(2).then(() => 'ok'), 100)).toBe('ok');
@test Trop long
await expect(avecLimite($sleep(200), 10)).toReject('Trop long');
@test L'erreur d'origine passe
const ko = Promise.reject(new Error('autre')); ko.catch(() => {}); await expect(avecLimite(ko, 100)).toReject('autre');
@types Garde le type
const p: Promise<number> = avecLimite(Promise.resolve(3), 10);
// @ts-expect-error
const q: Promise<string> = avecLimite(Promise.resolve(3), 10);
@hint
`Promise.race` entre la promesse et une autre qui rejette après `ms`. Une promesse qui ne fait que rejeter est une `Promise<never>`.
@solution
function avecLimite<T>(promesse: Promise<T>, ms: number): Promise<T> {
  const limite = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Trop long')), ms);
  });
  return Promise.race([promesse, limite]);
}

@@ predict ordre
Dans quel ordre ?
```js
console.log('a');
setTimeout(() => console.log('b'), 0);
Promise.resolve().then(() => console.log('c'));
console.log('d');
```
@answer `a d c b`
@wrong `a b c d`
@wrong `a d b c`
@wrong `a c d b`
@why Le synchrone d'abord, puis les microtâches (promesses), puis les tâches (minuteries).

@@ predict then-sans-return
Qu'affiche ce code ?
```js
Promise.resolve(1).then((n) => { n + 1; }).then((n) => console.log(n));
```
@answer `undefined`
@wrong `2`
@wrong `1`
@wrong Une TypeError
@why Avec des accolades, il manque un `return`.

@@ predict executeur
Dans quel ordre ?
```js
new Promise((r) => { console.log('a'); r(); }).then(() => console.log('b'));
console.log('c');
```
@answer `a c b`
@wrong `c a b`
@wrong `a b c`
@wrong `c b a`
@why La fonction donnée à `new Promise` s'exécute tout de suite ; le `.then`, plus tard.

@@ card etats
Les trois états d'une promesse ?
@back
En attente (*pending*), tenue (*fulfilled*), rejetée (*rejected*).

@@ card all-settled
`Promise.all` ou `Promise.allSettled` ?
@back
`all` échoue dès qu'une échoue ; `allSettled` attend tout et donne l'état de chacune.

@@ card microtache
Qui passe d'abord : `setTimeout(f, 0)` ou `Promise.resolve().then(f)` ?
@back
La promesse (microtâche), avant toute minuterie.

@@ defi ma-promesse | Écrire Promise | js
Écris la classe `MaPromesse`, **sans** utiliser `Promise`, `async` ni `await` :

- `new MaPromesse((resolve, reject) => …)` ; une erreur lancée rejette ; seul le premier appel compte
- `.then(ok, ko)` : renvoie une nouvelle `MaPromesse` ; les callbacks passent en **microtâche** (`queueMicrotask`)
- renvoyer (ou résoudre avec) une autre promesse l'attend, y compris une vraie `Promise`
- `.catch(ko)`, `.finally(f)`
- `MaPromesse.resolve(v)`, `MaPromesse.all(liste)`
@starter
class MaPromesse {
}
@test Tenue, rejetée
expect(await new MaPromesse((ok) => setTimeout(() => ok(3), 2))).toBe(3); await expect(new MaPromesse((ok, ko) => ko(new Error('non')))).toReject('non'); await expect(new MaPromesse(() => { throw new Error('oups'); })).toReject('oups');
@test Une seule fois
expect(await new MaPromesse((ok, ko) => { ok(1); ok(2); ko(3); })).toBe(1);
@test Enchaîne
expect(await MaPromesse.resolve(1).then((n) => n + 1).then((n) => MaPromesse.resolve(n * 10)).then((n) => Promise.resolve(n + 1))).toBe(21);
@test Les erreurs sautent jusqu'au catch
const l = []; await MaPromesse.resolve(1).then(() => { throw new Error('x'); }).then(() => l.push('non')).catch((e) => { l.push(e.message); return 'ok'; }).then((v) => l.push(v)); expect(l).toEqual(['x', 'ok']);
@test En microtâche
const l = []; const p = MaPromesse.resolve(1).then(() => l.push('b')); l.push('a'); await p; expect(l).toEqual(['a', 'b']);
@test Plusieurs `then`, même tardifs
const p = MaPromesse.resolve(5); const a = await p; const l = []; p.then((x) => l.push(x)); p.then((x) => l.push(x + 1)); await $sleep(5); expect([a, l]).toEqual([5, [5, 6]]);
@test Résoudre avec une promesse
expect(await new MaPromesse((ok) => ok($sleep(3).then(() => 'fin')))).toBe('fin');
@test `finally`
const l = []; expect(await MaPromesse.resolve(1).finally(() => { l.push('f'); return 99; })).toBe(1); await expect(new MaPromesse((ok, ko) => ko(new Error('e'))).finally(() => l.push('g'))).toReject('e'); expect(l).toEqual(['f', 'g']);
@test `all`
expect(await MaPromesse.all([1, MaPromesse.resolve(2), $sleep(2).then(() => 3)])).toEqual([1, 2, 3]); expect(await MaPromesse.all([])).toEqual([]); const ko = Promise.reject(new Error('n')); ko.catch(() => {}); await expect(MaPromesse.all([1, ko])).toReject('n');
@test Sans tricher
expect($source.replace(/MaPromesse/g, '')).not.toMatch(/Promise|async|await/);
@hint
Trois champs : état, valeur, liste de réactions. `resolve(v)` : si `v` a une méthode `then`, appelle-la avec tes `resolve` et `reject` ; sinon fixe la valeur.
@solution
class MaPromesse {
  #etat = 'attente';
  #valeur;
  #reactions = [];

  constructor(executeur) {
    let decide = false;
    const unique = (f) => (x) => {
      if (decide) return;
      decide = true;
      f(x);
    };
    const rejeter = unique((e) => this.#fixer('rejetee', e));
    const resoudre = unique((v) => this.#resoudre(v));
    try {
      executeur(resoudre, rejeter);
    } catch (e) {
      rejeter(e);
    }
  }

  #resoudre(v) {
    if (typeof v?.then !== 'function') return this.#fixer('tenue', v);
    queueMicrotask(() => {
      let decide = false;
      const unique = (f) => (x) => {
        if (decide) return;
        decide = true;
        f(x);
      };
      const rejeter = unique((e) => this.#fixer('rejetee', e));
      try {
        v.then(unique((x) => this.#resoudre(x)), rejeter);
      } catch (e) {
        rejeter(e);
      }
    });
  }

  #fixer(etat, valeur) {
    this.#etat = etat;
    this.#valeur = valeur;
    for (const reagir of this.#reactions) queueMicrotask(reagir);
    this.#reactions = [];
  }

  then(ok, ko) {
    return new MaPromesse((resoudre, rejeter) => {
      const reagir = () => {
        const f = this.#etat === 'tenue' ? ok : ko;
        try {
          if (typeof f === 'function') resoudre(f(this.#valeur));
          else if (this.#etat === 'tenue') resoudre(this.#valeur);
          else rejeter(this.#valeur);
        } catch (e) {
          rejeter(e);
        }
      };
      if (this.#etat === 'attente') this.#reactions.push(reagir);
      else queueMicrotask(reagir);
    });
  }

  catch(ko) {
    return this.then(undefined, ko);
  }

  finally(f) {
    return this.then(
      (v) => MaPromesse.resolve(f()).then(() => v),
      (e) => MaPromesse.resolve(f()).then(() => { throw e; }),
    );
  }

  static resolve(v) {
    return new MaPromesse((resoudre) => resoudre(v));
  }

  static all(liste) {
    return new MaPromesse((resoudre, rejeter) => {
      const resultats = [];
      let restantes = liste.length;
      if (restantes === 0) resoudre(resultats);
      liste.forEach((x, i) => {
        MaPromesse.resolve(x).then((v) => {
          resultats[i] = v;
          if (--restantes === 0) resoudre(resultats);
        }, rejeter);
      });
    });
  }
}
