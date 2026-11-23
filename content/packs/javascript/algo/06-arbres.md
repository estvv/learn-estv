# Arbres
> Parcours, arbres binaires de recherche, tries.

@@ lesson arbres | Les arbres

Un nœud, des enfants, pas de cycle : fichiers, DOM, JSON, organigrammes…

```ts
interface Noeud<T> { valeur: T; gauche: Noeud<T> | null; droite: Noeud<T> | null }
```

### Parcourir

- **En profondeur** (récursion ou pile) : préfixe (nœud, gauche, droite), infixe (gauche, nœud, droite), suffixe (gauche, droite, nœud).
- **En largeur** (file) : niveau par niveau.

```ts-run
interface N { v: number; g?: N; d?: N }
const arbre: N = { v: 1, g: { v: 2, g: { v: 4 } }, d: { v: 3 } };

function* profondeur(n?: N): Generator<number> {
  if (!n) return;
  yield* profondeur(n.g);
  yield n.v;               // infixe
  yield* profondeur(n.d);
}

function* largeur(n: N): Generator<number> {
  let niveau = [n];
  while (niveau.length > 0) {
    for (const x of niveau) yield x.v;
    niveau = niveau.flatMap((x) => [x.g, x.d]).filter((x) => x !== undefined);
  }
}
console.log([...profondeur(arbre)], [...largeur(arbre)]);
```

### Arbre binaire de recherche

À gauche, plus petit ; à droite, plus grand. Chercher et insérer coûtent O(hauteur) : O(log n) s'il est **équilibré**, O(n) s'il dégénère en liste (insertion de valeurs triées). Le parcours infixe donne les valeurs **triées**.

### Trie

Un arbre de lettres : chaque chemin est un préfixe. Idéal pour l'autocomplétion ; chercher un mot coûte sa longueur, quel que soit le nombre de mots.

### Penser récursivement

La plupart des fonctions sur les arbres s'écrivent ainsi : cas vide, appel sur chaque enfant, combinaison.

```ts-run
interface N { v: number; g?: N; d?: N }
const hauteur = (n?: N): number => (n ? 1 + Math.max(hauteur(n.g), hauteur(n.d)) : 0);
console.log(hauteur({ v: 1, g: { v: 2, d: { v: 3 } } }));
```

@@ code abr | Arbre binaire de recherche | ts
Classe `Arbre` (nombres) : `ajouter(x)` (renvoie `this`, ignore les doublons), `contient(x)`, `min()` et `max()` (`undefined` si vide), `hauteur()`, et itérable dans l'ordre **croissant**. `contient` ne doit pas tout parcourir.
@starter
class Arbre {
}
@test Ajoute et trie
expect([...new Arbre().ajouter(5).ajouter(2).ajouter(8).ajouter(2).ajouter(6)]).toEqual([2, 5, 6, 8]); expect([...new Arbre()]).toEqual([]);
@test Contient
const a = new Arbre(); for (const x of [5, 2, 8]) a.ajouter(x); expect([2, 5, 8, 3].map((x) => a.contient(x))).toEqual([true, true, true, false]);
@test Min, max, hauteur
const a = new Arbre(); expect([a.min(), a.max(), a.hauteur()]).toEqual([undefined, undefined, 0]); for (const x of [5, 2, 8, 9]) a.ajouter(x); expect([a.min(), a.max(), a.hauteur()]).toEqual([2, 9, 3]);
@test Un arbre très penché ne déborde pas
const a = new Arbre(); for (let i = 0; i < 3000; i++) a.ajouter(i); expect([a.contient(2999), a.max()]).toEqual([true, 2999]);
@solution
interface Noeud {
  valeur: number;
  gauche: Noeud | null;
  droite: Noeud | null;
}

class Arbre {
  #racine: Noeud | null = null;

  ajouter(x: number): this {
    const nouveau: Noeud = { valeur: x, gauche: null, droite: null };
    if (!this.#racine) {
      this.#racine = nouveau;
      return this;
    }
    let n = this.#racine;
    while (n.valeur !== x) {
      const cote = x < n.valeur ? 'gauche' : 'droite';
      const suivant = n[cote];
      if (!suivant) {
        n[cote] = nouveau;
        break;
      }
      n = suivant;
    }
    return this;
  }

  contient(x: number): boolean {
    let n = this.#racine;
    while (n && n.valeur !== x) n = x < n.valeur ? n.gauche : n.droite;
    return n !== null;
  }

