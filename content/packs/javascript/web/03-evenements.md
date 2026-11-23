# Événements
> Réagir aux clics, au clavier, aux formulaires.

@@ lesson evenements | Écouter

```web-run
<button id="b">Clique</button>
<p id="p">0</p>
---
const b = document.querySelector('#b');
let n = 0;
b.addEventListener('click', (evenement) => {
  n++;
  document.querySelector('#p').textContent = n;
  console.log(evenement.type, evenement.target.id);
});
```

Les courants : `click`, `input` (à chaque frappe), `change` (valeur validée), `submit`, `keydown`, `focus` / `blur`, `pointerdown` / `pointermove`, `scroll`, `DOMContentLoaded`.

Options : `addEventListener('click', f, { once: true })`, ou `{ signal }` pour retirer plusieurs écouteurs d'un coup avec un `AbortController`. Sinon, `removeEventListener` avec **la même** fonction.

### La remontée (bubbling)

Un événement part de l'élément le plus profond et **remonte** vers ses parents. `event.target` est l'élément d'origine, `event.currentTarget` celui qui écoute. `event.stopPropagation()` arrête la remontée (à éviter).

### Délégation

Plutôt qu'un écouteur par élément, **un seul sur le parent** : il marche aussi pour les éléments ajoutés plus tard.

```web-run
<ul id="liste"><li>a <button data-action="suppr">×</button></li><li>b <button data-action="suppr">×</button></li></ul>
---
document.querySelector('#liste').addEventListener('click', (e) => {
  const bouton = e.target.closest('[data-action=suppr]');
  if (bouton) bouton.closest('li').remove();
});
```

### Comportement par défaut

`event.preventDefault()` empêche l'action du navigateur : suivre un lien, envoyer un formulaire, écrire une touche…

```web-run
<form id="f"><input name="nom" value="Ada"><button>OK</button></form>
---
document.querySelector('#f').addEventListener('submit', (e) => {
  e.preventDefault(); // sinon la page se recharge
  const donnees = new FormData(e.currentTarget);
  console.log(Object.fromEntries(donnees));
});
```

### Clavier

```js
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') fermer();
  if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sauver(); }
});
```

### En TypeScript

Le type de l'événement est déduit du nom : `'keydown'` donne un `KeyboardEvent`. Mais `target` est un `EventTarget | null` : vérifie-le.

```web-ts-run
<input id="c" placeholder="tape ici">
---
document.querySelector('#c')!.addEventListener('input', (e) => {
  if (e.target instanceof HTMLInputElement) console.log(e.target.value);
});
```

@@ code compteur-dom | Un compteur | ts
Fais marcher la page : `+` et `-` changent la valeur, `Remettre` la met à 0. Elle ne descend jamais sous 0, et `-` est **désactivé** à 0.
@starter main.ts

@starter index.html readonly
<button id="moins">-</button>
<output id="valeur">0</output>
<button id="plus">+</button>
<button id="zero">Remettre</button>
@test Augmente
await $click('#zero'); await $click('#plus'); await $click('#plus'); expect($text('#valeur')).toBe('2');
@test Diminue
await $click('#zero'); await $click('#plus'); await $click('#plus'); await $click('#moins'); expect($text('#valeur')).toBe('1');
@test Remet à zéro
await $click('#plus'); await $click('#zero'); expect($text('#valeur')).toBe('0');
@test `-` est désactivé à 0
await $click('#zero'); expect(document.querySelector('#moins').disabled).toBe(true); await $click('#plus'); expect(document.querySelector('#moins').disabled).toBe(false);
@hint
Une fonction `afficher()` qui met **tout** à jour à partir de la valeur, appelée après chaque changement et une fois au début.
@solution main.ts
const moins = document.querySelector<HTMLButtonElement>('#moins')!;
const sortie = document.querySelector('#valeur')!;
let valeur = 0;

function changer(nouvelle: number): void {
  valeur = Math.max(0, nouvelle);
  sortie.textContent = String(valeur);
  moins.disabled = valeur === 0;
}

moins.addEventListener('click', () => changer(valeur - 1));
document.querySelector('#plus')!.addEventListener('click', () => changer(valeur + 1));
document.querySelector('#zero')!.addEventListener('click', () => changer(0));
changer(0);

@@ code delegation | Délégation | ts
Avec **un seul** `addEventListener`, sur `#liste` :

