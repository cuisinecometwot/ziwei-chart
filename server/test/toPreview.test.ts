import { describe, expect, it } from 'vitest';
import { toPreview } from '../src/interpreter';
import type { InterpretationSection } from '../src/types';

// Fixture mirrors the real shape returned by interpret(): one palace item per
// palace, Mệnh and Thân each with 2 palaces marked, plus one non-central
// palace ("Huynh đệ") to exercise the trimming path.
function baseSections(): InterpretationSection[] {
  return [
    {
      key: 'summary',
      title: 'Tổng quan',
      items: [{ key: 's1', text: 'Tóm tắt lá số' }],
    },
    {
      key: 'palaces',
      title: 'Luận theo cung',
      items: [
        {
          name: 'Mệnh',
          isMenh: true,
          isThan: false,
          palaceText: 'Mô tả cung Mệnh',
          starBlocks: [
            { name: 'Tử vi', isChinh: true, texts: ['Bản chất', 'Miếu', 'Theo chi', 'Theo cung', 'Hóa Quyền'] },
          ],
        },
        {
          name: 'Quan lộc',
          isMenh: false,
          isThan: true,
          palaceText: 'Mô tả cung Quan lộc (đóng vai Thân)',
          starBlocks: [{ name: 'Thiên phủ', isChinh: true, texts: ['Bản chất', 'Vượng'] }],
        },
        {
          name: 'Huynh đệ',
          isMenh: false,
          isThan: false,
          palaceText: 'Mô tả chi tiết cung Huynh đệ (trả phí)',
          starBlocks: [
            { name: 'Cự môn', isChinh: false, texts: ['Bản chất Cự môn', 'Đắc', 'Chi tiết theo cung'] },
          ],
        },
      ],
    },
    {
      key: 'patterns',
      title: 'Cách cục',
      items: [{ name: 'Sát Phá Liêm', text: 'Mô tả cách cục', palace: 'Mệnh' }],
    },
    {
      key: 'cohabitations',
      title: 'Đồng cung',
      items: [{ stars: ['Tử vi', 'Thiên phủ'], text: 'Đồng cung text', palace: 'Mệnh' }],
    },
    {
      key: 'oppositions',
      title: 'Xung chiếu',
      items: [{ stars: ['Tử vi', 'Thất sát'], text: 'Xung chiếu text', palaces: ['Mệnh', 'Thiên di'] }],
    },
    {
      key: 'relationships',
      title: 'Tương quan',
      items: [{ title: 'Tam hợp', text: 'Tương quan text', palaces: ['Mệnh', 'Tài bạch', 'Quan lộc'] }],
    },
  ];
}

describe('toPreview', () => {
  it('leaves the summary section untouched', () => {
    const [summary] = toPreview(baseSections());
    expect(summary).toEqual(baseSections()[0]);
    expect(summary.locked).toBeUndefined();
  });

  it('keeps Mệnh and Thân palace items fully intact', () => {
    const [, palaces] = toPreview(baseSections());
    const menh = palaces.items.find((it) => it.name === 'Mệnh')!;
    const than = palaces.items.find((it) => it.name === 'Quan lộc')!;

    expect(menh.palaceText).toBe('Mô tả cung Mệnh');
    expect(menh.starBlocks?.[0].texts).toHaveLength(5);

    expect(than.palaceText).toBe('Mô tả cung Quan lộc (đóng vai Thân)');
    expect(than.starBlocks?.[0].texts).toHaveLength(2);
  });

  it('trims every other palace to a one-line teaser (star meaning only)', () => {
    const [, palaces] = toPreview(baseSections());
    const other = palaces.items.find((it) => it.name === 'Huynh đệ')!;

    expect(other.palaceText).toBeNull();
    expect(other.starBlocks?.[0].texts).toEqual(['Bản chất Cự môn']);
  });

  it('marks the palaces section locked with the count of trimmed (non-Mệnh/Thân) palaces', () => {
    const [, palaces] = toPreview(baseSections());
    expect(palaces.locked).toBe(true);
    expect(palaces.lockedCount).toBe(1);
  });

  it('does not lock the palaces section when every palace is Mệnh or Thân', () => {
    const sections = baseSections();
    sections[1] = { ...sections[1], items: sections[1].items.filter((it) => it.name !== 'Huynh đệ') };
    const [, palaces] = toPreview(sections);
    expect(palaces.locked).toBeUndefined();
    expect(palaces.items).toHaveLength(2);
  });

  it.each(['patterns', 'cohabitations', 'oppositions', 'relationships'])(
    'fully withholds the %s section, exposing only a locked count',
    (key) => {
      const sections = toPreview(baseSections());
      const section = sections.find((s) => s.key === key)!;
      expect(section.items).toEqual([]);
      expect(section.locked).toBe(true);
      expect(section.lockedCount).toBe(1);
    },
  );

  it('leaves an already-empty withheld-type section untouched (no fake lock)', () => {
    const sections = baseSections();
    const patterns = sections.find((s) => s.key === 'patterns')!;
    patterns.items = [];
    const result = toPreview(sections).find((s) => s.key === 'patterns')!;
    expect(result.locked).toBeUndefined();
    expect(result.items).toEqual([]);
  });
});
