import viJson from './data/luangiai/vi.json';
import type { Chart, HoaType, InterpretationItem, InterpretationSection, Lang, Palace, Star } from './types';

// Branch index relationship helpers. chiCung is 0-based (Tý=0 ... Hợi=11).
const BRANCH_ORDER = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

const TAM_HOP_GROUPS = [
  [0, 4, 8],  // Tý-Thìn-Thân
  [1, 5, 9],  // Sửu-Tị-Dậu
  [2, 6, 10], // Dần-Ngọ-Tuất
  [3, 7, 11], // Mão-Mùi-Hợi
];

const NHI_HOP_PAIRS = [
  [0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7],
];

const mod = (a: number, m: number) => ((a % m) + m) % m;

const sameGroup = (a: number, b: number) =>
  TAM_HOP_GROUPS.some((g) => g.includes(a) && g.includes(b));

const isNhiHop = (a: number, b: number) =>
  NHI_HOP_PAIRS.some((p) => p.includes(a) && p.includes(b));

const isXung = (a: number, b: number) => mod(a - b, 12) === 6;

const starStatusKey = (star: Star) => {
  const code = star && star.status;
  // Engine codes: 'M' miếu, 'V' vượng, 'Đ' đắc, 'H' hãm, 'B' bình, 'N' none.
  return code || 'B';
};

// All named stars of a palace (main + auxiliary).
const palaceStars = (palace: Palace): Star[] => [
  ...palace.chinhTinh,
  ...palace.saoTot,
  ...palace.saoXau,
];

const palaceStarNames = (palace: Palace): string[] => palaceStars(palace).map((s) => s.name);

const findStar = (chart: Chart, name: string) => {
  for (const p of chart.palaces) {
    const star = palaceStars(p).find((s) => s.name === name);
    if (star) return { palace: p, star };
  }
  return null;
};

interface StarEntries {
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
  [key: string]: unknown;
}

interface PalaceEntry {
  general: string;
  reading?: string;
}

interface PatternRule {
  match: string;
  stars: string[];
  status?: string;
  tuhua?: HoaType;
  branch?: string;
  min?: number;
  name: string;
  text: string;
}

interface InterpretationDict {
  sections: Record<string, string>;
  intro: { title: string; subtitle: string; empty: string };
  summary: Record<string, string>;
  stars: Record<string, StarEntries>;
  palaces: Record<string, PalaceEntry>;
  patterns: PatternRule[];
  cohabitations: { stars: string[]; text: string }[];
  oppositions: { stars: string[]; text: string }[];
  relationships?: {
    tamHop?: { title: string; rules: { palaces: string[]; text: string }[] };
    xungChieu?: { title: string; rules: { pair: string[]; text: string }[] };
    nhiHop?: { title: string; rules: { pair: string[]; text: string }[] };
  };
}

const dict = viJson as unknown as InterpretationDict;

// Match a single pattern rule against the whole chart. Returns info or null.
function matchPattern(pattern: PatternRule, chart: Chart): Palace | null {
  const allPalaces = chart.palaces;
  switch (pattern.match) {
    case 'same_palace': {
      for (const p of allPalaces) {
        const names = new Set(palaceStarNames(p));
        if (pattern.stars.every((s) => names.has(s))) return p;
      }
      return null;
    }
    case 'same_palace_status': {
      const [starName] = pattern.stars;
      const want = pattern.status;
      for (const p of allPalaces) {
        const star = palaceStars(p).find((s) => s.name === starName);
        if (star && starStatusKey(star) === want) return p;
      }
      return null;
    }
    case 'same_palace_tuhua': {
      const [starName] = pattern.stars;
      const want = pattern.tuhua;
      for (const p of allPalaces) {
        const star = palaceStars(p).find((s) => s.name === starName);
        if (star && star.hóa === want) return p;
      }
      return null;
    }
    case 'in_palaces': {
      const menh = allPalaces.find((p) => p.isMenh);
      if (!menh) return null;
      const zone = [menh, ...allPalaces.filter((p) => sameGroup(p.chiCung, menh.chiCung))];
      const zoneNames = new Set(zone.flatMap(palaceStarNames));
      if (pattern.stars.every((s) => zoneNames.has(s))) return menh;
      return null;
    }
    case 'palace_branch': {
      // A named star located at a specific branch (con giáp). e.g. Thái dương cư Ngọ.
      const [starName] = pattern.stars;
      const want = pattern.branch;
      const hit = findStar(chart, starName);
      if (hit && hit.palace.branch === want) return hit.palace;
      return null;
    }
    case 'tuhua_any': {
      // Any of the listed stars receives the given transformation in the chart.
      const want = pattern.tuhua;
      for (const p of allPalaces) {
        for (const s of palaceStars(p)) {
          if (pattern.stars.includes(s.name) && s.hóa === want) return p;
        }
      }
      return null;
    }
    case 'tuhua_count': {
      // Count of stars carrying the given transformation across the chart.
      const want = pattern.tuhua;
      const min = pattern.min || 1;
      let count = 0;
      let hitPalace: Palace | null = null;
      for (const p of allPalaces) {
        for (const s of palaceStars(p)) {
          if (s.hóa === want) {
            count++;
            if (!hitPalace && pattern.stars.includes(s.name)) hitPalace = p;
          }
        }
      }
      return count >= min ? hitPalace : null;
    }
    default:
      return null;
  }
}

