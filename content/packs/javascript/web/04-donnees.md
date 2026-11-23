# Données : stockage et réseau
> localStorage, fetch dans une page, états de chargement.

@@ lesson stockage | Garder des données

`localStorage` garde des **textes** dans le navigateur, même après fermeture. `sessionStorage` : le temps de l'onglet.

```web-run
<p>Regarde la console.</p>
---
localStorage.setItem('reglages', JSON.stringify({ theme: 'sombre' }));
const brut = localStorage.getItem('reglages'); // null si absent
console.log(JSON.parse(brut ?? '{}').theme);
localStorage.removeItem('reglages');
```

À savoir : environ 5 Mo, synchrone, propre à chaque site, modifiable par l'utilisateur (donc **à vérifier** à la lecture), et l'accès peut échouer (navigation privée). N'y mets jamais de secret. Pour de gros volumes : IndexedDB.

@@ lesson chargement | Charger et afficher

Une page qui charge des données a **toujours** au moins trois états : chargement, erreur, succès (et souvent « vide »). Modélise-les :

```ts
type Etat<T> =
  | { statut: 'chargement' }
  | { statut: 'erreur'; message: string }
  | { statut: 'ok'; donnees: T };
```

Une fonction `afficher(etat)` dessine **tout** à partir de l'état. C'est l'idée de base de React : l'interface est une fonction de l'état.

### Les courses

Si l'utilisateur change de recherche pendant un chargement, la première réponse peut arriver **après** la seconde. Annule l'ancienne requête :

```ts
let annuleur: AbortController | null = null;

async function charger(q: string) {
  annuleur?.abort();
  annuleur = new AbortController();
  const { signal } = annuleur;
  try {
    const r = await fetch(`/api?q=${encodeURIComponent(q)}`, { signal });
    afficher(await r.json());
  } catch (e) {
    if (!signal.aborted) afficherErreur(e); // une annulation n'est pas une erreur
  }
}
```

### Ne pas surcharger

`debounce` attend la fin de la frappe (recherche) ; `throttle` limite à une fois par intervalle (défilement).

@@ code preferences | Des préférences sûres | ts
`lirePreferences()` lit la clé `prefs` de `localStorage` et renvoie toujours des `Preferences` valables : valeurs par défaut (`clair`, `16`) pour ce qui manque ou n'est pas valable, même si le JSON est cassé. `taille` doit être un nombre entre 10 et 30. `ecrirePreferences(changements)` fusionne et sauvegarde, puis renvoie le résultat.
@starter main.ts
interface Preferences {
  theme: 'clair' | 'sombre';
  taille: number;
}

@starter index.html readonly
<p>Préférences</p>
@test Par défaut
localStorage.clear(); expect(lirePreferences()).toEqual({ theme: 'clair', taille: 16 });
@test Lit ce qui est valable
localStorage.setItem('prefs', '{"theme":"sombre","taille":20}'); expect(lirePreferences()).toEqual({ theme: 'sombre', taille: 20 });
@test Corrige le reste
for (const t of ['{oups', 'null', '3', '"a"', '{"theme":"rose","taille":"20"}', '{"taille":500}']) { localStorage.setItem('prefs', t); expect(lirePreferences(), t).toEqual({ theme: 'clair', taille: 16 }); }
@test Écrit en fusionnant
localStorage.clear(); ecrirePreferences({ taille: 12 }); expect(ecrirePreferences({ theme: 'sombre' })).toEqual({ theme: 'sombre', taille: 12 }); expect(JSON.parse(localStorage.getItem('prefs'))).toEqual({ theme: 'sombre', taille: 12 });
@types Signatures
const p: Preferences = lirePreferences(); const q: Preferences = ecrirePreferences({});
// @ts-expect-error
ecrirePreferences({ theme: 'rose' });
@solution main.ts
interface Preferences {
  theme: 'clair' | 'sombre';
  taille: number;
}

