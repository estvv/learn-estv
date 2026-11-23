# React : l'état
> useState, l'immuabilité, remonter l'état.

@@ lesson usestate | useState

Une variable normale ne fait rien réafficher, et est recréée à chaque appel. L'**état** survit aux rendus, et le changer **relance le rendu** :

```react-run
import { useState } from 'react';

export default function App() {
  const [n, setN] = useState(0);
  return <button onClick={() => setN(n + 1)}>{n} clics</button>;
}
```

Les hooks (`use…`) s'appellent **toujours en haut** du composant, jamais dans un `if` ou une boucle : React les reconnaît à leur ordre.

### L'état est une photo

Dans un rendu donné, `n` ne change pas. `setN` **programme** un nouveau rendu :

```react-run
import { useState } from 'react';

export default function App() {
  const [n, setN] = useState(0);
  const triple = () => {
    setN(n + 1); setN(n + 1); setN(n + 1); // trois fois la même valeur : +1
  };
  const vraiTriple = () => {
    setN((x) => x + 1); setN((x) => x + 1); setN((x) => x + 1); // +3
  };
  return <><p>{n}</p><button onClick={triple}>+1 ?</button> <button onClick={vraiTriple}>+3</button></>;
}
```

Règle : si la nouvelle valeur dépend de l'ancienne, passe une **fonction**.

### Ne jamais modifier l'état

React compare avec `Object.is`. Modifier un objet ou un tableau **sur place** ne se voit pas : crée une copie.

| | Au lieu de | Écris |
|---|---|---|
| Ajouter | `l.push(x)` | `[...l, x]` |
| Retirer | `l.splice(i, 1)` | `l.filter((x) => x.id !== id)` |
| Modifier | `l[i].ok = true` | `l.map((x) => x.id === id ? { ...x, ok: true } : x)` |
| Objet | `o.nom = 'a'` | `{ ...o, nom: 'a' }` |
| Trier | `l.sort()` | `l.toSorted()` |

### Calculer plutôt que dupliquer

Ce qui se **déduit** de l'état ne doit pas être dans l'état :

```tsx
const [articles, setArticles] = useState<Article[]>([]);
const total = articles.reduce((s, a) => s + a.prix, 0); // calculé à chaque rendu
```

### Remonter l'état

Deux composants partagent une donnée ? Elle vit dans leur **parent commun**, qui la passe en prop avec une fonction pour la changer. Les données descendent, les événements remontent.

```react-run
import { useState } from 'react';

function Champ({ valeur, onChange }: { valeur: string; onChange: (v: string) => void }) {
  return <input value={valeur} onChange={(e) => onChange(e.target.value)} />;
}

export default function App() {
  const [texte, setTexte] = useState('');
  return <><Champ valeur={texte} onChange={setTexte} /><p>{texte.length} caractères</p></>;
}
```

Un `input` avec `value` et `onChange` est **contrôlé** : l'état est la vérité.

### Remettre à zéro

L'état est lié à la **place** du composant dans l'arbre. Change sa `key` pour repartir de zéro : `<Formulaire key={user.id} />`.

@@ code compteur-react | Un compteur réglable | tsx
`Compteur` : props `depart` (0 par défaut) et `pas` (1 par défaut). Un `<output>` avec la valeur, des boutons `-`, `+` et `Remettre` (à `depart`). `-` est désactivé quand la valeur est à 0 ou moins.
@starter main.tsx
import { useState } from 'react';

export function Compteur() {
  return <output />;
}

export default function App() {
  return <Compteur />;
}
@test Valeurs par défaut
const el = await $mount(<Compteur />); const [m, p, r] = el.querySelectorAll('button'); expect($text('output')).toBe('0'); expect(m.disabled).toBe(true); await $click(p); await $click(p); expect($text('output')).toBe('2'); await $click(m); expect($text('output')).toBe('1');
@test Départ et pas
const el = await $mount(<Compteur depart={10} pas={5} />); const [m, p, r] = el.querySelectorAll('button'); await $click(p); expect($text('output')).toBe('15'); await $click(r); expect($text('output')).toBe('10');
@test Deux clics groupés comptent double
const el = await $mount(<Compteur />); const p = el.querySelectorAll('button')[1]; await $act(() => { p.click(); p.click(); }); expect($text('output')).toBe('2');
@test Deux compteurs sont indépendants
const el = await $mount(<><Compteur /><Compteur /></>); await $click(el.querySelectorAll('button')[1]); expect($texts('output', el)).toEqual(['1', '0']);
@solution main.tsx
import { useState } from 'react';

