# Mini-projets : React
> Un quiz, un tableau Kanban, une recherche avec pagination.

@@ code quiz-react | Un quiz | tsx
Un petit quiz complet. Les questions sont fournies en prop.
@starter main.tsx
import { useState } from 'react';

export interface Question {
  texte: string;
  choix: string[];
  bonne: number;
}

const DEMO: Question[] = [
  { texte: 'Capitale de la Corée du Sud ?', choix: ['Busan', 'Séoul'], bonne: 1 },
  { texte: '2 + 2 ?', choix: ['4', '5', '22'], bonne: 0 },
];

export function Quiz({ questions }: { questions: Question[] }) {
  return <div />;
}

export default function App() {
  return <Quiz questions={DEMO} />;
}
@part Une question
Affiche `<h2>` avec le texte, un `<button className="choix">` par choix, et `<p className="progres">Question 1 / 2</p>`.
@test La première question
const q = [{ texte: 'A ?', choix: ['x', 'y'], bonne: 1 }, { texte: 'B ?', choix: ['z'], bonne: 0 }]; const el = await $mount(<Quiz questions={q} />); expect($text('h2')).toBe('A ?'); expect($texts('.choix', el)).toEqual(['x', 'y']); expect($text('.progres')).toBe('Question 1 / 2');
@part Répondre
Cliquer sur un choix : tous se désactivent, le bon reçoit la classe `juste`, celui choisi (s'il est mauvais) la classe `faux`, et un bouton `.suite` `Suivant` apparaît.
@test Bonne réponse
const q = [{ texte: 'A ?', choix: ['x', 'y'], bonne: 1 }]; const el = await $mount(<Quiz questions={q} />); expect(el.querySelector('.suite')).toBe(null); await $click(el.querySelectorAll('.choix')[1]); expect([...el.querySelectorAll('.choix')].map((c) => [c.disabled, c.classList.contains('juste'), c.classList.contains('faux')])).toEqual([[true, false, false], [true, true, false]]);
@test Mauvaise réponse
const q = [{ texte: 'A ?', choix: ['x', 'y'], bonne: 1 }]; const el = await $mount(<Quiz questions={q} />); await $click(el.querySelectorAll('.choix')[0]); expect([...el.querySelectorAll('.choix')].map((c) => [c.classList.contains('juste'), c.classList.contains('faux')])).toEqual([[false, true], [true, false]]); expect(el.querySelectorAll('.suite')).toHaveLength(1);
@part Le score
`Suivant` passe à la question suivante. Après la dernière : `<p className="score">Score : 1 / 2</p>` et un bouton `.rejouer`, qui recommence tout.
@test Jusqu'au score
const q = [{ texte: 'A ?', choix: ['x', 'y'], bonne: 1 }, { texte: 'B ?', choix: ['z', 'w'], bonne: 0 }]; const el = await $mount(<Quiz questions={q} />); await $click(el.querySelectorAll('.choix')[1]); await $click('.suite'); expect([$text('h2'), el.querySelectorAll('.juste').length]).toEqual(['B ?', 0]); await $click(el.querySelectorAll('.choix')[1]); await $click('.suite'); expect($text('.score')).toBe('Score : 1 / 2'); expect(el.querySelector('h2')).toBe(null);
@test Rejouer
const q = [{ texte: 'A ?', choix: ['x'], bonne: 0 }]; const el = await $mount(<Quiz questions={q} />); await $click('.choix'); await $click('.suite'); await $click('.rejouer'); expect([$text('h2'), $text('.progres')]).toEqual(['A ?', 'Question 1 / 1']); await $click('.choix'); await $click('.suite'); expect($text('.score')).toBe('Score : 1 / 1');
@part Au clavier
Les touches `1`, `2`… choisissent une réponse, `Enter` passe à la suite. L'écoute se fait sur `document`, et s'arrête au démontage.
@test Clavier
const q = [{ texte: 'A ?', choix: ['x', 'y'], bonne: 1 }, { texte: 'B ?', choix: ['z'], bonne: 0 }]; const el = await $mount(<Quiz questions={q} />); await $key(document.body, '9'); await $key(document.body, '2'); expect(el.querySelectorAll('.juste')).toHaveLength(1); await $key(document.body, 'Enter'); expect($text('h2')).toBe('B ?'); await $key(document.body, '1'); await $key(document.body, 'Enter'); expect($text('.score')).toBe('Score : 2 / 2');
@test Écoute arrêtée au démontage
await $mount(<p />); let ajouts = 0; let retraits = 0; const { addEventListener: a, removeEventListener: r } = document; document.addEventListener = function (t, ...x) { if (t === 'keydown') ajouts++; return a.call(this, t, ...x); }; document.removeEventListener = function (t, ...x) { if (t === 'keydown') retraits++; return r.call(this, t, ...x); }; const el = await $mount(<Quiz questions={[{ texte: 'A', choix: ['x'], bonne: 0 }]} />); await el.$unmount(); document.addEventListener = a; document.removeEventListener = r; expect(ajouts).toBeGreaterThan(0); expect(retraits).toBe(ajouts);
@hint
Un seul état suffit : `reponses: number[]` (les réponses données) et `montree: boolean` (la correction est-elle affichée). L'indice et le score s'en déduisent.
@solution main.tsx
import { useEffect, useState } from 'react';

export interface Question {
  texte: string;
  choix: string[];
  bonne: number;
}

const DEMO: Question[] = [
  { texte: 'Capitale de la Corée du Sud ?', choix: ['Busan', 'Séoul'], bonne: 1 },
  { texte: '2 + 2 ?', choix: ['4', '5', '22'], bonne: 0 },
];

export function Quiz({ questions }: { questions: Question[] }) {
  const [reponses, setReponses] = useState<number[]>([]);
  const [corrige, setCorrige] = useState(false);
  const indice = corrige ? reponses.length - 1 : reponses.length;
  const question = questions.at(indice);
  const finie = indice >= questions.length;

  const repondre = (i: number) => {
    if (corrige || !question || i < 0 || i >= question.choix.length) return;
    setReponses([...reponses, i]);
    setCorrige(true);
  };
  const suivant = () => setCorrige(false);

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Enter') suivant();
      else if (/^[1-9]$/.test(e.key)) repondre(Number(e.key) - 1);
    };
    document.addEventListener('keydown', touche);
    return () => document.removeEventListener('keydown', touche);
  });

  if (finie || !question) {
    const score = reponses.filter((r, i) => r === questions[i].bonne).length;
    return (
      <div>
        <p className="score">{`Score : ${score} / ${questions.length}`}</p>
        <button className="rejouer" onClick={() => setReponses([])}>Rejouer</button>
      </div>
    );
  }

  const classe = (i: number) => {
    if (!corrige) return 'choix';
    if (i === question.bonne) return 'choix juste';
    return i === reponses[indice] ? 'choix faux' : 'choix';
  };

  return (
    <div>
      <p className="progres">{`Question ${indice + 1} / ${questions.length}`}</p>
      <h2>{question.texte}</h2>
      {question.choix.map((c, i) => (
        <button key={c} className={classe(i)} disabled={corrige} onClick={() => repondre(i)}>{c}</button>
      ))}
      {corrige && <button className="suite" onClick={suivant}>Suivant</button>}
    </div>
  );
}

