import {
  hasHoa,
  hasStar,
  isNhiHop,
  menhOf,
  neighbors,
  palaceStars,
  starStatusKey,
  tamPhuongTuChinh,
} from './chartQuery';
import type { Chart, HoaType, Palace } from './types';

// Match conditions for the cách cục in tuvi-cach-cuc.json, keyed by the same
// names. Only the conditions live in git; the texts stay in the private data.
// Each condition is taken from the definition at the start of that entry's
// text. A rule returns the palace the cách is anchored to, or null.
//
// "Sinh Bất Phùng Thời" has no rule on purpose: its definition (good stars
// "lạc hãm" plus bad early đại vận) is a judgment call, not a chart fact.
export type CachCucRule = (chart: Chart) => Palace | null;

const SAT_TINH = ['Kình dương', 'Đà la', 'Hỏa tinh', 'Linh tinh', 'Địa không', 'Địa kiếp'];
const CAT_TINH = ['Tả phù', 'Hữu bật', 'Văn xương', 'Văn khúc', 'Thiên khôi', 'Thiên việt'];

// Star pairs of the "đồng cung" cách — used to drop the overlapping
// cohabitation entry when the richer cách cục text already covers it.
export const DONG_CUNG_PAIRS: Record<string, [string, string]> = {};

const dongCung = (name: string, a: string, b: string): [string, CachCucRule] => {
  DONG_CUNG_PAIRS[name] = [a, b];
  return [name, (chart) => chart.palaces.find((p) => hasStar(p, a) && hasStar(p, b)) ?? null];
};

const zoneHas = (zone: Palace[], name: string) => zone.some((p) => hasStar(p, name));
const zoneHasHoa = (zone: Palace[], type: HoaType) => zone.some((p) => hasHoa(p, type));
const hasAny = (p: Palace, names: string[]) => names.some((n) => hasStar(p, n));

// All listed stars gather in Mệnh's tam phương tứ chính.
const hoiMenh = (...stars: string[]): CachCucRule => (chart) => {
  const menh = menhOf(chart);
  if (!menh) return null;
  const zone = tamPhuongTuChinh(chart, menh);
  return stars.every((s) => zoneHas(zone, s)) ? menh : null;
};

// A pair either gathers around Mệnh (tam phương tứ chính or nhị hợp) or
// flanks Mệnh from both sides.
const hoiHoacGiapMenh = (a: string, b: string): CachCucRule => (chart) => {
  const menh = menhOf(chart);
  if (!menh) return null;
  const zone = [
    ...tamPhuongTuChinh(chart, menh),
    ...chart.palaces.filter((p) => isNhiHop(p.chiCung, menh.chiCung)),
  ];
  if (zoneHas(zone, a) && zoneHas(zone, b)) return menh;
  const sides = neighbors(chart, menh);
  if (!sides) return null;
  const [x, y] = sides;
  return (hasStar(x, a) && hasStar(y, b)) || (hasStar(x, b) && hasStar(y, a)) ? menh : null;
};

// Star sits in Mệnh at one of the given branches.
const thuMenhTai = (star: string, branches: string[]): CachCucRule => (chart) => {
  const menh = menhOf(chart);
  return menh && hasStar(menh, star) && branches.includes(menh.branch) ? menh : null;
};

// The palace holding `center` is flanked by one side matching `sideA` and the
// other matching `sideB`.
const giap = (
  chart: Chart,
  center: Palace,
  sideA: (p: Palace) => boolean,
  sideB: (p: Palace) => boolean,
) => {
  const sides = neighbors(chart, center);
  if (!sides) return false;
  const [x, y] = sides;
  return (sideA(x) && sideB(y)) || (sideA(y) && sideB(x));
};

const voChinhDieu = (p: Palace) => p.chinhTinh.length === 0;