interface CompteurProps {
  depart?: number;
  pas?: number;
}

export function Compteur({ depart = 0, pas = 1 }: CompteurProps) {
  const [valeur, setValeur] = useState(depart);
  return (
    <div>
      <output>{valeur}</output>
      <button disabled={valeur <= 0} onClick={() => setValeur((v) => v - pas)}>-</button>
      <button onClick={() => setValeur((v) => v + pas)}>+</button>
      <button onClick={() => setValeur(depart)}>Remettre</button>
    </div>
  );
}

export default function App() {
  return <Compteur pas={2} />;
}

@@ code panier-react | Un panier | tsx
`Panier` reçoit `catalogue` : `{ id, nom, prix }[]`.

- pour chaque produit, un `<button className="produit">` avec son nom : cliquer l'ajoute (ou augmente sa quantité)
- `<ul>` du panier : `<li>` avec `Pomme x2`, et un bouton `.moins` qui retire un exemplaire (à 0, la ligne disparaît)
- `<p className="total">` : `Total : 6.00 €`

Le total n'est **pas** dans un état.
@starter main.tsx
import { useState } from 'react';

interface Produit {
  id: number;
  nom: string;
  prix: number;
}

export function Panier({ catalogue }: { catalogue: Produit[] }) {
  return <ul />;
}

