// Konstanter, priser og tekster. Juster balansen her.

export const HERO = 'Stian Lønvik';
export const HERO_FIRST = 'Stian';
export const HOME = 'Inderøy';

export const TILE = 16;
export const VIEW_W = 18;
export const VIEW_H = 12;

// Sideskrollende sti: fra byen i vest til fjellene i øst.
export const TRAIL_LEN = 420;
export const TRAIL_H = 24;
export const TOWN_END = 64;
export const TOWN_GROUND = 18;
export const MIN_PER_TILE = 1.5;

export const MINE_W = 40;
export const MINE_H = 28;
export const M = { AIR: 0, WALL: 1, VEIN: 2, RICH: 3, BEDROCK: 4, EXIT: 5, LADDER: 6 };
export const DIGGABLE = new Set([M.WALL, M.VEIN, M.RICH]);
export const OPEN = new Set([M.AIR, M.LADDER, M.EXIT]);

export const TOWN_NAME = 'Tørrbekk';

export const BUILDINGS = [
  { id: 'butikk', name: 'Hansens handel', sign: 'HANDEL' },
  { id: 'analyse', name: 'Analysekontoret', sign: 'ANALYSE' },
  { id: 'bank', name: 'Tørrbekk Bank', sign: 'BANK' },
  { id: 'saloon', name: 'Den tørste mulen', sign: 'SALOON' },
  { id: 'hotell', name: 'Dede&Cams Hotell', sign: 'HOTELL' },
  { id: 'stall', name: 'Ridskolan', sign: 'RIDSKOLE' },
];

export const PRICES = {
  provisions: 4, pick: 8, lantern: 6, dynamite: 2, mule: 35, hotel: 2, drink: 1, bet: 5,
};
export const START_MONEY = 40;

export const RUMORS = [
  'Klapperslangene er verst midt på dagen. Hopp over dem, ikke gå rundt.',
  'Banditter rir om natta. Dollar i banken sover tryggere enn dollar i lomma.',
  'Bekkene nærmest fjellet har mest gull, sies det.',
  'Uten lykt i gruva er du så godt som blind.',
  'Dynamitt river løs mye, men taket liker det dårlig.',
  'Nåla? Den spisse steinsøyla langt øst ved fjellfoten. Umulig å ta feil av.',
  'Hollenderen døde med hemmeligheten sin. Eller gjorde han det?',
  'Sjakta hans er gjengrodd. Du ser den ikke før du nesten snubler i den.',
  'Et muldyr er verdt hver dollar. Du kommer dobbelt så langt på en dag.',
  'Selg gullet før du rir ut igjen. Banditter liker gull like godt som deg.',
  'Faller du mer enn tre favner i en sjakt, kjenner du det i knærne.',
];
