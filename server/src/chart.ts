import { generateLaSo } from 'tuvi-neo';
import type { Chart, ChartInfo, Gender, HoaType, Palace, Star } from './types';

export const STEM_ORDER = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
export const BRANCH_ORDER = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tị', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

const BRANCH_NORMALIZE: Record<string, string> = { Tí: 'Tý', Sữu: 'Sửu', Tỵ: 'Tị', Kỹ: 'Kỷ' };
const PALACE_NORMALIZE: Record<string, string> = { Di: 'Thiên di' };

export const normalizeBranch = (b: string): string => BRANCH_NORMALIZE[b] || b;

// Ngũ Hổ Độn: can at the Dần palace from the year's can (0-based index).
const canAtDan = (canIdx: number) => ((canIdx % 5) * 2 + 2) % 10;
// Can at branch b (0-based, Tý=0), counting forward from Dần.
const canAtBranch = (canIdx: number, branchIdx: number) => (canAtDan(canIdx) + ((branchIdx - 2 + 12) % 12)) % 10;

// Tiểu Hạn starting palace (1-based position, Tý=1) for age 1, by year branch.
const tieuHanStart = (dcNam: number): number => {
  switch (dcNam % 4) {
    case 3: return 5; // Dần/Ngọ/Tuất -> Tị
    case 1: return 11; // Tý/Thìn/Thân -> Tuất
    case 2: return 8; // Sửu/Tị/Dậu -> Mùi
    default: return 2; // Mão/Mùi/Hợi -> Sửu
  }
};

const mod = (a: number, m: number) => ((a % m) + m) % m;

const isDnan = (male: boolean, tcNam: number) =>
  (male && tcNam % 2 === 1) || (!male && tcNam % 2 === 0);

// Standard year-stem Four Transformations (Tứ Hóa).
export const TUHOA_BY_CAN: Record<string, Record<HoaType, string>> = {
  Giáp: { loc: 'Liêm trinh', quyen: 'Phá quân', khoa: 'Vũ khúc', ky: 'Thái dương' },
  Ất: { loc: 'Thiên cơ', quyen: 'Thiên lương', khoa: 'Tử vi', ky: 'Thái âm' },
  Bính: { loc: 'Thiên đồng', quyen: 'Thiên cơ', khoa: 'Văn xương', ky: 'Liêm trinh' },
  Đinh: { loc: 'Thái âm', quyen: 'Thiên đồng', khoa: 'Thiên cơ', ky: 'Cự môn' },
  Mậu: { loc: 'Tham lang', quyen: 'Thái âm', khoa: 'Hữu bật', ky: 'Thiên cơ' },
  Kỷ: { loc: 'Vũ khúc', quyen: 'Tham lang', khoa: 'Thiên lương', ky: 'Văn khúc' },
  Canh: { loc: 'Thái dương', quyen: 'Vũ khúc', khoa: 'Thái âm', ky: 'Thiên đồng' },
  Tân: { loc: 'Cự môn', quyen: 'Thái dương', khoa: 'Văn xương', ky: 'Văn khúc' },
  Nhâm: { loc: 'Thiên lương', quyen: 'Tử vi', khoa: 'Tả phù', ky: 'Vũ khúc' },
  Quý: { loc: 'Phá quân', quyen: 'Cự môn', khoa: 'Thái âm', ky: 'Tham lang' },
};

const TUHOA_TYPE: Record<string, HoaType> = { 'Hóa lộc': 'loc', 'Hóa quyền': 'quyen', 'Hóa khoa': 'khoa', 'Hóa kỵ': 'ky' };

const isHoaStar = (name: string) => name.startsWith('Hóa ');

export interface ChartInput {
  name?: string;
  gender: Gender;
  birth?: { year: number; month: number; day: number; hour: number };
  day?: number;
  month?: number;
  year?: number;
  hour?: number;
}

