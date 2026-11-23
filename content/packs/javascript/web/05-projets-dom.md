# Mini-projets : le DOM
> Une liste de tâches, des onglets accessibles, un tableau triable.

@@ code taches | Liste de tâches | ts
Une liste de tâches complète, sans bibliothèque. Les données sont la seule vérité : chaque action change le tableau `taches`, puis appelle une fonction qui redessine.
@starter main.ts
interface Tache {
  id: number;
  texte: string;
  faite: boolean;
}

@starter index.html readonly
<form id="ajout"><input name="texte" aria-label="Nouvelle tâche"><button>Ajouter</button></form>
<ul id="liste"></ul>
<p id="reste"></p>
<div id="filtres">
  <button data-filtre="toutes">Toutes</button>
  <button data-filtre="actives">Actives</button>
  <button data-filtre="faites">Faites</button>
</div>
<button id="nettoyer">Supprimer les faites</button>
@starter style.css
.faite span {
  text-decoration: line-through;
  color: #999;
}
button[aria-pressed="true"] {
  font-weight: bold;
}
@part Ajouter
Envoyer le formulaire ajoute un `<li>` contenant une case à cocher, un `<span>` avec le texte, et un bouton `.suppr`. Le champ est vidé. Un texte vide (ou d'espaces) n'ajoute rien.
@test Ajoute
await $type('[name=texte]', 'Lait'); await $submit('#ajout'); await $type('[name=texte]', '  Pain '); await $submit('#ajout'); expect($texts('#liste span')).toEqual(['Lait', 'Pain']); expect(document.querySelector('[name=texte]').value).toBe('');
@test Ignore le vide
const n = document.querySelectorAll('#liste li').length; await $type('[name=texte]', '  '); await $submit('#ajout'); expect(document.querySelectorAll('#liste li')).toHaveLength(n);
@test Case et bouton
expect([document.querySelector('#liste li input').type, document.querySelectorAll('#liste li .suppr').length]).toEqual(['checkbox', document.querySelectorAll('#liste li').length]);
@part Cocher et supprimer
Cocher donne la classe `faite` au `li`. `.suppr` le supprime. `#reste` affiche `2 restantes`, ou `1 restante`, ou `0 restante`.
@test Cocher
await $click('#liste li:first-child input'); expect(document.querySelector('#liste li:first-child').classList.contains('faite')).toBe(true); expect($text('#reste')).toBe('1 restante');
@test Décocher
await $click('#liste li:first-child input'); expect(document.querySelector('#liste li:first-child').classList.contains('faite')).toBe(false); expect($text('#reste')).toBe('2 restantes');
@test Supprimer
await $type('[name=texte]', 'Sel'); await $submit('#ajout'); await $click('#liste li:last-child .suppr'); expect($texts('#liste span')).toEqual(['Lait', 'Pain']);
@part Filtrer
Les boutons de `#filtres` n'affichent que certaines tâches ; celui choisi a `aria-pressed="true"`, les autres `"false"` (au départ : `toutes`).
@test Au départ
await $click('[data-filtre=toutes]'); expect([...document.querySelectorAll('#filtres button')].map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
@test Actives et faites
await $click('#liste li:first-child input'); await $click('[data-filtre=faites]'); expect($texts('#liste span')).toEqual(['Lait']); await $click('[data-filtre=actives]'); expect($texts('#liste span')).toEqual(['Pain']); expect($text('#reste')).toBe('1 restante'); await $click('[data-filtre=toutes]'); expect($texts('#liste span')).toEqual(['Lait', 'Pain']);
@part Nettoyer et sauvegarder
`#nettoyer` supprime les tâches faites. Après chaque changement, les tâches sont sauvegardées en JSON dans `localStorage`, clé `taches`. Exporte aussi `demarrer()`, qui recharge les tâches sauvegardées et redessine (appelle-la au chargement).
@test Nettoyer
await $click('#nettoyer'); expect($texts('#liste span')).toEqual(['Pain']);
@test Sauvegarde
expect(JSON.parse(localStorage.getItem('taches')).map((t) => [t.texte, t.faite])).toEqual([['Pain', false]]);
@test Recharge
localStorage.setItem('taches', JSON.stringify([{ id: 5, texte: 'Riz', faite: true }])); demarrer(); expect($texts('#liste .faite span')).toEqual(['Riz']); expect(document.querySelector('#liste input').checked).toBe(true);
@test Nouvel id après rechargement
await $type('[name=texte]', 'Thé'); await $submit('#ajout'); const ids = JSON.parse(localStorage.getItem('taches')).map((t) => t.id); expect(new Set(ids).size).toBe(2);
@hint
Une seule fonction `dessiner()`, et une seule `changer(nouvelles)` qui remplace le tableau, sauvegarde et dessine.
@hint
Délégation sur `#liste` : l'id de la tâche est dans `li.dataset.id`.
@solution main.ts
interface Tache {
  id: number;
  texte: string;
  faite: boolean;
}

type Filtre = 'toutes' | 'actives' | 'faites';

const formulaire = document.querySelector<HTMLFormElement>('#ajout')!;
const liste = document.querySelector('#liste')!;
const reste = document.querySelector('#reste')!;
const filtres = document.querySelectorAll<HTMLButtonElement>('#filtres button');

let taches: Tache[] = [];
let filtre: Filtre = 'toutes';

const visible = (t: Tache): boolean => filtre === 'toutes' || t.faite === (filtre === 'faites');

function ligne(tache: Tache): HTMLLIElement {
  const li = document.createElement('li');
  li.dataset.id = String(tache.id);
  li.classList.toggle('faite', tache.faite);
  const caseACocher = document.createElement('input');
  caseACocher.type = 'checkbox';
  caseACocher.checked = tache.faite;
  const texte = document.createElement('span');
  texte.textContent = tache.texte;
  const suppr = document.createElement('button');
  suppr.className = 'suppr';
  suppr.textContent = '×';
  li.append(caseACocher, texte, suppr);
  return li;
}

function dessiner(): void {
  liste.replaceChildren(...taches.filter(visible).map(ligne));
  const n = taches.filter((t) => !t.faite).length;
  reste.textContent = `${n} restante${n > 1 ? 's' : ''}`;
  for (const b of filtres) b.setAttribute('aria-pressed', String(b.dataset.filtre === filtre));
}

function changer(nouvelles: Tache[]): void {
  taches = nouvelles;
  localStorage.setItem('taches', JSON.stringify(taches));
  dessiner();
}

export function demarrer(): void {
  try {
    taches = JSON.parse(localStorage.getItem('taches') ?? '[]');
  } catch {
    taches = [];
  }
  dessiner();
}

formulaire.addEventListener('submit', (e) => {
  e.preventDefault();
  const texte = String(new FormData(formulaire).get('texte') ?? '').trim();
  if (!texte) return;
  const id = Math.max(0, ...taches.map((t) => t.id)) + 1;
  changer([...taches, { id, texte, faite: false }]);
  formulaire.reset();
});

liste.addEventListener('click', (e) => {
  if (!(e.target instanceof Element)) return;
  const id = Number(e.target.closest<HTMLElement>('li')?.dataset.id);
  if (e.target.closest('.suppr')) changer(taches.filter((t) => t.id !== id));
  else if (e.target.closest('input')) changer(taches.map((t) => (t.id === id ? { ...t, faite: !t.faite } : t)));
});

for (const bouton of filtres) {
  bouton.addEventListener('click', () => {
    filtre = bouton.dataset.filtre as Filtre;
    dessiner();
  });
}

document.querySelector('#nettoyer')!.addEventListener('click', () => changer(taches.filter((t) => !t.faite)));

demarrer();

@@ code onglets | Des onglets accessibles | ts
Des onglets utilisables à la souris **et** au clavier, comme le recommande l'ARIA.
@starter main.ts

@starter index.html readonly
<div id="onglets">
  <div role="tablist">
    <button role="tab" aria-controls="p1">Un</button>
    <button role="tab" aria-controls="p2">Deux</button>
    <button role="tab" aria-controls="p3">Trois</button>
  </div>
  <section role="tabpanel" id="p1">Contenu 1</section>
  <section role="tabpanel" id="p2">Contenu 2</section>
  <section role="tabpanel" id="p3">Contenu 3</section>
</div>
@starter style.css
[role="tab"][aria-selected="true"] {
  font-weight: bold;
  border-bottom: 2px solid;
}
@part Choisir
Au départ, le premier onglet est choisi : `aria-selected="true"` (les autres `"false"`), et seul son panneau est visible (attribut `hidden` sur les autres). Cliquer change d'onglet.
@test Au départ
await $click('[aria-controls=p1]'); expect([...document.querySelectorAll('[role=tab]')].map((t) => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']); expect([...document.querySelectorAll('[role=tabpanel]')].map((p) => p.hidden)).toEqual([false, true, true]);
@test Cliquer
await $click('[aria-controls=p3]'); expect([...document.querySelectorAll('[role=tabpanel]')].map((p) => p.hidden)).toEqual([true, true, false]);
@part Le clavier
Les flèches droite et gauche passent d'un onglet à l'autre (en boucle), `Home` et `End` vont au premier et au dernier. L'onglet choisi reçoit le focus. Seul l'onglet choisi a `tabIndex` 0, les autres -1.
@test Flèches
await $click('[aria-controls=p1]'); await $key('[aria-controls=p1]', 'ArrowRight'); expect(document.querySelector('[aria-selected=true]').textContent).toBe('Deux'); await $key('[aria-controls=p2]', 'ArrowLeft'); await $key('[aria-controls=p1]', 'ArrowLeft'); expect(document.querySelector('[aria-selected=true]').textContent).toBe('Trois');
@test Début et fin
await $key('[aria-controls=p3]', 'Home'); expect($text('[aria-selected=true]')).toBe('Un'); await $key('[aria-controls=p1]', 'End'); expect($text('[aria-selected=true]')).toBe('Trois');
@test Focus et tabIndex
await $key('[aria-controls=p3]', 'Home'); expect(document.activeElement.textContent).toBe('Un'); expect([...document.querySelectorAll('[role=tab]')].map((t) => t.tabIndex)).toEqual([0, -1, -1]);
@part Réutilisable
Exporte `onglets(racine: Element)`, qui branche n'importe quel bloc de cette forme et renvoie `{ choisir(i: number): void }`. Utilise-la pour la page. Deux blocs sont indépendants.
@test Deux blocs indépendants
const html = (n) => `<div role="tablist"><button role="tab" aria-controls="${n}a">A</button><button role="tab" aria-controls="${n}b">B</button></div><section role="tabpanel" id="${n}a"></section><section role="tabpanel" id="${n}b"></section>`; const [x, y] = ['x', 'y'].map((n) => { const d = document.createElement('div'); d.innerHTML = html(n); document.body.append(d); return d; }); const ox = onglets(x); onglets(y); ox.choisir(1); expect([x, y].map((d) => $text(d.querySelector('[aria-selected=true]')))).toEqual(['B', 'A']); x.remove(); y.remove();
@types Signature
const o: { choisir(i: number): void } = onglets(document.body);
@solution main.ts
export function onglets(racine: Element): { choisir(i: number): void } {
  const tabs = [...racine.querySelectorAll<HTMLElement>('[role=tab]')];
  const panneaux = [...racine.querySelectorAll<HTMLElement>('[role=tabpanel]')];

  const choisir = (choisi: number): void => {
    const id = tabs[choisi].getAttribute('aria-controls');
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === choisi));
      tab.tabIndex = i === choisi ? 0 : -1;
    });
    for (const panneau of panneaux) panneau.hidden = panneau.id !== id;
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => choisir(i));
    tab.addEventListener('keydown', (e) => {
      const n = tabs.length;
      const cibles: Record<string, number> = { ArrowRight: (i + 1) % n, ArrowLeft: (i + n - 1) % n, Home: 0, End: n - 1 };
      const cible = cibles[e.key];
      if (cible === undefined) return;
      e.preventDefault();
      choisir(cible);
      tabs[cible].focus();
    });
  });

  choisir(0);
  return { choisir };
}

