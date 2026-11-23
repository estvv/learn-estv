# Le DOM
> Trouver, lire, modifier et créer des éléments.

@@ lesson dom | Le DOM

Le navigateur transforme le HTML en un arbre d'objets, le **DOM**. JavaScript lit et modifie cet arbre, et la page suit.

### Trouver

```web-run
<h1 id="titre">Bonjour</h1>
<ul><li class="fait">a</li><li>b</li></ul>
---
const titre = document.querySelector('#titre');   // le premier, ou null
const items = document.querySelectorAll('li');    // tous (NodeList)
console.log(titre.textContent, items.length);
console.log([...items].map((li) => li.textContent));
console.log(titre.nextElementSibling.tagName, items[0].parentElement.tagName);
console.log(items[0].closest('ul') !== null, items[0].matches('.fait'));
```

### Modifier

```web-run
<p id="p">avant</p>
<input id="champ" value="texte">
---
const p = document.querySelector('#p');
p.textContent = 'après';               // du texte, sans danger
p.classList.add('grand');
p.classList.toggle('actif');
p.style.color = 'tomato';
p.dataset.id = '42';                   // data-id="42"
p.setAttribute('title', 'bulle');
console.log(p.outerHTML);
console.log(document.querySelector('#champ').value);
```

> **`innerHTML`** interprète du HTML. N'y mets **jamais** du texte qui vient d'un utilisateur : il pourrait contenir un script (faille XSS). Pour du texte : `textContent`.

### Créer, déplacer, supprimer

```web-run
<ul id="liste"><li>1</li></ul>
---
const liste = document.querySelector('#liste');
for (const texte of ['2', '3']) {
  const li = document.createElement('li');
  li.textContent = texte;
  liste.append(li);                    // à la fin ; prepend, before, after…
}
liste.firstElementChild.remove();
liste.append(liste.firstElementChild); // un élément déjà là est DÉPLACÉ
console.log([...liste.children].map((e) => e.textContent));
```

Pour reconstruire une liste entière : `liste.replaceChildren(...elements)`.

### En TypeScript

`querySelector` renvoie `Element | null`. Précise le type, et traite `null` :

```web-ts-run
<input id="nom" value="Ada">
---
const champ = document.querySelector<HTMLInputElement>('#nom');
if (!champ) throw new Error('champ introuvable');
console.log(champ.value.toUpperCase()); // value existe sur HTMLInputElement
```

Dans un exercice dont tu connais la page, `!` est acceptable : `querySelector('#nom')!`.

@@ code modifier-page | Modifier la page | js
Sans toucher au HTML :

1. mets le texte `Bienvenue` dans le titre
2. ajoute la classe `actif` au **deuxième** `li`
3. supprime l'élément `#pub`
4. mets `data-vu` à `oui` sur **tous** les `li`
@starter main.js

@starter index.html readonly
<h1>Titre</h1>
<p id="pub">Achetez !</p>
<ul><li>un</li><li>deux</li><li>trois</li></ul>
@test Le titre
expect($text('h1')).toBe('Bienvenue');
@test La classe
expect([...document.querySelectorAll('li')].map((l) => l.classList.contains('actif'))).toEqual([false, true, false]);
@test La pub a disparu
expect(document.querySelector('#pub')).toBe(null);
@test `data-vu` partout
expect([...document.querySelectorAll('li')].map((l) => l.dataset.vu)).toEqual(['oui', 'oui', 'oui']);
@solution main.js
document.querySelector('h1').textContent = 'Bienvenue';
const items = document.querySelectorAll('li');
items[1].classList.add('actif');
document.querySelector('#pub').remove();
for (const li of items) li.dataset.vu = 'oui';

@@ code liste-dom | Afficher une liste | ts
`afficher(personnes)` remplit `#liste` : un `<li>` par personne, avec un `<strong>` pour le nom, suivi de ` (36 ans)`. Elle **remplace** ce qui s'y trouvait. Sans personne, un seul `<li class="vide">` : `Personne`. Les noms peuvent contenir du HTML : il doit s'afficher **comme du texte**.
@starter main.ts
interface Personne {
  nom: string;
  age: number;
}

export function afficher(personnes: Personne[]): void {
}
@starter index.html readonly
<ul id="liste"><li>ancien</li></ul>
@test Remplit la liste
afficher([{ nom: 'Ada', age: 36 }, { nom: 'Linus', age: 21 }]); expect($texts('#liste li')).toEqual(['Ada (36 ans)', 'Linus (21 ans)']); expect($texts('#liste strong')).toEqual(['Ada', 'Linus']);
@test Remplace l'ancien contenu
afficher([{ nom: 'A', age: 1 }]); afficher([{ nom: 'B', age: 2 }]); expect($texts('#liste li')).toEqual(['B (2 ans)']);
@test Liste vide
afficher([]); expect($texts('#liste li.vide')).toEqual(['Personne']);
@test Le HTML des noms est du texte
afficher([{ nom: '<img src=x>', age: 1 }]); expect(document.querySelector('#liste img')).toBe(null); expect($text('#liste strong')).toBe('<img src=x>');
@hint
`li.append(strong, texte)` accepte des éléments **et** des chaînes.
@solution main.ts
interface Personne {
  nom: string;
  age: number;
}

const liste = document.querySelector('#liste')!;

