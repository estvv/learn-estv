# HTML et CSS, l'essentiel
> La structure et le style d'une page, juste ce qu'il faut pour la suite.

@@ lesson html | Le HTML

Le HTML décrit la **structure** : des éléments imbriqués, écrits avec des balises.

```web-run
<h1>Mon carnet</h1>
<p>Un paragraphe avec un <a href="#">lien</a> et du <strong>texte fort</strong>.</p>
<ul>
  <li>Premier</li>
  <li>Second</li>
</ul>
<button type="button" disabled>Désactivé</button>
<img src="data:," alt="Une image décrite">
```

- Une balise ouvrante, du contenu, une balise fermante : `<p>…</p>`. Quelques-unes n'ont pas de contenu : `<img>`, `<input>`, `<br>`.
- Les **attributs** précisent : `href`, `src`, `type`, `id` (unique dans la page), `class` (réutilisable), `data-xxx` (tes propres données).
- Choisis la balise pour son **sens**, pas pour son apparence : `<button>` pour une action, `<a>` pour un lien, `<nav>`, `<main>`, `<header>`, `<article>`, `<h1>` à `<h6>` pour les titres. Claviers et lecteurs d'écran en dépendent.

### Formulaires

```web-run
<form>
  <label>Nom <input name="nom" required></label>
  <label>Âge <input name="age" type="number" min="0"></label>
  <select name="pays">
    <option value="fr">France</option>
    <option value="kr">Corée</option>
  </select>
  <textarea name="note"></textarea>
  <label><input name="ok" type="checkbox"> J'accepte</label>
  <button>Envoyer</button>
</form>
```

Chaque champ a un `name` (la clé de sa valeur) et un `<label>`. Un `<button>` dans un formulaire l'**envoie**, sauf avec `type="button"`.

@@ lesson css | Le CSS

```css
/* sélecteur { propriété: valeur; } */
p { color: #333; }              /* toutes les balises p */
.carte { padding: 16px; }       /* class="carte" */
#menu { display: none; }        /* id="menu" */
nav a { text-decoration: none } /* un a DANS un nav */
ul > li { margin: 4px 0; }      /* enfant direct */
a:hover, .actif { color: red; } /* état ; plusieurs sélecteurs */
[disabled] { opacity: .5; }     /* attribut */
```

En cas de conflit, le sélecteur le plus **précis** gagne (id > classe > balise), puis le dernier écrit.

### La boîte et l'alignement

Chaque élément est une boîte : contenu, `padding` (dedans), `border`, `margin` (dehors). Pour placer des éléments, deux outils :

```web-run
<style>
  .ligne { display: flex; gap: 12px; align-items: center; justify-content: space-between; }
  .grille { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
  .grille div, .ligne span { background: #eef; padding: 8px; border-radius: 6px; }
</style>
<div class="ligne"><span>gauche</span><span>milieu</span><span>droite</span></div>
<div class="grille"><div>1</div><div>2</div><div>3</div><div>4</div></div>
```

- **flex** : une ligne (ou une colonne avec `flex-direction: column`).
- **grid** : des lignes et des colonnes.

Les mêmes sélecteurs servent en JavaScript, avec `querySelector`.

@@ code carte | Une carte de profil | js
Dans `index.html`, écris :

- un `<article>` de classe `profil`
- dedans, un titre `<h2>` avec le texte `Ada`
- une image avec un `alt` non vide
- une liste `<ul>` de **trois** `<li>`
- un bouton qui n'envoie pas de formulaire
@starter main.js readonly
// Rien à faire ici : tout est dans index.html
@starter index.html

@test Un article de classe `profil`
expect(document.querySelectorAll('article.profil')).toHaveLength(1);
@test Le titre est dedans
expect($text('article.profil h2')).toBe('Ada');
@test L'image a une description
expect(document.querySelector('.profil img')?.alt).toBeTruthy();
@test Trois éléments de liste
expect(document.querySelectorAll('.profil ul > li')).toHaveLength(3);
@test Le bouton est de type `button`
expect(document.querySelector('.profil button')?.getAttribute('type')).toBe('button');
@solution main.js
// Rien à faire ici : tout est dans index.html
@solution index.html
<article class="profil">
  <h2>Ada</h2>
  <img src="data:," alt="Portrait d'Ada">
  <ul>
    <li>Mathématiques</li>
    <li>Poésie</li>
    <li>Machines</li>
  </ul>
  <button type="button">Suivre</button>
</article>

@@ code formulaire-html | Un formulaire correct | js
Écris un `<form>` avec :

- un champ `email` de type email, **obligatoire**
- un champ `age` numérique, minimum 18
- un choix `pays` (`<select>`) avec `fr` et `kr`
- une case à cocher `cgu`
- un bouton d'envoi

