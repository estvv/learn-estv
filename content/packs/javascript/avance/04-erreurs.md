# Erreurs
> Lancer, attraper, et faire échouer proprement.

@@ lesson erreurs | try, catch, throw

```js-run
function diviser(a, b) {
  if (b === 0) throw new Error('Division par zéro');
  return a / b;
}

try {
  console.log(diviser(6, 2));
  console.log(diviser(1, 0));
  console.log('jamais atteint');
} catch (erreur) {
  console.log(erreur.name, '|', erreur.message);
} finally {
  console.log('toujours exécuté');
}
```

`throw` interrompt tout et remonte d'appel en appel jusqu'au premier `catch`. Sans `catch`, le programme s'arrête. On peut lancer n'importe quelle valeur, mais lance **toujours** une `Error` : elle contient la pile d'appels (`stack`).

### Ses propres erreurs

```js-run
class ErreurDeSaisie extends Error {
  constructor(champ, message) {
    super(message);
    this.name = 'ErreurDeSaisie';
    this.champ = champ;
  }
}

try {
  throw new ErreurDeSaisie('age', 'doit être positif');
} catch (e) {
  if (e instanceof ErreurDeSaisie) console.log(e.champ, e.message);
  else throw e; // pas la nôtre : on relance
}
```

### Garder la cause

```js-run
try {
  try {
    JSON.parse('{oups');
  } catch (e) {
    throw new Error('Configuration illisible', { cause: e });
  }
} catch (e) {
  console.log(e.message, '←', e.cause.name);
}
```

### Bonnes habitudes

- N'attrape que ce que tu sais traiter. Un `catch {}` vide cache les bugs.
- Pour un cas **normal** (pas trouvé…), renvoie plutôt `null` ou `undefined`. Garde les exceptions pour l'anormal.
- `finally` s'exécute même après un `return`. N'y mets pas de `return`, il remplacerait l'autre.

### En TypeScript

Dans un `catch`, l'erreur est de type `unknown` : on peut lancer n'importe quoi, donc il faut vérifier. Et `never` est le type d'une fonction qui ne se termine jamais normalement.

```ts-run
function echouer(message: string): never {
  throw new Error(message);
}
try {
  echouer('aïe');
} catch (e) {
  const message = e instanceof Error ? e.message : String(e);
  console.log(message);
}
```

Une autre école : renvoyer le résultat **ou** l'erreur, bien typés.

