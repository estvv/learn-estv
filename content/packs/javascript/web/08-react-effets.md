# React : effets et refs
> Se synchroniser avec l'extérieur : minuteries, réseau, DOM.

@@ lesson useeffect | useEffect

Un composant doit rester **pur** : même props, même état, même résultat. Pour agir sur l'**extérieur** (minuterie, réseau, abonnement, titre de la page), on utilise un **effet**, exécuté après l'affichage.

```react-run
import { useEffect, useState } from 'react';

function Horloge() {
  const [secondes, setSecondes] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSecondes((s) => s + 1), 1000);
    return () => clearInterval(id); // nettoyage
  }, []); // une seule fois
  return <p>{secondes} s</p>;
}

export default function App() {
  const [visible, setVisible] = useState(true);
  return <><button onClick={() => setVisible(!visible)}>Basculer</button>{visible && <Horloge />}</>;
}
```

| Dépendances | L'effet s'exécute |
|---|---|
| aucune (pas de tableau) | après chaque rendu |
| `[]` | au montage |
| `[a, b]` | au montage, puis quand `a` ou `b` change |

Le **nettoyage** s'exécute avant chaque nouvelle exécution, et au démontage.

> Liste **toutes** les valeurs du composant utilisées dans l'effet. Mentir sur les dépendances donne des valeurs périmées.

### Pas besoin d'effet pour…

- calculer une valeur à partir des props ou de l'état → calcule-la pendant le rendu ;
- réagir à un clic → fais-le dans le gestionnaire ;
- remettre l'état à zéro quand une prop change → utilise `key`.

### Charger des données

```tsx
useEffect(() => {
  const annuleur = new AbortController();
  setEtat({ statut: 'chargement' });
  lireUser(id, annuleur.signal).then(
    (donnees) => setEtat({ statut: 'ok', donnees }),
    (e) => { if (!annuleur.signal.aborted) setEtat({ statut: 'erreur', message: String(e) }); },
  );
  return () => annuleur.abort(); // id a changé, ou démontage
}, [id]);
```

Sans ce nettoyage, une vieille réponse peut remplacer la bonne.

### useRef

Une boîte `{ current }` qui survit aux rendus **sans** les déclencher. Deux usages : accéder à un élément du DOM, et garder une valeur « en coulisses ».

```react-run
import { useEffect, useRef } from 'react';

export default function App() {
  const champ = useRef<HTMLInputElement>(null);
  useEffect(() => champ.current?.focus(), []);
  return <><input ref={champ} /> <button onClick={() => champ.current?.select()}>Tout sélectionner</button></>;
}
```

Ne lis ni n'écris `ref.current` **pendant** le rendu.

### Hooks personnalisés

Une fonction `use…` qui utilise d'autres hooks, pour partager de la **logique** (pas l'état : chaque appel a le sien).

```react-run
import { useEffect, useState } from 'react';

function useLargeur(): number {
  const [largeur, setLargeur] = useState(window.innerWidth);
  useEffect(() => {
    const mesurer = () => setLargeur(window.innerWidth);
    window.addEventListener('resize', mesurer);
    return () => window.removeEventListener('resize', mesurer);
  }, []);
  return largeur;
}

export default function App() {
  return <p>{useLargeur()} px</p>;
}
```

