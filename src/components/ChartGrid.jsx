import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import PalaceCell from './PalaceCell';
import CenterBlock from './CenterBlock';
import { translateTerm, formatHour } from '../i18n/dict';

const AREA_BY_BRANCH = {
  Tý: 'ty', Sửu: 'suu', Dần: 'dan', Mão: 'mao', Thìn: 'thin',
  Tị: 'ti', Ngọ: 'ngo', Mùi: 'mui', Thân: 'than', Dậu: 'dau',
  Tuất: 'tuat', Hợi: 'hoi',
};

const ChartGrid = forwardRef(function ChartGrid({ chart, t }, ref) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const info = chart.info;

  const cells = {};
  chart.palaces.forEach((p) => {
    cells[AREA_BY_BRANCH[p.branch]] = p;
  });

  const areaKeys = [
    ['ti', 'ngo', 'mui', 'than'],
    ['thin', 'dau'],
    ['mao', 'tuat'],
    ['dan', 'suu', 'ty', 'hoi'],
  ];

  return (
    <div className="chart-wrap" ref={ref}>
      <div className="chart-header">
        <h1>{t('chartTitle')}</h1>
        <div className="chart-header-info">
          <span>
            {info.name} · {t(info.gender === 'male' ? 'male' : 'female')} ·{' '}
            {translateTerm(info.canNam, lang)} {translateTerm(info.chiNam, lang)}
          </span>
          <span>
            {info.day}/{String(info.month).padStart(2, '0')}/{info.year} ·{' '}
            {formatHour(info.hour, lang)}
          </span>
        </div>
      </div>

      <div className="grid">
        <div className="center-slot">
          <CenterBlock chart={chart} t={t} />
        </div>
        {areaKeys.flat().map((key) => {
          const palace = cells[key];
          return (
            <div key={key} className="cell-slot" style={{ gridArea: key }}>
              {palace && <PalaceCell palace={palace} t={t} />}
            </div>
          );
        })}
      </div>

      <div className="chart-footer">
        <img
          className="mascot"
          src="mascot.png"
          alt=""
          aria-hidden="true"
          draggable="false"
        />
        <span>{t('tagline')}</span>
        <span className="footer-note">{t('note')}</span>
      </div>
    </div>
  );
});

export default ChartGrid;