// Build interpretation blocks.
export function interpret(chart: Chart, lang: Lang = 'vi'): {
  lang: Lang;
  intro: { title: string; subtitle: string; empty: string };
  sections: InterpretationSection[];
} {
  const sections: InterpretationSection[] = [];
  const palaceByName: Record<string, Palace> = {};
  chart.palaces.forEach((p) => {
    palaceByName[p.name] = p;
  });

  // --- 1. Cách cục đặc biệt (patterns) ---
  const patterns: InterpretationItem[] = [];
  if (Array.isArray(dict.patterns)) {
    for (const rule of dict.patterns) {
      const palace = matchPattern(rule, chart);
      if (palace) {
        patterns.push({ name: rule.name, text: rule.text, palace: palace.name });
      }
    }
  }

  // --- 2. Luận theo cung (palace by palace) ---
  const palaces = chart.palaces
    .filter((p) => p.name)
    .map((p) => {
      const starTexts: string[] = [];

      for (const s of palaceStars(p)) {
        const entries = dict.stars[s.name];
        if (!entries) continue;

        // 2a. Luận theo độ sáng (status).
        const statusKey = starStatusKey(s);
        const statusText_ = entries[statusKey];
        if (typeof statusText_ === 'string') starTexts.push(statusText_);

        // 2b. Luận theo con giáp (branch) của sao.
        if (entries.branch && entries.branch[p.branch]) {
          starTexts.push(entries.branch[p.branch]);
        }

        // 2b′. Luận theo cung an vị (sao X tại cung Y).
        if (entries.palace && entries.palace[p.name]) {
          starTexts.push(entries.palace[p.name]);
        }

        // 2c. Luận theo nghĩa tổng quát (auxiliary stars, or fallback).
        if (entries.meaning && !statusText_ && !(entries.branch && entries.branch[p.branch])) {
          starTexts.push(entries.meaning);
        }

        // 2d. Tứ Hóa.
        if (s.hóa && entries.tuhua && entries.tuhua[s.hóa]) {
          starTexts.push(entries.tuhua[s.hóa]!);
        }
      }

      const palaceEntry = dict.palaces[p.name];
      const palaceText = palaceEntry
        ? [palaceEntry.general, palaceEntry.reading].filter(Boolean).join(' ')
        : null;

      return {
        name: p.name,
        isMenh: p.isMenh,
        isThan: p.isThan,
        branch: p.branch,
        starTexts,
        palaceText,
        hasContent: starTexts.length > 0 || !!palaceText,
      };
    })
    .filter((p) => p.hasContent);

  // --- 3. Tương quan giữa các cung ---
  const relationships: InterpretationItem[] = [];
  const rel = dict.relationships || {};
  const addRel = (title: string, text: string, palacesInvolved: string[]) => {
    if (!text) return;
    relationships.push({ title, text, palaces: palacesInvolved });
  };

  if (rel.tamHop && Array.isArray(rel.tamHop.rules)) {
    for (const rule of rel.tamHop.rules) {
      const idxs = rule.palaces
        .map((n) => palaceByName[n] && palaceByName[n].chiCung)
        .filter((v) => v !== undefined && v !== null);
      if (idxs.length === rule.palaces.length && idxs.every((i) => sameGroup(i, idxs[0]!))) {
        addRel(rel.tamHop.title, rule.text, rule.palaces);
      }
    }
  }
  if (rel.xungChieu && Array.isArray(rel.xungChieu.rules)) {
    for (const rule of rel.xungChieu.rules) {
      const [a, b] = rule.pair;
      const ai = palaceByName[a] && palaceByName[a].chiCung;
      const bi = palaceByName[b] && palaceByName[b].chiCung;
      if (ai !== undefined && bi !== undefined && isXung(ai, bi)) {
        addRel(rel.xungChieu.title, rule.text, rule.pair);
      }
    }
  }
  if (rel.nhiHop && Array.isArray(rel.nhiHop.rules)) {
    for (const rule of rel.nhiHop.rules) {
      const [a, b] = rule.pair;
      const ai = palaceByName[a] && palaceByName[a].chiCung;
      const bi = palaceByName[b] && palaceByName[b].chiCung;
      if (ai !== undefined && bi !== undefined && isNhiHop(ai, bi)) {
        addRel(rel.nhiHop.title, rule.text, rule.pair);
      }
    }
  }

  // --- 4. Đồng cung (cohabitation) & xung chiếu sao (opposition) ---
  const cohabitations: InterpretationItem[] = [];
  const oppositions: InterpretationItem[] = [];

  if (Array.isArray(dict.cohabitations)) {
    for (const rule of dict.cohabitations) {
      for (const p of chart.palaces) {
        const names = new Set(palaceStarNames(p));
        if (rule.stars.every((s) => names.has(s))) {
          cohabitations.push({ text: rule.text, stars: rule.stars, palace: p.name });
          break;
        }
      }
    }
  }

  if (Array.isArray(dict.oppositions)) {
    for (const rule of dict.oppositions) {
      const [a, b] = rule.stars;
      const hitA = findStar(chart, a);
      const hitB = findStar(chart, b);
      if (hitA && hitB && isXung(hitA.palace.chiCung, hitB.palace.chiCung)) {
        oppositions.push({
          text: rule.text,
          stars: [a, b],
          palaces: [hitA.palace.name, hitB.palace.name],
        });
      }
    }
  }

  // --- 5. Tổng quan (summary) ---
  const summary = buildSummary(chart, dict);

  // Tóm lược đứng đầu (đọc nhanh); các mục chi tiết theo sau, "palaces" (dài nhất) đặt cuối.
  sections.push({ key: 'summary', title: dict.sections.summary, items: summary });
  sections.push({ key: 'patterns', title: dict.sections.patterns, items: patterns });
  sections.push({ key: 'cohabitations', title: dict.sections.cohabitations, items: cohabitations });
  sections.push({ key: 'oppositions', title: dict.sections.oppositions, items: oppositions });
  sections.push({ key: 'relationships', title: dict.sections.relationships, items: relationships });
  sections.push({ key: 'palaces', title: dict.sections.palaces, items: palaces });

  return { lang, intro: dict.intro, sections };
}

