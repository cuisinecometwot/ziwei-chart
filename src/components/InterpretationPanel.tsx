import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchInterpretation, VerificationError } from '../core/api';
import { TURNSTILE_SITEKEY } from '../config';
import Turnstile from './Turnstile';
import type { Chart, InterpretResponse, Lang } from '../types';

const KIND_CLASS: Record<string, string> = {
  patterns: 'kind-patterns',
  cohabitations: 'kind-cohabitations',
  oppositions: 'kind-oppositions',
  palaces: 'kind-palaces',
  relationships: 'kind-relationships',
  summary: 'kind-summary',
};

const resolveLang = (lng: string): Lang => (lng === 'en' ? 'en' : lng === 'jp' ? 'jp' : 'vi');

// Độ sáng của sao (miếu/vượng/đắc = tốt, bình = trung tính, hãm = xấu) quyết
// định tông màu của badge hiển thị cạnh tên sao.
const statusTone = (status?: string): 'good' | 'neutral' | 'bad' => {
  if (status === 'H') return 'bad';
  if (status === 'B' || status === 'N') return 'neutral';
  return 'good';
};

// Panel luận giải: KHÔNG tự gọi API. Lá số tự cập nhật ngay trên browser khi đổi
// ngày giờ sinh, nhưng luận giải chỉ được gửi khi người dùng bấm "Nhận luận giải".
export default function InterpretationPanel({ chart }: { chart: Chart }) {
  const { i18n, t } = useTranslation();
  const lang = resolveLang(i18n.language);
  const [result, setResult] = useState<InterpretResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  // Người dùng đã bấm "Nhận luận giải" chưa.
  const [requested, setRequested] = useState(false);
  // Đã xác minh Turnstile thành công chưa (bắt buộc nếu có cấu hình sitekey).
  const [verified, setVerified] = useState(false);
  const tokenRef = useRef<string | null>(null);
  const chartRef = useRef(chart);
  chartRef.current = chart;
  const langRef = useRef(lang);
  langRef.current = lang;

  const needsTurnstile = TURNSTILE_SITEKEY.length > 0;

  // Khi lá số thay đổi (đổi ngày giờ sinh...): xoá kết quả cũ và quay về trạng thái
  // chờ bấm nút. Tuyệt đối không tự gửi request.
  const prevChart = useRef(chart);
  useEffect(() => {
    if (prevChart.current !== chart) {
      prevChart.current = chart;
      setRequested(false);
      setVerified(false);
      tokenRef.current = null;
      setResult(null);
      setError(null);
      setLoading(false);
    }
  }, [chart]);

  const doFetch = async (token?: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    const { info } = chartRef.current;
    try {
      const r = await fetchInterpretation(
        {
          gender: info.gender,
          year: info.year,
          month: info.month,
          day: info.day,
          hour: info.hourInput,
          lang: langRef.current,
        },
        token,
      );
      setResult(r);
    } catch (err: unknown) {
      if (err instanceof VerificationError) {
        tokenRef.current = null;
        setVerified(false); // yêu cầu xác minh lại
      }
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = () => {
    setRequested(true);
    if (needsTurnstile && !verified) return; // chờ người dùng xác minh qua widget
    void doFetch(tokenRef.current || undefined);
  };

  const handleToken = (token: string) => {
    tokenRef.current = token;
    setVerified(true);
    void doFetch(token);
  };

  const handleExpire = () => {
    tokenRef.current = null;
    setVerified(false);
    setResult(null);
    setError(null);
  };

  const empty =
    result !== null &&
    result.sections.every((s) => !s.items || s.items.length === 0);

  return (
    <div className="interpretation">
      <button
        type="button"
        className="interpretation-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="interpretation-toggle-title">
          {result ? result.intro.title : t('interpTitle')}
        </span>
        <span className="interpretation-toggle-caret">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="interpretation-body">
          {!requested && !loading && !result && (
            <div className="interpretation-actions">
              <button type="button" className="btn-primary" onClick={handleRequest}>
                ☯ {t('interpGet')}
              </button>
            </div>
          )}

          {loading && (
            <p className="interpretation-subtitle">{t('interpLoading')}</p>
          )}

          {requested && needsTurnstile && !verified && !loading && (
            <div className="turnstile-area">
              <p className="interpretation-subtitle">{t('interpVerify')}</p>
              <Turnstile
                sitekey={TURNSTILE_SITEKEY}
                onToken={handleToken}
                onExpire={handleExpire}
                onError={handleExpire}
              />
            </div>
          )}

          {error && (
            <div className="interpretation-error">
              <p className="interpretation-subtitle">{error}</p>
              {verified && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => void doFetch(tokenRef.current || undefined)}
                >
                  {t('interpRetry')}
                </button>
              )}
            </div>
          )}

          {result && (
            <>
              <p className="interpretation-subtitle">{result.intro.subtitle}</p>

              {result.tier === 'preview' && (
                <p className="interpretation-preview-banner">{t('interpPreviewBanner')}</p>
              )}

              {empty && (
                <p className="interpretation-empty">{result.intro.empty}</p>
              )}

              {result.sections.map((section) => {
                const items = section.items || [];
                if (items.length === 0 && !section.locked) return null;
                const isSummary = section.key === 'summary';

                const lockedNote = section.locked && (
                  <p className="interpretation-locked-note">
                    🔒 {t('interpLockedMore', { count: section.lockedCount ?? 0 })}
                  </p>
                );

                if (items.length === 0) {
                  // Fully withheld section: nothing to expand, just the teaser.
                  return (
                    <div
                      key={section.key}
                      className={`interpretation-section interpretation-section-locked ${KIND_CLASS[section.key] || ''}`}
                    >
                      <p className="interpretation-section-title">{section.title}</p>
                      {lockedNote}
                    </div>
                  );
                }

                const body = (
                  <>
                    {section.key === 'summary' && (
                      <ul className="interpretation-list interpretation-summary">
                        {items.map((it) => (
                          <li key={it.key} className="interpretation-summary-item">
                            {it.text}
                          </li>
                        ))}
                      </ul>
                    )}

                    {section.key === 'patterns' && (
                      <ul className="interpretation-list">
                        {items.map((it, i) => (
                          <li key={i} className="interpretation-item">
                            <span className="interpretation-item-head">
                              <span className="interpretation-item-name">{it.name}</span>
                              {it.palace && (
                                <span className="interpretation-item-palace">
                                  @ {it.palace}
                                </span>
                              )}
                            </span>
                            <p className="interpretation-item-text">{it.text}</p>
                          </li>
                        ))}
                      </ul>
                    )}

                    {section.key === 'cohabitations' && (
                      <ul className="interpretation-list">
                        {items.map((it, i) => (
                          <li key={i} className="interpretation-item">
                            <span className="interpretation-item-head">
                              <span className="interpretation-item-name">
                                {it.stars?.join(' + ')}
                              </span>
                              {it.palace && (
                                <span className="interpretation-item-palace">
                                  @ Cung {it.palace}
                                </span>
                              )}
                            </span>
                            <p className="interpretation-item-text">{it.text}</p>
                          </li>
                        ))}
                      </ul>
                    )}

                    {section.key === 'oppositions' && (
                      <ul className="interpretation-list">
                        {items.map((it, i) => (
                          <li key={i} className="interpretation-item">
                            <span className="interpretation-item-head">
                              <span className="interpretation-item-name">
                                {it.stars?.join(' xung ')}
                              </span>
                              {it.palaces && (
                                <span className="interpretation-item-palace">
                                  {it.palaces.join(' ↔ ')}
                                </span>
                              )}
                            </span>
                            <p className="interpretation-item-text">{it.text}</p>
                          </li>
                        ))}
                      </ul>
                    )}

                    {section.key === 'palaces' && (
                      <ul className="interpretation-list">
                        {items.map((it) => (
                          <li key={it.name} className="interpretation-item interpretation-palace-item">
                            <details open={it.isMenh || it.isThan}>
                              <summary className="interpretation-item-head">
                                <span className="interpretation-item-name">
                                  Cung {it.name}
                                </span>{' '}
                                {it.isMenh && <span className="badge badge-menh">Mệnh</span>}
                                {it.isThan && <span className="badge badge-than">Thân</span>}
                              </summary>
                              <div className="interpretation-palace-body">
                                {it.palaceText && (
                                  <p className="interpretation-item-text">{it.palaceText}</p>
                                )}
                                {it.starBlocks?.map((block, i) => (
                                  <div
                                    key={i}
                                    className={`interpretation-star-block${block.isChinh ? ' is-chinh' : ''}`}
                                  >
                                    <div className="interpretation-star-header">
                                      <span className="interpretation-star-name">{block.name}</span>
                                      {block.statusLabel && (
                                        <span
                                          className={`badge badge-status-${statusTone(block.status)}`}
                                        >
                                          {block.statusLabel}
                                        </span>
                                      )}
                                      {block.hoaLabel && (
                                        <span className="badge badge-hoa">{block.hoaLabel}</span>
                                      )}
                                    </div>
                                    {block.texts.map((txt, j) => (
                                      <p key={j} className="interpretation-item-text">
                                        {txt}
                                      </p>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </details>
                          </li>
                        ))}
                      </ul>
                    )}

                    {section.key === 'relationships' && (
                      <ul className="interpretation-list">
                        {items.map((it, i) => (
                          <li key={i} className="interpretation-item">
                            <span className="interpretation-item-head">
                              <span className="interpretation-item-name">{it.title}</span>
                              {it.palaces && (
                                <span className="interpretation-item-palace">
                                  {it.palaces.join(' · ')}
                                </span>
                              )}
                            </span>
                            <p className="interpretation-item-text">{it.text}</p>
                          </li>
                        ))}
                      </ul>
                    )}

                    {lockedNote}
                  </>
                );

                if (isSummary) {
                  return (
                    <section
                      key={section.key}
                      className={`interpretation-section ${KIND_CLASS[section.key] || ''}`}
                    >
                      <h4 className="interpretation-section-title">{section.title}</h4>
                      {body}
                    </section>
                  );
                }

                return (
                  <details
                    key={section.key}
                    className={`interpretation-section ${KIND_CLASS[section.key] || ''}`}
                  >
                    <summary className="interpretation-section-title">{section.title}</summary>
                    {body}
                  </details>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}