@@ code minuteur | Un minuteur | tsx
`Minuteur` : props `ms` (durée d'un tic, 1000 par défaut). Affiche `<output>` (nombre de tics) et un bouton `Démarrer` / `Pause`. `Remettre` arrête et remet à 0. Aucune minuterie ne doit rester après la pause ou le démontage.
@starter main.tsx
import { useEffect, useState } from 'react';

export default function App() {
  return <p>À toi</p>;
}
@setup
globalThis.$actives = new Set();
const { setInterval: si, clearInterval: ci } = globalThis;
globalThis.$compter = (f, ms) => { const id = setInterval(f, ms); globalThis.$actives.add(id); return id; };
@test Démarre et compte
const el = await $mount(<Minuteur ms={20} />); const [d] = el.querySelectorAll('button'); expect([$text('output'), $text(d)]).toEqual(['0', 'Démarrer']); await $click(d); expect($text(d)).toBe('Pause'); await $until(() => expect(Number($text('output'))).toBeGreaterThan(1));
@test Pause
const el = await $mount(<Minuteur ms={10} />); const [d] = el.querySelectorAll('button'); await $click(d); await $until(() => expect($text('output')).not.toBe('0')); await $click(d); const v = $text('output'); await $act(() => $sleep(50)); expect($text('output')).toBe(v);
@test Remettre
const el = await $mount(<Minuteur ms={10} />); const [d, r] = el.querySelectorAll('button'); await $click(d); await $until(() => expect($text('output')).not.toBe('0')); await $click(r); await $act(() => $sleep(40)); expect([$text('output'), $text(d)]).toEqual(['0', 'Démarrer']);
@test Un nettoyage est écrit
expect($source).toMatch(/clear(Interval|Timeout)\(/);
@hint
L'effet dépend de `[marche, ms]` : s'il ne marche pas, il ne fait rien.
@solution main.tsx
import { useEffect, useState } from 'react';

export function Minuteur({ ms = 1000 }: { ms?: number }) {
  const [tics, setTics] = useState(0);
  const [marche, setMarche] = useState(false);

  useEffect(() => {
    if (!marche) return;
    const id = setInterval(() => setTics((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [marche, ms]);

  return (
    <div>
      <output>{tics}</output>
      <button onClick={() => setMarche(!marche)}>{marche ? 'Pause' : 'Démarrer'}</button>
      <button onClick={() => { setMarche(false); setTics(0); }}>Remettre</button>
    </div>
  );
}

export default function App() {
  return <Minuteur />;
}

@@ code charger-user | Charger sans course | tsx
`FicheUser` (prop `id`) appelle `lireUser(id)` (fournie, renvoie une promesse de `{ nom }`) et affiche dans un `<p>` : `Chargement…`, puis le nom, ou `Erreur`. Quand `id` change, on revient à `Chargement…`, et une réponse en retard pour l'ancien `id` est **ignorée**.
@starter main.tsx
import { useEffect, useState } from 'react';

declare function lireUser(id: number): Promise<{ nom: string }>;

export function FicheUser({ id }: { id: number }) {
  return <p />;
}

export default function App() {
  const [id, setId] = useState(1);
  return <><button onClick={() => setId(id + 1)}>Suivant</button><FicheUser id={id} /></>;
}
@setup
globalThis.lireUser = (id) => new Promise((ok, ko) => setTimeout(() => (id < 0 ? ko(new Error('x')) : ok({ nom: `user ${id}` })), id === 1 ? 60 : 10));
@test Charge
await $mount(<FicheUser id={2} />); expect($text('p')).toBe('Chargement…'); await $until(() => expect($text('p')).toBe('user 2'));
@test Erreur
await $mount(<FicheUser id={-1} />); await $until(() => expect($text('p')).toBe('Erreur'));
@test Change d'id
const el = await $mount(<FicheUser id={2} />); await $until(() => expect($text('p')).toBe('user 2')); await el.$update(<FicheUser id={3} />); expect($text('p')).toBe('Chargement…'); await $until(() => expect($text('p')).toBe('user 3'));
@test Ignore la réponse en retard
const el = await $mount(<FicheUser id={1} />); await el.$update(<FicheUser id={4} />); await $until(() => expect($text('p')).toBe('user 4')); await $act(() => $sleep(90)); expect($text('p')).toBe('user 4');
@hint
Dans l'effet : `let annule = false;`, testé avant chaque `setEtat`, et mis à `true` dans le nettoyage.
@solution main.tsx
import { useEffect, useState } from 'react';

declare function lireUser(id: number): Promise<{ nom: string }>;

export function FicheUser({ id }: { id: number }) {
  const [texte, setTexte] = useState('Chargement…');

  useEffect(() => {
    let annule = false;
    setTexte('Chargement…');
    lireUser(id).then(
      (user) => { if (!annule) setTexte(user.nom); },
      () => { if (!annule) setTexte('Erreur'); },
    );
    return () => {
      annule = true;
    };
  }, [id]);

  return <p>{texte}</p>;
}

export default function App() {
  const [id, setId] = useState(1);
  return <><button onClick={() => setId(id + 1)}>Suivant</button><FicheUser id={id} /></>;
}

@@ code use-stockage | Un hook : useStockage | tsx
`useStockage(cle, initial)` marche comme `useState`, mais garde la valeur en JSON dans `localStorage`. Il renvoie `[valeur, setValeur]` ; `setValeur` accepte aussi une fonction. Un contenu illisible donne `initial`. Le type suit `initial`.
@starter main.tsx
import { useEffect, useState } from 'react';

export default function App() {
  return <p>À toi</p>;
}
@test Valeur de départ, puis changement
localStorage.clear(); function T() { const [v, setV] = useStockage('a', 1); return <button onClick={() => setV(v + 1)}>{v}</button>; } await $mount(<T />); expect($text('button')).toBe('1'); await $click('button'); expect($text('button')).toBe('2'); expect(localStorage.getItem('a')).toBe('2');
@test Retrouve la valeur
localStorage.setItem('b', '{"x":5}'); function T() { const [v] = useStockage('b', { x: 0 }); return <p>{v.x}</p>; } await $mount(<T />); expect($text('p')).toBe('5');
@test Contenu illisible
localStorage.setItem('c', '{oups'); function T() { const [v] = useStockage('c', 'ok'); return <p>{v}</p>; } await $mount(<T />); expect($text('p')).toBe('ok');
@test Avec une fonction
localStorage.clear(); function T() { const [v, setV] = useStockage('d', 0); return <button onClick={() => { setV((x) => x + 1); setV((x) => x + 1); }}>{v}</button>; } await $mount(<T />); await $click('button'); expect([$text('button'), localStorage.getItem('d')]).toEqual(['2', '2']);
@types Types
const T = () => { const [v, setV] = useStockage('a', 1); const n: number = v; setV(2); setV((x) => x + 1);
// @ts-expect-error
setV('x'); return null; };
@hint
`useState<T>(() => …)` : une fonction d'initialisation n'est appelée qu'au premier rendu. Le retour se type avec `as const`.
@solution main.tsx
import { useEffect, useState } from 'react';

function lire<T>(cle: string, initial: T): T {
  try {
    const brut = localStorage.getItem(cle);
    return brut === null ? initial : JSON.parse(brut);
  } catch {
    return initial;
  }
}

export function useStockage<T>(cle: string, initial: T) {
  const [valeur, setValeur] = useState<T>(() => lire(cle, initial));
  useEffect(() => localStorage.setItem(cle, JSON.stringify(valeur)), [cle, valeur]);
  return [valeur, setValeur] as const;
}

export default function App() {
  const [texte, setTexte] = useStockage('brouillon', '');
  return <textarea value={texte} onChange={(e) => setTexte(e.target.value)} />;
}

@@ defi use-requete | Un hook de chargement | tsx
`useRequete(cle, charger)` renvoie `{ statut: 'chargement' } | { statut: 'erreur', message } | { statut: 'ok', donnees }`, plus `recharger()` dans tous les cas.

- recharge quand `cle` change, en ignorant les réponses en retard
- garde les résultats **par clé** dans un cache partagé : revenir à une clé connue affiche tout de suite ses données (en rechargeant derrière)
- `recharger()` relance pour la clé actuelle, sans repasser par « chargement » s'il y a des données
- une erreur alors qu'il y a des données ne les efface pas
@starter main.tsx
import { useEffect, useState } from 'react';

export default function App() {
  return <p>À toi</p>;
}
@setup
globalThis.Vue = null;
@test Charge, puis affiche
function T({ k }) { const r = useRequete(k, async () => { await $sleep(5); return k + '!'; }); return <p>{r.statut === 'ok' ? r.donnees : r.statut}</p>; } await $mount(<T k="a1" />); expect($text('p')).toBe('chargement'); await $until(() => expect($text('p')).toBe('a1!'));
@test Erreur
function T() { const r = useRequete('e1', async () => { throw new Error('panne'); }); return <p>{r.statut === 'erreur' ? r.message : r.statut}</p>; } await $mount(<T />); await $until(() => expect($text('p')).toBe('panne'));
@test Ignore les réponses en retard
function T({ k }) { const r = useRequete(k, async () => { await $sleep(k === 'lent' ? 60 : 5); return k; }); return <p>{r.statut === 'ok' ? r.donnees : r.statut}</p>; } const el = await $mount(<T k="lent" />); await el.$update(<T k="vite" />); await $until(() => expect($text('p')).toBe('vite')); await $act(() => $sleep(80)); expect($text('p')).toBe('vite');
@test Le cache : retour immédiat
let n = 0; function T({ k }) { const r = useRequete(k, async () => { await $sleep(15); return k + ++n; }); return <p>{r.statut === 'ok' ? r.donnees : r.statut}</p>; } const el = await $mount(<T k="c" />); await $until(() => expect($text('p')).toBe('c1')); await el.$update(<T k="d" />); await $until(() => expect($text('p')).toBe('d2')); await el.$update(<T k="c" />); expect($text('p')).toBe('c1'); await $until(() => expect($text('p')).toBe('c3'));
@test Recharger garde les données, même en cas d'erreur
let n = 0; function T() { const r = useRequete('r', async () => { await $sleep(5); if (++n === 2) throw new Error('x'); return 'v' + n; }); return <button onClick={r.recharger}>{r.statut === 'ok' ? r.donnees : r.statut}</button>; } await $mount(<T />); await $until(() => expect($text('button')).toBe('v1')); await $click('button'); expect($text('button')).toBe('v1'); await $act(() => $sleep(30)); expect($text('button')).toBe('v1'); await $click('button'); await $until(() => expect($text('button')).toBe('v3'));
@hint
Un `Map` au niveau du module pour le cache ; un état `{ cle, erreur }` et un compteur de versions pour relancer l'effet.
@hint
Le résultat se **calcule** pendant le rendu : données en cache pour la clé, sinon erreur de cette clé, sinon chargement.
@solution main.tsx
import { useEffect, useRef, useState } from 'react';

type Requete<T> = { recharger: () => void } & (
  | { statut: 'chargement' }
  | { statut: 'erreur'; message: string }
  | { statut: 'ok'; donnees: T }
);

const cache = new Map<string, unknown>();

export function useRequete<T>(cle: string, charger: () => Promise<T>): Requete<T> {
  const [erreur, setErreur] = useState<{ cle: string; message: string } | null>(null);
  const [version, setVersion] = useState(0);
  const [, redessiner] = useState(0);
  // La dernière fonction reçue, sans relancer l'effet à chaque rendu
  const dernier = useRef(charger);
  useEffect(() => {
    dernier.current = charger;
  });

  useEffect(() => {
    let annule = false;
    dernier.current().then(
      (donnees) => {
        if (annule) return;
        cache.set(cle, donnees);
        setErreur(null);
        redessiner((n) => n + 1);
      },
      (e: unknown) => {
        if (!annule) setErreur({ cle, message: e instanceof Error ? e.message : String(e) });
      },
    );
    return () => {
      annule = true;
    };
  }, [cle, version]);

  const recharger = () => setVersion((v) => v + 1);
  if (cache.has(cle)) return { statut: 'ok', donnees: cache.get(cle) as T, recharger };
  if (erreur?.cle === cle) return { statut: 'erreur', message: erreur.message, recharger };
  return { statut: 'chargement', recharger };
}

export default function App() {
  const r = useRequete('demo', async () => 'prêt');
  return <p>{r.statut === 'ok' ? r.donnees : r.statut}</p>;
}

@@ predict effet-deps
Quand cet effet s'exécute-t-il ?
```tsx
useEffect(() => { document.title = nom; }, [nom]);
```
@answer Au montage, puis quand `nom` change
@wrong À chaque rendu
@wrong Une seule fois
@wrong Seulement quand `nom` change
@why Avec des dépendances : au montage, puis à chaque changement.

@@ predict ref-rendu
Que se passe-t-il à l'écran après `compteur.current++` ?
@answer Rien : une ref ne relance pas le rendu
@wrong Le composant se réaffiche
@wrong Une erreur
@wrong Le composant est démonté
@why Pour que l'écran suive, il faut un état.

@@ card nettoyage
À quoi sert la fonction renvoyée par un effet ?
@back
Au nettoyage (arrêter minuterie, abonnement, requête) : avant la prochaine exécution et au démontage.

@@ card regles-hooks
Les règles des hooks ?
@back
Les appeler en haut d'un composant ou d'un autre hook, jamais dans une condition, une boucle ou une fonction imbriquée.

@@ card useref
`useRef` ou `useState` ?
@back
`useState` si l'écran dépend de la valeur ; `useRef` pour un élément du DOM ou une valeur en coulisses.
