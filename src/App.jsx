import { useEffect, useRef, useState, useCallback, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import Controls from './components/Controls';
import ErrorBoundary from './components/ErrorBoundary';
import { buildChart } from './core/chart';

// html-to-image is only needed when the user exports a PNG, so load it lazily
// to keep the initial bundle small (web.dev/learn/performance/code-split-javascript).
const toPngPromise = import('html-to-image').then((m) => m.toPng);

const DEFAULT_FORM = {
  name: 'Nguyễn Văn A',
  gender: 'male',
  day: 15,
  month: 5,
  year: 1990,
  hour: 7,
};

// The chart itself only depends on the small core module; the heavy engine is
// bundled separately (see vite.config.js manualChunks) so it loads in parallel.
function App() {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [chart, setChart] = useState(() => buildChart(DEFAULT_FORM));
  const [exporting, setExporting] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    try {
      setChart(
        buildChart({
          name: form.name,
          gender: form.gender,
          birth: {
            year: form.year,
            month: form.month,
            day: form.day,
            hour: form.hour,
          },
        }),
      );
    } catch (err) {
      console.error(err);
    }
  }, [form]);

  // Keep the document language and title in sync with the UI language.
  useEffect(() => {
    document.documentElement.lang = i18n.language === 'en' ? 'en' : i18n.language === 'jp' ? 'ja' : 'vi';
    document.title = t('appTitle');
  }, [i18n.language, t]);

  const changeLang = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('lasotuvi-lang', lng);
  };

  const handleDownload = useCallback(async () => {
    const node = chartRef.current;
    if (!node || exporting) return;
    setExporting(true);
    try {
      const toPng = await toPngPromise;
      const prev = node.style.width;
      node.style.width = '960px';
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#fbf6ec',
      });
      node.style.width = prev;
      const link = document.createElement('a');
      const slug = (form.name || 'laso').trim().replace(/\s+/g, '-');
      link.download = `laso-tuvi-${slug}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert('Không thể xuất ảnh PNG: ' + err.message);
    } finally {
      setExporting(false);
    }
  }, [form.name, exporting]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon" aria-hidden="true">☯</span>
          <div>
            <h1>{t('appTitle')}</h1>
            <p>{t('tagline')}</p>
          </div>
        </div>
        <div className="lang-switch" role="group" aria-label={t('language')}>
          {['vn', 'en', 'jp'].map((l) => (
            <button
              key={l}
              className={i18n.language === l ? 'active' : ''}
              aria-pressed={i18n.language === l}
              onClick={() => changeLang(l)}
            >
              {l === 'vn' ? 'Việt' : l === 'en' ? 'EN' : '日本語'}
            </button>
          ))}
        </div>
      </header>

      <main className="main">
        <aside className="sidebar">
          <Controls form={form} onChange={setForm} onSubmit={() => chartRef.current?.scrollIntoView({ behavior: 'smooth' })} />
          <button
            className="btn-download"
            onClick={handleDownload}
            disabled={exporting || !chart}
            aria-busy={exporting}
          >
            {exporting ? t('loading') : `⬇ ${t('downloadPng')}`}
          </button>
          <p className="disclaimer">{t('note')}</p>
        </aside>

        <section className="chart-section" aria-label={t('chartTitle')}>
          {chart ? (
            <ErrorBoundary>
              <ChartView ref={chartRef} chart={chart} t={t} />
            </ErrorBoundary>
          ) : (
            <div className="empty-state">{t('emptyTitle')}</div>
          )}
        </section>
      </main>

      <footer className="app-footer">{t('footer')}</footer>
    </div>
  );
}

// Separate module so the chart subtree can suspend independently.
const ChartView = lazy(() => import('./components/ChartGrid'));

export default function AppRoot() {
  return (
    <Suspense fallback={<div className="empty-state">…</div>}>
      <App />
    </Suspense>
  );
}