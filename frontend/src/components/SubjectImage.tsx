import { useState } from 'react';
import { accent } from '../lib/theme';

// A subject's picture from /public/subjects/<id>.png (960×600), cropped to the
// box. Without the file: the subject's accent with its initial.
export function SubjectImage({ id, name, accent: a, className, text = 'text-2xl' }: {
  id: string;
  name: string;
  accent?: string;
  className: string;
  text?: string;
}) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      <span className={`${className} shrink-0 flex items-center justify-center font-bold ${text} ${accent(a).tile}`}>
        {name.slice(0, 1)}
      </span>
    );
  }
  return <img src={`/subjects/${id}.png`} alt="" onError={() => setMissing(true)} className={`${className} shrink-0 bg-neutral-100 object-cover`} />;
}