  #bout(cote: 'gauche' | 'droite'): number | undefined {
    let n = this.#racine;
    while (n?.[cote]) n = n[cote];
    return n?.valeur;
  }

  min(): number | undefined {
    return this.#bout('gauche');
  }

  max(): number | undefined {
    return this.#bout('droite');
  }

  hauteur(): number {
    const h = (n: Noeud | null): number => (n ? 1 + Math.max(h(n.gauche), h(n.droite)) : 0);
    return h(this.#racine);
  }

  *[Symbol.iterator](): Generator<number> {
    const pile: Noeud[] = [];
    let n = this.#racine;
    while (n || pile.length > 0) {
      while (n) {
        pile.push(n);
        n = n.gauche;
      }
      const noeud = pile.pop()!;
      yield noeud.valeur;
      n = noeud.droite;
    }
  }
}

@@ code parcours | Questions sur un arbre | ts
Avec le type donné :

- `parNiveaux(n)` : les valeurs niveau par niveau (`number[][]`)
- `symetrique(n)` : l'arbre est-il son propre reflet ?
- `cheminsDeSomme(n, cible)` : les chemins de la racine à une **feuille** dont la somme vaut `cible`
@starter
interface Noeud {
  v: number;
  g?: Noeud;
  d?: Noeud;
}

@test `parNiveaux`
expect(parNiveaux({ v: 1, g: { v: 2, d: { v: 4 } }, d: { v: 3 } })).toEqual([[1], [2, 3], [4]]); expect(parNiveaux(undefined)).toEqual([]);
@test `symetrique`
expect(symetrique({ v: 1, g: { v: 2, g: { v: 3 } }, d: { v: 2, d: { v: 3 } } })).toBe(true); expect(symetrique({ v: 1, g: { v: 2, g: { v: 3 } }, d: { v: 2, g: { v: 3 } } })).toBe(false); expect(symetrique(undefined)).toBe(true);
@test `cheminsDeSomme`
expect(cheminsDeSomme({ v: 5, g: { v: 4, g: { v: 2 } }, d: { v: 3, g: { v: 3 }, d: { v: 9 } } }, 11)).toEqual([[5, 4, 2], [5, 3, 3]]); expect(cheminsDeSomme({ v: 1, g: { v: 2 } }, 1)).toEqual([]);
@solution
interface Noeud {
  v: number;
  g?: Noeud;
  d?: Noeud;
}

function parNiveaux(racine: Noeud | undefined): number[][] {
  const resultat: number[][] = [];
  let niveau = racine ? [racine] : [];
  while (niveau.length > 0) {
    resultat.push(niveau.map((n) => n.v));
    niveau = niveau.flatMap((n) => [n.g, n.d]).filter((n) => n !== undefined);
  }
  return resultat;
}

function reflets(a: Noeud | undefined, b: Noeud | undefined): boolean {
  if (!a || !b) return a === b;
  return a.v === b.v && reflets(a.g, b.d) && reflets(a.d, b.g);
}

function symetrique(racine: Noeud | undefined): boolean {
  return reflets(racine?.g, racine?.d);
}

function cheminsDeSomme(racine: Noeud | undefined, cible: number): number[][] {
  if (!racine) return [];
  const { v, g, d } = racine;
  if (!g && !d) return v === cible ? [[v]] : [];
  return [...cheminsDeSomme(g, cible - v), ...cheminsDeSomme(d, cible - v)].map((c) => [v, ...c]);
}

@@ code trie | Autocomplétion | ts
Classe `Trie` : `ajouter(mot)` (renvoie `this`), `contient(mot)`, `suggestions(prefixe, max = 10)` : les mots qui commencent ainsi, par ordre alphabétique. Ne parcours que la branche utile.
@starter
class Trie {
}
@test Contient seulement des mots entiers
const t = new Trie().ajouter('chat').ajouter('chaton'); expect([t.contient('chat'), t.contient('cha'), t.contient('chaton'), t.contient('')]).toEqual([true, false, true, false]);
@test Suggestions
const t = new Trie(); for (const m of ['chien', 'chaton', 'chat', 'loup']) t.ajouter(m); expect(t.suggestions('ch')).toEqual(['chat', 'chaton', 'chien']); expect([t.suggestions('x'), t.suggestions('', 2)]).toEqual([[], ['chat', 'chaton']]);
@test Beaucoup de mots
const t = new Trie(); for (let i = 0; i < 20_000; i++) t.ajouter(i.toString(36).padStart(4, 'a')); const d = performance.now(); for (let i = 0; i < 1000; i++) t.suggestions('aa1', 3); expect(performance.now() - d).toBeLessThan(800);
@solution
interface Branche {
  fin: boolean;
  enfants: Map<string, Branche>;
}

