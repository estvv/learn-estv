# React : composants et JSX
> Décrire l'interface avec des fonctions.

@@ lesson react-jsx | Un composant

React part d'une idée : **l'interface est une fonction des données**. On décrit ce qu'on veut voir, React met le DOM à jour.

```react-run
function Salut({ nom }: { nom: string }) {
  return <h1>Bonjour {nom} !</h1>;
}

export default function App() {
  return (
    <div>
      <Salut nom="Ada" />
      <Salut nom="Linus" />
    </div>
  );
}
```

- Un **composant** est une fonction dont le nom commence par une majuscule et qui renvoie du JSX.
- Les **props** sont son unique paramètre, un objet qu'on ne modifie **jamais**.

### Le JSX

```react-run
export default function App() {
  const classes = ['carte', 'grande'].join(' ');
  const connecte = true;
  const messages = 3;
  return (
    <>
      <p className={classes} style={{ color: 'teal', fontSize: 18 }}>1 + 1 = {1 + 1}</p>
      {connecte ? <p>Connecté</p> : <p>Invité</p>}
      {messages > 0 && <p>{messages} messages</p>}
      <label htmlFor="c">Champ</label> <input id="c" disabled />
    </>
  );
}
```

- `{…}` accepte une **expression** (pas un `if` ni une boucle).
- Un seul élément racine : sinon, un fragment `<>…</>`.
- `className`, `htmlFor`, `style={{ … }}`, `onClick` (camelCase). Toutes les balises se ferment.
- `null`, `undefined`, `true` et `false` n'affichent rien. Mais `0` s'affiche : écris `n > 0 && …`.
- Les textes sont échappés : pas de faille XSS.

### Les listes

```react-run
const fruits = [{ id: 1, nom: 'pomme' }, { id: 2, nom: 'kiwi' }];

export default function App() {
  return <ul>{fruits.map((f) => <li key={f.id}>{f.nom}</li>)}</ul>;
}
```

La `key` identifie chaque élément d'un rendu à l'autre. Elle est **stable** et **unique** dans la liste : un id. Pas l'indice si la liste change d'ordre, jamais `Math.random()`.

### children

Ce qu'on met entre les balises arrive dans la prop `children` :

```react-run
import type { ReactNode } from 'react';

function Carte({ titre, children }: { titre: string; children: ReactNode }) {
  return <section style={{ border: '1px solid #ddd', padding: 12 }}><h2>{titre}</h2>{children}</section>;
}

export default function App() {
  return <Carte titre="Info"><p>Du contenu</p><button>OK</button></Carte>;
}
```

### En TypeScript

Type les props avec une interface (ou sur place). Le retour se déduit. Pour accepter tous les attributs d'un bouton : `ComponentProps<'button'>`.

@@ code profil-react | Une carte de profil | tsx
`Profil` reçoit `nom`, `metier` (facultatif) et `competences` (textes). Elle affiche :

- un `<article className="profil">`
- `<h2>` avec le nom
- `<p>` avec le métier, **seulement** s'il est donné
- une `<ul>` des compétences, ou `<p className="vide">Aucune compétence</p>` s'il n'y en a pas

Exporte par défaut `App`, qui affiche un `Profil` de ton choix.
@starter main.tsx
export function Profil() {
  return <article />;
}

export default function App() {
  return <Profil />;
}
@test Le nom et les compétences
const el = await $mount(<Profil nom="Ada" metier="Maths" competences={['a', 'b']} />); expect($text('article.profil h2')).toBe('Ada'); expect($text('article.profil > p')).toBe('Maths'); expect($texts('li', el)).toEqual(['a', 'b']);
@test Sans métier
const el = await $mount(<Profil nom="Ada" competences={['a']} />); expect(el.querySelectorAll('p')).toHaveLength(0);
@test Sans compétence
const el = await $mount(<Profil nom="Ada" competences={[]} />); expect($text('.vide')).toBe('Aucune compétence'); expect(el.querySelector('ul')).toBe(null);
@test `App` affiche un profil
const el = await $mount(<App />); expect(el.querySelectorAll('article.profil')).toHaveLength(1);
@types Props vérifiées
const a = <Profil nom="A" competences={[]} />;
// @ts-expect-error
const b = <Profil competences={[]} />;
// @ts-expect-error
const c = <Profil nom={3} competences={[]} />;
@solution main.tsx
interface ProfilProps {
  nom: string;
  metier?: string;
  competences: string[];
}