export const CACH_CUC_RULES: Record<string, CachCucRule> = Object.fromEntries([
  dongCung('Tử Phủ đồng cung', 'Tử vi', 'Thiên phủ'),
  dongCung('Tử Tham cách', 'Tử vi', 'Tham lang'),
  dongCung('Tử Phá cách', 'Tử vi', 'Phá quân'),
  dongCung('Tử Sát cách', 'Tử vi', 'Thất sát'),
  dongCung('Tử Tướng cách', 'Tử vi', 'Thiên tướng'),
  dongCung('Vũ Phủ cách', 'Vũ khúc', 'Thiên phủ'),
  dongCung('Vũ Tham cách', 'Vũ khúc', 'Tham lang'),
  dongCung('Vũ Tướng cách', 'Vũ khúc', 'Thiên tướng'),
  dongCung('Vũ Sát cách', 'Vũ khúc', 'Thất sát'),
  dongCung('Vũ Phá cách', 'Vũ khúc', 'Phá quân'),
  dongCung('Liêm Phủ cách', 'Liêm trinh', 'Thiên phủ'),
  dongCung('Liêm Tham cách', 'Liêm trinh', 'Tham lang'),
  dongCung('Liêm Tướng cách', 'Liêm trinh', 'Thiên tướng'),
  dongCung('Liêm Sát cách', 'Liêm trinh', 'Thất sát'),
  dongCung('Liêm Phá cách', 'Liêm trinh', 'Phá quân'),
  dongCung('Cơ Âm cách', 'Thiên cơ', 'Thái âm'),
  dongCung('Cơ Cự cách', 'Thiên cơ', 'Cự môn'),
  dongCung('Cơ Lương cách', 'Thiên cơ', 'Thiên lương'),
  dongCung('Đồng Âm cách', 'Thiên đồng', 'Thái âm'),
  dongCung('Đồng Cự cách', 'Thiên đồng', 'Cự môn'),
  dongCung('Đồng Lương cách', 'Thiên đồng', 'Thiên lương'),
  dongCung('Dương Cự cách', 'Thái dương', 'Cự môn'),
  dongCung('Dương Lương cách', 'Thái dương', 'Thiên lương'),
  dongCung('Nhật Nguyệt đồng lâm', 'Thái dương', 'Thái âm'),
  dongCung('Văn Xương Văn Khúc đồng cung', 'Văn xương', 'Văn khúc'),
  dongCung('Kình Đà đồng cung', 'Kình dương', 'Đà la'),
  dongCung('Hỏa Linh đồng cung', 'Hỏa tinh', 'Linh tinh'),

  ['Cơ Nguyệt Đồng Lương', hoiMenh('Thiên cơ', 'Thái âm', 'Thiên đồng', 'Thiên lương')],
  ['Sát Phá Tham', hoiMenh('Thất sát', 'Phá quân', 'Tham lang')],
  ['Sát Phá Liêm Tham', hoiMenh('Thất sát', 'Phá quân', 'Tham lang', 'Liêm trinh')],
  ['Tử Vũ Liêm hội (tam hợp)', hoiMenh('Tử vi', 'Vũ khúc', 'Liêm trinh')],
  ['Tử Phủ Vũ Tướng hội', hoiMenh('Tử vi', 'Thiên phủ', 'Vũ khúc', 'Thiên tướng')],
  ['Phủ Tướng triều viên', hoiMenh('Thiên phủ', 'Thiên tướng')],
  ['Ân Quang Thiên Quý hội', hoiMenh('Ân quang', 'Thiên quý')],
  ['Linh Xương Đà Vũ', hoiMenh('Linh tinh', 'Văn xương', 'Đà la', 'Vũ khúc')],

  ['Khôi Việt hội/giáp Mệnh', hoiHoacGiapMenh('Thiên khôi', 'Thiên việt')],
  ['Tả Hữu hội/giáp Mệnh', hoiHoacGiapMenh('Tả phù', 'Hữu bật')],
  ['Xương Khúc hội/giáp Mệnh', hoiHoacGiapMenh('Văn xương', 'Văn khúc')],

  ['Lộc Mã giao trì', (chart) => {
    const menh = menhOf(chart);
    if (!menh) return null;
    const zone = tamPhuongTuChinh(chart, menh);
    return zoneHas(zone, 'Thiên mã') && (zoneHas(zone, 'Lộc tồn') || zoneHasHoa(zone, 'loc')) ? menh : null;
  }],

  ['Mã Đầu Đới Kiếm', (chart) =>
    chart.palaces.find((p) => p.branch === 'Ngọ' && hasStar(p, 'Kình dương')) ?? null],

  // Triều đẩu (Ngọ, Thân) also requires no sát tinh; ngưỡng đẩu (Dần, Tý) doesn't.
  ['Thất Sát triều đẩu / ngưỡng đẩu', (chart) => {
    const menh = menhOf(chart);
    if (!menh || !hasStar(menh, 'Thất sát')) return null;
    if (['Dần', 'Tý'].includes(menh.branch)) return menh;
    if (['Ngọ', 'Thân'].includes(menh.branch) && !hasAny(menh, SAT_TINH)) return menh;
    return null;
  }],

  ['Tam Kỳ Gia Hội', (chart) => {
    const menh = menhOf(chart);
    if (!menh) return null;
    const zone = tamPhuongTuChinh(chart, menh);
    return (['loc', 'quyen', 'khoa'] as HoaType[]).every((t) => zoneHasHoa(zone, t)) ? menh : null;
  }],

  ['Vô Chính Diệu', (chart) => {
    const menh = menhOf(chart);
    return menh && voChinhDieu(menh) ? menh : null;
  }],

  ['Kim Dư Phù Giá', (chart) => {
    const menh = menhOf(chart);
    if (!menh) return null;
    const tuVi = palaceStars(menh).find((s) => s.name === 'Tử vi');
    if (!tuVi || !['M', 'V'].includes(starStatusKey(tuVi)) || hasAny(menh, SAT_TINH)) return null;
    const zone = tamPhuongTuChinh(chart, menh);
    return zoneHas(zone, 'Tả phù') && zoneHas(zone, 'Hữu bật') ? menh : null;
  }],

  // Needs every kind of "quần thần": phò tá, văn tinh, quý nhân, and Lộc tồn.
  ['Quần Thần Khánh Hội', (chart) => {
    const menh = menhOf(chart);
    if (!menh || !hasStar(menh, 'Tử vi')) return null;
    const zone = tamPhuongTuChinh(chart, menh);
    const any = (names: string[]) => names.some((n) => zoneHas(zone, n));
    return any(['Tả phù', 'Hữu bật']) &&
      any(['Văn xương', 'Văn khúc']) &&
      any(['Thiên khôi', 'Thiên việt']) &&
      zoneHas(zone, 'Lộc tồn')
      ? menh
      : null;
  }],

  ['Cực Hướng Ly Minh', thuMenhTai('Tử vi', ['Ngọ'])],
  ['Thạch Trung Ẩn Ngọc', thuMenhTai('Cự môn', ['Tý', 'Ngọ'])],

  ['Nhật Nguyệt Chiếu Bích', (chart) => {
    const menh = menhOf(chart);
    if (!menh || menh.branch !== 'Hợi' || !voChinhDieu(menh)) return null;
    const at = (branch: string, star: string) =>
      chart.palaces.some((p) => p.branch === branch && hasStar(p, star));
    return at('Mão', 'Thái dương') && at('Mùi', 'Thái âm') ? menh : null;
  }],

  ['Tài Ấm Giáp Ấn', (chart) =>
    chart.palaces.find(
      (p) =>
        ['Mệnh', 'Tài bạch', 'Điền trạch'].includes(p.name) &&
        hasStar(p, 'Thiên tướng') &&
        giap(chart, p, (x) => hasStar(x, 'Thiên lương'), (x) => hasStar(x, 'Lộc tồn') || hasHoa(x, 'loc')),
    ) ?? null],

  ['Song Lộc Triều Viên', (chart) => {
    const menh = menhOf(chart);
    if (!menh) return null;
    const zone = tamPhuongTuChinh(chart, menh);
    return zoneHas(zone, 'Lộc tồn') && zoneHasHoa(zone, 'loc') ? menh : null;
  }],

  ['Hình Tù Giáp Ấn', (chart) => {
    const menh = menhOf(chart);
    if (!menh || !hasStar(menh, 'Thiên tướng')) return null;
    return giap(
      chart,
      menh,
      (x) => hasStar(x, 'Kình dương') || hasStar(x, 'Thiên hình'),
      (x) => hasStar(x, 'Đà la') || hasHoa(x, 'ky'),
    )
      ? menh
      : null;
  }],

  // Kình Đà always flank Lộc tồn, so the definition says it only really
  // applies when the Lộc palace (taken here as Mệnh) has no cát tinh to offset it.
  ['Lộc bị Kình Đà giáp', (chart) => {
    const menh = menhOf(chart);
    if (!menh || hasAny(menh, CAT_TINH)) return null;
    const hasLoc = hasStar(menh, 'Lộc tồn') || hasHoa(menh, 'loc');
    if (!hasLoc) return null;
    return giap(chart, menh, (x) => hasStar(x, 'Kình dương'), (x) => hasStar(x, 'Đà la')) ? menh : null;
  }],

  // Both hãm is true for ~40% of charts, so it only counts when at least one
  // of them bears on Mệnh (tam phương tứ chính).
  ['Nhật Nguyệt Phản Bối', (chart) => {
    const menh = menhOf(chart);
    if (!menh) return null;
    const hamAt = (name: string) =>
      chart.palaces.find((p) => palaceStars(p).some((s) => s.name === name && starStatusKey(s) === 'H'));
    const sun = hamAt('Thái dương');
    const moon = hamAt('Thái âm');
    if (!sun || !moon) return null;
    const zone = tamPhuongTuChinh(chart, menh);
    return zone.includes(sun) || zone.includes(moon) ? menh : null;
  }],
]);
