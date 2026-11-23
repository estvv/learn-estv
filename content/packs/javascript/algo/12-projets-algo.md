# Mini-projets : algorithmes
> Un tableur, un langage, un moteur de recherche.

@@ code tableur | Un tableur | ts
Des cellules `A1`, `B2`… qui contiennent un nombre, un texte ou une **formule**. Changer une cellule recalcule celles qui en dépendent.
@starter

@part Valeurs simples
`creerTableur()` renvoie `{ ecrire(cellule, contenu: string), lire(cellule) }`. `lire` donne un nombre si le contenu en est un, sinon le texte, et `''` pour une cellule vide.
@test Nombres et textes
const t = creerTableur(); t.ecrire('A1', '12.5'); t.ecrire('B1', 'salut'); expect([t.lire('A1'), t.lire('B1'), t.lire('Z9')]).toEqual([12.5, 'salut', '']);
@test Remplacer et vider
const t = creerTableur(); t.ecrire('A1', '1'); t.ecrire('A1', '2'); expect(t.lire('A1')).toBe(2); t.ecrire('A1', ''); expect(t.lire('A1')).toBe('');
@part Formules
Un contenu qui commence par `=` est une formule : nombres, références, `+ - * /` et parenthèses, avec les priorités habituelles. Une cellule vide vaut 0.
@test Calculs
const t = creerTableur(); t.ecrire('A1', '2'); t.ecrire('A2', '3'); t.ecrire('A3', '=A1+A2*4'); t.ecrire('A4', '=(A1+A2)*4-B9'); expect([t.lire('A3'), t.lire('A4')]).toEqual([14, 20]);
@test Signe moins
const t = creerTableur(); t.ecrire('A1', '=-3+5'); t.ecrire('A2', '=2*-A1'); expect([t.lire('A1'), t.lire('A2')]).toEqual([2, -4]);
@test Se met à jour
const t = creerTableur(); t.ecrire('A1', '1'); t.ecrire('B1', '=A1*10'); t.ecrire('C1', '=B1+1'); t.ecrire('A1', '5'); expect(t.lire('C1')).toBe(51);
@part Erreurs
Les erreurs sont des textes : `#SYNTAXE` (formule mal écrite), `#VALEUR` (calcul sur un texte), `#DIV` (division par zéro), `#CYCLE` (référence circulaire). Une formule qui lit une erreur donne **la même** erreur.
@test Syntaxe, valeur, division
const t = creerTableur(); t.ecrire('A1', '=1+'); t.ecrire('B1', 'abc'); t.ecrire('A2', '=B1+1'); t.ecrire('A3', '=1/0'); t.ecrire('A4', '=(1'); expect(['A1', 'A2', 'A3', 'A4'].map(t.lire)).toEqual(['#SYNTAXE', '#VALEUR', '#DIV', '#SYNTAXE']);
@test Propagation
const t = creerTableur(); t.ecrire('A1', '=1/0'); t.ecrire('A2', '=A1+1'); expect(t.lire('A2')).toBe('#DIV');
@test Cycles
const t = creerTableur(); t.ecrire('A1', '=B1'); t.ecrire('B1', '=A1+1'); t.ecrire('C1', '=C1'); expect([t.lire('A1'), t.lire('C1')]).toEqual(['#CYCLE', '#CYCLE']); t.ecrire('B1', '7'); expect(t.lire('A1')).toBe(7);
@part Fonctions
`SOMME`, `MOYENNE`, `MIN`, `MAX`, avec une plage `A1:B3` et/ou des expressions séparées par `;`. Dans une plage, les textes et les cellules vides sont ignorés. `MOYENNE` d'aucun nombre : `#DIV` ; `MIN`, `MAX` et `SOMME` d'aucun nombre : 0.
@test Plages
const t = creerTableur(); t.ecrire('A1', '1'); t.ecrire('A2', '2'); t.ecrire('B1', 'x'); t.ecrire('B2', '=A1+A2'); t.ecrire('C1', '=SOMME(A1:B3)'); t.ecrire('C2', '=MAX(A1:B2;10)*2'); t.ecrire('C3', '=MOYENNE(A1:A2)'); expect(['C1', 'C2', 'C3'].map(t.lire)).toEqual([6, 20, 1.5]);
@test Vides
const t = creerTableur(); t.ecrire('A1', '=SOMME(D1:D9)'); t.ecrire('A2', '=MOYENNE(D1:D9)'); t.ecrire('A3', '=MIN(D1:D2)'); expect(['A1', 'A2', 'A3'].map(t.lire)).toEqual([0, '#DIV', 0]);
@test Inconnue, et cycle par une plage
const t = creerTableur(); t.ecrire('A1', '=ZUT(1)'); t.ecrire('B1', '=SOMME(B1:B3)'); expect([t.lire('A1'), t.lire('B1')]).toEqual(['#SYNTAXE', '#CYCLE']);
@hint
Pas besoin de graphe : recalcule à la lecture, avec l'ensemble des cellules **en cours** d'évaluation pour détecter les cycles.
@hint
Une classe d'erreur `ErreurFormule extends Error` avec un code, lancée n'importe où et attrapée dans `lire`.
@solution
type Valeur = number | string;

