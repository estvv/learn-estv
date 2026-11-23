# Patterns de conception
> Organiser du code qui change.

@@ lesson patterns | Quelques patterns utiles

Un *pattern* est une solution connue à un problème d'organisation. En JavaScript, une **fonction** remplace souvent une hiérarchie de classes.

| Pattern | Problème | En bref |
|---|---|---|
| Stratégie | plusieurs façons de faire | passer une fonction |
| Observateur | prévenir sans se connaître | `abonner(f)` / `emettre` |
| Commande | annuler, rejouer | un objet `{ faire, annuler }` |
| Décorateur | ajouter un comportement | envelopper une fonction |
| Adaptateur | interface incompatible | une couche de traduction |
| Fabrique | choisir quoi créer | une fonction qui construit |
| Machine à états | transitions interdites | une table état → événement → état |
| Injection | dépendances remplaçables | les recevoir en paramètre |

### Machine à états

```ts-run
const feu = {
  rouge: { suivant: 'vert' },
  vert: { suivant: 'orange' },
  orange: { suivant: 'rouge' },
} as const;
type Etat = keyof typeof feu;
let etat: Etat = 'rouge';
for (let i = 0; i < 4; i++) {
  console.log(etat);
  etat = feu[etat].suivant;
}
```

### Injection de dépendances

Une fonction qui appelle `fetch`, `Date.now()` ou `Math.random()` est difficile à tester. Reçois-les en paramètre :

```ts-run
interface Horloge { maintenant(): number }
function salutation(horloge: Horloge): string {
  return new Date(horloge.maintenant()).getUTCHours() < 12 ? 'Bonjour' : 'Bonsoir';
}
console.log(salutation({ maintenant: () => Date.UTC(2026, 0, 1, 20) })); // dans un test
console.log(salutation({ maintenant: Date.now }));                       // en vrai
```

### Cœur pur, bords impurs

Mets les **décisions** dans des fonctions pures (faciles à tester), et les effets (réseau, écran, disque) autour, dans une couche mince.

> Un pattern a un coût. Attends d'avoir le problème avant d'appliquer la solution.

@@ code commandes | Annuler et refaire | ts
Une **commande** est `{ faire(): void; annuler(): void }`. Classe `Historique` : `executer(commande)`, `annuler()` et `refaire()` (renvoient `false` s'il n'y a rien à faire). Exécuter une nouvelle commande efface ce qu'on pouvait refaire.

Écris aussi `groupe(...commandes)`, une commande qui les fait dans l'ordre et les annule dans l'ordre **inverse**.
@starter
interface Commande {
  faire(): void;
  annuler(): void;
}

@test Annuler et refaire
let n = 0; const plus = (x) => ({ faire: () => { n += x; }, annuler: () => { n -= x; } }); const h = new Historique(); h.executer(plus(5)); h.executer(plus(3)); expect([n, h.annuler(), n, h.refaire(), n]).toEqual([8, true, 5, true, 8]);
@test Rien à faire
const h = new Historique(); expect([h.annuler(), h.refaire()]).toEqual([false, false]);
@test Une nouvelle commande efface le futur
let n = 0; const plus = (x) => ({ faire: () => { n += x; }, annuler: () => { n -= x; } }); const h = new Historique(); h.executer(plus(1)); h.annuler(); h.executer(plus(10)); expect([h.refaire(), n]).toEqual([false, 10]);
@test Un groupe
const l = []; const c = (x) => ({ faire: () => l.push(`+${x}`), annuler: () => l.push(`-${x}`) }); const g = groupe(c('a'), c('b')); g.faire(); g.annuler(); expect(l).toEqual(['+a', '+b', '-b', '-a']);
@types Types
const h = new Historique(); h.executer(groupe()); const b: boolean = h.annuler();
// @ts-expect-error
h.executer({ faire() {} });
@solution
interface Commande {
  faire(): void;
  annuler(): void;
}

class Historique {
  #passe: Commande[] = [];
  #futur: Commande[] = [];

  executer(commande: Commande): void {
    commande.faire();
    this.#passe.push(commande);
    this.#futur = [];
  }

  annuler(): boolean {
    const commande = this.#passe.pop();
    if (!commande) return false;
    commande.annuler();
    this.#futur.push(commande);
    return true;
  }

  refaire(): boolean {
    const commande = this.#futur.pop();
    if (!commande) return false;
    commande.faire();
    this.#passe.push(commande);
    return true;
  }
}

function groupe(...commandes: Commande[]): Commande {
  return {
    faire: () => commandes.forEach((c) => c.faire()),
    annuler: () => commandes.toReversed().forEach((c) => c.annuler()),
  };
}

