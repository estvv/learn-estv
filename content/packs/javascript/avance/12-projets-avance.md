# Mini-projets : JavaScript
> Un état observable, un petit framework de tests, un moteur de recherche asynchrone.

@@ code store | Un gestionnaire d'état | js
Tu écris un petit « store », l'idée derrière Redux ou Zustand.
@starter

@part Lire et écrire
`creerStore(initial)` renvoie `{ lire, ecrire }`. `lire()` donne l'état. `ecrire(changements)` fusionne les changements dans un **nouvel** objet d'état.
@test Lit et fusionne
const s = creerStore({ a: 1, b: 2 }); s.ecrire({ b: 3 }); expect(s.lire()).toEqual({ a: 1, b: 3 });
@test Un nouvel objet à chaque fois
const init = { a: 1 }; const s = creerStore(init); s.ecrire({ a: 2 }); expect(init).toEqual({ a: 1 }); expect(s.lire()).not.toBe(init);
@part Une fonction de mise à jour
`ecrire` accepte aussi une **fonction** qui reçoit l'état et renvoie les changements.
@test Avec une fonction
const s = creerStore({ n: 1 }); s.ecrire((e) => ({ n: e.n + 1 })); s.ecrire((e) => ({ n: e.n * 10 })); expect(s.lire().n).toBe(20);
@part S'abonner
`abonner(f)` : `f(etat, ancien)` est appelée à chaque écriture. Renvoie une fonction de désabonnement. Se désabonner **pendant** une notification ne doit pas faire sauter un autre abonné.
@test Prévient
const s = creerStore({ n: 1 }); const l = []; s.abonner((e, a) => l.push([a.n, e.n])); s.ecrire({ n: 5 }); expect(l).toEqual([[1, 5]]);
@test Désabonnement
const s = creerStore({}); let n = 0; const off = s.abonner(() => n++); s.ecrire({}); off(); s.ecrire({}); expect(n).toBe(1);
@test Désabonnement pendant la notification
const s = creerStore({}); const l = []; const off = s.abonner(() => { l.push('a'); off(); }); s.abonner(() => l.push('b')); s.ecrire({}); expect(l).toEqual(['a', 'b']);
@part Surveiller une partie
`surveiller(selecteur, f)` : `f(valeur, ancienne)` n'est appelée que si la valeur choisie par le sélecteur **change** (`Object.is`). Renvoie la fonction de désabonnement.
@test Seulement si ça change
const s = creerStore({ a: 1, b: 1 }); const l = []; s.surveiller((e) => e.a, (v, av) => l.push([av, v])); s.ecrire({ b: 2 }); s.ecrire({ a: 1 }); s.ecrire({ a: 9 }); expect(l).toEqual([[1, 9]]);
@test Désabonnement
const s = creerStore({ a: 1 }); let n = 0; s.surveiller((e) => e.a, () => n++)(); s.ecrire({ a: 2 }); expect(n).toBe(0);
@part Annuler
`annuler()` revient à l'état précédent et prévient les abonnés ; sans rien à annuler, elle ne fait rien et renvoie `false` (sinon `true`).
@test Revient en arrière
const s = creerStore({ n: 1 }); s.ecrire({ n: 2 }); s.ecrire({ n: 3 }); expect([s.annuler(), s.lire().n, s.annuler(), s.lire().n, s.annuler(), s.lire().n]).toEqual([true, 2, true, 1, false, 1]);
@test Prévient
const s = creerStore({ n: 1 }); s.ecrire({ n: 2 }); let vu; s.abonner((e) => { vu = e.n; }); s.annuler(); expect(vu).toBe(1);
@hint
Garde l'état et les abonnés (`Set`) dans la closure. Parcours une **copie** des abonnés : `[...abonnes]`.
@hint
Une seule fonction interne `changer(nouvel)` qui remplace l'état et prévient : `ecrire` et `annuler` l'utilisent.
@solution
function creerStore(initial) {
  let etat = initial;
  const abonnes = new Set();
  const historique = [];

  const changer = (nouvel) => {
    const ancien = etat;
    etat = nouvel;
    for (const f of [...abonnes]) f(etat, ancien);
  };

  const abonner = (f) => {
    abonnes.add(f);
    return () => abonnes.delete(f);
  };

  return {
    lire: () => etat,
    ecrire(changements) {
      const ajout = typeof changements === 'function' ? changements(etat) : changements;
      historique.push(etat);
      changer({ ...etat, ...ajout });
    },
    abonner,
    surveiller: (selecteur, f) => abonner((nouvel, ancien) => {
      const [apres, avant] = [selecteur(nouvel), selecteur(ancien)];
      if (!Object.is(apres, avant)) f(apres, avant);
    }),
    annuler() {
      if (historique.length === 0) return false;
      changer(historique.pop());
      return true;
    },
  };
}