export default function App() {
  return <Panier catalogue={[{ id: 1, nom: 'Pomme', prix: 3 }, { id: 2, nom: 'Kiwi', prix: 1.5 }]} />;
}
@test Ajoute et cumule
const c = [{ id: 1, nom: 'Pomme', prix: 3 }, { id: 2, nom: 'Kiwi', prix: 1.5 }]; const el = await $mount(<Panier catalogue={c} />); const [p, k] = el.querySelectorAll('.produit'); expect($text('.total')).toBe('Total : 0.00 €'); await $click(p); await $click(k); await $click(p); expect([...el.querySelectorAll('li')].map((l) => l.textContent.startsWith('Pomme x2') || l.textContent.startsWith('Kiwi x1'))).toEqual([true, true]); expect($text('.total')).toBe('Total : 7.50 €');
@test Retire
const el = await $mount(<Panier catalogue={[{ id: 1, nom: 'P', prix: 3 }]} />); const p = el.querySelector('.produit'); await $click(p); await $click(p); await $click('.moins'); expect($text('.total')).toBe('Total : 3.00 €'); await $click('.moins'); expect(el.querySelectorAll('li')).toHaveLength(0);
@test Clics groupés
const el = await $mount(<Panier catalogue={[{ id: 1, nom: 'P', prix: 3 }]} />); const p = el.querySelector('.produit'); await $act(() => { p.click(); p.click(); p.click(); }); expect($text('.total')).toBe('Total : 9.00 €');
@test Un seul état
expect($source.match(/useState[<(]/g)).toHaveLength(1);
@hint
L'état peut être très simple : `Record<number, number>`, l'id vers la quantité.
@solution main.tsx
import { useState } from 'react';

interface Produit {
  id: number;
  nom: string;
  prix: number;
}

export function Panier({ catalogue }: { catalogue: Produit[] }) {
  const [quantites, setQuantites] = useState<Record<number, number>>({});
  const changer = (id: number, n: number) => setQuantites((q) => ({ ...q, [id]: (q[id] ?? 0) + n }));
  const lignes = catalogue.map((p) => ({ ...p, quantite: quantites[p.id] ?? 0 })).filter((l) => l.quantite > 0);
  const total = lignes.reduce((s, l) => s + l.prix * l.quantite, 0);
  return (
    <div>
      {catalogue.map((p) => <button key={p.id} className="produit" onClick={() => changer(p.id, 1)}>{p.nom}</button>)}
      <ul>
        {lignes.map((l) => (
          <li key={l.id}>{`${l.nom} x${l.quantite} `}<button className="moins" onClick={() => changer(l.id, -1)}>-</button></li>
        ))}
      </ul>
      <p className="total">{`Total : ${total.toFixed(2)} €`}</p>
    </div>
  );
}

export default function App() {
  return <Panier catalogue={[{ id: 1, nom: 'Pomme', prix: 3 }, { id: 2, nom: 'Kiwi', prix: 1.5 }]} />;
}

@@ code temperature | Remonter l'état | tsx
Deux champs synchronisés : Celsius et Fahrenheit. `Champ` (props `nom`, `valeur`, `onChange`) est un `<label>` avec son texte et un `<input>` **contrôlé**. `App` affiche les deux ; taper dans l'un met l'autre à jour (arrondi à 1 décimale). Si le texte n'est pas un nombre (ou est vide), l'autre champ est vide.

F = C × 1,8 + 32
@starter main.tsx
import { useState } from 'react';

export default function App() {
  return <p>À toi</p>;
}
@test Celsius vers Fahrenheit
const el = await $mount(<App />); const [c, f] = el.querySelectorAll('input'); await $type(c, '100'); expect([c.value, f.value]).toEqual(['100', '212']); await $type(c, '36.6'); expect(f.value).toBe('97.9');
@test Fahrenheit vers Celsius
const el = await $mount(<App />); const [c, f] = el.querySelectorAll('input'); await $type(f, '0'); expect(c.value).toBe('-17.8');
@test Le texte tapé reste tel quel
const el = await $mount(<App />); const [c, f] = el.querySelectorAll('input'); await $type(c, '5.'); expect([c.value, f.value]).toEqual(['5.', '41']);
@test Texte invalide ou vide
const el = await $mount(<App />); const [c, f] = el.querySelectorAll('input'); await $type(c, '10'); await $type(c, 'abc'); expect([c.value, f.value]).toEqual(['abc', '']); await $type(c, ''); expect(f.value).toBe('');
@hint
Ne garde pas deux valeurs : garde le **texte** et **quel champ** l'a produit. L'autre se calcule.
@solution main.tsx
import { useState } from 'react';

interface ChampProps {
  nom: string;
  valeur: string;
  onChange: (valeur: string) => void;
}

function Champ({ nom, valeur, onChange }: ChampProps) {
  return <label>{nom} <input value={valeur} onChange={(e) => onChange(e.target.value)} /></label>;
}

function convertir(texte: string, f: (n: number) => number): string {
  const n = Number(texte);
  if (texte.trim() === '' || Number.isNaN(n)) return '';
  return String(Math.round(f(n) * 10) / 10);
}

export default function App() {
  const [saisie, setSaisie] = useState<{ unite: 'C' | 'F'; texte: string }>({ unite: 'C', texte: '' });
  const { unite, texte } = saisie;
  const celsius = unite === 'C' ? texte : convertir(texte, (f) => (f - 32) / 1.8);
  const fahrenheit = unite === 'F' ? texte : convertir(texte, (c) => c * 1.8 + 32);
  return (
    <>
      <Champ nom="Celsius" valeur={celsius} onChange={(t) => setSaisie({ unite: 'C', texte: t })} />
      <Champ nom="Fahrenheit" valeur={fahrenheit} onChange={(t) => setSaisie({ unite: 'F', texte: t })} />
    </>
  );
}

@@ defi annuler-refaire | Annuler et refaire | tsx
`Editeur` : un `<textarea>` contrôlé et deux boutons, `Annuler` et `Refaire`.

- chaque modification s'ajoute à l'historique
- `Annuler` revient en arrière, `Refaire` en avant ; désactivés quand c'est impossible
- écrire après avoir annulé **efface** ce qu'on pouvait refaire
- au plus `limite` annulations possibles (prop, 100 par défaut)
@starter main.tsx
import { useState } from 'react';

export default function App() {
  return <p>À toi</p>;
}
@test Annule et refait
const el = await $mount(<Editeur />); const t = el.querySelector('textarea'); const [a, r] = el.querySelectorAll('button'); await $type(t, 'a'); await $type(t, 'ab'); await $click(a); expect(t.value).toBe('a'); await $click(r); expect(t.value).toBe('ab'); await $click(a); await $click(a); expect(t.value).toBe('');
@test Boutons désactivés
const el = await $mount(<Editeur />); const t = el.querySelector('textarea'); const [a, r] = el.querySelectorAll('button'); expect([a.disabled, r.disabled]).toEqual([true, true]); await $type(t, 'a'); expect([a.disabled, r.disabled]).toEqual([false, true]); await $click(a); expect([a.disabled, r.disabled]).toEqual([true, false]);
@test Écrire efface le futur
const el = await $mount(<Editeur />); const t = el.querySelector('textarea'); const [a, r] = el.querySelectorAll('button'); await $type(t, 'a'); await $click(a); await $type(t, 'z'); expect(r.disabled).toBe(true); await $click(a); expect(t.value).toBe('');
@test La limite
const el = await $mount(<Editeur limite={2} />); const t = el.querySelector('textarea'); const [a] = el.querySelectorAll('button'); for (const x of ['1', '2', '3', '4']) await $type(t, x); await $click(a); await $click(a); expect([t.value, a.disabled]).toEqual(['2', true]);
@hint
Un seul état : `{ passe: string[]; present: string; futur: string[] }`.
@solution main.tsx
import { useState } from 'react';

interface Historique {
  passe: string[];
  present: string;
  futur: string[];
}

export function Editeur({ limite = 100 }: { limite?: number }) {
  const [{ passe, present, futur }, setHistorique] = useState<Historique>({ passe: [], present: '', futur: [] });

  const ecrire = (texte: string) => setHistorique((h) => ({
    passe: [...h.passe, h.present].slice(-limite),
    present: texte,
    futur: [],
  }));
  const annuler = () => setHistorique((h) => {
    const avant = h.passe.at(-1);
    return avant === undefined ? h : { passe: h.passe.slice(0, -1), present: avant, futur: [h.present, ...h.futur] };
  });
  const refaire = () => setHistorique((h) => {
    const [apres, ...suite] = h.futur;
    return apres === undefined ? h : { passe: [...h.passe, h.present], present: apres, futur: suite };
  });

  return (
    <div>
      <textarea value={present} onChange={(e) => ecrire(e.target.value)} />
      <button disabled={passe.length === 0} onClick={annuler}>Annuler</button>
      <button disabled={futur.length === 0} onClick={refaire}>Refaire</button>
    </div>
  );
}

export default function App() {
  return <Editeur />;
}

@@ predict set-trois
`n` vaut 0. Que vaut-il après le clic ?
```tsx
onClick={() => { setN(n + 1); setN(n + 1); }}
```
@answer `1`
@wrong `2`
@wrong `0`
@wrong Une erreur
@why Dans ce rendu, `n` vaut 0 : on demande deux fois 1. Avec `setN((x) => x + 1)`, ce serait 2.

@@ predict push-etat
Que se passe-t-il ?
```tsx
const [l, setL] = useState([1]);
// au clic :
l.push(2);
setL(l);
```
@answer Rien ne se réaffiche : c'est le même tableau
@wrong `[1, 2]` s'affiche
@wrong Une erreur
@wrong Deux rendus
@why React compare avec `Object.is` : même référence, donc pas de changement. `setL([...l, 2])`.

@@ card set-fonction
Quand passer une fonction à `setX` ?
@back
Quand la nouvelle valeur dépend de l'ancienne : `setN((n) => n + 1)`.

@@ card etat-derive
Faut-il mettre le total d'un panier dans un état ?
@back
Non : il se calcule à partir des articles, à chaque rendu.

@@ card remonter
Deux composants doivent partager une donnée ?
@back
La mettre dans l'état de leur parent commun, et la passer en props avec une fonction pour la changer.
