# Mini-projets : les bases
> Trois petits programmes complets, étape par étape.

@@ code panier | Le panier d'achat | js
Tu écris la logique d'un panier. Un **article** est un objet `{ nom, prix, quantite }`, un **panier** est un tableau d'articles. Aucune fonction ne doit modifier le panier reçu : renvoie toujours un nouveau tableau.

Chaque étape se débloque quand la précédente est réussie.
@starter
const panierVide = [];

@part Ajouter
`ajouter(panier, nom, prix, quantite = 1)` renvoie un panier avec cet article en plus. Si un article du même nom existe déjà, augmente sa quantité.
@test Ajoute un nouvel article
expect(ajouter([], 'livre', 10)).toEqual([{ nom: 'livre', prix: 10, quantite: 1 }]);
@test Cumule les quantités
expect(ajouter([{ nom: 'livre', prix: 10, quantite: 1 }], 'livre', 10, 3)).toEqual([{ nom: 'livre', prix: 10, quantite: 4 }]);
@test Ne modifie rien
const p = [{ nom: 'livre', prix: 10, quantite: 1 }]; ajouter(p, 'livre', 10); ajouter(p, 'sac', 5); expect(p).toEqual([{ nom: 'livre', prix: 10, quantite: 1 }]);
@part Retirer
`retirer(panier, nom)` enlève **un** exemplaire ; à zéro, l'article disparaît. Un nom inconnu ne change rien.
@test Diminue la quantité
expect(retirer([{ nom: 'livre', prix: 10, quantite: 2 }], 'livre')).toEqual([{ nom: 'livre', prix: 10, quantite: 1 }]);
@test Disparaît à zéro
expect(retirer([{ nom: 'a', prix: 1, quantite: 1 }, { nom: 'b', prix: 1, quantite: 1 }], 'a')).toEqual([{ nom: 'b', prix: 1, quantite: 1 }]);
@test Nom inconnu
expect(retirer([{ nom: 'a', prix: 1, quantite: 1 }], 'z')).toEqual([{ nom: 'a', prix: 1, quantite: 1 }]);
@part Calculer le total
`total(panier, code)` additionne prix × quantité, puis applique le code promo : `'MOINS10'` retire 10 %, `'MOINS5EUR'` retire 5 (sans passer sous 0). Un autre code, ou aucun, ne change rien. Arrondis à 2 décimales (le résultat est un nombre).
@test Sans code
expect(total([{ nom: 'a', prix: 10, quantite: 2 }, { nom: 'b', prix: 1.5, quantite: 1 }])).toBe(21.5);
@test Codes promo
const p = [{ nom: 'a', prix: 20, quantite: 1 }]; expect(total(p, 'MOINS10')).toBe(18); expect(total(p, 'MOINS5EUR')).toBe(15); expect(total(p, 'FAUX')).toBe(20);
@test Jamais négatif, et arrondi
expect(total([{ nom: 'a', prix: 2, quantite: 1 }], 'MOINS5EUR')).toBe(0);
expect(total([{ nom: 'a', prix: 0.1, quantite: 3 }])).toBe(0.3);
@part Le ticket
`ticket(panier)` renvoie un texte, une ligne par article puis le total :

```
2 x livre : 20.00 €
1 x sac : 5.50 €
Total : 25.50 €
```

Pour un panier vide : `Panier vide`.
@test Panier vide
expect(ticket([])).toBe('Panier vide');
@test Un ticket complet
expect(ticket([{ nom: 'livre', prix: 10, quantite: 2 }, { nom: 'sac', prix: 5.5, quantite: 1 }])).toBe('2 x livre : 20.00 €\n1 x sac : 5.50 €\nTotal : 25.50 €');
@hint
Ajouter : `panier.some((a) => a.nom === nom)` dit si l'article existe ; ensuite `map` pour modifier seulement celui-là.
@hint
Retirer : `map` pour diminuer la quantité, puis `filter` pour enlever ceux à 0.
@hint
Arrondir : `Math.round(x * 100) / 100`.
@solution
const panierVide = [];