@@ code mini-test | Un framework de tests | js
Écris l'outil qui vérifie tes exercices, en petit.
@starter

@part Affirmer
`verifier(valeur)` renvoie un objet avec `.vaut(x)` (`Object.is`) et `.ressemble(x)` (même JSON). En cas d'échec, lance une `Error` au message `attendu <x>, reçu <valeur>`, les valeurs étant écrites en JSON.
@test `vaut`
verifier(1).vaut(1); expect(() => verifier(1).vaut(2)).toThrow('attendu 2, reçu 1');
@test `ressemble`
verifier({ a: [1] }).ressemble({ a: [1] }); expect(() => verifier('a').ressemble(['a'])).toThrow('attendu ["a"], reçu "a"');
@part Lancer les tests
`creerSuite()` renvoie `{ test(nom, f), lancer() }`. `lancer()` est **asynchrone** et exécute les tests dans l'ordre, l'un après l'autre (`f` peut être asynchrone). Elle renvoie une liste de `{ nom, ok, erreur }`, avec `erreur` le message, ou `null`.
@test Réussites et échecs
const s = creerSuite(); s.test('bon', () => {}); s.test('mauvais', () => { throw new Error('zut'); }); expect(await s.lancer()).toEqual([{ nom: 'bon', ok: true, erreur: null }, { nom: 'mauvais', ok: false, erreur: 'zut' }]);
@test Tests asynchrones, l'un après l'autre
const s = creerSuite(); const l = []; s.test('a', async () => { await $sleep(10); l.push('a'); }); s.test('b', async () => { l.push('b'); throw new Error('b'); }); const r = await s.lancer(); expect(l).toEqual(['a', 'b']); expect(r.map((x) => x.ok)).toEqual([true, false]);
@part Le rapport
`rapport(resultats)` renvoie un texte :

```
✓ bon
✗ mauvais : zut
1 / 2 réussis
```
@test Un rapport
expect(rapport([{ nom: 'bon', ok: true, erreur: null }, { nom: 'mauvais', ok: false, erreur: 'zut' }])).toBe('✓ bon\n✗ mauvais : zut\n1 / 2 réussis');
@test Aucun test
expect(rapport([])).toBe('0 / 0 réussis');
@part Préparer
`avant(f)` ajoute à la suite une fonction exécutée (et attendue) avant **chaque** test. Si elle échoue, le test échoue.
@test Avant chaque test
const s = creerSuite(); let n = 0; s.avant(async () => { n = 10; }); s.test('a', () => { n++; verifier(n).vaut(11); }); s.test('b', () => verifier(n).vaut(10)); expect((await s.lancer()).map((r) => r.ok)).toEqual([true, true]);
@test Si elle échoue
const s = creerSuite(); s.avant(() => { throw new Error('panne'); }); s.test('a', () => {}); expect((await s.lancer())[0]).toEqual({ nom: 'a', ok: false, erreur: 'panne' });
@hint
`await f()` marche que `f` soit asynchrone ou non, et `try…catch` attrape les deux sortes d'erreurs.
@solution
function verifier(valeur) {
  const echouer = (x) => {
    throw new Error(`attendu ${JSON.stringify(x)}, reçu ${JSON.stringify(valeur)}`);
  };
  return {
    vaut(x) {
      if (!Object.is(valeur, x)) echouer(x);
    },
    ressemble(x) {
      if (JSON.stringify(valeur) !== JSON.stringify(x)) echouer(x);
    },
  };
}

