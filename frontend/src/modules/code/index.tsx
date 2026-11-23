import { codeConfig, type CodeConfig } from '@learn/shared';
import { lazy, Suspense } from 'react';
import { LoadingState } from '../../components/ui';
import type { ActivityModule } from '../types';

const CodePlayer = lazy(() => import('./CodePlayer'));

export const codeModule: ActivityModule<CodeConfig> = {
  id: 'code',
  label: 'Exercice',
  configSchema: codeConfig,
  toolkits: ['code'],
  wide: true,
  Player: (props) => <Suspense fallback={<LoadingState />}><CodePlayer {...props} /></Suspense>,
};
