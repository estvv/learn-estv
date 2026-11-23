# React : reducer, contexte, performance
> Organiser une application qui grandit.

@@ lesson reducer-contexte | useReducer et contexte

### useReducer

Quand plusieurs valeurs changent ensemble, regroupe les transitions dans **une fonction pure** `(état, action) => nouvel état`. Elle se teste sans React.

```react-run
import { useReducer } from 'react';

type Action = { type: 'ajouter'; n: number } | { type: 'remettre' };

function reducteur(etat: number, action: Action): number {
  switch (action.type) {
    case 'ajouter': return etat + action.n;
    case 'remettre': return 0;
  }
}

export default function App() {
  const [n, dispatch] = useReducer(reducteur, 0);
  return (
    <>
      <p>{n}</p>
      <button onClick={() => dispatch({ type: 'ajouter', n: 5 })}>+5</button>{' '}
      <button onClick={() => dispatch({ type: 'remettre' })}>0</button>
    </>
  );
}
```

### Le contexte

Pour une donnée utile à **beaucoup** de composants (thème, utilisateur), sans la passer de prop en prop :

```react-run
import { createContext, useContext, useState, type ReactNode } from 'react';

const Theme = createContext<{ theme: string; basculer: () => void } | null>(null);

function FournisseurTheme({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState('clair');
  const basculer = () => setTheme((t) => (t === 'clair' ? 'sombre' : 'clair'));
  return <Theme value={{ theme, basculer }}>{children}</Theme>;
}

function useTheme() {
  const t = useContext(Theme);
  if (!t) throw new Error('useTheme hors de FournisseurTheme');
  return t;
}

function Bouton() {
  const { theme, basculer } = useTheme();
  return <button onClick={basculer}>{theme}</button>;
}

export default function App() {
  return <FournisseurTheme><Bouton /></FournisseurTheme>;
}
```

Tous les composants qui lisent un contexte se réaffichent quand sa valeur change. N'en fais pas un fourre-tout.

@@ lesson performance | Performance

Un composant se réaffiche quand **son état** change, ou quand **son parent** se réaffiche. Réafficher est en général rapide : mesure avant d'optimiser.

| Outil | Effet |
|---|---|
| `memo(Composant)` | saute le rendu si les props n'ont pas changé |
| `useMemo(() => calcul, deps)` | garde un résultat coûteux |
| `useCallback(f, deps)` | garde la même fonction (utile avec `memo`) |
| `useDeferredValue(x)` | une version en retard, pour garder la saisie fluide |
| `lazy(() => import('./Page'))` + `<Suspense>` | charge le code à la demande |

```react-run
import { memo, useCallback, useMemo, useState } from 'react';

const Ligne = memo(function Ligne({ n, onClick }: { n: number; onClick: (n: number) => void }) {
  console.log('rendu de', n);
  return <button onClick={() => onClick(n)}>{n}</button>;
});

export default function App() {
  const [total, setTotal] = useState(0);
  const nombres = useMemo(() => [1, 2, 3], []);
  const ajouter = useCallback((n: number) => setTotal((t) => t + n), []);
  return <><p>{total}</p>{nombres.map((n) => <Ligne key={n} n={n} onClick={ajouter} />)}</>;
}
```

Sans `useCallback`, la prop `onClick` serait nouvelle à chaque rendu, et `memo` ne servirait à rien. Le **React Compiler** fait ce travail automatiquement dans les projets qui l'activent.

Souvent mieux que mémoriser : **descendre l'état** au plus près de là où il sert, ou passer du JSX en `children`.

### Erreurs et portails

Une **Error Boundary** (composant classe, ou bibliothèque) affiche un secours si un enfant plante. `createPortal(jsx, document.body)` affiche ailleurs dans le DOM (fenêtres modales).

@@ code reducer-react | Un formulaire à étapes | tsx
Écris le réducteur **pur** d'une commande en 3 étapes, puis le composant `Commande`.

État : `{ etape: 1 | 2 | 3; nom: string; erreur: string | null }`. Actions :

- `{ type: 'nom', valeur }` : change le nom et efface l'erreur
- `{ type: 'suivant' }` : étape suivante (au plus 3). À l'étape 1, un nom vide met l'erreur `Nom obligatoire` et n'avance pas
- `{ type: 'precedent' }` : étape précédente (au moins 1), efface l'erreur

`Commande` affiche `<h2>Étape 1</h2>`, un `<input>` à l'étape 1, `<p className="erreur">` s'il y a une erreur, et les boutons `Précédent` et `Suivant`. À l'étape 3 : `<p className="fin">Merci Ada</p>`.
@starter main.tsx
import { useReducer } from 'react';

