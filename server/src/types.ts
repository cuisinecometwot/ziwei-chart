import type { LaSo } from 'tuvi-neo';

export type Gender = 'male' | 'female';
export type HoaType = 'loc' | 'quyen' | 'khoa' | 'ky';
export type Lang = 'vi' | 'en' | 'jp';

export interface Star {
  name: string;
  status?: string;
  hanh?: number;
  hóa?: HoaType;
}

export interface Palace {
  name: string;
  chiCung: number;
  branch: string;
  can: string;
  ganZhi: string;
  isMenh: boolean;
  isThan: boolean;
  daiHan: { start: number; end: number };
  tieuHanAge: number;
  transforms: { type: HoaType; star: string }[];
  chinhTinh: Star[];
  saoTot: Star[];
  saoXau: Star[];
}

export interface ChartInfo {
  name: string;
  gender: Gender;
  day: number;
  month: number;
  year: number;
  hourInput: number;
  amDuong: string;
  yearGanZhi: string;
  canNam: string;
  chiNam: string;
  lunarDay: number;
  lunarMonth: number;
  hour: string;
  cuc: string;
  cucNH: number;
  chuMenh: string;
  chuThan: string;
  thanCu: string;
  daiHanDir: 'forward' | 'backward';
  menhBranch: string;
  menhPalace: string;
}

export interface Chart {
  info: ChartInfo;
  palaces: Palace[];
  raw: LaSo;
}

// One star's contribution to a palace's interpretation, kept as its own group
// (rather than flattened into one big array) so the UI can render a labeled
// block per star instead of an undifferentiated wall of paragraphs.
export interface PalaceStarBlock {
  name: string;
  isChinh: boolean;
  status?: string;
  statusLabel?: string;
  hoa?: HoaType;
  hoaLabel?: string;
  texts: string[];
}

export interface InterpretationItem {
  key?: string;
  name?: string;
  text?: string;
  palace?: string;
  stars?: string[];
  palaces?: string[];
  title?: string;
  isMenh?: boolean;
  isThan?: boolean;
  palaceText?: string | null;
  starBlocks?: PalaceStarBlock[];
}

export interface InterpretationSection {
  key: string;
  title: string;
  items: InterpretationItem[];
  // Set on a "preview" response when this section has content beyond what's
  // shown (items trimmed, or emptied entirely) — see interpreter.ts#toPreview.
  locked?: boolean;
  lockedCount?: number;
}

export interface InterpretRequest {
  gender: Gender;
  year: number;
  month: number;
  day: number;
  hour: number;
  lang?: Lang;
}

export type InterpretTier = 'preview' | 'full';

export interface InterpretResponse {
  lang: Lang;
  tier: InterpretTier;
  intro: { title: string; subtitle: string; empty: string };
  sections: InterpretationSection[];
}