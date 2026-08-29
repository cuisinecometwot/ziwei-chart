import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { translateTerm, statusText, HOA_SHORT } from '../i18n/dict';
import type { HoaType, Palace, Star } from '../types';

const HOA_CLASS: Record<HoaType, string> = { loc: 'hoa-loc', quyen: 'hoa-quyen', khoa: 'hoa-khoa', ky: 'hoa-ky' };

// Brightness is rendered as plain text in parentheses right after the star
// name, in the same span, instead of a separate badge — a badge sitting next
// to the name as its own flex box could shrink/overlap and hide part of the
// name on narrow layouts.
function StarTag({ star }: { star: Star }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const name = translateTerm(star.name, lang);
  const hóa = star.hóa;
  const brightness = star.status ? statusText(star.status, lang) : null;
  return (
    <span className={`star-name${hóa ? ' has-hoa' : ''}`}>
      {name}
      {brightness && <span className="brightness"> ({brightness})</span>}
      {hóa && <span className={`hoa ${HOA_CLASS[hóa]}`}>{HOA_SHORT[lang][hóa]}</span>}
    </span>
  );
}

interface PalaceCellProps {
  palace: Palace;
  t: TFunction;
}

export default function PalaceCell({ palace, t }: PalaceCellProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const name = translateTerm(palace.name, lang);

  // Small stars: one star per line, good stars on the left, bad stars on the right.
  const goodStars = palace.saoTot;
  const badStars = palace.saoXau;

  return (
    <div className={`cell${palace.isMenh ? ' cell-menh' : ''}${palace.isThan ? ' cell-than' : ''}`}>
      <div className="cell-header">
        <span className="palace-name">
          {name}
          {(palace.isMenh || palace.isThan) && (
            <span className="badges">
              {palace.isMenh && <span className="badge badge-menh">{t('menh')}</span>}
              {palace.isThan && <span className="badge badge-than">{t('than')}</span>}
            </span>
          )}
        </span>
        <span className="ganzhi">{translateTerm(palace.can, lang)} {translateTerm(palace.branch, lang)}</span>
      </div>

      <div className="cell-limits">
        <span className="limit">
          <span className="limit-label">{t('daiHan')}</span> {palace.daiHan.start}–{palace.daiHan.end}
        </span>
        <span className="limit">
          <span className="limit-label">{t('tieuHan')}</span> {palace.tieuHanAge}
        </span>
      </div>

      <div className="cell-body">
        {palace.chinhTinh.length > 0 && (
          <div className="stars stars-main">
            {palace.chinhTinh.map((s, i) => (
              <div key={i} className="star-row">
                <StarTag star={s} />
              </div>
            ))}
          </div>
        )}

        <div className="small-stars">
          <div className="small-col small-good">
            {goodStars.map((s, i) => (
              <div key={i} className="small-row">
                <StarTag star={s} />
              </div>
            ))}
          </div>
          <div className="small-col small-bad">
            {badStars.map((s, i) => (
              <div key={i} className="small-row">
                <StarTag star={s} />
              </div>
            ))}
          </div>
        </div>

        {palace.TrangSinh && (
          <div className="trang-sinh">{translateTerm(palace.TrangSinh, lang)}</div>
        )}
      </div>
    </div>
  );
}
