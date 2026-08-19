import { useTranslation } from 'react-i18next';
import { translateTerm, statusText, HOA_SHORT } from '../i18n/dict';

const HOA_CLASS = { loc: 'hoa-loc', quyen: 'hoa-quyen', khoa: 'hoa-khoa', ky: 'hoa-ky' };

function StarTag({ star }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const name = translateTerm(star.name, lang);
  const hóa = star.hóa;
  return (
    <span className="star-name">
      {name}
      {hóa && <span className={`hoa ${HOA_CLASS[hóa]}`}>{HOA_SHORT[lang][hóa]}</span>}
    </span>
  );
}

export default function PalaceCell({ palace, t }) {
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
                <span className="star-name">
                  {translateTerm(s.name, lang)}
                  {s.hóa && <span className={`hoa ${HOA_CLASS[s.hóa]}`}>{HOA_SHORT[lang][s.hóa]}</span>}
                </span>
                <Brightness star={s} />
              </div>
            ))}
          </div>
        )}

        <div className="small-stars">
          <div className="small-col small-good">
            {goodStars.map((s, i) => (
              <div key={i} className="small-row">
                <StarTag star={s} />
                <Brightness star={s} />
              </div>
            ))}
          </div>
          <div className="small-col small-bad">
            {badStars.map((s, i) => (
              <div key={i} className="small-row">
                <StarTag star={s} />
                <Brightness star={s} />
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

// Star brightness (miếu/vượng/đắc/hãm/bình). Some stars have no status.
function Brightness({ star }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  if (!star.status) return null;
  return <span className="brightness">{statusText(star.status, lang)}</span>;
}