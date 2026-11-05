import type { Chart, HoaType, Palace, Star } from './types';

// chiCung is 0-based (Tý=0 ... Hợi=11).
export const mod = (a: number, m: number) => ((a % m) + m) % m;

const TAM_HOP_GROUPS = [
  [0, 4, 8],  // Tý-Thìn-Thân
  [1, 5, 9],  // Sửu-Tị-Dậu
  [2, 6, 10], // Dần-Ngọ-Tuất
  [3, 7, 11], // Mão-Mùi-Hợi
];

const NHI_HOP_PAIRS = [
  [0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7],
];

export const sameGroup = (a: number, b: number) =>
  TAM_HOP_GROUPS.some((g) => g.includes(a) && g.includes(b));

export const isNhiHop = (a: number, b: number) =>
  NHI_HOP_PAIRS.some((p) => p.includes(a) && p.includes(b));

export const isXung = (a: number, b: number) => mod(a - b, 12) === 6;

// Engine codes: 'M' miếu, 'V' vượng, 'Đ' đắc, 'H' hãm, 'B' bình, 'N' none.
export const starStatusKey = (star: Star) => (star && star.status) || 'B';

export const palaceStars = (palace: Palace): Star[] => [
  ...palace.chinhTinh,
  ...palace.saoTot,
  ...palace.saoXau,
];

export const palaceStarNames = (palace: Palace): string[] => palaceStars(palace).map((s) => s.name);

export const hasStar = (palace: Palace | undefined, name: string) =>
  !!palace && palaceStars(palace).some((s) => s.name === name);

export const hasHoa = (palace: Palace | undefined, type: HoaType) =>
  !!palace && palaceStars(palace).some((s) => s.hóa === type);

export const findStar = (chart: Chart, name: string) => {
  for (const p of chart.palaces) {
    const star = palaceStars(p).find((s) => s.name === name);
    if (star) return { palace: p, star };
  }
  return null;
};

export const menhOf = (chart: Chart) => chart.palaces.find((p) => p.isMenh);

export const palaceAtOffset = (chart: Chart, from: Palace, offset: number) =>
  chart.palaces.find((p) => mod(p.chiCung - from.chiCung, 12) === mod(offset, 12));

// The palace itself + its two tam hợp palaces + its xung chiếu palace.
export const tamPhuongTuChinh = (chart: Chart, palace: Palace): Palace[] =>
  chart.palaces.filter((p) => sameGroup(p.chiCung, palace.chiCung) || isXung(p.chiCung, palace.chiCung));

// The two palaces on either side, which "giáp" (flank) the given one.
export const neighbors = (chart: Chart, palace: Palace): [Palace, Palace] | null => {
  const a = palaceAtOffset(chart, palace, 1);
  const b = palaceAtOffset(chart, palace, -1);
  return a && b ? [a, b] : null;
};