export default function App() {
  return <p>À toi</p>;
}
@test Le réducteur
const e = { etape: 1, nom: '', erreur: null }; expect(reducteur(e, { type: 'suivant' })).toEqual({ etape: 1, nom: '', erreur: 'Nom obligatoire' }); expect(reducteur({ ...e, erreur: 'x' }, { type: 'nom', valeur: 'A' })).toEqual({ etape: 1, nom: 'A', erreur: null }); expect(reducteur({ ...e, nom: 'A' }, { type: 'suivant' }).etape).toBe(2); expect(reducteur({ etape: 3, nom: 'A', erreur: null }, { type: 'suivant' }).etape).toBe(3); expect(reducteur(e, { type: 'precedent' }).etape).toBe(1);
@test Le réducteur est pur
const e = Object.freeze({ etape: 1, nom: 'A', erreur: null }); reducteur(e, { type: 'suivant' }); reducteur(e, { type: 'nom', valeur: 'B' });
@test Le parcours complet
const el = await $mount(<Commande />); const [p, s] = el.querySelectorAll('button'); await $click(s); expect([$text('h2'), $text('.erreur')]).toEqual(['Étape 1', 'Nom obligatoire']); await $type('input', 'Ada'); expect(el.querySelector('.erreur')).toBe(null); await $click(s); expect($text('h2')).toBe('Étape 2'); await $click(s); expect($text('.fin')).toBe('Merci Ada');
@test Revenir garde le nom
const el = await $mount(<Commande />); const [p, s] = el.querySelectorAll('button'); await $type('input', 'Ada'); await $click(s); await $click(p); expect(el.querySelector('input').value).toBe('Ada');
@types Actions vérifiées
const e = reducteur({ etape: 1, nom: '', erreur: null }, { type: 'precedent' });
// @ts-expect-error
reducteur(e, { type: 'nom' });
// @ts-expect-error
reducteur(e, { type: 'zut' });
@solution main.tsx
import { useReducer } from 'react';

interface Etat {
  etape: 1 | 2 | 3;
  nom: string;
  erreur: string | null;
}

type Action =
  | { type: 'nom'; valeur: string }
  | { type: 'suivant' }
  | { type: 'precedent' };

export function reducteur(etat: Etat, action: Action): Etat {
  switch (action.type) {
    case 'nom':
      return { ...etat, nom: action.valeur, erreur: null };
    case 'suivant':
      if (etat.etape === 1 && !etat.nom.trim()) return { ...etat, erreur: 'Nom obligatoire' };
      return { ...etat, etape: etat.etape === 1 ? 2 : 3, erreur: null };
    case 'precedent':
      return { ...etat, etape: etat.etape === 3 ? 2 : 1, erreur: null };
  }
}

export function Commande() {
  const [{ etape, nom, erreur }, dispatch] = useReducer(reducteur, { etape: 1, nom: '', erreur: null });
  return (
    <div>
      <h2>{`Étape ${etape}`}</h2>
      {etape === 1 && <input value={nom} onChange={(e) => dispatch({ type: 'nom', valeur: e.target.value })} />}
      {erreur && <p className="erreur">{erreur}</p>}
      {etape === 3 && <p className="fin">{`Merci ${nom}`}</p>}
      <button onClick={() => dispatch({ type: 'precedent' })}>Précédent</button>
      <button onClick={() => dispatch({ type: 'suivant' })}>Suivant</button>
    </div>
  );
}

export default function App() {
  return <Commande />;
}

@@ code contexte-langue | Un contexte de langue | tsx
- `FournisseurLangue` : garde la langue (`'fr'` par défaut, ou la prop `initiale`)
- `useLangue()` : renvoie `{ langue, changer, t }` ; `t(cle)` traduit. Hors du fournisseur, lance une erreur contenant `FournisseurLangue`
- `Choix` : un `<select>` avec `fr` et `en`, branché dessus
- `Titre` : `<h1>` avec la traduction de `bienvenue`

Les textes sont dans `TEXTES` ; `t` n'accepte que les clés qui existent.
@starter main.tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

const TEXTES = {
  fr: { bienvenue: 'Bienvenue', sortir: 'Quitter' },
  en: { bienvenue: 'Welcome', sortir: 'Leave' },
};

export default function App() {
  return <p>À toi</p>;
}
@test Traduit
await $mount(<FournisseurLangue><Titre /></FournisseurLangue>); expect($text('h1')).toBe('Bienvenue'); await $mount(<FournisseurLangue initiale="en"><Titre /></FournisseurLangue>); expect($text('h1')).toBe('Welcome');
@test Change partout
const el = await $mount(<FournisseurLangue><Choix /><Titre /><Titre /></FournisseurLangue>); await $type('select', 'en'); expect($texts('h1', el)).toEqual(['Welcome', 'Welcome']); expect(el.querySelector('select').value).toBe('en');
@test Hors du fournisseur
expect(await $error(<Titre />)).toContain('FournisseurLangue');
@types Clés vérifiées
const T = () => { const { t, langue, changer } = useLangue(); const s: string = t('sortir'); changer('en');
// @ts-expect-error
t('zut');
// @ts-expect-error
changer('es'); return null; };
@hint
`type Langue = keyof typeof TEXTES; type Cle = keyof (typeof TEXTES)['fr'];`
@solution main.tsx
import { createContext, useContext, useState, type ReactNode } from 'react';