function buildSummary(chart: Chart, dict: InterpretationDict): InterpretationItem[] {
  const items: InterpretationItem[] = [];
  const s = dict.summary;
  if (!s) return items;
  const menh = chart.palaces.find((p) => p.isMenh);

  if (menh && s.menhPalace) {
    const menhGeneral = dict.palaces[menh.name]?.general;
    const palaceText = menhGeneral ? ` ${menhGeneral}` : '';
    items.push({
      key: 'menhPalace',
      text: s.menhPalace
        .replace('{palace}', menh.name)
        .replace('{palaceText}', palaceText),
    });
  }
  if (chart.info.chuMenh && s.chuMenh) {
    items.push({ key: 'chuMenh', text: s.chuMenh.replace('{star}', chart.info.chuMenh) });
  }
  if (chart.info.chuThan && s.chuThan) {
    items.push({
      key: 'chuThan',
      text: s.chuThan
        .replace('{star}', chart.info.chuThan)
        .replace('{thanCu}', chart.info.thanCu || ''),
    });
  }
  if (chart.info.cuc && s.bureau) {
    items.push({ key: 'bureau', text: s.bureau.replace('{cuc}', chart.info.cuc) });
  }
  return items;
}

// Derive the free "preview" view from a full interpretation. Curated by content
// value, not truncated arbitrarily: the short overview stays intact, the two
// personally-central palaces (Mệnh, Thân) stay visible, everything else that
// draws on the interpretation dataset (cách cục, đồng cung, xung chiếu, tương
// quan, and the other 10 palaces) is withheld — only a locked count is exposed
// so the raw dictionary text never leaves the server for un-entitled requests.
export function toPreview(sections: InterpretationSection[]): InterpretationSection[] {
  return sections.map((section) => {
    if (section.key === 'summary') return section;

    if (section.key === 'palaces') {
      const shown = section.items.filter((it) => it.isMenh || it.isThan);
      const hiddenCount = section.items.length - shown.length;
      return hiddenCount > 0
        ? { ...section, items: shown, locked: true, lockedCount: hiddenCount }
        : { ...section, items: shown };
    }

    // patterns / cohabitations / oppositions / relationships: fully withheld.
    const hiddenCount = section.items.length;
    return hiddenCount > 0
      ? { ...section, items: [], locked: true, lockedCount: hiddenCount }
      : section;
  });
}