- cliquer sur le texte d'un élément bascule la classe `fait` de son `li`
- cliquer sur son bouton `.suppr` supprime le `li`

Cela doit marcher pour des éléments ajoutés plus tard.
@starter main.ts

@starter index.html readonly
<ul id="liste">
  <li><span>a</span> <button class="suppr">×</button></li>
  <li><span>b</span> <button class="suppr">×</button></li>
</ul>
@test Bascule la classe
const s = document.querySelector('#liste li span'); await $click(s); expect(s.closest('li').classList.contains('fait')).toBe(true); await $click(s); expect(s.closest('li').classList.contains('fait')).toBe(false);
@test Supprime
const n = document.querySelectorAll('#liste li').length; await $click('#liste li:last-child .suppr'); expect(document.querySelectorAll('#liste li')).toHaveLength(n - 1);
@test Marche pour un nouvel élément
document.querySelector('#liste').insertAdjacentHTML('beforeend', '<li id="n"><span>n</span><button class="suppr">×</button></li>'); await $click('#n span'); expect(document.querySelector('#n').classList.contains('fait')).toBe(true); await $click('#n .suppr'); expect(document.querySelector('#n')).toBe(null);
@test Un seul écouteur
expect($source.match(/addEventListener/g)).toHaveLength(1);
@hint
`if (!(e.target instanceof Element)) return;` puis `e.target.closest('li')`.
@solution main.ts
document.querySelector('#liste')!.addEventListener('click', (e) => {
  if (!(e.target instanceof Element)) return;
  const li = e.target.closest('li');
  if (!li) return;
  if (e.target.closest('.suppr')) li.remove();
  else if (e.target.closest('span')) li.classList.toggle('fait');
});

@@ code inscription-form | Valider un formulaire | ts
À l'envoi (sans recharger la page) :

- `nom` vide (ou que des espaces) → `#erreur` : `Le nom est obligatoire`
- `mdp` de moins de 8 caractères → `Mot de passe trop court`
- sinon, `#erreur` est vide, `#resultat` affiche `Bienvenue <nom>` (nom sans espaces autour) et le formulaire est vidé
@starter main.ts

@starter index.html readonly
<form id="f">
  <input name="nom">
  <input name="mdp" type="password">
  <button>OK</button>
</form>
<p id="erreur"></p>
<p id="resultat"></p>
@test Nom obligatoire
await $type('[name=nom]', '   '); await $type('[name=mdp]', '12345678'); await $submit('#f'); expect($text('#erreur')).toBe('Le nom est obligatoire');
@test Mot de passe trop court
await $type('[name=nom]', 'Ada'); await $type('[name=mdp]', '123'); await $submit('#f'); expect($text('#erreur')).toBe('Mot de passe trop court');
@test Réussite
await $type('[name=nom]', ' Ada '); await $type('[name=mdp]', '12345678'); await $submit('#f'); expect([$text('#erreur'), $text('#resultat')]).toEqual(['', 'Bienvenue Ada']); expect(document.querySelector('[name=nom]').value).toBe('');
@test La page ne se recharge pas
const e = new Event('submit', { bubbles: true, cancelable: true }); document.querySelector('#f').dispatchEvent(e); expect(e.defaultPrevented).toBe(true);
@hint
`String(donnees.get('nom') ?? '')` : `FormData.get` peut aussi renvoyer un fichier ou `null`.
@solution main.ts
const formulaire = document.querySelector<HTMLFormElement>('#f')!;
const erreur = document.querySelector('#erreur')!;
const resultat = document.querySelector('#resultat')!;

formulaire.addEventListener('submit', (e) => {
  e.preventDefault();
  const donnees = new FormData(formulaire);
  const nom = String(donnees.get('nom') ?? '').trim();
  const mdp = String(donnees.get('mdp') ?? '');
  if (!nom) {
    erreur.textContent = 'Le nom est obligatoire';
  } else if (mdp.length < 8) {
    erreur.textContent = 'Mot de passe trop court';
  } else {
    erreur.textContent = '';
    resultat.textContent = `Bienvenue ${nom}`;
    formulaire.reset();
  }
});

@@ defi raccourcis | Des raccourcis clavier | ts
`raccourcis(cible, table)` branche des raccourcis : `{ 'ctrl+s': f, 'escape': g, 'ctrl+shift+k': h }`. La correspondance est **exacte** (`ctrl+s` ne doit pas réagir à `ctrl+shift+s`), sans tenir compte de la casse. `ctrl` accepte aussi `meta` (Mac). Un raccourci reconnu annule l'action par défaut. Rien ne se passe si l'on tape dans un `input` ou un `textarea`, sauf pour `escape`. La fonction renvoie un désabonnement.
@starter main.ts