class ErreurFormule extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

const FONCTIONS: Record<string, (n: number[]) => number> = {
  SOMME: (n) => n.reduce((a, b) => a + b, 0),
  MOYENNE(n) {
    if (n.length === 0) throw new ErreurFormule('#DIV');
    return FONCTIONS.SOMME(n) / n.length;
  },
  MIN: (n) => (n.length ? Math.min(...n) : 0),
  MAX: (n) => (n.length ? Math.max(...n) : 0),
};

const syntaxe = (): never => {
  throw new ErreurFormule('#SYNTAXE');
};

function colonne(lettres: string): number {
  return [...lettres].reduce((n, l) => n * 26 + l.charCodeAt(0) - 64, 0);
}

function nomColonne(n: number): string {
  return n === 0 ? '' : nomColonne(Math.floor((n - 1) / 26)) + String.fromCharCode(65 + ((n - 1) % 26));
}

function plage(debut: string, fin: string): string[] {
  const [, c1, l1] = /^([A-Z]+)(\d+)$/.exec(debut) ?? syntaxe();
  const [, c2, l2] = /^([A-Z]+)(\d+)$/.exec(fin) ?? syntaxe();
  const cellules: string[] = [];
  for (let l = Number(l1); l <= Number(l2); l++) {
    for (let c = colonne(c1); c <= colonne(c2); c++) cellules.push(`${nomColonne(c)}${l}`);
  }
  return cellules;
}

function evaluer(formule: string, lire: (cellule: string) => Valeur): number {
  const jetons = formule.match(/\d+(?:\.\d+)?|[A-Z]+\d+|[A-Z]+|\S/g) ?? [];
  let i = 0;
  const prendre = (...attendus: string[]): string | null => {
    const jeton = jetons[i];
    if (jeton === undefined || !attendus.includes(jeton)) return null;
    i++;
    return jeton;
  };
  const exiger = (attendu: string): void => {
    if (!prendre(attendu)) syntaxe();
  };

  const nombre = (cellule: string): number => {
    const v = lire(cellule);
    if (v === '') return 0;
    if (typeof v === 'string') throw new ErreurFormule('#VALEUR');
    return v;
  };

  const argument = (): number[] => {
    if (/^[A-Z]+\d+$/.test(jetons[i] ?? '') && jetons[i + 1] === ':') {
      const [debut, , fin] = jetons.slice(i, i + 3);
      i += 3;
      return plage(debut, fin ?? '').map(lire).filter((v) => typeof v === 'number');
    }
    return [somme()];
  };

  const facteur = (): number => {
    if (prendre('-')) return -facteur();
    if (prendre('(')) {
      const n = somme();
      exiger(')');
      return n;
    }
    const jeton = jetons[i++] ?? syntaxe();
    if (/^\d/.test(jeton)) return Number(jeton);
    if (/^[A-Z]+\d+$/.test(jeton)) return nombre(jeton);
    if (!Object.hasOwn(FONCTIONS, jeton)) return syntaxe();
    exiger('(');
    const nombres = argument();
    while (prendre(';')) nombres.push(...argument());
    exiger(')');
    return FONCTIONS[jeton](nombres);
  };

  const produit = (): number => {
    let n = facteur();
    for (let op = prendre('*', '/'); op; op = prendre('*', '/')) {
      const m = facteur();
      if (op === '/' && m === 0) throw new ErreurFormule('#DIV');
      n = op === '*' ? n * m : n / m;
    }
    return n;
  };

  const somme = (): number => {
    let n = produit();
    for (let op = prendre('+', '-'); op; op = prendre('+', '-')) n += op === '+' ? produit() : -produit();
    return n;
  };

  const resultat = somme();
  if (i < jetons.length) syntaxe();
  return resultat;
}