Chaque champ doit être **dans** un `<label>`.
@starter main.js readonly
// Rien à faire ici : tout est dans index.html
@starter index.html

@test Le champ email
const e = document.querySelector('form [name=email]'); expect(e?.getAttribute('type')).toBe('email'); expect(e.hasAttribute('required')).toBe(true);
@test Le champ âge
const a = document.querySelector('form [name=age]'); expect([a?.getAttribute('type'), a?.getAttribute('min')]).toEqual(['number', '18']);
@test Le choix du pays
expect([...document.querySelectorAll('form select[name=pays] option')].map((o) => o.getAttribute('value'))).toEqual(['fr', 'kr']);
@test La case à cocher
expect(document.querySelector('form [name=cgu]')?.getAttribute('type')).toBe('checkbox');
@test Tous dans un label, et un bouton
expect([...document.querySelectorAll('form [name]')].every((c) => c.closest('label'))).toBe(true); expect(document.querySelectorAll('form button')).toHaveLength(1);
@solution main.js
// Rien à faire ici : tout est dans index.html
@solution index.html
<form>
  <label>Email <input name="email" type="email" required></label>
  <label>Âge <input name="age" type="number" min="18"></label>
  <label>Pays
    <select name="pays">
      <option value="fr">France</option>
      <option value="kr">Corée</option>
    </select>
  </label>
  <label><input name="cgu" type="checkbox"> J'accepte</label>
  <button>Envoyer</button>
</form>

@@ defi selecteurs | Les sélecteurs | js
Remplis `selecteurs` : pour chaque clé, un sélecteur CSS qui trouve **exactement** les éléments demandés dans la page (en lecture seule).

- `titres` : tous les `h2`
- `liens` : les liens dans `nav`, mais pas celui de classe `logo`
- `enfants` : les `li` qui sont des enfants **directs** de `#menu`
- `manquants` : les champs obligatoires
- `impairs` : les lignes impaires (1re, 3e…) du `tbody`
- `apres` : le paragraphe **juste après** un `h2`
@starter main.js
const selecteurs = {
  titres: 'h2',
  liens: '',
  enfants: '',
  manquants: '',
  impairs: '',
  apres: '',
};
@starter index.html readonly
<nav><a class="logo">L</a><a>A</a><a>B</a></nav>
<ul id="menu"><li>1<ul><li>1.1</li></ul></li><li>2</li></ul>
<h2>T1</h2><p>P1</p><p>P2</p>
<h2>T2</h2><p>P3</p>
<form><input name="a" required><input name="b"><input name="c" required></form>
<table><thead><tr><td>0</td></tr></thead><tbody><tr><td>1</td></tr><tr><td>2</td></tr><tr><td>3</td></tr></tbody></table>
@test `titres`
expect($texts(selecteurs.titres)).toEqual(['T1', 'T2']);
@test `liens`
expect($texts(selecteurs.liens)).toEqual(['A', 'B']);
@test `enfants`
expect([...document.querySelectorAll(selecteurs.enfants)].map((e) => e.firstChild.textContent)).toEqual(['1', '2']);
@test `manquants`
expect([...document.querySelectorAll(selecteurs.manquants)].map((e) => e.getAttribute('name'))).toEqual(['a', 'c']);
@test `impairs`
expect($texts(selecteurs.impairs)).toEqual(['1', '3']);
@test `apres`
expect($texts(selecteurs.apres)).toEqual(['P1', 'P3']);
@hint
`:not(.x)`, `>`, `[attribut]`, `:nth-child(odd)`, `+`.
@solution main.js
const selecteurs = {
  titres: 'h2',
  liens: 'nav a:not(.logo)',
  enfants: '#menu > li',
  manquants: '[required]',
  impairs: 'tbody tr:nth-child(odd)',
  apres: 'h2 + p',
};

@@ predict specificite
Le paragraphe `<p class="a" id="b">` est de quelle couleur ?
```css
#b { color: red; }
.a { color: blue; }
p { color: green; }
```
@answer Rouge
@wrong Vert
@wrong Bleu
@wrong Noir
@why Un id est plus précis qu'une classe, elle-même plus précise qu'une balise. L'ordre ne compte qu'à précision égale.

@@ predict bouton-form
Que fait un `<button>` sans `type` dans un formulaire ?
@answer Il envoie le formulaire
@wrong Rien
@wrong Il vide le formulaire
@wrong Il recharge seulement la page
@why Le type par défaut est `submit`. Pour un simple bouton : `type="button"`.

@@ card flex
Mettre des éléments en ligne, espacés de 8 px et centrés verticalement ?
@back
`display: flex; gap: 8px; align-items: center;`

@@ card selecteurs-css
`nav a` et `nav > a` ?
@back
Un `a` n'importe où dans `nav` ; un `a` enfant **direct** de `nav`.
