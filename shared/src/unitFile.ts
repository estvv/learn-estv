import type { PackInput } from './pack.ts';

// Packs written as a folder of Markdown files, one per unit (easier to write
// and read than JSON for lessons and code). See content/packs/README.md.
//
//   # Unit name
//   > Description
//
//   @@ lesson id | Title          Markdown lesson
//   @@ code id | Title | js       exercise: instructions, then @starter,
//                                 @solution, @test, @types, @hint, @setup, @part
//   @@ defi id | Title | js       same, harder and optional: last in the unit
//   @@ predict id                 "what does this do?" question: @answer, @wrong, @why
//   @@ card id                    flashcard: front, then @back

export interface UnitFile {
  path: string; // id of the path it belongs to
  id: string;
  text: string;
}

type Steps = { id: string; title: string; module: string; config: Record<string, unknown> }[];
type Section = { tag: string; arg: string; body: string };

const TAGS = /^@(starter|solution|test|types|hint|setup|part|answer|wrong|why|back)\b[ \t]*(.*)$/;
const trim = (s: string) => s.replace(/^(?:[ \t]*\n)+/, '').trimEnd();

// The text before the first @tag, then each @tag with its argument and body.
function sections(text: string): { intro: string; list: Section[] } {
  const list: (Section & { lines: string[] })[] = [];
  const intro: string[] = [];
  for (const line of text.split('\n')) {
    const m = TAGS.exec(line);
    if (m) list.push({ tag: m[1], arg: m[2].trim(), body: '', lines: [] });
    else (list.length ? list[list.length - 1].lines : intro).push(line);
  }
  return { intro: trim(intro.join('\n')), list: list.map(({ tag, arg, lines }) => ({ tag, arg, body: trim(lines.join('\n')) })) };
}

function codeStep(body: string, lang: string): Record<string, unknown> {
  const { intro, list } = sections(body);
  const file = (s: Section) => {
    const [name, flag] = s.arg.split(/\s+/);
    return { name: name || `main.${lang}`, code: `${s.body}\n`, readonly: flag === 'readonly' };
  };
  const all = (tag: string) => list.filter((s) => s.tag === tag);
  const parts: { title: string; instructions: string; tests: object[]; types: object[] }[] = [];
  for (const s of list) {
    if (s.tag === 'part') parts.push({ title: s.arg, instructions: s.body, tests: [], types: [] });
    if (s.tag !== 'test' && s.tag !== 'types') continue;
    if (!parts.length) parts.push({ title: '', instructions: '', tests: [], types: [] });
    parts[parts.length - 1][s.tag === 'test' ? 'tests' : 'types'].push({ name: s.arg, code: s.body });
  }
  const files = all('starter').map(file);
  const solution = all('solution').map(file);
  return {
    instructions: intro,
    files,
    parts,
    hints: all('hint').map((s) => s.body || s.arg),
    // Files the solution does not mention stay as given.
    solution: [...solution, ...files.filter((f) => !solution.some((s) => s.name === f.name))]
      .sort((a, b) => files.findIndex((f) => f.name === a.name) - files.findIndex((f) => f.name === b.name)),
    setup: all('setup').map((s) => s.body).join('\n'),
  };
}

export function buildPack(base: PackInput, unitFiles: UnitFile[]): PackInput {
  const pack = { ...base, skills: [...(base.skills ?? [])], elements: [...(base.elements ?? [])], lessons: [...(base.lessons ?? [])] };
  pack.paths = (base.paths ?? []).map((path) => {
    if (!pack.skills.some((s) => s.id === path.id)) pack.skills.push({ id: path.id, name: path.name });
    const units = unitFiles.filter((u) => u.path === path.id).map((u) => {
      const fail = (what: string): never => { throw new Error(`${u.path}/${u.id} : ${what}`); };
      const [head, ...blocks] = u.text.replace(/\r\n/g, '\n').split(/^@@ /m);
      const name = /^# (.+)$/m.exec(head)?.[1] ?? fail('titre « # » manquant');
      const description = /^> (.+)$/m.exec(head)?.[1] ?? '';
      pack.skills.push({ id: u.id, name, parent: path.id });
      const steps: Steps = [];
      const challenges: Steps = [];
      let predicts = 0;
      let cards = 0;
      for (const block of blocks) {
        const end = block.indexOf('\n');
        const [kindId, title = '', lang = 'js'] = block.slice(0, end).split('|').map((s) => s.trim());
        const [kind, id] = kindId.split(/\s+/);
        const body = trim(block.slice(end + 1));
        const full = `${u.id}.${id}`;
        const { intro, list } = sections(body);
        const get = (tag: string) => list.filter((s) => s.tag === tag).map((s) => [s.arg, s.body].filter(Boolean).join('\n'));
        if (kind === 'lesson') {
          pack.lessons.push({ id: full, title, markdown: body, skills: [u.id] });
          steps.push({ id, title, module: 'lesson', config: { lesson: full } });
        } else if (kind === 'defi') {
          challenges.push({ id, title, module: 'code', config: { ...codeStep(body, lang), challenge: true } });
        } else if (kind === 'code') {
          steps.push({ id, title, module: 'code', config: codeStep(body, lang) });
        } else if (kind === 'predict') {
          predicts++;
          const [answer] = get('answer');
          const wrong = get('wrong');
          if (!answer || !wrong.length) fail(`${id} : @answer ou @wrong manquant`);
          pack.elements.push({ id: full, kind: 'predict', skills: [u.id], data: { prompt: intro, answer, wrong, why: get('why')[0] ?? '' } });
        } else if (kind === 'card') {
          cards++;
          pack.elements.push({ id: full, kind: 'card', skills: [u.id], data: { front: intro, back: get('back')[0] ?? fail(`${id} : @back manquant`) } });
        } else fail(`bloc inconnu : ${kind}`);
      }
      const select = (kind: string) => ({ kind, skill: u.id });
      if (predicts) {
        steps.push({ id: 'lire', title: 'Lire du code', module: 'quiz', config: {
          mode: 'generated', select: select('predict'), facet: 'lire', prompt: '{{prompt}}', answer: '{{answer}}', wrong: 'wrong', explanation: '{{why}}', count: predicts,
        } });
      }
      if (cards) {
        steps.push({ id: 'retenir', title: 'À retenir', module: 'flashcards', config: {
          select: select('card'), facet: 'retenir', front: '{{front}}', back: '{{back}}',
        } });
      }
      return { id: u.id, name, description, steps: [...steps, ...challenges] };
    });
    return { ...path, units: [...(path.units ?? []), ...units] };
  });
  return pack;
}