```ts-run
type Resultat<T> = { ok: true; valeur: T } | { ok: false; erreur: string };
function lireNombre(texte: string): Resultat<number> {
  const n = Number(texte);
  return Number.isNaN(n) ? { ok: false, erreur: `${texte} n'est pas un nombre` } : { ok: true, valeur: n };
}
const r = lireNombre('12');
if (r.ok) console.log(r.valeur + 1);
```

@@ code json-sur | JSON sans plantage | js
`lireJson(texte, defaut = null)` renvoie l'objet lu, ou `defaut` si le texte n'est pas du JSON valable.
@starter
function lireJson(texte, defaut = null) {
  return JSON.parse(texte);
}
@test JSON valable
expect(lireJson('{"a":[1]}')).toEqual({ a: [1] });
@test JSON invalide
expect(lireJson('{oups')).toBe(null);
@test Valeur par défaut
expect(lireJson('', { vide: true })).toEqual({ vide: true });
@solution
function lireJson(texte, defaut = null) {
  try {
    return JSON.parse(texte);
  } catch {
    return defaut;
  }
}

@@ code valider | Valider et lancer | js
Crée `ErreurDeValidation` (hérite d'`Error`, `name` correct, propriété `champ`), puis `validerInscription({ email, age })` :

- `email` doit contenir `@`, sinon champ `'email'`
- `age` doit être un nombre entier ≥ 18, sinon champ `'age'`
- sinon, renvoie `true`
@starter

@test Inscription correcte
expect(validerInscription({ email: 'a@b.c', age: 20 })).toBe(true);
@test Mauvais email
expect(() => validerInscription({ email: 'abc', age: 20 })).toThrow(ErreurDeValidation);
try { validerInscription({ email: 'abc', age: 20 }); } catch (e) { expect(e.champ).toBe('email'); expect(e.name).toBe('ErreurDeValidation'); }
@test Mauvais âge
for (const age of [17, 20.5, '30', undefined]) { let champ; try { validerInscription({ email: 'a@b', age }); } catch (e) { champ = e.champ; } expect(champ, `âge ${age}`).toBe('age'); }
@test C'est aussi une `Error`
expect(() => validerInscription({ email: '', age: 1 })).toThrow(Error);
@hint
`Number.isInteger(age)` est faux pour un texte.
@solution
class ErreurDeValidation extends Error {
  constructor(champ, message) {
    super(message);
    this.name = 'ErreurDeValidation';
    this.champ = champ;
  }
}

function validerInscription({ email, age }) {
  if (!email?.includes('@')) throw new ErreurDeValidation('email', 'Email invalide');
  if (!Number.isInteger(age) || age < 18) throw new ErreurDeValidation('age', 'Il faut avoir 18 ans');
  return true;
}

@@ code essayer | Réessayer | js
`reessayer(f, fois)` appelle `f` jusqu'à ce qu'elle réussisse, au plus `fois` fois, et renvoie son résultat. Si tout échoue, relance la **dernière** erreur.
@starter
function reessayer(f, fois) {
}
@test Réussit du premier coup
let n = 0; expect(reessayer(() => { n++; return 'ok'; }, 3)).toBe('ok'); expect(n).toBe(1);
@test Réussit au troisième
let n = 0; expect(reessayer(() => { if (++n < 3) throw new Error('non'); return n; }, 5)).toBe(3);
@test Échoue avec la dernière erreur
let n = 0; expect(() => reessayer(() => { throw new Error(`essai ${++n}`); }, 3)).toThrow('essai 3'); expect(n).toBe(3);
@solution
function reessayer(f, fois) {
  let derniere;
  for (let i = 0; i < fois; i++) {
    try {
      return f();
    } catch (e) {
      derniere = e;
    }
  }
  throw derniere;
}

@@ code message | Le message d'une erreur, en TypeScript | ts
`messageDe(e)` reçoit **n'importe quoi** (ce qu'un `catch` a attrapé) et renvoie toujours un texte : le message d'une `Error`, le texte lui-même si c'en est un, la propriété `message` d'un objet si c'est un texte, sinon `'Erreur inconnue'`.
@starter
function messageDe(e: any): string {
  return e.message;
}
@test Une `Error`
expect(messageDe(new TypeError('aïe'))).toBe('aïe');
@test Un texte
expect(messageDe('zut')).toBe('zut');
@test Un objet avec un message
expect(messageDe({ message: 'ici' })).toBe('ici');
@test Le reste
expect([null, undefined, 3, {}, { message: 4 }].map(messageDe)).toEqual(Array(5).fill('Erreur inconnue'));
@test Sans `any`
expect($source).not.toMatch(/\bany\b/);
@types Le paramètre est `unknown`
type _ = $Expect<$Equal<typeof messageDe, (e: unknown) => string>>;
@hint
Pour un objet : `typeof e === 'object' && e !== null && 'message' in e && typeof e.message === 'string'`.
@solution
function messageDe(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  if (typeof e === 'object' && e !== null && 'message' in e && typeof e.message === 'string') return e.message;
  return 'Erreur inconnue';
}

@@ predict finally
Qu'affiche ce code ?
```js
function f() {
  try { return 'a'; } finally { console.log('b'); }
}
console.log(f());
```
@answer `b a`
@wrong `a`
@wrong `a b`
@wrong `b`
@why `finally` s'exécute avant que la fonction ne rende la main, même après un `return`.

@@ predict throw-arret
Qu'affiche ce code ?
```js
try {
  console.log(1);
  throw new Error('x');
  console.log(2);
} catch { console.log(3); }
console.log(4);
```
@answer `1 3 4`
@wrong `1 3`
@wrong `1 2 3 4`
@wrong `1 4`
@why Le reste du `try` est sauté, puis le programme reprend après le `catch`.

@@ card catch-unknown
De quel type est l'erreur d'un `catch` en TypeScript ?
@back
`unknown` (en mode strict) : vérifie avec `e instanceof Error`.

@@ card erreur-perso
Créer sa propre classe d'erreur ?
@back
`class MonErreur extends Error { constructor(m) { super(m); this.name = 'MonErreur'; } }`

@@ defi transaction | Tout ou rien | js
`transaction(etapes)` exécute une liste de `{ faire, defaire }` (synchrones) dans l'ordre. Si un `faire` échoue, elle appelle les `defaire` des étapes **déjà faites**, dans l'ordre inverse, puis lance une `Error` :

- de message `Étape 2 : <message>` (numérotées à partir de 1)
- dont `cause` est l'erreur d'origine
- avec une propriété `echecs` : les erreurs lancées par des `defaire` (qui n'empêchent pas les suivants)

Sinon, elle renvoie la liste des résultats.
@starter
function transaction(etapes) {
}
@test Réussite
expect(transaction([{ faire: () => 1, defaire() {} }, { faire: () => 2, defaire() {} }])).toEqual([1, 2]); expect(transaction([])).toEqual([]);
@test Défait dans l'ordre inverse
const l = []; const e = (n, ko) => ({ faire() { if (ko) throw new Error('aïe'); l.push(n); }, defaire() { l.push(-n); } }); expect(() => transaction([e(1), e(2), e(3, true), e(4)])).toThrow('Étape 3 : aïe'); expect(l).toEqual([1, 2, -2, -1]);
@test Cause et échecs
const origine = new Error('x'); const casse = new Error('y'); let defait = false; try { transaction([{ faire() {}, defaire() { defait = true; } }, { faire() {}, defaire() { throw casse; } }, { faire() { throw origine; }, defaire() {} }]); } catch (e) { expect(e.cause).toBe(origine); expect(e.echecs[0]).toBe(casse); } expect(defait).toBe(true);
@test Une erreur qui n'est pas une `Error`
expect(() => transaction([{ faire() { throw 'zut'; }, defaire() {} }])).toThrow('Étape 1 : zut');
@solution
function transaction(etapes) {
  const faites = [];
  const resultats = [];
  for (const [i, etape] of etapes.entries()) {
    try {
      resultats.push(etape.faire());
      faites.push(etape);
    } catch (cause) {
      const echecs = [];
      for (const faite of faites.toReversed()) {
        try {
          faite.defaire();
        } catch (e) {
          echecs.push(e);
        }
      }
      const message = cause instanceof Error ? cause.message : String(cause);
      throw Object.assign(new Error(`Étape ${i + 1} : ${message}`, { cause }), { echecs });
    }
  }
  return resultats;
}