const branche = (): Branche => ({ fin: false, enfants: new Map() });

class Trie {
  #racine = branche();

  #aller(texte: string): Branche | undefined {
    let b: Branche | undefined = this.#racine;
    for (const c of texte) b = b?.enfants.get(c);
    return b;
  }

  ajouter(mot: string): this {
    let b = this.#racine;
    for (const c of mot) {
      let suivante = b.enfants.get(c);
      if (!suivante) b.enfants.set(c, (suivante = branche()));
      b = suivante;
    }
    b.fin = true;
    return this;
  }

  contient(mot: string): boolean {
    return this.#aller(mot)?.fin ?? false;
  }

  suggestions(prefixe: string, max = 10): string[] {
    const resultat: string[] = [];
    const explorer = (b: Branche, mot: string): void => {
      if (resultat.length >= max) return;
      if (b.fin) resultat.push(mot);
      for (const c of [...b.enfants.keys()].sort()) {
        if (resultat.length >= max) return;
        explorer(b.enfants.get(c)!, mot + c);
      }
    };
    const depart = this.#aller(prefixe);
    if (depart) explorer(depart, prefixe);
    return resultat;
  }
}

@@ defi serialiser | Aller-retour en texte | ts
`ecrire(arbre)` transforme un arbre en texte, `lire(texte)` fait l'inverse, **exactement**. Format libre, mais **sans** `JSON`. Les valeurs sont des textes quelconques (virgules, guillemets, parenthèses, vides…).
@starter
interface Noeud {
  valeur: string;
  enfants: Noeud[];
}

@test Aller-retour
const n = (valeur, ...enfants) => ({ valeur, enfants }); for (const a of [n('a'), n('a', n('b'), n('c', n('d'))), n('', n(''))]) expect(lire(ecrire(a))).toEqual(a);
@test Caractères pièges
const n = (valeur, ...enfants) => ({ valeur, enfants }); for (const v of ['a,b', '(x)', '"', '\\', '\\"', '3:abc', '\n', '[]{}', '👍', '12']) { const a = n(v, n(v), n('z')); expect(lire(ecrire(a)), v).toEqual(a); }
@test Grand arbre
let a = { valeur: 'x', enfants: [] }; for (let i = 0; i < 500; i++) a = { valeur: String(i), enfants: [a, { valeur: 'f', enfants: [] }] }; expect(lire(ecrire(a))).toEqual(a);
@test Sans JSON
expect($source).not.toMatch(/JSON/);
@hint
Le plus simple : préfixer chaque valeur par sa **longueur** (`3:abc`), puis le nombre d'enfants. Aucun échappement n'est alors nécessaire.
@solution
interface Noeud {
  valeur: string;
  enfants: Noeud[];
}

// <longueur>:<valeur><nombre d'enfants>;<enfants…>
function ecrire({ valeur, enfants }: Noeud): string {
  return `${valeur.length}:${valeur}${enfants.length};${enfants.map(ecrire).join('')}`;
}

function lire(texte: string): Noeud {
  let i = 0;
  const nombre = (fin: string): number => {
    const j = texte.indexOf(fin, i);
    const n = Number(texte.slice(i, j));
    i = j + 1;
    return n;
  };
  const noeud = (): Noeud => {
    const longueur = nombre(':');
    const valeur = texte.slice(i, i + longueur);
    i += longueur;
    const combien = nombre(';');
    const enfants: Noeud[] = [];
    for (let k = 0; k < combien; k++) enfants.push(noeud());
    return { valeur, enfants };
  };
  return noeud();
}

@@ predict infixe
Le parcours infixe d'un arbre binaire de recherche donne :
@answer Les valeurs triées
@wrong Les valeurs niveau par niveau
@wrong La racine en premier
@wrong L'ordre d'insertion
@why Gauche (plus petits), nœud, droite (plus grands).

@@ predict abr-trie
On insère 1, 2, 3, …, n dans un arbre binaire de recherche simple. Sa hauteur ?
@answer n
@wrong log₂ n
@wrong 2
@wrong n / 2
@why Chaque valeur va à droite : l'arbre devient une liste. Il faut un arbre équilibré.

@@ card largeur-profondeur
Structure pour un parcours en largeur ? En profondeur ?
@back
Largeur : une file. Profondeur : une pile (ou la récursion).

@@ card trie-quoi
À quoi sert un trie ?
@back
À chercher par préfixe (autocomplétion), en temps proportionnel à la longueur du mot.