function creerTableur() {
  const contenus = new Map<string, string>();
  const enCours = new Set<string>();

  // Lance une ErreurFormule, pour que les formules la propagent
  const valeur = (cellule: string): Valeur => {
    const contenu = contenus.get(cellule) ?? '';
    if (!contenu.startsWith('=')) {
      return contenu.trim() === '' || Number.isNaN(Number(contenu)) ? contenu : Number(contenu);
    }
    if (enCours.has(cellule)) throw new ErreurFormule('#CYCLE');
    enCours.add(cellule);
    try {
      return evaluer(contenu.slice(1), valeur);
    } finally {
      enCours.delete(cellule);
    }
  };

  return {
    ecrire(cellule: string, contenu: string): void {
      contenus.set(cellule, contenu);
    },
    lire(cellule: string): Valeur {
      try {
        return valeur(cellule);
      } catch (e) {
        if (e instanceof ErreurFormule) return e.code;
        throw e;
      }
    },
  };
}

@@ code moteur | Un moteur de recherche | ts
Un index inversé, comme dans un vrai moteur.
@starter
interface Document {
  id: number;
  titre: string;
  texte: string;
}

@part Indexer et chercher
`creerMoteur()` renvoie `{ ajouter(doc), chercher(requete): number[] }`. `chercher` donne les ids des documents qui contiennent **tous** les mots (dans le titre ou le texte), triés par id. Sans casse ni accents ; un mot est une suite de lettres ou chiffres.
@test Un mot, plusieurs mots
const m = creerMoteur(); m.ajouter({ id: 1, titre: 'Le chat', texte: 'dort beaucoup' }); m.ajouter({ id: 2, titre: 'Le chien', texte: 'dort' }); expect([m.chercher('dort'), m.chercher('chat DORT'), m.chercher('zut'), m.chercher('')]).toEqual([[1, 2], [1], [], []]);
@test Sans accents
const m = creerMoteur(); m.ajouter({ id: 1, titre: 'Été', texte: '' }); expect(m.chercher('ete')).toEqual([1]);
@test Rapide
const m = creerMoteur(); for (let i = 0; i < 3000; i++) m.ajouter({ id: i, titre: `titre ${i}`, texte: 'un texte commun '.repeat(5) }); const t = performance.now(); for (let i = 0; i < 500; i++) m.chercher(`titre ${i}`); expect(performance.now() - t).toBeLessThan(1500);
@part Classer
Les résultats sont triés par **score** décroissant (puis par id) : chaque mot de la requête compte 1 par apparition dans le texte, et **3** par apparition dans le titre.
@test Le titre compte plus
const m = creerMoteur(); m.ajouter({ id: 1, titre: 'a', texte: 'piano piano' }); m.ajouter({ id: 2, titre: 'piano', texte: '' }); m.ajouter({ id: 3, titre: 'b', texte: 'piano' }); expect(m.chercher('piano')).toEqual([2, 1, 3]);
@part Retirer et remplacer
`retirer(id)` enlève un document. Ajouter un document d'`id` existant le **remplace**.
@test Retirer
const m = creerMoteur(); m.ajouter({ id: 1, titre: 'a', texte: 'x' }); m.ajouter({ id: 2, titre: 'a', texte: 'y' }); m.retirer(1); m.retirer(99); expect([m.chercher('a'), m.chercher('x')]).toEqual([[2], []]);
@test Remplacer
const m = creerMoteur(); m.ajouter({ id: 1, titre: 'ancien', texte: '' }); m.ajouter({ id: 1, titre: 'nouveau', texte: '' }); expect([m.chercher('ancien'), m.chercher('nouveau')]).toEqual([[], [1]]);
@part Requêtes avancées
- `-mot` : exclut les documents qui contiennent le mot
- `mot*` : tous les mots qui **commencent** ainsi (leurs scores s'additionnent)

Une requête qui n'a que des exclusions ne donne rien.
@test Exclusion
const m = creerMoteur(); m.ajouter({ id: 1, titre: 'chat noir', texte: '' }); m.ajouter({ id: 2, titre: 'chat blanc', texte: '' }); expect([m.chercher('chat -noir'), m.chercher('-noir')]).toEqual([[2], []]);
@test Préfixe
const m = creerMoteur(); m.ajouter({ id: 1, titre: '', texte: 'chaton' }); m.ajouter({ id: 2, titre: 'chat', texte: 'chats' }); expect([m.chercher('chat*'), m.chercher('chato*'), m.chercher('chat* -chaton')]).toEqual([[2, 1], [1], [2]]);
@hint
Index : `Map<mot, Map<id, score>>`. Garde aussi, par document, la liste de ses mots, pour le retirer vite.
@solution
interface Document {
  id: number;
  titre: string;
  texte: string;
}

type Scores = Map<number, number>;

const simplifier = (texte: string): string =>
  texte.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const mots = (texte: string): string[] => simplifier(texte).match(/[\p{L}\d]+/gu) ?? [];

function creerMoteur() {
  const index = new Map<string, Scores>();
  const motsDe = new Map<number, Set<string>>();

  const noter = (mot: string, id: number, points: number): void => {
    let scores = index.get(mot);
    if (!scores) index.set(mot, (scores = new Map()));
    scores.set(id, (scores.get(id) ?? 0) + points);
    motsDe.get(id)?.add(mot);
  };

  const retirer = (id: number): void => {
    for (const mot of motsDe.get(id) ?? []) {
      const scores = index.get(mot);
      scores?.delete(id);
      if (scores?.size === 0) index.delete(mot);
    }
    motsDe.delete(id);
  };

  const scoresDe = (terme: string): Scores => {
    const total: Scores = new Map();
    for (const mot of mots(terme)) {
      const trouves = terme.endsWith('*')
        ? [...index].filter(([m]) => m.startsWith(mot)).map(([, s]) => s)
        : [index.get(mot) ?? new Map<number, number>()];
      for (const scores of trouves) {
        for (const [id, n] of scores) total.set(id, (total.get(id) ?? 0) + n);
      }
    }
    return total;
  };

  return {
    ajouter({ id, titre, texte }: Document): void {
      retirer(id);
      motsDe.set(id, new Set());
      for (const mot of mots(titre)) noter(mot, id, 3);
      for (const mot of mots(texte)) noter(mot, id, 1);
    },
    retirer,
    chercher(requete: string): number[] {
      const termes = requete.split(/\s+/).filter((t) => mots(t).length > 0);
      const voulus = termes.filter((t) => !t.startsWith('-')).map(scoresDe);
      if (voulus.length === 0) return [];
      const exclus = new Set(termes.filter((t) => t.startsWith('-')).flatMap((t) => [...scoresDe(t.slice(1)).keys()]));
      const [premier] = voulus;
      return [...premier.keys()]
        .filter((id) => !exclus.has(id) && voulus.every((s) => s.has(id)))
        .map((id) => ({ id, score: voulus.reduce((n, s) => n + (s.get(id) ?? 0), 0) }))
        .sort((a, b) => b.score - a.score || a.id - b.id)
        .map(({ id }) => id);
    },
  };
}

@@ code langage | Un petit langage | ts
Un interpréteur de **Lisp** : `(+ 1 (* 2 3))` vaut 7. Une expression est un nombre, un symbole, ou une liste dont le premier élément dit quoi faire.
@starter
type Expression = number | string | Expression[];

@part Lire
`lire(code): Expression[]` transforme le texte en expressions (il peut y en avoir plusieurs). Les nombres deviennent des `number`, le reste des symboles (textes), les parenthèses des tableaux. Une parenthèse en trop ou manquante lance une `SyntaxError`.
@test Atomes et listes
expect(lire('42 x (+ 1 -2.5)')).toEqual([42, 'x', ['+', 1, -2.5]]);
@test Imbriqué, sur plusieurs lignes
expect(lire('(a\n  (b (c))\n  ())')).toEqual([['a', ['b', ['c']], []]]);
@test Erreurs
for (const c of ['(', ')', '(a))', '((a)']) expect(() => lire(c), c).toThrow(SyntaxError);
@part Calculer
`executer(code)` évalue chaque expression et renvoie la valeur de la **dernière**. Opérations sur deux nombres ou plus : `+ - * /` ; comparaisons de deux nombres : `< > =` (booléens). Un symbole inconnu lance une `ReferenceError` contenant son nom.
@test Calculs
expect([executer('(+ 1 2 3)'), executer('(* 2 (- 10 4))'), executer('(/ 8 2 2)')]).toEqual([6, 12, 2]);
@test Comparaisons
expect([executer('(< 1 2)'), executer('(= 2 3)'), executer('(> 5 (+ 1 1))')]).toEqual([true, false, true]);
@test Plusieurs expressions, symbole inconnu
expect(executer('1 2 (+ 1 1)')).toBe(2); expect(() => executer('(+ zut 1)')).toThrow('zut'); expect(() => executer('(zut 1)')).toThrow(ReferenceError);
@part Variables et conditions
- `(def nom valeur)` : définit une variable
- `(si condition alors sinon)` : n'évalue **que** la branche choisie (`false` est faux, tout le reste est vrai)
@test Variables
expect(executer('(def x 5) (def y (* x 2)) (+ x y)')).toBe(15);
@test Conditions
expect([executer('(si (< 1 2) 10 20)'), executer('(si (> 1 2) 10 20)'), executer('(si (= 1 1) 1 (zut))')]).toEqual([10, 20, 1]);
@part Fonctions
`(fn (a b) corps)` crée une fonction, avec portée lexicale (closures) et récursion.
@test Appels
expect([executer('((fn (x) (* x x)) 7)'), executer('(def double (fn (x) (* 2 x))) (double (double 3))')]).toEqual([49, 12]);
@test Closures
expect(executer('(def plus (fn (a) (fn (b) (+ a b)))) (def p5 (plus 5)) (def a 100) (p5 3)')).toBe(8);
@test Récursion
expect(executer('(def fact (fn (n) (si (= n 0) 1 (* n (fact (- n 1)))))) (fact 10)')).toBe(3628800);
@test Fonctions d'ordre supérieur, variables locales
expect(executer('(def deux (fn (f x) (f (f x)))) (deux (fn (n) (* n 3)) 2)')).toBe(18); expect(() => executer('(def f (fn (z) z)) (f 1) z')).toThrow(ReferenceError);
@hint
Un **environnement** : une classe avec une `Map` et un parent. Une fonction garde l'environnement où elle a été créée ; l'appeler crée un environnement enfant.
@solution
type Expression = number | string | Expression[];
type Valeur = number | boolean | Fonction;
type Fonction = (...args: Valeur[]) => Valeur;

function lire(code: string): Expression[] {
  const jetons = code.match(/[()]|[^\s()]+/g) ?? [];
  const pile: Expression[][] = [[]];
  for (const jeton of jetons) {
    if (jeton === '(') {
      pile.push([]);
    } else if (jeton === ')') {
      const liste = pile.pop()!;
      const parent = pile.at(-1);
      if (!parent) throw new SyntaxError('Parenthèse fermante en trop');
      parent.push(liste);
    } else {
      pile.at(-1)!.push(Number.isNaN(Number(jeton)) ? jeton : Number(jeton));
    }
  }
  if (pile.length > 1) throw new SyntaxError('Parenthèse fermante manquante');
  return pile[0];
}

class Environnement {
  #valeurs = new Map<string, Valeur>();

  constructor(private readonly parent: Environnement | null = null) {}

  definir(nom: string, valeur: Valeur): Valeur {
    this.#valeurs.set(nom, valeur);
    return valeur;
  }

  lire(nom: string): Valeur {
    const valeur = this.#valeurs.get(nom);
    if (valeur !== undefined) return valeur;
    if (!this.parent) throw new ReferenceError(`${nom} n'existe pas`);
    return this.parent.lire(nom);
  }
}

function nombre(v: Valeur | undefined): number {
  if (typeof v !== 'number') throw new TypeError('Nombre attendu');
  return v;
}

function symbole(e: Expression | undefined): string {
  if (typeof e !== 'string') throw new SyntaxError('Nom attendu');
  return e;
}

const enchainer = (f: (a: number, b: number) => number): Fonction => (...args) => args.map(nombre).reduce(f);
const comparer = (f: (a: number, b: number) => boolean): Fonction => (a, b) => f(nombre(a), nombre(b));

function evaluer(e: Expression, env: Environnement): Valeur {
  if (typeof e === 'number') return e;
  if (typeof e === 'string') return env.lire(e);
  const [tete, ...reste] = e;
  if (tete === 'def') return env.definir(symbole(reste[0]), evaluer(reste[1], env));
  if (tete === 'si') return evaluer(evaluer(reste[0], env) === false ? reste[2] : reste[1], env);
  if (tete === 'fn') {
    const [params, corps] = reste;
    if (!Array.isArray(params)) throw new SyntaxError('Paramètres attendus');
    const noms = params.map(symbole);
    return (...args) => {
      const local = new Environnement(env);
      noms.forEach((nom, i) => local.definir(nom, args[i]));
      return evaluer(corps, local);
    };
  }
  const f = evaluer(tete ?? [], env);
  if (typeof f !== 'function') throw new TypeError('Fonction attendue');
  return f(...reste.map((x) => evaluer(x, env)));
}

function executer(code: string): Valeur | undefined {
  const env = new Environnement();
  env.definir('+', enchainer((a, b) => a + b));
  env.definir('-', enchainer((a, b) => a - b));
  env.definir('*', enchainer((a, b) => a * b));
  env.definir('/', enchainer((a, b) => a / b));
  env.definir('<', comparer((a, b) => a < b));
  env.definir('>', comparer((a, b) => a > b));
  env.definir('=', comparer((a, b) => a === b));
  return lire(code).map((e) => evaluer(e, env)).at(-1);
}
