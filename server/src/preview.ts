import type { InterpretationSection } from './types';

// Derive the free "preview" view from a full interpretation. Curated by content
// value, not truncated arbitrarily: the short overview stays intact, cung
// Mệnh stays fully visible (every star it holds, every text line), and every
// other palace (Thân included) is cut down to just its main stars' (chính
// tinh) general "bản chất" line (texts[0] — see step 2a in interpret(),
// always the star's meaning, never cung-specific) as a teaser — phụ tinh
// blocks are dropped entirely there, and the cung-specific analysis stays
// hidden. Cách cục, đồng cung, xung chiếu, tương quan stay fully withheld —
// only a locked count is exposed so that raw dictionary text never leaves
// the server beyond this.
export function toPreview(sections: InterpretationSection[]): InterpretationSection[] {
  return sections.map((section) => {
    if (section.key === 'summary') return section;

    if (section.key === 'palaces') {
      let trimmedCount = 0;
      const items = section.items.map((it) => {
        if (it.isMenh) return it;
        trimmedCount += 1;
        return {
          ...it,
          palaceText: null,
          starBlocks: it.starBlocks
            ?.filter((b) => b.isChinh)
            .map((b) => ({ ...b, texts: b.texts.slice(0, 1) })),
        };
      });
      return trimmedCount > 0
        ? { ...section, items, locked: true, lockedCount: trimmedCount }
        : { ...section, items };
    }

    // patterns / cohabitations / oppositions / relationships: fully withheld.
    const hiddenCount = section.items.length;
    return hiddenCount > 0
      ? { ...section, items: [], locked: true, lockedCount: hiddenCount }
      : section;
  });
}