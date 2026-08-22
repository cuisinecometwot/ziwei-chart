import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: string;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

interface TurnstileProps {
  sitekey: string;
  onToken: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

// Widget Cloudflare Turnstile (xác minh con người, miễn phí).
// Script được nạp lười và render một lần khi mount.
export default function Turnstile({ sitekey, onToken, onExpire, onError }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onExpireRef = useRef(onExpire);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTokenRef.current = onToken;
    onExpireRef.current = onExpire;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(container, {
        sitekey,
        callback: (token) => onTokenRef.current(token),
        'expired-callback': () => onExpireRef.current?.(),
        'error-callback': () => onErrorRef.current?.(),
      });
    };

    if (window.turnstile) {
      render();
      return;
    }

    const scriptId = 'cf-turnstile-script';
    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.addEventListener('load', render);
      return () => existing.removeEventListener('load', render);
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', render);
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [sitekey]);

  return <div className="turnstile" ref={containerRef} />;
}