@@ code machine | Une machine à états | ts
`creerMachine(depart, transitions)` où `transitions` est `{ [etat]: { [evenement]: etat } }`. Renvoie `{ etat(), envoyer(evenement), peut(evenement), surChangement(f) }`. `envoyer` renvoie `false` (et ne change rien) si l'événement est interdit. `f(avant, apres, evenement)` est appelée à chaque changement ; `surChangement` renvoie un désabonnement.
@starter

@test Transitions
const m = creerMachine('arret', { arret: { jouer: 'lecture' }, lecture: { pause: 'pause', stop: 'arret' }, pause: { jouer: 'lecture', stop: 'arret' } }); expect([m.etat(), m.envoyer('pause'), m.etat(), m.envoyer('jouer'), m.etat(), m.peut('stop'), m.peut('jouer')]).toEqual(['arret', false, 'arret', true, 'lecture', true, false]);
@test Prévient
const m = creerMachine('a', { a: { go: 'b' }, b: { go: 'a' } }); const l = []; const off = m.surChangement((x, y, e) => l.push([x, y, e])); m.envoyer('go'); m.envoyer('non'); off(); m.envoyer('go'); expect(l).toEqual([['a', 'b', 'go']]);
@test Un nom piège
const m = creerMachine('a', { a: {} }); expect([m.envoyer('toString'), m.peut('constructor'), m.etat()]).toEqual([false, false, 'a']);
@types États et événements vérifiés
const m = creerMachine('a', { a: { go: 'b' }, b: {} }); const e: 'a' | 'b' = m.etat();
// @ts-expect-error
creerMachine('z', { a: { go: 'a' } });
// @ts-expect-error
creerMachine('a', { a: { go: 'zut' } });
@hint
`<E extends string>(depart: NoInfer<E>, transitions: Record<E, Record<string, NoInfer<E>>>)`.
@solution
function creerMachine<E extends string>(depart: NoInfer<E>, transitions: Record<E, Record<string, NoInfer<E>>>) {
  type Ecouteur = (avant: E, apres: E, evenement: string) => void;
  let etat: E = depart;
  const ecouteurs = new Set<Ecouteur>();
  const suivant = (evenement: string): E | undefined =>
    (Object.hasOwn(transitions[etat], evenement) ? transitions[etat][evenement] : undefined);

  return {
    etat: (): E => etat,
    peut: (evenement: string): boolean => suivant(evenement) !== undefined,
    envoyer(evenement: string): boolean {
      const apres = suivant(evenement);
      if (apres === undefined) return false;
      const avant = etat;
      etat = apres;
      for (const f of [...ecouteurs]) f(avant, apres, evenement);
      return true;
    },
    surChangement(f: Ecouteur): () => void {
      ecouteurs.add(f);
      return () => {
        ecouteurs.delete(f);
      };
    },
  };
}

@@ code middleware | Une chaîne de middlewares | ts
Comme Express ou Koa : `creerApp()` renvoie `{ utiliser(m), traiter(requete) }`. Un middleware est `async (ctx, suivant) => {}` : il peut agir **avant** et **après** `await suivant()`, ou ne pas l'appeler (la chaîne s'arrête). `traiter(requete)` crée `ctx = { requete, reponse: null }`, exécute la chaîne et renvoie `ctx.reponse`. Appeler `suivant()` deux fois dans un middleware lance une erreur.
@starter

@test L'ordre en oignon
const l = []; const a = creerApp(); a.utiliser(async (c, s) => { l.push('a1'); await s(); l.push('a2'); }); a.utiliser(async (c, s) => { l.push('b1'); await $sleep(2); await s(); l.push('b2'); }); await a.traiter('x'); expect(l).toEqual(['a1', 'b1', 'b2', 'a2']);
@test La réponse
const a = creerApp(); a.utiliser(async (c, s) => { await s(); c.reponse += '!'; }); a.utiliser(async (c) => { c.reponse = `ok ${c.requete}`; }); expect(await a.traiter('x')).toBe('ok x!');
@test Arrêter la chaîne
let n = 0; const a = creerApp(); a.utiliser(async (c) => { c.reponse = 'stop'; }); a.utiliser(async () => { n++; }); expect([await a.traiter('x'), n]).toEqual(['stop', 0]);
@test Les erreurs remontent
const a = creerApp(); a.utiliser(async (c, s) => { try { await s(); } catch (e) { c.reponse = e.message; } }); a.utiliser(async () => { throw new Error('aïe'); }); expect(await a.traiter('x')).toBe('aïe');
@test `suivant` deux fois
const a = creerApp(); a.utiliser(async (c, s) => { await s(); await s(); }); await expect(a.traiter('x')).toReject();
@solution
interface Contexte {
  requete: string;
  reponse: string | null;
}