onglets(document.querySelector('#onglets')!);

@@ code tableau-tri | Un tableau triable | ts
Un tableau générique qui affiche des objets, se trie et se filtre.
@starter main.ts

@starter index.html readonly
<div id="zone"></div>
@part Afficher
`creerTableau<T>(zone, colonnes)`, où une colonne est `{ titre: string; valeur: (ligne: T) => string | number }`, renvoie `{ afficher(lignes: T[]) }`. Elle crée une `<table>` avec un `<th>` par colonne et une ligne par donnée.
@test En-têtes et lignes
const t = creerTableau(document.querySelector('#zone'), [{ titre: 'Nom', valeur: (p) => p.nom }, { titre: 'Âge', valeur: (p) => p.age }]); t.afficher([{ nom: 'Ada', age: 36 }]); expect($texts('#zone th')).toEqual(['Nom', 'Âge']); expect($texts('#zone td')).toEqual(['Ada', '36']);
@test Remplace
const z = document.createElement('div'); const t = creerTableau(z, [{ titre: 'N', valeur: (x) => x }]); t.afficher([1, 2]); t.afficher([3]); expect($texts('td', z)).toEqual(['3']);
@types Colonnes typées
const t = creerTableau<{ nom: string }>(document.body, [{ titre: 'N', valeur: (p) => p.nom }]); t.afficher([{ nom: 'a' }]);
// @ts-expect-error
t.afficher([{ age: 3 }]);
// @ts-expect-error
creerTableau<{ nom: string }>(document.body, [{ titre: 'N', valeur: (p) => p.age }]);
@part Trier
Cliquer sur un en-tête trie par cette colonne, croissant ; recliquer inverse. Les nombres se trient comme des nombres, les textes avec `localeCompare`. L'en-tête trié a `aria-sort="ascending"` ou `"descending"` ; les autres n'ont pas l'attribut. Le tableau de données reçu n'est pas modifié.
@test Trie des nombres
const z = document.createElement('div'); const t = creerTableau(z, [{ titre: 'N', valeur: (x) => x }]); const d = [10, 9, 100]; t.afficher(d); await $click(z.querySelector('th')); expect($texts('td', z)).toEqual(['9', '10', '100']); await $click(z.querySelector('th')); expect($texts('td', z)).toEqual(['100', '10', '9']); expect(d).toEqual([10, 9, 100]);
@test Trie des textes, avec accents
const z = document.createElement('div'); const t = creerTableau(z, [{ titre: 'N', valeur: (x) => x }]); t.afficher(['zoé', 'éric', 'ali']); await $click(z.querySelector('th')); expect($texts('td', z)).toEqual(['ali', 'éric', 'zoé']);
@test `aria-sort`
const z = document.createElement('div'); const t = creerTableau(z, [{ titre: 'A', valeur: (x) => x.a }, { titre: 'B', valeur: (x) => x.b }]); t.afficher([{ a: 1, b: 2 }]); const s = () => [...z.querySelectorAll('th')].map((h) => h.getAttribute('aria-sort')); await $click(z.querySelectorAll('th')[1]); expect(s()).toEqual([null, 'ascending']); await $click(z.querySelectorAll('th')[1]); expect(s()).toEqual([null, 'descending']); await $click(z.querySelectorAll('th')[0]); expect(s()).toEqual(['ascending', null]);
@part Filtrer
`filtrer(texte)` ne garde que les lignes dont une cellule contient le texte (sans casse ni accents). Le tri reste.
@test Filtre
const z = document.createElement('div'); const t = creerTableau(z, [{ titre: 'N', valeur: (x) => x }]); t.afficher(['Zoé', 'Éric', 'Ali']); await $click(z.querySelector('th')); t.filtrer('É'); expect($texts('td', z)).toEqual(['Éric', 'Zoé']); t.filtrer(''); expect($texts('td', z)).toEqual(['Ali', 'Éric', 'Zoé']);
@test Le filtre survit à de nouvelles données
const z = document.createElement('div'); const t = creerTableau(z, [{ titre: 'N', valeur: (x) => x }]); t.filtrer('1'); t.afficher([1, 2, 31]); expect($texts('td', z)).toEqual(['1', '31']);
@solution main.ts
interface Colonne<T> {
  titre: string;
  valeur: (ligne: T) => string | number;
}