export function buildChart(input: ChartInput): Chart {
  const b = input.birth || { year: input.year!, month: input.month!, day: input.day!, hour: input.hour! };
  const laso = generateLaSo({
    name: input.name || 'Chưa đặt tên',
    gender: input.gender,
    birth: {
      isLunar: false,
      year: b.year,
      month: b.month,
      day: b.day,
      hour: b.hour,
      minute: 0,
    },
  });

  const raw = laso.getRawData();
  const info = laso.Info;

  const menhPos = raw.menh; // 1-based (Tý=1)
  const menhIdx = menhPos - 1;
  const cuc = raw.cuc;
  const dnan = raw.dnan;
  const male = raw.male;
  const dcNam = raw.dcNam; // 1-based year branch
  const tcNam = raw.tcNam; // 1-based year stem
  const canIdx = tcNam - 1;

  const tieuStart = tieuHanStart(dcNam);

  const palaces: Palace[] = laso.Cac_cung.map((c) => {
    const chiCung = c.ChiCung; // equals array index
    const branch = normalizeBranch(BRANCH_ORDER[chiCung]);
    const can = STEM_ORDER[canAtBranch(canIdx, chiCung)];

    // Đại Hạn: distance from the Mệnh palace along the direction
    const n = dnan
      ? mod(chiCung - menhIdx, 12)
      : mod(menhIdx - chiCung, 12);
    const daiHanStart = cuc + 10 * n;

    // Tiểu Hạn: age 1..12 assigned along gender direction
    const dist = male
      ? mod(chiCung + 1 - tieuStart, 12)
      : mod(tieuStart - (chiCung + 1), 12);
    const tieuHanAge = dist + 1;

    // Tứ Hóa markers: attach each transformation to its transformed star
    const tuHoa = [c.LocNhap, c.QuyenNhap, c.KhoaNhap, c.KyNhap].filter((x): x is string => !!x);
    const transforms = tuHoa.map((h) => {
      const type = TUHOA_TYPE[h] || 'loc';
      return { type, star: TUHOA_BY_CAN[can]?.[type] || h };
    });

    return {
      ...c,
      name: PALACE_NORMALIZE[c.Name] || c.Name,
      chiCung,
      branch,
      can,
      ganZhi: `${can} ${branch}`,
      isMenh: c.Name === 'Mệnh',
      isThan: c.Than === 1,
      daiHan: { start: daiHanStart, end: daiHanStart + 9 },
      tieuHanAge,
      transforms,
      chinhTinh: c.ChinhTinh.map((s) => ({
        name: s.Name,
        status: s.Status,
        hanh: s.NguHanh,
        hóa: transforms.find((t) => t.star === s.Name)?.type,
      })),
      saoTot: c.Saotot
        .filter((s) => !isHoaStar(s.Name))
        .map((s) => ({
          name: s.Name,
          status: s.Status,
          hóa: transforms.find((t) => t.star === s.Name)?.type,
        })),
      saoXau: c.Saoxau
        .filter((s) => !isHoaStar(s.Name))
        .map((s) => ({
          name: s.Name,
          status: s.Status,
          hóa: transforms.find((t) => t.star === s.Name)?.type,
        })),
    };
  });

  const infoOut: ChartInfo = {
    name: input.name || '',
    gender: input.gender,
    day: b.day,
    month: b.month,
    year: b.year,
    hourInput: b.hour,
    amDuong: info.AmDuong, // e.g. "Dương Nam"
    yearGanZhi: info.Nam,
    canNam: STEM_ORDER[tcNam - 1],
    chiNam: normalizeBranch(BRANCH_ORDER[dcNam - 1]),
    lunarDay: info.Ngay,
    lunarMonth: info.Thang,
    hour: normalizeBranch(info.Gio),
    cuc: info.Cuc,
    cucNH: info.CucNH,
    chuMenh: info.ChuMenh,
    chuThan: info.ChuThan,
    thanCu: info.ThanCu,
    daiHanDir: dnan ? 'forward' : 'backward',
    menhBranch: normalizeBranch(BRANCH_ORDER[menhIdx]),
    menhPalace: palaces[menhIdx].name,
  };

  return {
    info: infoOut,
    palaces,
    raw,
  };
}