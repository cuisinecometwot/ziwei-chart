import { useTranslation } from 'react-i18next';
import { DOUBLE_HOURS } from '../core/chart';
import { translateTerm } from '../i18n/dict';
import type { FormState } from '../types';

interface ControlsProps {
  form: FormState;
  onChange: (form: FormState) => void;
  onSubmit: () => void;
}

export default function Controls({ form, onChange, onSubmit }: ControlsProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const set = (patch: Partial<FormState>) => onChange({ ...form, ...patch });

  const years: number[] = [];
  for (let y = 1920; y <= new Date().getFullYear(); y++) years.push(y);

  return (
    <form
      className="controls"
      onSubmit={(e) => e.preventDefault()}
    >
      <h2>{t('formTitle')}</h2>

      <div className="field">
        <label htmlFor="field-name">{t('nameLabel')}</label>
        <input
          id="field-name"
          type="text"
          value={form.name}
          placeholder={t('namePlaceholder')}
          autoComplete="name"
          onChange={(e) => set({ name: e.target.value })}
        />
      </div>

      <fieldset className="field fieldset">
        <legend>{t('genderLabel')}</legend>
        <div className="gender-row">
          {(['male', 'female'] as const).map((g) => (
            <label key={g} className={`radio ${form.gender === g ? 'checked' : ''}`}>
              <input
                type="radio"
                name="gender"
                value={g}
                checked={form.gender === g}
                onChange={() => set({ gender: g })}
              />
              {t(g)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="field">
        <span className="field-label" id="date-label">{t('dateLabel')}</span>
        <div className="date-row" role="group" aria-labelledby="date-label">
          <div className="mini-field">
            <label htmlFor="field-day">{t('day')}</label>
            <select
              id="field-day"
              value={form.day}
              onChange={(e) => set({ day: Number(e.target.value) })}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="mini-field">
            <label htmlFor="field-month">{t('month')}</label>
            <select
              id="field-month"
              value={form.month}
              onChange={(e) => set({ month: Number(e.target.value) })}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="mini-field">
            <label htmlFor="field-year">{t('year')}</label>
            <select
              id="field-year"
              value={form.year}
              onChange={(e) => set({ year: Number(e.target.value) })}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="field-hour">{t('hourLabel')}</label>
        <select
          id="field-hour"
          value={form.hour}
          onChange={(e) => set({ hour: Number(e.target.value) })}
        >
          {DOUBLE_HOURS.map((h) => (
            <option key={h.branch} value={h.hour}>
              {translateTerm(h.branch, lang)} ({h.range})
            </option>
          ))}
        </select>
        <small className="hint">{t('hourHint')}</small>
      </div>

      {/* Chart already updates live as fields change; this only jumps to it,
          which matters on the stacked mobile layout (hidden on desktop via CSS). */}
      <button type="button" className="btn-scroll-to-chart" onClick={onSubmit}>
        {t('scrollToChartBtn')} ↓
      </button>
    </form>
  );
}