// Builds the luận giải dictionary from the private data files in
// data/luangiai/ (gitignored, never committed; bundled into the Worker at
// deploy time). vi.json is the base; the three tuvi-*.json files are the newer,
// deeper content and override it where they overlap.
import viJson from './data/luangiai/vi.json';
import luanGiaiJson from './data/luangiai/tuvi-luan-giai.json';
import tapTinhJson from './data/luangiai/tuvi-tap-tinh.json';
import cachCucJson from './data/luangiai/tuvi-cach-cuc.json';
import { CACH_CUC_RULES } from './cachCucRules';
import type { HoaType } from './types';

export interface StarEntries {
  M?: string;
  V?: string;
  Đ?: string;
  H?: string;
  B?: string;
  N?: string;
  branch?: Record<string, string>;
  palace?: Record<string, string>;
  tuhua?: Partial<Record<HoaType, string>>;
  meaning?: string;
  dignity?: string;
  // The Mệnh text already opens with the star's bản chất, so don't repeat
  // `meaning` there.
  menhCoversMeaning?: boolean;
  [key: string]: unknown;
}

interface PalaceEntry {
  general: string;
  reading?: string;
}

export interface PatternRule {
  match: string;
  stars: string[];
  status?: string;
  tuhua?: HoaType;
  tuhuaList?: HoaType[];
  branch?: string;
  min?: number;
  name: string;
  text: string;
}

export interface InterpretationDict {
  sections: Record<string, string>;
  intro: { title: string; subtitle: string; empty: string };
  summary: Record<string, string>;
  stars: Record<string, StarEntries>;
  palaces: Record<string, PalaceEntry>;
  statusLabels?: Record<string, string>;
  hoaLabels?: Record<string, string>;
  voChinhDieu?: { general: string; borrowNote?: string; palace: Record<string, string> };
  patterns: PatternRule[];
  cohabitations: { stars: string[]; text: string }[];
  oppositions: { stars: string[]; text: string }[];
  relationships?: {
    tamHop?: { title: string; rules: { palaces: string[]; text: string }[] };
    xungChieu?: { title: string; rules: { pair: string[]; text: string }[] };
    nhiHop?: { title: string; rules: { pair: string[]; text: string }[] };
  };
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

// How-to-place notes ("an_sao") are chart-building info, not a reading.
const HIDDEN_FIELDS = new Set(['an_sao']);

const mergeInto = (target: StarEntries, source: Record<string, unknown>) => {
  for (const [field, value] of Object.entries(source)) {
    if (HIDDEN_FIELDS.has(field)) continue;
    const prev = target[field];
    target[field] =
      value && typeof value === 'object' && prev && typeof prev === 'object'
        ? { ...(prev as object), ...(value as object) }
        : value;
  }
};

// Old vi.json patterns whose cách is now covered by tuvi-cach-cuc.json under
// a different name (same-name ones are dropped automatically).
const SUPERSEDED_PATTERNS = new Set([
  'Tử Vũ Liêm Tướng hội',
  'Vũ Phủ hội',
  'Cơ Nguyệt đồng cung',
  'Cơ Lương đồng cung',
  'Đồng Lương đồng cung',
  'Nhật Nguyệt đồng minh',
  'Khôi Việt hội',
  'Khôi Việt giáp Mệnh',
  'Tả Hữu hội',
  'Tả Hữu giáp Mệnh',
  'Xương Khúc giáp Mệnh',
  'Thất Sát triều đẩu (Thân)',
  'Thất Sát triều đẩu (Ngọ)',
  'Thất Sát ngưỡng đẩu (Dần)',
  'Thất Sát ngưỡng đẩu (Tý)',
]);

function build() {
  const base = viJson as unknown as InterpretationDict;

  const stars: Record<string, StarEntries> = {};
  for (const [name, entries] of Object.entries(base.stars)) {
    stars[starKey(name)] = { ...entries };
  }
  const sources = [
    [luanGiaiJson, true],
    [tapTinhJson, false],
  ] as unknown as [Record<string, Record<string, unknown>>, boolean][];
  for (const [source, menhCoversMeaning] of sources) {
    for (const [name, entries] of Object.entries(source)) {
      const key = starKey(name);
      stars[key] ??= {};
      mergeInto(stars[key], entries);
      if (menhCoversMeaning) stars[key].menhCoversMeaning = true;
    }
  }

  const cachCucTexts = cachCucJson as unknown as Record<string, string>;
  const cachCuc = Object.entries(cachCucTexts)
    .filter(([name]) => CACH_CUC_RULES[name])
    .map(([name, text]) => ({ name, text, rule: CACH_CUC_RULES[name] }));

  const patterns = base.patterns.filter(
    (p) => !(p.name in cachCucTexts) && !SUPERSEDED_PATTERNS.has(p.name),
  );

  const dict: InterpretationDict = { ...base, stars, patterns };
  return { dict, cachCuc };
}

export const { dict, cachCuc } = build();

export const starEntry = (name: string): StarEntries | undefined => dict.stars[starKey(name)];
