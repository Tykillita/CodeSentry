export interface SealMark {
  asset: string;
  mode: 'mono' | 'tone' | 'span';
  viewBox?: string;
  width?: number;
  height?: number;
}

// Original app marks; provenance is recorded in artifacts/project-button-rollout/logo-sources.json.
export const projectSealMarks: Record<string, SealMark> = {
  argus: { asset: '/media/garden/seals/marks/argus.svg', mode: 'mono' },
  cowork: { asset: '/media/garden/seals/marks/cowork.svg', mode: 'mono' },
  span: { asset: '/media/garden/seals/marks/span.webp', mode: 'span', viewBox: '92.16 75.2 72.32 100.8', width: 256, height: 256 },
  pams: { asset: '/media/garden/seals/marks/pams.svg', mode: 'mono' },
  'legal-docs': { asset: '/media/garden/seals/marks/legal-docs.svg', mode: 'mono' },
  'tecnico-terminal': { asset: '/media/garden/seals/marks/tecnico-terminal.svg', mode: 'mono' },
  centrovet: { asset: '/media/garden/seals/marks/centrovet.webp', mode: 'tone', viewBox: '17.23 21.33 214.97 214.97', width: 253, height: 256 },
  elcontainer: { asset: '/media/garden/seals/marks/elcontainer.svg', mode: 'tone' },
  'cocina-anita': { asset: '/media/garden/seals/marks/cocina-anita.webp', mode: 'tone', viewBox: '11 9.5 233 235.25', width: 256, height: 256 },
  vigilia: { asset: '/media/garden/seals/marks/vigilia.svg', mode: 'mono' },
  'rex-en-fuga': { asset: '/media/garden/seals/marks/rex-en-fuga.svg', mode: 'mono' },
};

// User-approved engraved names for apps without their own logo assets.
export const projectSealNames: Record<string, string[]> = {
  cotizacion: ['COTIZACIÓN', 'REACT'],
  'apple-stock': ['APPLE STOCK', 'LIVE'],
  'menu-semanal': ['MENÚ', 'SEMANAL'],
  vidmaker: ['VIDMAKER'],
};
