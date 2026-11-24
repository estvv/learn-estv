import { appearance, DEFAULT_HANDS, look, resetHands, setHand, setTheme, shadesOf, type Appearance, type Theme } from '../lib/appearance';
import { useObservable } from '../lib/store';
import { Field } from './Field';
import { Segmented } from './Segmented';

export function ThemeField({ full }: { full?: boolean }) {
  const { theme } = useObservable(appearance);
  return (
    <Field label="Thème">
      <Segmented<Appearance['theme']>
        full={full}
        value={theme}
        onChange={setTheme}
        options={[{ value: 'auto', label: 'Auto' }, { value: 'light', label: 'Clair' }, { value: 'dark', label: 'Nuit' }]}
      />
    </Field>
  );
}

// The colours of the hands in a theme; left out: the one shown.
export function HandColorsField({ theme: given, label = 'Couleurs des mains' }: { theme?: Theme; label?: string }) {
  const { hands } = useObservable(appearance);
  const shown = useObservable(look).theme;
  const theme = given ?? shown;
  const own = hands[theme];
  const changed = own.left !== DEFAULT_HANDS[theme].left || own.right !== DEFAULT_HANDS[theme].right;
  return (
    <div>
      <div className="mb-1.5 flex h-6 items-center text-sm font-semibold text-neutral-900">
        <span className="flex-1">{label}</span>
        {changed && <button type="button" onClick={() => resetHands(theme)} className="text-xs font-normal text-neutral-500 underline hover:text-neutral-900">Par défaut</button>}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-2">
        {([['left', 'Gauche'], ['right', 'Droite']] as const).map(([hand, name]) => {
          const s = shadesOf(own[hand], theme);
          return (
            <label key={hand} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-neutral-200 px-2.5 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
              <input type="color" value={own[hand]} onChange={(e) => setHand(theme, hand, e.target.value)} aria-label={`Main ${name.toLowerCase()}`} className="h-7 w-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0" />
              <span className="min-w-0 flex-1 truncate">{name}</span>
              {/* A note that comes, a note that sounds. */}
              <span aria-hidden className="flex shrink-0 gap-1 text-xs font-bold">
                <span className="flex h-6 w-6 items-end justify-center rounded" style={{ background: s.pale, color: s.ink }}>1</span>
                <span className="flex h-6 w-6 items-end justify-center rounded" style={{ background: s.strong, color: s.on }}>2</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