const TEXTES = {
  fr: { bienvenue: 'Bienvenue', sortir: 'Quitter' },
  en: { bienvenue: 'Welcome', sortir: 'Leave' },
};

type Langue = keyof typeof TEXTES;
type Cle = keyof (typeof TEXTES)['fr'];

interface Valeur {
  langue: Langue;
  changer: (langue: Langue) => void;
  t: (cle: Cle) => string;
}

const ContexteLangue = createContext<Valeur | null>(null);

export function FournisseurLangue({ initiale = 'fr', children }: { initiale?: Langue; children: ReactNode }) {
  const [langue, changer] = useState<Langue>(initiale);
  return <ContexteLangue value={{ langue, changer, t: (cle) => TEXTES[langue][cle] }}>{children}</ContexteLangue>;
}

export function useLangue(): Valeur {
  const valeur = useContext(ContexteLangue);
  if (!valeur) throw new Error('useLangue doit être dans un FournisseurLangue');
  return valeur;
}

export function Choix() {
  const { langue, changer } = useLangue();
  return (
    <select value={langue} onChange={(e) => changer(e.target.value === 'en' ? 'en' : 'fr')}>
      <option value="fr">Français</option>
      <option value="en">English</option>
    </select>
  );
}

export function Titre() {
  return <h1>{useLangue().t('bienvenue')}</h1>;
}

export default function App() {
  return <FournisseurLangue><Choix /><Titre /></FournisseurLangue>;
}

@@ code memo-liste | Éviter des rendus | tsx
`Liste` affiche 3 `Ligne`, qui comptent leurs rendus dans `rendus` (fourni). Aujourd'hui, taper dans le champ ou cocher **une** ligne les réaffiche **toutes**. Corrige pour que :

- taper ne réaffiche aucune ligne
- cocher une ligne ne réaffiche qu'elle

Ne change ni ce qui s'affiche, ni l'incrément de `rendus`.
@starter main.tsx
import { memo, useCallback, useState } from 'react';

export const rendus: Record<number, number> = {};

interface LigneProps {
  id: number;
  cochee: boolean;
  onCocher: (id: number) => void;
}

function Ligne({ id, cochee, onCocher }: LigneProps) {
  rendus[id] = (rendus[id] ?? 0) + 1;
  return <li><input type="checkbox" checked={cochee} onChange={() => onCocher(id)} /> {id}</li>;
}

export function Liste() {
  const [texte, setTexte] = useState('');
  const [cochees, setCochees] = useState<number[]>([]);
  const cocher = (id: number) => {
    setCochees(cochees.includes(id) ? cochees.filter((c) => c !== id) : [...cochees, id]);
  };
  return (
    <>
      <input className="champ" value={texte} onChange={(e) => setTexte(e.target.value)} />
      <ul>{[1, 2, 3].map((id) => <Ligne key={id} id={id} cochee={cochees.includes(id)} onCocher={cocher} />)}</ul>
    </>
  );
}

export default function App() {
  return <Liste />;
}
@test Marche toujours
const el = await $mount(<Liste />); const c = el.querySelectorAll('[type=checkbox]'); await $click(c[1]); await $click(c[0]); expect([...c].map((x) => x.checked)).toEqual([true, true, false]); await $click(c[1]); expect([...c].map((x) => x.checked)).toEqual([true, false, false]);
@test Taper ne réaffiche aucune ligne
await $mount(<Liste />); const avant = { ...rendus }; await $type('.champ', 'abc'); expect(rendus).toEqual(avant);
@test Cocher n'en réaffiche qu'une
const el = await $mount(<Liste />); const avant = { ...rendus }; await $click(el.querySelectorAll('[type=checkbox]')[2]); expect([1, 2, 3].map((i) => rendus[i] - avant[i])).toEqual([0, 0, 1]);
@hint
`memo` sur `Ligne`, et un `cocher` **stable** : `useCallback` sans dépendance, avec `setCochees((c) => …)`.
@solution main.tsx
import { memo, useCallback, useState } from 'react';

export const rendus: Record<number, number> = {};

interface LigneProps {
  id: number;
  cochee: boolean;
  onCocher: (id: number) => void;
}

