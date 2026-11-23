import { lazy, Suspense } from 'react';
import { LoadingState } from '../../components/ui';
import type { Toolkit } from '../types';
import { registerCodeBlocks } from './blocks';

const Playground = lazy(() => import('./Playground'));

export const codeToolkit: Toolkit = {
  id: 'code',
  label: 'Programmation',
  description: 'Éditeur, exécution de JavaScript, TypeScript, pages web et React dans le navigateur.',
  Practice: () => <Suspense fallback={<LoadingState />}><Playground /></Suspense>,
  init() {
    registerCodeBlocks();
  },
};
