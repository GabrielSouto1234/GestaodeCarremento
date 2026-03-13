import { TruckType, TruckPhoto } from './types';

export const TRUCK_TYPES: TruckType[] = [
  'Baú',
  'Sider',
  'Graneleiro',
  'Plataforma',
  'Tanque',
  'Outro'
];

export const CHECKLIST_ITEMS = [
  { id: 'painting', label: 'Avaria na Pintura' },
  { id: 'externalStructure', label: 'Avaria na Estrutura Externa' },
  { id: 'floor', label: 'Avaria no Piso' },
  { id: 'internalSides', label: 'Avaria nas Laterais Internas' },
  { id: 'seal', label: 'Avaria no Lacre' },
  { id: 'roof', label: 'Avaria no Teto' }
];

export const PHOTO_STEPS: { id: number; label: string }[] = [
  { id: 1, label: 'LATERAL DIREITA EXTERNA' },
  { id: 2, label: 'LATERAL ESQUERDA EXTERNA' },
  { id: 3, label: 'PORTA' },
  { id: 4, label: 'LACRE (FECHADURA)' },
  { id: 5, label: 'PAREDE DIREITA INTERNA' },
  { id: 6, label: 'PAREDE ESQUERDA INTERNA' },
  { id: 7, label: 'PISO' },
  { id: 8, label: 'TETO' },
  { id: 9, label: 'CARGA CARREGADA' }
];