function lireObjet(): Record<string, unknown> {
  try {
    const x: unknown = JSON.parse(localStorage.getItem('prefs') ?? '{}');
    return typeof x === 'object' && x !== null ? { ...x } : {};
  } catch {
    return {};
  }
}

function lirePreferences(): Preferences {
  const { theme, taille } = lireObjet();
  return {
    theme: theme === 'sombre' ? 'sombre' : 'clair',
    taille: typeof taille === 'number' && taille >= 10 && taille <= 30 ? taille : 16,
  };
}

function ecrirePreferences(changements: Partial<Preferences>): Preferences {
  const preferences = { ...lirePreferences(), ...changements };
  localStorage.setItem('prefs', JSON.stringify(preferences));
  return preferences;
}

@@ code liste-users | Charger une liste | ts
`charger()` appelle `fetch('/users')` et met à jour `#zone` :

- pendant : `<p>Chargement…</p>`
- erreur (réseau ou réponse non `ok`) : `<p class="erreur">Impossible de charger</p>` et un bouton `Réessayer` qui relance
- vide : `<p>Aucun résultat</p>`
- sinon : une liste `<ul>` avec un `<li>` par nom
@starter main.ts
interface User {
  nom: string;
}

export async function charger(): Promise<void> {
}
@starter index.html readonly
<div id="zone"></div>
@setup
globalThis.$reponse = { ok: true, donnees: [] };
globalThis.fetch = async () => {
  const r = globalThis.$reponse;
  await new Promise((f) => setTimeout(f, 5));
  if (r.reseau) throw new TypeError('réseau');
  return { ok: r.ok, status: r.ok ? 200 : 500, json: async () => r.donnees };
};
@test Pendant le chargement
const p = charger(); expect($text('#zone')).toBe('Chargement…'); await p;
@test Une liste
$reponse = { ok: true, donnees: [{ nom: 'Ada' }, { nom: '<b>x</b>' }] }; await charger(); expect($texts('#zone li')).toEqual(['Ada', '<b>x</b>']); expect($texts('#zone p')).toEqual([]);
@test Liste vide
$reponse = { ok: true, donnees: [] }; await charger(); expect($text('#zone')).toBe('Aucun résultat');
@test Erreurs
$reponse = { ok: false }; await charger(); expect($text('#zone .erreur')).toBe('Impossible de charger'); $reponse = { reseau: true }; await charger(); expect($text('#zone .erreur')).toBe('Impossible de charger');
@test Réessayer
$reponse = { reseau: true }; await charger(); $reponse = { ok: true, donnees: [{ nom: 'Z' }] }; await $click('#zone button'); await $until(() => expect($texts('#zone li')).toEqual(['Z']));
@solution main.ts
interface User {
  nom: string;
}

const zone = document.querySelector('#zone')!;

function creer(balise: string, texte: string): HTMLElement {
  const element = document.createElement(balise);
  element.textContent = texte;
  return element;
}

export async function charger(): Promise<void> {
  zone.replaceChildren(creer('p', 'Chargement…'));
  try {
    const reponse = await fetch('/users');
    if (!reponse.ok) throw new Error(`Erreur ${reponse.status}`);
    const users: User[] = await reponse.json();
    if (users.length === 0) {
      zone.replaceChildren(creer('p', 'Aucun résultat'));
      return;
    }
    const liste = document.createElement('ul');
    liste.append(...users.map((u) => creer('li', u.nom)));
    zone.replaceChildren(liste);
  } catch {
    const message = creer('p', 'Impossible de charger');
    message.className = 'erreur';
    const bouton = creer('button', 'Réessayer');
    bouton.addEventListener('click', () => void charger());
    zone.replaceChildren(message, bouton);
  }
}

@@ defi cache-perime | Un cache qui se périme | ts
`lireAvecCache(cle, ms, charger)` (asynchrone) :

- garde le résultat dans `localStorage`, avec sa date
- s'il a moins de `ms` millisecondes, le renvoie **sans** charger
- s'il est périmé, charge ; mais si le chargement **échoue**, renvoie quand même l'ancien
- sans ancien résultat, l'échec est relancé
- deux appels simultanés pour la même clé ne chargent qu'une fois
@starter main.ts

