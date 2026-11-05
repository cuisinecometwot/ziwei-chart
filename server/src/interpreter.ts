import { cachCuc, dict, starEntry, type InterpretationDict, type PatternRule } from './dictionary';
import { DONG_CUNG_PAIRS } from './cachCucRules';
import {
  findStar,
  isNhiHop,
  isXung,
  mod,
  palaceStarNames,
  palaceStars,
  sameGroup,
  starStatusKey,
} from './chartQuery';
import type { Chart, InterpretationItem, InterpretationSection, Lang, Palace, PalaceStarBlock } from './types';

// Cung hiển thị ưu tiên lên đầu danh sách luận giải theo cung, theo đúng thứ tự này.
const PRIORITY_PALACES = ['Mệnh', 'Tài bạch', 'Quan lộc'];

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
    case 'giap': {
      // Hai sao chỉ định đóng ở hai cung liền kề, kẹp Mệnh ở giữa (không phân biệt bên nào).
      const [starA, starB] = pattern.stars;
      const menh = allPalaces.find((p) => p.isMenh);
      if (!menh) return null;
      const side1 = allPalaces.find((p) => mod(p.chiCung - menh.chiCung, 12) === 1);
      const side2 = allPalaces.find((p) => mod(p.chiCung - menh.chiCung, 12) === 11);
      if (!side1 || !side2) return null;
      const n1 = new Set(palaceStarNames(side1));
      const n2 = new Set(palaceStarNames(side2));
      if ((n1.has(starA) && n2.has(starB)) || (n1.has(starB) && n2.has(starA))) return menh;
      return null;
    }
    case 'tuhua_in_palaces': {
      // Một tập loại hóa (trên sao bất kỳ) cùng có mặt trong tam hợp Mệnh.
      const menh = allPalaces.find((p) => p.isMenh);
      if (!menh) return null;
      const zone = [menh, ...allPalaces.filter((p) => sameGroup(p.chiCung, menh.chiCung))];
      const zoneHoa = new Set(zone.flatMap(palaceStars).map((s) => s.hóa).filter(Boolean));
      const want = pattern.tuhuaList || [];
      return want.length > 0 && want.every((t) => zoneHoa.has(t)) ? menh : null;
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
  const matchedCachCuc = new Set<string>();
  for (const cc of cachCuc) {
    const palace = cc.rule(chart);
    if (palace) {
      matchedCachCuc.add(cc.name);
      patterns.push({ name: cc.name, text: cc.text, palace: palace.name });
    }
  }
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
      const starBlocks: PalaceStarBlock[] = [];
      const chinhNames = new Set(p.chinhTinh.map((s) => s.name));

      for (const s of palaceStars(p)) {
        const entries = starEntry(s.name);
        if (!entries) continue;
        const texts: string[] = [];

        // 2a. Bản chất tổng quát của sao — luôn hiển thị bất kể cung an vị,
        // để người xem thấy được cốt lõi của sao ngay cả khi nó không thủ Mệnh.
        // Bỏ qua ở Mệnh nếu lời luận tại Mệnh đã mở đầu bằng bản chất.
        const menhCovers = p.isMenh && entries.menhCoversMeaning && !!entries.palace?.['Mệnh'];
        if (entries.meaning && !menhCovers) texts.push(entries.meaning);

        // 2b. Luận theo độ sáng (status), rồi vị trí miếu/hãm chung của phụ tinh.
        const statusKey = starStatusKey(s);
        const statusText_ = entries[statusKey];
        if (typeof statusText_ === 'string') texts.push(statusText_);
        if (entries.dignity) texts.push(entries.dignity);

        // 2c. Luận theo con giáp (branch) của sao.
        if (entries.branch && entries.branch[p.branch]) {
          texts.push(entries.branch[p.branch]);
        }

        // 2c′. Luận theo cung an vị (sao X tại cung Y).
        if (entries.palace && entries.palace[p.name]) {
          texts.push(entries.palace[p.name]);
        }

        // 2d. Tứ Hóa.
        if (s.hóa && entries.tuhua && entries.tuhua[s.hóa]) {
          texts.push(entries.tuhua[s.hóa]!);
        }

        if (texts.length === 0) continue;
        starBlocks.push({
          name: s.name,
          isChinh: chinhNames.has(s.name),
          status: s.status || undefined,
          statusLabel: s.status ? dict.statusLabels?.[s.status] : undefined,
          hoa: s.hóa,
          hoaLabel: s.hóa ? dict.hoaLabels?.[s.hóa] : undefined,
          texts,
        });
      }

      // 2e. Vô Chính Diệu — cung không có chính tinh nào trấn giữ. Không gắn
      // với một sao cụ thể nào, nên biểu diễn như một khối riêng ở cuối danh
      // sách thay vì một trường tách biệt, để UI dùng chung 1 kiểu hiển thị.
      if (p.chinhTinh.length === 0 && dict.voChinhDieu) {
        const vcd = dict.voChinhDieu;
        const texts: string[] = [];
        if (vcd.general) texts.push(vcd.general);
        if (vcd.palace && vcd.palace[p.name]) texts.push(vcd.palace[p.name]);

        const opposite = chart.palaces.find((p2) => isXung(p2.chiCung, p.chiCung));
        if (opposite && opposite.chinhTinh.length > 0 && vcd.borrowNote) {
          const stars = opposite.chinhTinh.map((s) => s.name).join(', ');
          texts.push(
            vcd.borrowNote
              .replace('{palace}', p.name)
              .replace('{stars}', stars)
              .replace('{oppositePalace}', opposite.name)
          );
        }
        if (texts.length > 0) {
          starBlocks.push({ name: 'Vô Chính Diệu', isChinh: false, texts });
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
        starBlocks,
        palaceText,
        hasContent: starBlocks.length > 0 || !!palaceText,
      };
    })
    .filter((p) => p.hasContent)
    .sort((a, b) => {
      const ia = PRIORITY_PALACES.indexOf(a.name);
      const ib = PRIORITY_PALACES.indexOf(b.name);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

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

  // Skip a pair already covered by a matched "đồng cung" cách cục.
  const coveredPairs = new Set(
    [...matchedCachCuc]
      .map((name) => DONG_CUNG_PAIRS[name])
      .filter(Boolean)
      .map((pair) => [...pair].sort().join('|')),
  );

  if (Array.isArray(dict.cohabitations)) {
    for (const rule of dict.cohabitations) {
      if (coveredPairs.has([...rule.stars].sort().join('|'))) continue;
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