function ajouter(panier, nom, prix, quantite = 1) {
  if (!panier.some((a) => a.nom === nom)) return [...panier, { nom, prix, quantite }];
  return panier.map((a) => (a.nom === nom ? { ...a, quantite: a.quantite + quantite } : a));
}

function retirer(panier, nom) {
  return panier
    .map((a) => (a.nom === nom ? { ...a, quantite: a.quantite - 1 } : a))
    .filter((a) => a.quantite > 0);
}

function total(panier, code) {
  let somme = panier.reduce((s, a) => s + a.prix * a.quantite, 0);
  if (code === 'MOINS10') somme *= 0.9;
  if (code === 'MOINS5EUR') somme = Math.max(0, somme - 5);
  return Math.round(somme * 100) / 100;
}

function ticket(panier) {
  if (panier.length === 0) return 'Panier vide';
  const lignes = panier.map((a) => `${a.quantite} x ${a.nom} : ${(a.prix * a.quantite).toFixed(2)} €`);
  return [...lignes, `Total : ${total(panier).toFixed(2)} €`].join('\n');
}

@@ code texte | Analyseur de texte | js
Un outil qui donne des statistiques sur un texte.
@starter

@part Les mots
`mots(texte)` renvoie la liste des mots, en minuscules. Un mot est une suite de lettres (accents compris), de chiffres ou d'apostrophes droites. La ponctuation disparaît.
@test Découpe
expect(mots('Le chat, le CHIEN !')).toEqual(['le', 'chat', 'le', 'chien']);
@test Apostrophes et accents
expect(mots("C'est l'été.")).toEqual(["c'est", "l'été"]);
@test Vide
expect(mots('  ... ')).toEqual([]);
@part Les fréquences
`frequences(texte)` renvoie un tableau de paires `[mot, nombre]`, du plus fréquent au moins fréquent ; à égalité, par ordre alphabétique.
@test Compte et trie
expect(frequences('b a b c a b')).toEqual([['b', 3], ['a', 2], ['c', 1]]);
@test Égalités par ordre alphabétique
expect(frequences('z a m')).toEqual([['a', 1], ['m', 1], ['z', 1]]);
@part Le résumé
`resume(texte)` renvoie `{ mots, uniques, plusLong, plusFrequent }` : nombre de mots, nombre de mots différents, le plus long (le premier en cas d'égalité) et le plus fréquent. Les deux derniers valent `null` sans mot.
@test Un texte
expect(resume('le grand chat et le petit chat noir le')).toEqual({ mots: 9, uniques: 6, plusLong: 'grand', plusFrequent: 'le' });
@test Vide
expect(resume('')).toEqual({ mots: 0, uniques: 0, plusLong: null, plusFrequent: null });
@hint
`texte.toLowerCase().match(/[\p{L}\d']+/gu) ?? []` : `\p{L}` reconnaît toute lettre, `match` renvoie `null` s'il ne trouve rien.
@hint
Tri à deux critères : `(a, b) => b[1] - a[1] || a[0].localeCompare(b[0])`.
@solution
function mots(texte) {
  return texte.toLowerCase().match(/[\p{L}\d']+/gu) ?? [];
}

function frequences(texte) {
  const compte = {};
  for (const mot of mots(texte)) compte[mot] = (compte[mot] ?? 0) + 1;
  return Object.entries(compte).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function resume(texte) {
  const liste = mots(texte);
  const freq = frequences(texte);
  return {
    mots: liste.length,
    uniques: freq.length,
    plusLong: liste.reduce((max, mot) => (max === null || mot.length > max.length ? mot : max), null),
    plusFrequent: freq[0]?.[0] ?? null,
  };
}

@@ code notes | Carnet de notes, en TypeScript | ts
Cette fois, tout est typé. Un élève a un `nom` et des `notes` par matière.
@starter

@part Les types
Déclare :

- le type `Matiere` : `'maths' | 'français' | 'sport'`
- l'interface `Eleve` : `nom` (texte, lecture seule) et `notes`, un `Partial<Record<Matiere, number[]>>` (pas forcément toutes les matières)
@types `Matiere` n'accepte que les trois textes
const m: Matiere = 'sport';
// @ts-expect-error
const n: Matiere = 'chimie';
@types Un élève valable
const e: Eleve = { nom: 'Ada', notes: { maths: [12] } };
// @ts-expect-error
e.nom = 'Autre';
@part Ajouter une note
`noter(eleve, matiere, note)` renvoie une **copie** de l'élève avec la note en plus. Une note hors de 0–20 lance `new RangeError('Note invalide')` (`throw new RangeError(…)`).
@test Première note, puis une autre
const e = noter({ nom: 'Ada', notes: {} }, 'maths', 12); expect(e).toEqual({ nom: 'Ada', notes: { maths: [12] } });
expect(noter(e, 'maths', 18).notes.maths).toEqual([12, 18]);
@test Copie
const e = { nom: 'Ada', notes: { maths: [1] } }; noter(e, 'maths', 2); expect(e.notes.maths).toEqual([1]);
@test Note invalide
expect(() => noter({ nom: 'Ada', notes: {} }, 'maths', 21)).toThrow(RangeError);
@types Signature
const e: Eleve = noter({ nom: 'A', notes: {} }, 'sport', 3);
// @ts-expect-error
noter({ nom: 'A', notes: {} }, 'chimie', 3);
@part Les moyennes
`moyenne(notes: number[])` renvoie `number | null` (`null` si vide) ; `moyenneGenerale(eleve)` est la moyenne des moyennes de chaque matière **notée**, ou `null`.
@test `moyenne`
expect(moyenne([10, 15])).toBe(12.5); expect(moyenne([])).toBe(null);
@test `moyenneGenerale`
expect(moyenneGenerale({ nom: 'A', notes: { maths: [10, 20], sport: [5] } })).toBe(10);
expect(moyenneGenerale({ nom: 'A', notes: { maths: [] } })).toBe(null);
@types Retours
type _ = [$Expect<$Equal<ReturnType<typeof moyenne>, number | null>>, $Expect<$Equal<ReturnType<typeof moyenneGenerale>, number | null>>];
@part Le classement
`classement(eleves)` renvoie les noms, de la meilleure moyenne générale à la moins bonne. Les élèves sans moyenne sont à la fin, dans leur ordre d'origine.
@test Classe
expect(classement([{ nom: 'A', notes: { maths: [8] } }, { nom: 'B', notes: {} }, { nom: 'C', notes: { sport: [18] } }])).toEqual(['C', 'A', 'B']);
@test Ne modifie pas la liste
const l = [{ nom: 'A', notes: { maths: [8] } }, { nom: 'C', notes: { sport: [18] } }]; classement(l); expect(l[0].nom).toBe('A');
@hint
Dans `noter` : `{ ...eleve, notes: { ...eleve.notes, [matiere]: [...(eleve.notes[matiere] ?? []), note] } }`.
@hint
Pour écarter les `null` d'un tableau, TypeScript comprend `.filter((m) => m !== null)`.
@solution
type Matiere = 'maths' | 'français' | 'sport';

interface Eleve {
  readonly nom: string;
  notes: Partial<Record<Matiere, number[]>>;
}

function noter(eleve: Eleve, matiere: Matiere, note: number): Eleve {
  if (note < 0 || note > 20) throw new RangeError('Note invalide');
  return { ...eleve, notes: { ...eleve.notes, [matiere]: [...(eleve.notes[matiere] ?? []), note] } };
}

function moyenne(notes: number[]): number | null {
  if (notes.length === 0) return null;
  return notes.reduce((s, n) => s + n, 0) / notes.length;
}

function moyenneGenerale(eleve: Eleve): number | null {
  const moyennes = Object.values(eleve.notes).map(moyenne).filter((m) => m !== null);
  return moyenne(moyennes);
}

function classement(eleves: Eleve[]): string[] {
  return eleves
    .toSorted((a, b) => (moyenneGenerale(b) ?? -1) - (moyenneGenerale(a) ?? -1))
    .map((e) => e.nom);
}