@starter index.html readonly
<input id="champ">
<div id="zone" tabindex="0"></div>
@test Reconnaît les touches
let l = []; const off = raccourcis(document, { 'ctrl+s': () => l.push('s'), escape: () => l.push('e') }); await $key('#zone', 'S', { ctrlKey: true }); await $key('#zone', 's', { metaKey: true }); await $key('#zone', 'Escape'); off(); expect(l).toEqual(['s', 's', 'e']);
@test Correspondance exacte
let n = 0; const off = raccourcis(document, { 'ctrl+s': () => n++ }); await $key('#zone', 's'); await $key('#zone', 's', { ctrlKey: true, shiftKey: true }); off(); expect(n).toBe(0);
@test Plusieurs modificateurs
let n = 0; const off = raccourcis(document, { 'shift+ctrl+k': () => n++ }); await $key('#zone', 'K', { ctrlKey: true, shiftKey: true }); off(); expect(n).toBe(1);
@test Annule l'action par défaut
const off = raccourcis(document, { 'ctrl+s': () => {} }); const e = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true }); document.querySelector('#zone').dispatchEvent(e); off(); expect(e.defaultPrevented).toBe(true);
@test Ignore les champs, sauf escape
let l = []; const off = raccourcis(document, { k: () => l.push('k'), escape: () => l.push('e') }); await $key('#champ', 'k'); await $key('#champ', 'Escape'); off(); expect(l).toEqual(['e']);
@test Désabonnement
let n = 0; raccourcis(document, { k: () => n++ })(); await $key('#zone', 'k'); expect(n).toBe(0);
@hint
Mets les deux côtés sous la même forme : les modificateurs triés, puis la touche. `ctrl+shift+k` et `shift+ctrl+k` donnent alors le même texte.
@solution main.ts
const MODIFICATEURS = ['ctrl', 'alt', 'shift'];

function normaliser(raccourci: string): string {
  const parts = raccourci.toLowerCase().split('+');
  return [...MODIFICATEURS.filter((m) => parts.includes(m)), ...parts.filter((p) => !MODIFICATEURS.includes(p))].join('+');
}

function lire(e: KeyboardEvent): string {
  const presses = { ctrl: e.ctrlKey || e.metaKey, alt: e.altKey, shift: e.shiftKey };
  return [...Object.entries(presses).filter(([, p]) => p).map(([m]) => m), e.key.toLowerCase()].join('+');
}

function raccourcis(cible: Document | HTMLElement, table: Record<string, () => void>): () => void {
  const actions = new Map(Object.entries(table).map(([r, f]) => [normaliser(r), f]));
  const ecouter = (e: Event) => {
    if (!(e instanceof KeyboardEvent)) return;
    const touche = lire(e);
    const action = actions.get(touche);
    if (!action) return;
    const dansUnChamp = e.target instanceof Element && e.target.matches('input, textarea');
    if (dansUnChamp && touche !== 'escape') return;
    e.preventDefault();
    action();
  };
  cible.addEventListener('keydown', ecouter);
  return () => cible.removeEventListener('keydown', ecouter);
}

@@ predict target
Un `<button><b>OK</b></button>` écoute `click`. On clique sur le mot OK. Que vaut `event.target` ?
@answer L'élément `b`
@wrong Le bouton
@wrong `document`
@wrong `null`
@why `target` est l'élément le plus profond ; `currentTarget` est celui qui écoute. D'où `target.closest('button')`.

@@ predict input-change
Quel événement se produit à **chaque** frappe dans un champ texte ?
@answer `input`
@wrong `change`
@wrong `submit`
@wrong `blur`
@why `change` attend que la valeur soit validée (sortie du champ).

@@ card prevent
Empêcher un formulaire de recharger la page ?
@back
`event.preventDefault()` dans l'écouteur `submit`.

@@ card delegation-quoi
Qu'est-ce que la délégation d'événements ?
@back
Un écouteur sur le parent, qui regarde `event.target.closest(…)` : marche aussi pour les éléments ajoutés plus tard.

@@ card formdata
Lire toutes les valeurs d'un formulaire ?
@back
`Object.fromEntries(new FormData(formulaire))`
