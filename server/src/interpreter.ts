import { cachCuc, cung, starEntry, tuongQuan, ui } from './dictionary';
import { findStar, isNhiHop, isXung, palaceStars, sameGroup, starStatusKey } from './chartQuery';
import type { Chart, InterpretationItem, InterpretationSection, Lang, Palace, PalaceStarBlock } from './types';

// Cung hiển thị ưu tiên lên đầu danh sách luận giải theo cung, theo đúng thứ tự này.
const PRIORITY_PALACES = ['Mệnh', 'Tài bạch', 'Quan lộc'];

type StatusKey = 'M' | 'V' | 'Đ' | 'H' | 'B';

// Build interpretation blocks.
export function interpret(chart: Chart, lang: Lang = 'vi'): {
  lang: Lang;
  intro: { title: string; subtitle: string; empty: string };
  sections: InterpretationSection[];
} {
  const palaceByName: Record<string, Palace> = {};
  chart.palaces.forEach((p) => {
    palaceByName[p.name] = p;
  });

  // --- 1. Cách cục đặc biệt ---
  const patterns: InterpretationItem[] = [];
  for (const cc of cachCuc) {
    const palace = cc.rule(chart);
    if (palace) patterns.push({ name: cc.name, text: cc.text, palace: palace.name });
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
        // Phải đứng đầu: bản xem trước lấy texts[0] làm phần giới thiệu.
        if (entries.meaning) texts.push(entries.meaning);
        // Ảnh hưởng & lời khuyên chung của tạp tinh, cũng hiện ở mọi cung.
        if (entries.influence) texts.push(entries.influence);

        // 2b. Luận theo độ sáng (status), rồi vị trí miếu/hãm chung của phụ tinh.
        const statusText = entries[starStatusKey(s) as StatusKey];
        if (statusText) texts.push(statusText);
        if (entries.dignity) texts.push(entries.dignity);

        // 2c. Luận theo con giáp (branch) của sao.
        const branchText = entries.branch?.[p.branch];
        if (branchText) texts.push(branchText);

        // 2c′. Luận theo cung an vị (sao X tại cung Y).
        const palaceText = entries.palace?.[p.name];
        if (palaceText) texts.push(palaceText);

        // 2d. Tứ Hóa.
        const hoaText = s.hóa && entries.tuhua?.[s.hóa];
        if (hoaText) texts.push(hoaText);

        if (texts.length === 0) continue;
        starBlocks.push({
          name: s.name,
          isChinh: chinhNames.has(s.name),
          status: s.status || undefined,
          statusLabel: s.status ? ui.statusLabels[s.status] : undefined,
          hoa: s.hóa,
          hoaLabel: s.hóa ? ui.hoaLabels[s.hóa] : undefined,
          texts,
        });
      }

      // 2e. Vô Chính Diệu — cung không có chính tinh nào trấn giữ. Không gắn
      // với một sao cụ thể nào, nên biểu diễn như một khối riêng ở cuối danh
      // sách thay vì một trường tách biệt, để UI dùng chung 1 kiểu hiển thị.
      if (p.chinhTinh.length === 0) {
        const vcd = cung.voChinhDieu;
        const texts: string[] = [];
        // Lời luận riêng cho Mệnh đã tự giải thích khái niệm, không lặp lại phần chung.
        const own = vcd.palace[p.name];
        if (vcd.general && !(p.isMenh && own)) texts.push(vcd.general);
        if (own) texts.push(own);

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

      const palaceEntry = cung.palaces[p.name];
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
  const rel = tuongQuan.relationships;
  const addRel = (title: string, text: string, palacesInvolved: string[]) => {
    if (!text) return;
    relationships.push({ title, text, palaces: palacesInvolved });
  };
  const chiOf = (name: string) => palaceByName[name]?.chiCung;

  for (const rule of rel.tamHop?.rules ?? []) {
    const idxs = rule.palaces.map(chiOf).filter((v): v is number => v !== undefined);
    if (idxs.length === rule.palaces.length && idxs.every((i) => sameGroup(i, idxs[0]))) {
      addRel(rel.tamHop!.title, rule.text, rule.palaces);
    }
  }
  for (const rule of rel.xungChieu?.rules ?? []) {
    const [ai, bi] = rule.pair.map(chiOf);
    if (ai !== undefined && bi !== undefined && isXung(ai, bi)) {
      addRel(rel.xungChieu!.title, rule.text, rule.pair);
    }
  }
  for (const rule of rel.nhiHop?.rules ?? []) {
    const [ai, bi] = rule.pair.map(chiOf);
    if (ai !== undefined && bi !== undefined && isNhiHop(ai, bi)) {
      addRel(rel.nhiHop!.title, rule.text, rule.pair);
    }
  }

  // --- 4. Sao xung chiếu ---
  const oppositions: InterpretationItem[] = [];
  for (const rule of tuongQuan.oppositions) {
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

  // Tóm lược đứng đầu (đọc nhanh); các mục chi tiết theo sau, "palaces" (dài nhất) đặt cuối.
  const sections: InterpretationSection[] = [
    { key: 'summary', title: ui.sections.summary, items: buildSummary(chart) },
    { key: 'patterns', title: ui.sections.patterns, items: patterns },
    { key: 'oppositions', title: ui.sections.oppositions, items: oppositions },
    { key: 'relationships', title: ui.sections.relationships, items: relationships },
    { key: 'palaces', title: ui.sections.palaces, items: palaces },
  ];

  return { lang, intro: ui.intro, sections };
}

function buildSummary(chart: Chart): InterpretationItem[] {
  const items: InterpretationItem[] = [];
  const s = ui.summary;
  const menh = chart.palaces.find((p) => p.isMenh);

  if (menh && s.menhPalace) {
    const menhGeneral = cung.palaces[menh.name]?.general;
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
