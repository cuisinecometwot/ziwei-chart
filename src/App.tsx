import { useEffect, useRef, useState, useCallback, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import Controls from './components/Controls';
import ErrorBoundary from './components/ErrorBoundary';
import { buildChart } from './core/chart';
import type { Chart, FormState } from './types';

// html-to-image is only needed when the user exports a PNG, so load it lazily
// to keep the initial bundle small (web.dev/learn/performance/code-split-javascript).
const toPngPromise = import('html-to-image').then((m) => m.toPng);

const DEFAULT_FORM: FormState = {
  name: 'Nguyễn Văn A',
  gender: 'male',
  day: 15,
  month: 5,
  year: 1990,
  hour: 7,
};

const docLang = (lng: string): string => (lng === 'en' ? 'en' : lng === 'jp' ? 'ja' : 'vi');

// The chart itself only depends on the small core module; the heavy engine is
// bundled separately (see vite.config.ts manualChunks) so it loads in parallel.
function App() {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [chart, setChart] = useState<Chart>(() => buildChart(DEFAULT_FORM));
  const [exporting, setExporting] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

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
    document.documentElement.lang = docLang(i18n.language);
    document.title = t('appTitle');
  }, [i18n.language, t]);

  // The shared site header (public/shared/site-header.js) owns the language
  // switch UI outside of React; it reports changes via this event so the
  // chart itself re-renders in the new language.
  useEffect(() => {
    const onLangChange = (e: Event) => {
      const lang = (e as CustomEvent<{ lang: string }>).detail?.lang;
      if (lang) i18n.changeLanguage(lang);
    };
    document.addEventListener('site:langchange', onLangChange);
    return () => document.removeEventListener('site:langchange', onLangChange);
  }, [i18n]);

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
      const slug = (form.name || 'laso').trim().replace(/\s+/g, '-');
      const filename = `laso-tuvi-${slug}.png`;

      // iOS Safari ignores the `download` attribute on <a> and just navigates
      // to the URL instead of saving it, so there's no way to trigger a real
      // download there — open the image in a new tab and let the user save it
      // manually (press-and-hold → Save Image).
      const isIOS =
        /iP(hone|ad|od)/.test(navigator.userAgent) ||
        // iPadOS reports itself as "Macintosh" by default; the touch-point
        // check is the standard way to tell it apart from a real Mac.
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIOS) {
        window.open(dataUrl, '_blank');
        alert(t('iosSaveHint'));
      } else {
        // Convert to a blob URL rather than using the data URL directly: some
        // mobile/in-app browsers (and detached <a> elements) won't honor
        // `download` on a raw data: URI.
        const blob = await (await fetch(dataUrl)).blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = filename;
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      }
    } catch (err) {
      console.error(err);
      alert('Không thể xuất ảnh PNG: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setExporting(false);
    }
  }, [form.name, exporting]);

  return (
    <div className="app">
      <main className="main">
        <aside className="sidebar">
          <Controls form={form} onChange={setForm} onSubmit={() => chartRef.current?.scrollIntoView({ behavior: 'smooth' })} />
          <button
            className="btn-download"
            onClick={handleDownload}
            disabled={exporting}
            aria-busy={exporting}
          >
            {exporting ? t('exportingPng') : `⬇ ${t('downloadPng')}`}
          </button>
          <p className="disclaimer">{t('note')}</p>
        </aside>

        <section className="chart-section" aria-label={t('chartTitle')}>
          <ErrorBoundary>
            <ChartView ref={chartRef} chart={chart} t={t} />
          </ErrorBoundary>
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