function creerSuite() {
  const tests = [];
  const preparations = [];
  return {
    avant(f) {
      preparations.push(f);
    },
    test(nom, f) {
      tests.push({ nom, f });
    },
    async lancer() {
      const resultats = [];
      for (const { nom, f } of tests) {
        try {
          for (const preparer of preparations) await preparer();
          await f();
          resultats.push({ nom, ok: true, erreur: null });
        } catch (e) {
          resultats.push({ nom, ok: false, erreur: e.message });
        }
      }
      return resultats;
    },
  };
}

function rapport(resultats) {
  const lignes = resultats.map((r) => (r.ok ? `✓ ${r.nom}` : `✗ ${r.nom} : ${r.erreur}`));
  return [...lignes, `${resultats.filter((r) => r.ok).length} / ${resultats.length} réussis`].join('\n');
}

@@ code recherche | Recherche instantanée | js
Le champ de recherche d'un site : ne pas appeler l'API à chaque lettre, et ignorer les réponses en retard.
@starter

@part Attendre la fin de la frappe
`debounce(f, ms)` renvoie une fonction qui n'appelle `f` (avec les derniers arguments) que `ms` après le **dernier** appel.
@test Un seul appel, le dernier
const l = []; const g = debounce((x) => l.push(x), 20); g('a'); g('b'); g('c'); expect(l).toEqual([]); await $sleep(50); expect(l).toEqual(['c']);
@test Deux appels espacés
const l = []; const g = debounce((x) => l.push(x), 10); g(1); await $sleep(35); g(2); await $sleep(35); expect(l).toEqual([1, 2]);
@part Mémoriser
`avecCache(charger)` renvoie une version de la fonction asynchrone qui garde la **promesse** par argument : deux appels simultanés ne font qu'un chargement. Un échec n'est pas gardé.
@test Un seul chargement
let n = 0; const g = avecCache(async (x) => { n++; await $sleep(5); return x + '!'; }); expect(await Promise.all([g('a'), g('a')])).toEqual(['a!', 'a!']); await g('a'); expect(n).toBe(1);
@test Les échecs sont réessayés
let n = 0; const g = avecCache(async () => { if (++n === 1) throw new Error('x'); return 'ok'; }); await expect(g('a')).toReject('x'); expect(await g('a')).toBe('ok');
@part Ignorer les réponses en retard
`derniere(charger)` renvoie une fonction asynchrone : si un appel plus récent a été fait entre-temps, l'ancien donne `null` au lieu de son résultat.
@test Seule la dernière compte
const g = derniere(async (ms) => { await $sleep(ms); return ms; }); const [a, b] = await Promise.all([g(40), g(5)]); expect([a, b]).toEqual([null, 5]);
@test Appels successifs
const g = derniere(async (x) => x); expect([await g(1), await g(2)]).toEqual([1, 2]);
@part Surligner
`surligner(texte, recherche)` entoure de `[` et `]` chaque apparition, sans tenir compte de la casse (mais en gardant celle du texte). Les caractères spéciaux sont pris tels quels. Une recherche vide ne change rien.
@test Surligne
expect(surligner('Le chat et le CHAT', 'chat')).toBe('Le [chat] et le [CHAT]');
@test Caractères spéciaux
expect(surligner('1+1=2 (oui)', '1+1')).toBe('[1+1]=2 (oui)'); expect(surligner('a(b', '(')).toBe('a[(]b');
@test Recherche vide
expect(surligner('abc', '')).toBe('abc');
@hint
`derniere` : un compteur dans la closure ; chaque appel retient son numéro et compare à la fin.
@hint
Échapper pour une regex : `recherche.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`. Dans un remplacement, `$&` est le texte trouvé.
@solution
function debounce(f, ms) {
  let minuterie;
  return (...args) => {
    clearTimeout(minuterie);
    minuterie = setTimeout(() => f(...args), ms);
  };
}

function avecCache(charger) {
  const cache = new Map();
  return (cle) => {
    if (!cache.has(cle)) {
      const promesse = charger(cle);
      cache.set(cle, promesse);
      promesse.catch(() => cache.delete(cle));
    }
    return cache.get(cle);
  };
}

function derniere(charger) {
  let numero = 0;
  return async (...args) => {
    const mien = ++numero;
    const resultat = await charger(...args);
    return mien === numero ? resultat : null;
  };
}

function surligner(texte, recherche) {
  if (recherche === '') return texte;
  const motif = recherche.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return texte.replace(new RegExp(motif, 'gi'), '[$&]');
}