export default function App() {
  return <Quiz questions={DEMO} />;
}

@@ code kanban | Un tableau Kanban | tsx
Des cartes réparties dans trois colonnes : `afaire`, `encours`, `fait`.
@starter main.tsx
import { useReducer } from 'react';

type Colonne = 'afaire' | 'encours' | 'fait';

interface Carte {
  id: number;
  titre: string;
  colonne: Colonne;
}

export default function App() {
  return <p>À toi</p>;
}
@part Le réducteur
Écris `reducteur(cartes: Carte[], action): Carte[]`, pur :

- `{ type: 'ajouter', titre }` : une carte à la fin, dans `afaire`, avec un nouvel `id` (le plus grand + 1, ou 1)
- `{ type: 'deplacer', id, vers }` : change de colonne
- `{ type: 'supprimer', id }`
- `{ type: 'renommer', id, titre }` : un titre vide (après `trim`) ne change rien
@test Ajouter
let c = reducteur([], { type: 'ajouter', titre: 'A' }); expect(c).toEqual([{ id: 1, titre: 'A', colonne: 'afaire' }]); c = reducteur([{ id: 7, titre: 'x', colonne: 'fait' }], { type: 'ajouter', titre: 'B' }); expect(c[1].id).toBe(8);
@test Déplacer et supprimer
const c = [{ id: 1, titre: 'a', colonne: 'afaire' }, { id: 2, titre: 'b', colonne: 'afaire' }]; expect(reducteur(c, { type: 'deplacer', id: 2, vers: 'fait' })[1].colonne).toBe('fait'); expect(reducteur(c, { type: 'supprimer', id: 1 })).toEqual([c[1]]);
@test Renommer
const c = [{ id: 1, titre: 'a', colonne: 'afaire' }]; expect(reducteur(c, { type: 'renommer', id: 1, titre: ' z ' })[0].titre).toBe('z'); expect(reducteur(c, { type: 'renommer', id: 1, titre: '  ' })).toEqual(c);
@test Pur
const c = Object.freeze([Object.freeze({ id: 1, titre: 'a', colonne: 'afaire' })]); for (const a of [{ type: 'ajouter', titre: 'x' }, { type: 'deplacer', id: 1, vers: 'fait' }, { type: 'renommer', id: 1, titre: 'b' }, { type: 'supprimer', id: 1 }]) reducteur(c, a);
@types Actions vérifiées
const c = reducteur([], { type: 'ajouter', titre: 'a' });
// @ts-expect-error
reducteur(c, { type: 'deplacer', id: 1, vers: 'ailleurs' });
@part Afficher
`Kanban` (prop `initiales: Carte[]`) affiche trois `<section data-colonne="afaire">` (etc.) avec un `<h2>` `À faire (2)`, `En cours (0)`, `Fait (1)`, et un `<article>` par carte, contenant un `<span>` avec le titre.
@test Colonnes et compteurs
const el = await $mount(<Kanban initiales={[{ id: 1, titre: 'a', colonne: 'afaire' }, { id: 2, titre: 'b', colonne: 'fait' }, { id: 3, titre: 'c', colonne: 'afaire' }]} />); expect($texts('h2', el)).toEqual(['À faire (2)', 'En cours (0)', 'Fait (1)']); expect($texts('[data-colonne=afaire] article span', el)).toEqual(['a', 'c']);
@part Agir
Un formulaire (un `<input>`, vidé ensuite) ajoute une carte, sauf si le texte est vide. Chaque carte a des boutons `.gauche`, `.droite` (absents quand c'est impossible) et `.suppr`.
@test Ajouter
const el = await $mount(<Kanban initiales={[]} />); await $type('form input', 'Nouveau'); await $submit('form'); await $type('form input', '  '); await $submit('form'); expect($texts('[data-colonne=afaire] span', el)).toEqual(['Nouveau']); expect(el.querySelector('form input').value.trim()).toBe('');
@test Déplacer
const el = await $mount(<Kanban initiales={[{ id: 1, titre: 'a', colonne: 'afaire' }]} />); expect(el.querySelector('.gauche')).toBe(null); await $click('.droite'); expect($texts('[data-colonne=encours] span', el)).toEqual(['a']); await $click('.droite'); expect(el.querySelector('.droite')).toBe(null); await $click('.gauche'); expect($texts('[data-colonne=encours] span', el)).toEqual(['a']);
@test Supprimer
const el = await $mount(<Kanban initiales={[{ id: 1, titre: 'a', colonne: 'fait' }]} />); await $click('.suppr'); expect(el.querySelectorAll('article')).toHaveLength(0);
@part Renommer sur place
Double-cliquer sur le titre (`onDoubleClick` sur le `<span>`) le remplace par un `<input className="titre">`. `Enter` valide, `Escape` annule.
@test Valider
const el = await $mount(<Kanban initiales={[{ id: 1, titre: 'a', colonne: 'fait' }]} />); await $fire('article span', new MouseEvent('dblclick', { bubbles: true })); await $type('.titre', 'zz'); await $key('.titre', 'Enter'); expect([$text('article span'), el.querySelector('.titre')]).toEqual(['zz', null]);
@test Annuler
const el = await $mount(<Kanban initiales={[{ id: 1, titre: 'a', colonne: 'fait' }]} />); await $fire('article span', new MouseEvent('dblclick', { bubbles: true })); expect(el.querySelector('.titre').value).toBe('a'); await $type('.titre', 'zz'); await $key('.titre', 'Escape'); expect($text('article span')).toBe('a');
@hint
Un tableau `COLONNES: { id: Colonne; titre: string }[]` dans l'ordre : « à gauche » et « à droite » deviennent des indices.
@solution main.tsx
import { useReducer, useState, type Dispatch } from 'react';

type Colonne = 'afaire' | 'encours' | 'fait';

interface Carte {
  id: number;
  titre: string;
  colonne: Colonne;
}

type Action =
  | { type: 'ajouter'; titre: string }
  | { type: 'deplacer'; id: number; vers: Colonne }
  | { type: 'supprimer'; id: number }
  | { type: 'renommer'; id: number; titre: string };

const COLONNES: { id: Colonne; nom: string }[] = [
  { id: 'afaire', nom: 'À faire' },
  { id: 'encours', nom: 'En cours' },
  { id: 'fait', nom: 'Fait' },
];

export function reducteur(cartes: Carte[], action: Action): Carte[] {
  switch (action.type) {
    case 'ajouter': {
      const id = Math.max(0, ...cartes.map((c) => c.id)) + 1;
      return [...cartes, { id, titre: action.titre, colonne: 'afaire' }];
    }
    case 'deplacer':
      return cartes.map((c) => (c.id === action.id ? { ...c, colonne: action.vers } : c));
    case 'supprimer':
      return cartes.filter((c) => c.id !== action.id);
    case 'renommer': {
      const titre = action.titre.trim();
      return titre ? cartes.map((c) => (c.id === action.id ? { ...c, titre } : c)) : cartes;
    }
  }
}

function Titre({ titre, onRenommer }: { titre: string; onRenommer: (titre: string) => void }) {
  const [brouillon, setBrouillon] = useState<string | null>(null);
  if (brouillon === null) return <span onDoubleClick={() => setBrouillon(titre)}>{titre}</span>;
  return (
    <input
      className="titre"
      value={brouillon}
      onChange={(e) => setBrouillon(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onRenommer(brouillon);
        if (e.key === 'Enter' || e.key === 'Escape') setBrouillon(null);
      }}
    />
  );
}

function VueCarte({ carte, dispatch }: { carte: Carte; dispatch: Dispatch<Action> }) {
  const i = COLONNES.findIndex((c) => c.id === carte.colonne);
  const bouton = (cible: number, classe: string, texte: string) => {
    const colonne = COLONNES[cible];
    return colonne && <button className={classe} onClick={() => dispatch({ type: 'deplacer', id: carte.id, vers: colonne.id })}>{texte}</button>;
  };
  return (
    <article>
      <Titre titre={carte.titre} onRenommer={(titre) => dispatch({ type: 'renommer', id: carte.id, titre })} />
      {bouton(i - 1, 'gauche', '←')}
      {bouton(i + 1, 'droite', '→')}
      <button className="suppr" onClick={() => dispatch({ type: 'supprimer', id: carte.id })}>×</button>
    </article>
  );
}

export function Kanban({ initiales }: { initiales: Carte[] }) {
  const [cartes, dispatch] = useReducer(reducteur, initiales);
  const [texte, setTexte] = useState('');
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!texte.trim()) return;
          dispatch({ type: 'ajouter', titre: texte.trim() });
          setTexte('');
        }}
      >
        <input value={texte} onChange={(e) => setTexte(e.target.value)} />
        <button>Ajouter</button>
      </form>
      {COLONNES.map(({ id, nom }) => {
        const liste = cartes.filter((c) => c.colonne === id);
        return (
          <section key={id} data-colonne={id}>
            <h2>{`${nom} (${liste.length})`}</h2>
            {liste.map((c) => <VueCarte key={c.id} carte={c} dispatch={dispatch} />)}
          </section>
        );
      })}
    </div>
  );
}

