import { appearance, setTheme, type Appearance } from '../lib/appearance';
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