const Ligne = memo(function Ligne({ id, cochee, onCocher }: LigneProps) {
  rendus[id] = (rendus[id] ?? 0) + 1;
  return <li><input type="checkbox" checked={cochee} onChange={() => onCocher(id)} /> {id}</li>;
});

export function Liste() {
  const [texte, setTexte] = useState('');
  const [cochees, setCochees] = useState<number[]>([]);
  const cocher = useCallback((id: number) => {
    setCochees((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }, []);
  return (
    <>
      <input className="champ" value={texte} onChange={(e) => setTexte(e.target.value)} />
      <ul>{[1, 2, 3].map((id) => <Ligne key={id} id={id} cochee={cochees.includes(id)} onCocher={cocher} />)}</ul>
    </>
  );
}

export default function App() {
  return <Liste />;
}

@@ defi mini-store | Un store avec sélecteurs | tsx
`creerStore(initial)` renvoie `{ lire, ecrire, useStore }`, comme Zustand :

- `ecrire(changements | fonction)` fusionne
- `useStore(selecteur)` donne une partie de l'état, et ne réaffiche le composant **que si cette partie change**
- utilise `useSyncExternalStore`
@starter main.tsx
import { useSyncExternalStore } from 'react';

export default function App() {
  return <p>À toi</p>;
}
@test Lit et écrit
const s = creerStore({ a: 1, b: 2 }); s.ecrire({ a: 5 }); s.ecrire((e) => ({ b: e.b * 10 })); expect(s.lire()).toEqual({ a: 5, b: 20 });
@test Affiche et met à jour
const s = creerStore({ n: 1 }); function T() { return <p>{s.useStore((e) => e.n)}</p>; } await $mount(<T />); await $act(() => s.ecrire({ n: 7 })); expect($text('p')).toBe('7');
@test Ne réaffiche que si la partie change
const s = creerStore({ a: 1, b: 1 }); let r = 0; function T() { r++; return <p>{s.useStore((e) => e.a)}</p>; } await $mount(<T />); const avant = r; await $act(() => s.ecrire({ b: 9 })); expect(r).toBe(avant); await $act(() => s.ecrire({ a: 2 })); expect(r).toBeGreaterThan(avant);
@test Deux composants partagent l'état
const s = creerStore({ n: 0 }); function A() { return <button onClick={() => s.ecrire((e) => ({ n: e.n + 1 }))}>+</button>; } function B() { return <p>{s.useStore((e) => e.n)}</p>; } await $mount(<><A /><B /></>); await $click('button'); await $click('button'); expect($text('p')).toBe('2');
@types Types
const s = creerStore({ n: 1, nom: 'a' }); const T = () => { const n: number = s.useStore((e) => e.n); return null; }; s.ecrire({ n: 2 });
// @ts-expect-error
s.ecrire({ n: 'x' });
@hint
`useSyncExternalStore(sAbonner, () => selecteur(etat))` : il compare les résultats avec `Object.is`.
@solution main.tsx
import { useSyncExternalStore } from 'react';

export function creerStore<E extends object>(initial: E) {
  let etat = initial;
  const abonnes = new Set<() => void>();

  const abonner = (f: () => void) => {
    abonnes.add(f);
    return () => {
      abonnes.delete(f);
    };
  };

  return {
    lire: (): E => etat,
    ecrire(changements: Partial<E> | ((etat: E) => Partial<E>)): void {
      etat = { ...etat, ...(typeof changements === 'function' ? changements(etat) : changements) };
      for (const f of [...abonnes]) f();
    },
    useStore: <T,>(selecteur: (etat: E) => T): T => useSyncExternalStore(abonner, () => selecteur(etat)),
  };
}

export default function App() {
  return <p>Un store</p>;
}

@@ predict memo-fonction
`Enfant` est enveloppé dans `memo`. Est-il réaffiché quand le parent se réaffiche ?
```tsx
<Enfant onClick={() => faire()} />
```
@answer Oui : la fonction est nouvelle à chaque rendu
@wrong Non : `memo` l'empêche
@wrong Seulement au premier rendu
@wrong Seulement si `faire` change
@why `memo` compare avec `Object.is`. Il faut une fonction stable : `useCallback`.

@@ predict contexte-rerender
Qui se réaffiche quand la valeur d'un contexte change ?
@answer Tous les composants qui le lisent
@wrong Seulement le fournisseur
@wrong Toute l'application, toujours
@wrong Personne
@why D'où l'intérêt de plusieurs petits contextes, ou d'un store avec sélecteurs.

@@ card reducteur
Qu'est-ce qu'un réducteur ?
@back
Une fonction **pure** `(etat, action) => nouvelEtat`.

@@ card usememo
`useMemo` et `useCallback` ?
@back
`useMemo` garde un **résultat** ; `useCallback` garde une **fonction**. Tous deux tant que les dépendances ne changent pas.