export default function App() {
  return <Kanban initiales={[{ id: 1, titre: 'Apprendre React', colonne: 'encours' }]} />;
}

@@ code catalogue | Un catalogue avec recherche | tsx
Une page de catalogue reliée à une API. `chercher(q, page)` est fournie : elle renvoie une promesse de `{ resultats: { id, nom }[], pages: number }`.
@starter main.tsx
import { useEffect, useState } from 'react';

interface Page {
  resultats: { id: number; nom: string }[];
  pages: number;
}

declare function chercher(q: string, page: number): Promise<Page>;

export default function App() {
  return <p>À toi</p>;
}
@setup
globalThis.$appels = [];
globalThis.chercher = async (q, page) => {
  globalThis.$appels.push(`${q}/${page}`);
  await new Promise((r) => setTimeout(r, q === 'lent' ? 80 : 5));
  if (q === 'panne') throw new Error('panne');
  const tous = Array.from({ length: 5 }, (_, i) => ({ id: i, nom: `${q || 'tout'} ${i}` }));
  if (q === 'rien') return { resultats: [], pages: 0 };
  return { resultats: tous.slice((page - 1) * 2, page * 2), pages: 3 };
};
@part Charger
`Catalogue` charge la page 1 de la recherche vide au montage. Pendant : `<p className="etat">Chargement…</p>`. Ensuite : `<ul>` des noms, ou `<p className="etat">Aucun résultat</p>`, ou `<p className="etat">Erreur</p>`.
@test Au montage
const el = await $mount(<Catalogue />); expect($text('.etat')).toBe('Chargement…'); await $until(() => expect($texts('li', el)).toEqual(['tout 0', 'tout 1'])); expect(el.querySelector('.etat')).toBe(null);
@part Chercher
Un `<input>` de recherche. La recherche part **30 ms** après la dernière frappe (prop `delai`, 30 par défaut), et revient à la page 1. Une réponse en retard est ignorée.
@test Cherche
const el = await $mount(<Catalogue />); await $type('input', 'chat'); await $until(() => expect($texts('li', el)).toEqual(['chat 0', 'chat 1']));
@test Attend la fin de la frappe
const el = await $mount(<Catalogue />); await $until(() => expect($texts('li', el)).toHaveLength(2)); $appels.length = 0; await $type('input', 'a'); await $type('input', 'ab'); await $type('input', 'abc'); await $until(() => expect($texts('li', el)[0]).toBe('abc 0')); expect($appels).toEqual(['abc/1']);
@test Aucun résultat, erreur
const el = await $mount(<Catalogue />); await $type('input', 'rien'); await $until(() => expect($text('.etat')).toBe('Aucun résultat')); await $type('input', 'panne'); await $until(() => expect($text('.etat')).toBe('Erreur'));
@test Réponse en retard ignorée
const el = await $mount(<Catalogue delai={1} />); await $type('input', 'lent'); await $act(() => $sleep(20)); await $type('input', 'vite'); await $until(() => expect($texts('li', el)[0]).toBe('vite 0')); await $act(() => $sleep(110)); expect($texts('li', el)[0]).toBe('vite 0');
@part Les pages
`<p className="page">Page 1 / 3</p>` et les boutons `.prec` et `.suiv`, désactivés au bord. Absents sans résultat. Changer de page ne passe pas par le délai.
@test Change de page
const el = await $mount(<Catalogue />); await $until(() => expect($text('.page')).toBe('Page 1 / 3')); expect([el.querySelector('.prec').disabled, el.querySelector('.suiv').disabled]).toEqual([true, false]); await $click('.suiv'); await $until(() => expect($texts('li', el)).toEqual(['tout 2', 'tout 3'])); await $click('.suiv'); await $until(() => expect($texts('li', el)).toEqual(['tout 4'])); expect(el.querySelector('.suiv').disabled).toBe(true);
@test Une recherche revient à la page 1
const el = await $mount(<Catalogue />); await $until(() => expect($text('.page')).toBe('Page 1 / 3')); await $click('.suiv'); await $until(() => expect($text('.page')).toBe('Page 2 / 3')); await $type('input', 'x'); await $until(() => expect([$texts('li', el)[0], $text('.page')]).toEqual(['x 0', 'Page 1 / 3']));
@test Absents sans résultat
const el = await $mount(<Catalogue />); await $type('input', 'rien'); await $until(() => expect($text('.etat')).toBe('Aucun résultat')); expect(el.querySelector('.suiv')).toBe(null);
@hint
Trois états : `texte` (ce qui est tapé), `requete` `{ q, page }` (ce qui est cherché), et le résultat. Un effet passe de `texte` à `requete` après le délai ; un autre charge `requete`.
@hint
Dans l'effet du délai, ne fais rien si le texte est déjà celui de la requête, sinon tu rechargerais au montage.
@solution main.tsx
import { useEffect, useState } from 'react';

