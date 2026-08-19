import { useTranslation } from 'react-i18next';
import { translateTerm, formatHour } from '../i18n/dict';

const MONTH_NAMES_VN = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Một', 'Chạp'];

export default function CenterBlock({ chart, t }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const info = chart.info;
  const lunarMonth = MONTH_NAMES_VN[(info.lunarMonth - 1) % 12];
  const thanCuPalace = info.thanCu.replace(/^Thân cư\s*/, '');
  const lunarDateVal =
    lang === 'vn'
      ? `${info.lunarDay} tháng ${lunarMonth}`
      : lang === 'en'
        ? `${info.lunarDay}/${info.lunarMonth} (lunar)`
        : `${info.lunarMonth}月${info.lunarDay}日`;

  const rows = [
    { k: t('nameLabel'), v: info.name },
    { k: t('genderWord'), v: t(info.gender === 'male' ? 'male' : 'female') },
    { k: t('amDuong'), v: translateTerm(info.amDuong, lang) },
    { k: t('yearGanZhi'), v: `${translateTerm(info.canNam, lang)} ${translateTerm(info.chiNam, lang)}` },
    {
      k: t('solarDate'),
      v: `${info.day}/${info.month}/${info.year}`,
    },
    {
      k: t('lunarDate'),
      v: lunarDateVal,
    },
    { k: t('birthHour'), v: formatHour(info.hour, lang) },
    { k: t('cuc'), v: translateTerm(info.cuc, lang) },
    {
      k: t('menhPosition'),
      v: `${translateTerm(info.menhPalace, lang)} (${translateTerm(info.menhBranch, lang)})`,
    },
    { k: t('thanPosition'), v: `${t('thanCu')} ${translateTerm(thanCuPalace, lang)}` },
    { k: t('chuMenh'), v: translateTerm(info.chuMenh, lang) },
    { k: t('chuThan'), v: translateTerm(info.chuThan, lang) },
    {
      k: t('daiHanInfo'),
      v: t(info.daiHanDir === 'forward' ? 'forward' : 'backward'),
    },
  ];

  return (
    <div className="center-block">
      <div className="center-title">☯</div>
      <div className="center-rows">
        {rows.map((r, i) => (
          <div className="center-row" key={i}>
            <span className="center-key">{r.k}</span>
            <span className="center-val">{r.v}</span>
          </div>
        ))}
      </div>
      <div className="center-brand">✦ {t('appTitle')} ✦</div>
    </div>
  );
}