type Middleware = (ctx: Contexte, suivant: () => Promise<void>) => Promise<void>;

function creerApp() {
  const chaine: Middleware[] = [];
  return {
    utiliser(m: Middleware): void {
      chaine.push(m);
    },
    async traiter(requete: string): Promise<string | null> {
      const ctx: Contexte = { requete, reponse: null };
      const executer = async (i: number): Promise<void> => {
        const m = chaine.at(i);
        if (i >= chaine.length || !m) return;
        let appele = false;
        await m(ctx, async () => {
          if (appele) throw new Error('suivant() appelé deux fois');
          appele = true;
          await executer(i + 1);
        });
      };
      await executer(0);
      return ctx.reponse;
    },
  };
}

@@ defi conteneur | Un conteneur d'injection | ts
`creerConteneur()` renvoie un objet avec :

- `.ajouter(nom, fabrique)` : `fabrique(c)` reçoit un objet dont **chaque propriété** est un service déjà ajouté, créé à la demande ; renvoie un conteneur du **type enrichi**
- `.construire()` : l'objet des services

Chaque service est créé **une fois**, et seulement si on le lit. Un cycle lance une erreur contenant les noms. Le type de chaque service doit être connu.
@starter

@test Services dépendants
const c = creerConteneur().ajouter('url', () => 'http://x').ajouter('client', (s) => ({ get: (p) => s.url + p })).construire(); expect(c.client.get('/a')).toBe('http://x/a');
@test Paresseux, une seule fois
let n = 0; const c = creerConteneur().ajouter('a', () => ({ id: ++n })).ajouter('b', (s) => s.a).construire(); expect(n).toBe(0); expect(c.a === c.b && c.a === c.a).toBe(true); expect(n).toBe(1);
@test Cycle
const c = creerConteneur().ajouter('a', (s) => s.b).ajouter('b', (s) => s.a).construire(); expect(() => c.a).toThrow(/a.*b/);
@test Remplacer (pour un test)
const base = creerConteneur().ajouter('h', () => 1).ajouter('d', (s) => s.h * 2); expect([base.construire().d, base.ajouter('h', () => 10).construire().d]).toEqual([2, 20]);
@types Types suivis
const c = creerConteneur().ajouter('n', () => 3).ajouter('t', (s) => s.n.toFixed(1)).construire(); const t: string = c.t; const n: number = c.n;
// @ts-expect-error
c.zut;
// @ts-expect-error
creerConteneur().ajouter('a', (s) => s.inconnu);
@hint
Le conteneur est immuable : une `Map` de fabriques, recopiée à chaque `ajouter`. `construire` crée un objet avec des **getters**.
@solution
type Fabriques = Map<string, (services: never) => unknown>;

interface Conteneur<S extends object> {
  ajouter<N extends string, T>(nom: N, fabrique: (services: S) => T): Conteneur<Omit<S, N> & { readonly [K in N]: T }>;
  construire(): S;
}

function conteneur<S extends object>(fabriques: Fabriques): Conteneur<S> {
  return {
    ajouter: (nom, fabrique) => conteneur(new Map([...fabriques, [nom, fabrique]])),
    construire() {
      const services = {};
      const prets = new Map<string, unknown>();
      const enCours: string[] = [];
      for (const [nom, fabrique] of fabriques) {
        Object.defineProperty(services, nom, {
          enumerable: true,
          get() {
            if (prets.has(nom)) return prets.get(nom);
            if (enCours.includes(nom)) throw new Error(`Cycle : ${[...enCours, nom].join(' → ')}`);
            enCours.push(nom);
            try {
              const service = fabrique(services as never);
              prets.set(nom, service);
              return service;
            } finally {
              enCours.pop();
            }
          },
        });
      }
      return services as S;
    },
  };
}

const creerConteneur = (): Conteneur<{}> => conteneur(new Map());

@@ predict strategie
Quel pattern utilise `liste.sort((a, b) => a - b)` ?
@answer Stratégie
@wrong Observateur
@wrong Commande
@wrong Fabrique
@why La façon de comparer est passée en paramètre.

@@ predict injection
Pourquoi recevoir l'horloge en paramètre plutôt qu'appeler `Date.now()` ?
@answer Pour pouvoir tester avec une heure choisie
@wrong C'est plus rapide
@wrong `Date.now()` est obsolète
@wrong Pour éviter les fuseaux horaires
@why Une dépendance reçue se remplace dans un test.

@@ card coeur-pur
« Cœur pur, bords impurs » ?
@back
Les décisions dans des fonctions pures, les effets (réseau, écran) dans une couche mince autour.

@@ card observateur
Le pattern observateur en une phrase ?
@back
Un objet prévient ses abonnés sans les connaître : `abonner(f)`, `emettre(x)`.