interface Page {
  resultats: { id: number; nom: string }[];
  pages: number;
}

declare function chercher(q: string, page: number): Promise<Page>;

type Etat =
  | { statut: 'chargement' }
  | { statut: 'erreur' }
  | { statut: 'ok'; page: Page };

function useRecherche(q: string, page: number): Etat {
  const [etat, setEtat] = useState<Etat>({ statut: 'chargement' });
  useEffect(() => {
    let annule = false;
    setEtat({ statut: 'chargement' });
    chercher(q, page).then(
      (p) => { if (!annule) setEtat({ statut: 'ok', page: p }); },
      () => { if (!annule) setEtat({ statut: 'erreur' }); },
    );
    return () => {
      annule = true;
    };
  }, [q, page]);
  return etat;
}

export function Catalogue({ delai = 30 }: { delai?: number }) {
  const [texte, setTexte] = useState('');
  const [requete, setRequete] = useState({ q: '', page: 1 });
  const etat = useRecherche(requete.q, requete.page);

  useEffect(() => {
    if (texte === requete.q) return;
    const id = setTimeout(() => setRequete({ q: texte, page: 1 }), delai);
    return () => clearTimeout(id);
  }, [texte, requete.q, delai]);

  const aller = (n: number) => setRequete((r) => ({ ...r, page: r.page + n }));

  return (
    <div>
      <input value={texte} onChange={(e) => setTexte(e.target.value)} />
      {etat.statut === 'chargement' && <p className="etat">Chargement…</p>}
      {etat.statut === 'erreur' && <p className="etat">Erreur</p>}
      {etat.statut === 'ok' && etat.page.resultats.length === 0 && <p className="etat">Aucun résultat</p>}
      {etat.statut === 'ok' && etat.page.resultats.length > 0 && (
        <>
          <ul>{etat.page.resultats.map((r) => <li key={r.id}>{r.nom}</li>)}</ul>
          <p className="page">{`Page ${requete.page} / ${etat.page.pages}`}</p>
          <button className="prec" disabled={requete.page <= 1} onClick={() => aller(-1)}>Précédent</button>
          <button className="suiv" disabled={requete.page >= etat.page.pages} onClick={() => aller(1)}>Suivant</button>
        </>
      )}
    </div>
  );
}

export default function App() {
  return <Catalogue />;
}