@starter index.html readonly
<p>Cache</p>
@test Garde le résultat
localStorage.clear(); let n = 0; const f = async () => ++n; expect([await lireAvecCache('a', 1000, f), await lireAvecCache('a', 1000, f)]).toEqual([1, 1]);
@test Se périme
localStorage.clear(); let n = 0; const f = async () => ++n; await lireAvecCache('b', 5, f); await $sleep(15); expect(await lireAvecCache('b', 5, f)).toBe(2);
@test Garde l'ancien si le chargement échoue
localStorage.clear(); await lireAvecCache('c', 5, async () => 'ancien'); await $sleep(15); expect(await lireAvecCache('c', 5, async () => { throw new Error('x'); })).toBe('ancien');
@test Échec sans ancien
localStorage.clear(); let e; try { await lireAvecCache('d', 5, async () => { throw new Error('non'); }); } catch (x) { e = x; } expect(e?.message).toBe('non');
@test Un seul chargement à la fois
localStorage.clear(); let n = 0; const f = async () => { n++; await $sleep(10); return n; }; await Promise.all([lireAvecCache('e', 1000, f), lireAvecCache('e', 1000, f)]); expect(n).toBe(1);
@test Stockage abîmé
localStorage.setItem('cache:f', '{oups'); localStorage.setItem('f', '{oups'); expect(await lireAvecCache('f', 1000, async () => 3)).toBe(3);
@types Types
const p: Promise<string> = lireAvecCache('a', 1, async () => 'x');
// @ts-expect-error
const q: Promise<number> = lireAvecCache('a', 1, async () => 'x');
@solution main.ts
interface Entree<T> {
  date: number;
  valeur: T;
}

const enCours = new Map<string, Promise<unknown>>();

function lireEntree<T>(cle: string): Entree<T> | null {
  try {
    const entree: Entree<T> | null = JSON.parse(localStorage.getItem(cle) ?? 'null');
    return typeof entree?.date === 'number' ? entree : null;
  } catch {
    return null;
  }
}

async function rafraichir<T>(cle: string, ancien: Entree<T> | null, charger: () => Promise<T>): Promise<T> {
  try {
    const valeur = await charger();
    localStorage.setItem(cle, JSON.stringify({ date: Date.now(), valeur }));
    return valeur;
  } catch (e) {
    if (ancien) return ancien.valeur;
    throw e;
  }
}

async function lireAvecCache<T>(cle: string, ms: number, charger: () => Promise<T>): Promise<T> {
  const ancien = lireEntree<T>(cle);
  if (ancien && Date.now() - ancien.date < ms) return ancien.valeur;
  let promesse = enCours.get(cle) as Promise<T> | undefined;
  if (!promesse) {
    promesse = rafraichir(cle, ancien, charger).finally(() => enCours.delete(cle));
    enCours.set(cle, promesse);
  }
  return promesse;
}

@@ predict storage-objet
Que contient `localStorage.getItem('a')` ?
```js-bad
localStorage.setItem('a', { x: 1 });
```
@answer `[object Object]`
@wrong `{"x":1}`
@wrong `{ x: 1 }`
@wrong `null`
@why Seul du texte est gardé : l'objet est converti. Utilise `JSON.stringify`.

@@ predict storage-absent
Que renvoie `localStorage.getItem('absent')` ?
@answer `null`
@wrong `undefined`
@wrong `''`
@wrong Une erreur
@why `null`, et `JSON.parse(null)` donne `null` aussi.

@@ card etats-chargement
Les états d'une page qui charge des données ?
@back
Chargement, erreur, vide, succès.

@@ card course
Comment éviter qu'une vieille réponse écrase la nouvelle ?
@back
Annuler la requête précédente (`AbortController`), ou ignorer toute réponse qui n'est pas la dernière.