export function Profil({ nom, metier, competences }: ProfilProps) {
  return (
    <article className="profil">
      <h2>{nom}</h2>
      {metier && <p>{metier}</p>}
      {competences.length > 0
        ? <ul>{competences.map((c) => <li key={c}>{c}</li>)}</ul>
        : <p className="vide">Aucune compétence</p>}
    </article>
  );
}

export default function App() {
  return <Profil nom="Ada" metier="Mathématicienne" competences={['Analyse', 'Poésie']} />;
}

@@ code bouton-react | Un bouton réutilisable | tsx
`Bouton` accepte **tous** les attributs d'un `<button>`, plus `variante` (`'primaire'` par défaut, ou `'danger'`). Il rend un `<button>` :

- de `type` `button`, sauf si un autre est donné
- de classe `btn btn-<variante>`, suivie du `className` reçu s'il y en a un
- avec tous les autres attributs, et ses enfants
@starter main.tsx
import type { ComponentProps } from 'react';

export default function App() {
  return <p>À toi</p>;
}
@test Par défaut
const el = await $mount(<Bouton>OK</Bouton>); const b = el.querySelector('button'); expect([b.className, b.type, b.textContent]).toEqual(['btn btn-primaire', 'button', 'OK']);
@test Variante, classe et type
const el = await $mount(<Bouton variante="danger" className="x" type="submit">!</Bouton>); const b = el.querySelector('button'); expect([b.className, b.type]).toEqual(['btn btn-danger x', 'submit']);
@test Les autres attributs passent
let n = 0; const el = await $mount(<Bouton onClick={() => n++} title="t" disabled={false} data-x="1">a</Bouton>); const b = el.querySelector('button'); await $click(b); expect([n, b.title, b.dataset.x, b.hasAttribute('variante')]).toEqual([1, 't', '1', false]);
@types Props vérifiées
const a = <Bouton variante="danger" onClick={(e) => e.currentTarget.disabled} aria-label="x" />;
// @ts-expect-error
const b = <Bouton variante="rose" />;
// @ts-expect-error
const c = <Bouton href="/x" />;
@hint
`interface BoutonProps extends ComponentProps<'button'> { variante?: … }`, puis `({ variante = 'primaire', className, …, ...reste })` et `<button {...reste}>`.
@solution main.tsx
import type { ComponentProps } from 'react';

interface BoutonProps extends ComponentProps<'button'> {
  variante?: 'primaire' | 'danger';
}

export function Bouton({ variante = 'primaire', className, type = 'button', ...reste }: BoutonProps) {
  const classes = ['btn', `btn-${variante}`, className].filter(Boolean).join(' ');
  return <button {...reste} type={type} className={classes} />;
}

export default function App() {
  return <Bouton variante="danger">Supprimer</Bouton>;
}

@@ code composition | Composer | tsx
- `Fenetre` : props `titre`, `children` et `pied` (facultatif, du JSX). Structure : `<section>` avec `<header>` (le titre), `<div className="corps">` (les enfants) et, si `pied` est donné, un `<footer>`.
- `Alerte` : prop `message` ; une `Fenetre` de titre `Attention`, dont le pied est un `<button>Fermer</button>`.
@starter main.tsx
import type { ReactNode } from 'react';

export default function App() {
  return <p>À toi</p>;
}
@test `Fenetre`
const el = await $mount(<Fenetre titre="T"><p>a</p><p>b</p></Fenetre>); expect($text('section > header')).toBe('T'); expect($texts('.corps p', el)).toEqual(['a', 'b']); expect(el.querySelector('footer')).toBe(null);
@test Le pied
const el = await $mount(<Fenetre titre="T" pied={<em>fin</em>}>x</Fenetre>); expect($text('section > footer > em')).toBe('fin');
@test `Alerte`
const el = await $mount(<Alerte message="Feu" />); expect([$text('header'), $text('.corps'), $text('footer button')]).toEqual(['Attention', 'Feu', 'Fermer']);
@test `Alerte` utilise `Fenetre`
expect($source.match(/<section/g)).toHaveLength(1);
@solution main.tsx
import type { ReactNode } from 'react';

interface FenetreProps {
  titre: string;
  children: ReactNode;
  pied?: ReactNode;
}

export function Fenetre({ titre, children, pied }: FenetreProps) {
  return (
    <section>
      <header>{titre}</header>
      <div className="corps">{children}</div>
      {pied && <footer>{pied}</footer>}
    </section>
  );
}

export function Alerte({ message }: { message: string }) {
  return <Fenetre titre="Attention" pied={<button>Fermer</button>}>{message}</Fenetre>;
}

export default function App() {
  return <Alerte message="Le four est allumé" />;
}