interface Tableau<T> {
  afficher(lignes: T[]): void;
  filtrer(texte: string): void;
}

const simplifier = (x: string | number): string =>
  String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function comparer(a: string | number, b: string | number): number {
  return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
}

function creerTableau<T>(zone: Element, colonnes: Colonne<T>[]): Tableau<T> {
  let lignes: T[] = [];
  let recherche = '';
  let tri: { colonne: number; sens: 1 | -1 } | null = null;

  const entetes = colonnes.map(({ titre }, i) => {
    const th = document.createElement('th');
    th.textContent = titre;
    th.addEventListener('click', () => {
      tri = { colonne: i, sens: tri?.colonne === i && tri.sens === 1 ? -1 : 1 };
      dessiner();
    });
    return th;
  });
  const table = document.createElement('table');
  table.createTHead().insertRow().append(...entetes);
  const corps = table.createTBody();
  zone.replaceChildren(table);

  function dessiner(): void {
    let visibles = lignes.filter((l) => colonnes.some((c) => simplifier(c.valeur(l)).includes(recherche)));
    if (tri) {
      const { colonne, sens } = tri;
      const { valeur } = colonnes[colonne];
      visibles = visibles.toSorted((a, b) => sens * comparer(valeur(a), valeur(b)));
    }
    entetes.forEach((th, i) => {
      if (tri?.colonne === i) th.setAttribute('aria-sort', tri.sens === 1 ? 'ascending' : 'descending');
      else th.removeAttribute('aria-sort');
    });
    corps.replaceChildren(...visibles.map((l) => {
      const tr = document.createElement('tr');
      for (const c of colonnes) tr.insertCell().textContent = String(c.valeur(l));
      return tr;
    }));
  }

  return {
    afficher(nouvelles) {
      lignes = nouvelles;
      dessiner();
    },
    filtrer(texte) {
      recherche = simplifier(texte);
      dessiner();
    },
  };
}
