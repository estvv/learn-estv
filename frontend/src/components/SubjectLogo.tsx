import { useState } from 'react';
import { accent } from '../lib/theme';

// A subject's logo from /public/subjects/<id>.png. Until the file exists, a
// tile in the subject's accent with its initial keeps the layout.
export function SubjectLogo({ id, name, accent: a, className = 'w-16 h-16 sm:w-20 sm:h-20', text = 'text-2xl' }: {
  id: string;
  name: string;
  accent?: string;
  className?: string;
  text?: string;
}) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      <span className={`${className} shrink-0 rounded-2xl flex items-center justify-center font-bold ${text} ${accent(a).tile}`}>
        {name.slice(0, 1)}
      </span>
    );
  }
  return <img src={`/subjects/${id}.png`} alt="" onError={() => setMissing(true)} className={`${className} shrink-0 object-contain`} />;
}