@@ defi arbre-fichiers | Un composant récursif | tsx
`Arbre` affiche une arborescence. Un nœud est un **fichier** `{ type: 'fichier', nom, taille }` ou un **dossier** `{ type: 'dossier', nom, enfants }`.

- `<ul>` avec un `<li>` par nœud ; dossiers d'abord, puis par ordre alphabétique
- fichier : `nom (12 o)` ; dossier : `nom/ (total o)`, où le total additionne **tout** ce qu'il contient, suivi de son propre `<ul>` s'il n'est pas vide

Déclare le type `Noeud` (union discriminée).
@starter main.tsx

@test Fichiers triés
const el = await $mount(<Arbre noeuds={[{ type: 'fichier', nom: 'b', taille: 2 }, { type: 'fichier', nom: 'a', taille: 1 }]} />); expect($texts('li', el)).toEqual(['a (1 o)', 'b (2 o)']);
@test Dossiers d'abord, avec leur total
const n = [{ type: 'fichier', nom: 'a', taille: 1 }, { type: 'dossier', nom: 'z', enfants: [{ type: 'fichier', nom: 'f', taille: 5 }, { type: 'dossier', nom: 'y', enfants: [{ type: 'fichier', nom: 'g', taille: 10 }] }] }]; const el = await $mount(<Arbre noeuds={n} />); expect([...el.querySelectorAll('li')].map((l) => l.firstChild.textContent + (l.querySelector('ul') ? '…' : '')).length).toBe(5); expect(el.textContent.replace(/\s+/g, '')).toBe('z/(15o)y/(10o)g(10o)f(5o)a(1o)');
@test Dossier vide
const el = await $mount(<Arbre noeuds={[{ type: 'dossier', nom: 'v', enfants: [] }]} />); expect(el.querySelectorAll('ul')).toHaveLength(1); expect($text('li')).toBe('v/ (0 o)');
@test Ne modifie pas les données
const n = [{ type: 'fichier', nom: 'b', taille: 2 }, { type: 'fichier', nom: 'a', taille: 1 }]; await $mount(<Arbre noeuds={n} />); expect(n[0].nom).toBe('b');
@types `Noeud`
const d: Noeud = { type: 'dossier', nom: 'a', enfants: [{ type: 'fichier', nom: 'b', taille: 1 }] };
// @ts-expect-error
const f: Noeud = { type: 'fichier', nom: 'b' };
@solution main.tsx
type Noeud =
  | { type: 'fichier'; nom: string; taille: number }
  | { type: 'dossier'; nom: string; enfants: Noeud[] };

const total = (n: Noeud): number =>
  n.type === 'fichier' ? n.taille : n.enfants.reduce((s, e) => s + total(e), 0);

const ordre = (a: Noeud, b: Noeud): number =>
  a.type === b.type ? a.nom.localeCompare(b.nom) : a.type === 'dossier' ? -1 : 1;

export function Arbre({ noeuds }: { noeuds: Noeud[] }) {
  return (
    <ul>
      {noeuds.toSorted(ordre).map((n) => (
        <li key={n.nom}>
          {`${n.nom}${n.type === 'dossier' ? '/' : ''} (${total(n)} o)`}
          {n.type === 'dossier' && n.enfants.length > 0 && <Arbre noeuds={n.enfants} />}
        </li>
      ))}
    </ul>
  );
}

export default function App() {
  return <Arbre noeuds={[{ type: 'dossier', nom: 'src', enfants: [{ type: 'fichier', nom: 'main.ts', taille: 120 }] }]} />;
}

@@ predict zero-affiche
Qu'affiche ce JSX si `n` vaut 0 ?
```tsx
<p>{n && <b>{n}</b>}</p>
```
@answer `0`
@wrong Rien
@wrong `false`
@wrong Une erreur
@why `0 && …` vaut 0, et React affiche les nombres. Écris `n > 0 && …`.

@@ predict key-indice
Pourquoi éviter l'indice comme `key` ?
@answer Si l'ordre change, React confond les éléments (et leur état)
@wrong C'est plus lent
@wrong React refuse les nombres
@wrong Les clés doivent être uniques dans toute la page
@why La clé doit suivre l'élément, pas sa position.

@@ card composant
Qu'est-ce qu'un composant React ?
@back
Une fonction au nom en majuscule qui reçoit des props et renvoie du JSX.

@@ card children
Type de la prop `children` ?
@back
`ReactNode`

@@ card props-bouton
Type des props qui accepte tous les attributs d'un bouton ?
@back
`ComponentProps<'button'>`
