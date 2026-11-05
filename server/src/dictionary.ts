// Loads the luận giải data from data/luangiai/ (gitignored, never committed;
// bundled into the Worker at deploy time). Each file owns one kind of content
// and nothing appears in two files:
//   giao-dien.json  section titles, intro, labels, summary templates
//   cung.json       the 12 cung + Vô Chính Diệu
//   chinh-tinh.json 14 chính tinh
//   phu-tinh.json   phụ tinh (Lộc Tồn, Xương Khúc, Tả Hữu, Khôi Việt, lục sát, …)
//   tap-tinh.json   every other star
//   cach-cuc.json   cách cục texts (match conditions live in cachCucRules.ts)
//   tuong-quan.json relationships between cung + sao xung chiếu
import giaoDien from './data/luangiai/giao-dien.json';
import cungJson from './data/luangiai/cung.json';
import chinhTinh from './data/luangiai/chinh-tinh.json';
import phuTinh from './data/luangiai/phu-tinh.json';
import tapTinh from './data/luangiai/tap-tinh.json';
import cachCucJson from './data/luangiai/cach-cuc.json';
import tuongQuanJson from './data/luangiai/tuong-quan.json';
import { CACH_CUC_RULES } from './cachCucRules';
import type { HoaType } from './types';

// Per star, every field is optional. Shown in this order: meaning (bản chất,
// any cung), status text (M/V/Đ/H/B), dignity (where it's strong/weak),
// branch, palace (per cung), tuhua. `an_sao` (how to place the star) is
// reference only and never shown.
export interface StarEntries {
  meaning?: string;
  M?: string;
  V?: string;
  Đ?: string;
  H?: string;
  B?: string;
  dignity?: string;
  branch?: Record<string, string>;
  palace?: Record<string, string>;
  tuhua?: Partial<Record<HoaType, string>>;
  an_sao?: string;
}

interface PalaceEntry {
  general: string;
  reading?: string;
}

interface UiText {
  sections: Record<string, string>;
  intro: { title: string; subtitle: string; empty: string };
  statusLabels: Record<string, string>;
  hoaLabels: Record<string, string>;
  summary: Record<string, string>;
}

interface CungData {
  palaces: Record<string, PalaceEntry>;
  voChinhDieu: { general: string; borrowNote?: string; palace: Record<string, string> };
}

interface TuongQuanData {
  relationships: {
    tamHop?: { title: string; rules: { palaces: string[]; text: string }[] };
    xungChieu?: { title: string; rules: { pair: string[]; text: string }[] };
    nhiHop?: { title: string; rules: { pair: string[]; text: string }[] };
  };
  oppositions: { stars: string[]; text: string }[];
}

// The data files spell star names differently from the engine ("Liêm Trinh"
// vs "Liêm trinh", "Thiên Hỷ" vs "Thiên hỉ", "Phúc Đức (vòng Thái Tuế)" vs
// "Phúc đức"), so every lookup goes through one normalized key.
export const starKey = (name: string) =>
  name
    .normalize('NFC')
    .replace(/\s*\(.*\)\s*$/, '')
    .toLowerCase()
    .replace(/hỷ/g, 'hỉ');

const stars = new Map<string, StarEntries>();
for (const group of [chinhTinh, phuTinh, tapTinh] as unknown as Record<string, StarEntries>[]) {
  for (const [name, entries] of Object.entries(group)) stars.set(starKey(name), entries);
}

export const ui = giaoDien as unknown as UiText;
export const cung = cungJson as unknown as CungData;
export const tuongQuan = tuongQuanJson as unknown as TuongQuanData;

export const starEntry = (name: string): StarEntries | undefined => stars.get(starKey(name));

// Cách cục without a rule (no computable condition) are never shown.
export const cachCuc = Object.entries(cachCucJson as unknown as Record<string, string>)
  .filter(([name]) => CACH_CUC_RULES[name])
  .map(([name, text]) => ({ name, text, rule: CACH_CUC_RULES[name] }));