export function afficher(personnes: Personne[]): void {
  if (personnes.length === 0) {
    const vide = document.createElement('li');
    vide.className = 'vide';
    vide.textContent = 'Personne';
    liste.replaceChildren(vide);
    return;
  }
  liste.replaceChildren(...personnes.map(({ nom, age }) => {
    const li = document.createElement('li');
    const strong = document.createElement('strong');
    strong.textContent = nom;
    li.append(strong, ` (${age} ans)`);
    return li;
  }));
}

@@ code creer-element | Un raccourci | ts
Écris `h(balise, attributs, ...enfants)`, qui crée un élément :

- `attributs` : un objet ; chaque valeur devient un attribut. `true` donne un attribut vide, `false` ne met rien.
- `enfants` : des textes ou des éléments

Le type de retour doit dépendre de la balise (`h('input', {})` est un `HTMLInputElement`).
@starter main.ts

@starter index.html readonly
<div id="zone"></div>
@test Crée avec attributs et enfants
const e = h('p', { id: 'x', class: 'a b' }, 'salut ', h('b', {}, 'toi')); expect(e.outerHTML).toBe('<p id="x" class="a b">salut <b>toi</b></p>');
@test Booléens
const e = h('button', { disabled: true, hidden: false }); expect([e.getAttribute('disabled'), e.hasAttribute('hidden')]).toEqual(['', false]);
@types Le type dépend de la balise
const i: HTMLInputElement = h('input', { type: 'text' }); const a: HTMLAnchorElement = h('a', {}, 'lien');
@types Balise inconnue refusée
// @ts-expect-error
h('zut', {});
@hint
`HTMLElementTagNameMap` associe chaque balise à son type : `<K extends keyof HTMLElementTagNameMap>`.
@solution main.ts
type Attributs = Record<string, string | boolean>;

function h<K extends keyof HTMLElementTagNameMap>(
  balise: K,
  attributs: Attributs,
  ...enfants: (string | Node)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(balise);
  for (const [nom, valeur] of Object.entries(attributs)) {
    if (valeur !== false) element.setAttribute(nom, valeur === true ? '' : valeur);
  }
  element.append(...enfants);
  return element;
}

@@ defi synchroniser | Mettre à jour sans tout refaire | ts
`synchroniser(liste, donnees)` fait correspondre les `<li>` de `liste` aux données `{ cle, texte }`, en **réutilisant** les éléments existants (repérés par `data-cle`) : texte mis à jour, éléments disparus retirés, nouveaux créés, ordre respecté. C'est le cœur de ce que fait React.
@starter main.ts
interface Donnee {
  cle: string;
  texte: string;
}

export function synchroniser(liste: Element, donnees: Donnee[]): void {
}
@starter index.html readonly
<ul id="l"></ul>
@test Crée
const l = document.createElement('ul'); synchroniser(l, [{ cle: 'a', texte: 'A' }, { cle: 'b', texte: 'B' }]); expect($texts('li', l)).toEqual(['A', 'B']);
@test Réutilise les éléments
const l = document.createElement('ul'); synchroniser(l, [{ cle: 'a', texte: 'A' }, { cle: 'b', texte: 'B' }]); const [a, b] = l.children; synchroniser(l, [{ cle: 'b', texte: 'B2' }, { cle: 'a', texte: 'A' }]); expect($texts('li', l)).toEqual(['B2', 'A']); expect(l.children[0] === b && l.children[1] === a).toBe(true);
@test Retire et ajoute au milieu
const l = document.createElement('ul'); const d = (...k) => k.map((cle) => ({ cle, texte: cle })); synchroniser(l, d('a', 'b', 'c')); const c = l.children[2]; synchroniser(l, d('a', 'x', 'c')); expect($texts('li', l)).toEqual(['a', 'x', 'c']); expect(l.children[2] === c).toBe(true);
@test Vide
const l = document.createElement('ul'); synchroniser(l, [{ cle: 'a', texte: 'A' }]); synchroniser(l, []); expect(l.children).toHaveLength(0);
@solution main.ts
interface Donnee {
  cle: string;
  texte: string;
}

export function synchroniser(liste: Element, donnees: Donnee[]): void {
  const anciens = new Map<string, HTMLElement>();
  for (const li of liste.querySelectorAll<HTMLElement>('li')) anciens.set(li.dataset.cle ?? '', li);
  liste.replaceChildren(...donnees.map(({ cle, texte }) => {
    const li = anciens.get(cle) ?? document.createElement('li');
    li.dataset.cle = cle;
    if (li.textContent !== texte) li.textContent = texte;
    return li;
  }));
}

@@ predict query-null
Que se passe-t-il si aucun élément ne correspond ?
```js-bad
document.querySelector('.absent').textContent = 'x';
```
@answer Une TypeError
@wrong Rien
@wrong L'élément est créé
@wrong Une SyntaxError
@why `querySelector` renvoie `null`, et `null.textContent` est une TypeError.

@@ predict append-deplace
Que se passe-t-il si on fait `b.append(element)` alors que `element` est déjà dans `a` ?
@answer Il est déplacé de `a` vers `b`
@wrong Il est copié dans `b`
@wrong Une erreur
@wrong Rien
@why Un nœud n'a qu'un parent. Pour copier : `element.cloneNode(true)`.

@@ card textcontent
`textContent` ou `innerHTML` pour un texte saisi par un utilisateur ?
@back
`textContent` : `innerHTML` interpréterait le HTML (faille XSS).

@@ card classlist
Ajouter, retirer, inverser une classe ?
@back
`el.classList.add('x')`, `.remove('x')`, `.toggle('x')`
