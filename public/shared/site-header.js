(function () {
  var STORAGE_KEY = 'lasotuvi-lang';
  var SUPPORTED = ['vn', 'en', 'jp'];

  var STRINGS = {
    vn: {
      brand: 'Lá Số Tử Vi',
      tagline: 'Tử Vi Đẩu Số - Lập lá số trực tuyến',
      navHome: 'Lập lá số',
      navAbout: 'Giới thiệu',
      navLearn: 'Học Tử Vi',
      langLabel: 'Ngôn ngữ',
    },
    en: {
      brand: 'Zi Wei Chart',
      tagline: 'Zi Wei Dou Shu - Online chart maker',
      navHome: 'Chart',
      navAbout: 'About',
      navLearn: 'Learn',
      langLabel: 'Language',
    },
    jp: {
      brand: '紫微斗数',
      tagline: '紫微斗数 - オンライン排盤',
      navHome: '命盤作成',
      navAbout: '紹介',
      navLearn: '学ぶ',
      langLabel: '言語',
    },
  };

  var LANG_BUTTONS = [
    { code: 'vn', label: 'Việt' },
    { code: 'en', label: 'EN' },
    { code: 'jp', label: '日本語' },
  ];

  var mount = document.getElementById('site-header');
  if (!mount) return;

  var segs = location.pathname.replace(/index\.html$/, '').split('/').filter(Boolean);
  var last = segs[segs.length - 1];
  var current = last === 'about' ? 'about' : last === 'hoc-tu-vi' ? 'learn' : 'home';
  var base = current === 'home' ? './' : '../';
  var onlyVietnamese = current === 'learn';

  mount.innerHTML =
    '<header class="site-header">' +
    '<a class="site-brand" href="' + base + '">' +
    '<span class="site-brand-icon" aria-hidden="true">☯</span>' +
    '<span class="site-brand-text"><h2 data-role="brand"></h2><p data-role="tagline"></p></span>' +
    '</a>' +
    '<div class="site-header-controls">' +
    '<nav class="site-nav" aria-label="Site">' +
    '<a data-role="nav-home" href="' + base + '"></a>' +
    '<a data-role="nav-about" href="' + base + 'about/"></a>' +
    '<a data-role="nav-learn" href="' + base + 'hoc-tu-vi/"></a>' +
    '</nav>' +
    '<div class="site-lang-switch" role="group" data-role="lang-switch"></div>' +
    '</div>' +
    '</header>';

  var navHome = mount.querySelector('[data-role="nav-home"]');
  var navAbout = mount.querySelector('[data-role="nav-about"]');
  var navLearn = mount.querySelector('[data-role="nav-learn"]');
  var brandEl = mount.querySelector('[data-role="brand"]');
  var taglineEl = mount.querySelector('[data-role="tagline"]');
  var langSwitchEl = mount.querySelector('[data-role="lang-switch"]');

  navHome.classList.toggle('active', current === 'home');
  navAbout.classList.toggle('active', current === 'about');
  navLearn.classList.toggle('active', current === 'learn');
  if (current === 'home') navHome.setAttribute('aria-current', 'page');
  if (current === 'about') navAbout.setAttribute('aria-current', 'page');
  if (current === 'learn') navLearn.setAttribute('aria-current', 'page');

  var buttonsToShow = onlyVietnamese ? [LANG_BUTTONS[0]] : LANG_BUTTONS;
  langSwitchEl.innerHTML = buttonsToShow
    .map(function (l) {
      return '<button type="button" data-lang-btn="' + l.code + '">' + l.label + '</button>';
    })
    .join('');

  function applyLanguage(lang, opts) {
    var silent = opts && opts.silent;
    var strings = STRINGS[lang] || STRINGS.vn;

    brandEl.textContent = strings.brand;
    taglineEl.textContent = strings.tagline;
    navHome.textContent = strings.navHome;
    navAbout.textContent = strings.navAbout;
    navLearn.textContent = strings.navLearn;
    langSwitchEl.setAttribute('aria-label', strings.langLabel);

    Array.prototype.forEach.call(langSwitchEl.querySelectorAll('[data-lang-btn]'), function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang-btn') === lang);
    });

    document.documentElement.lang = lang === 'en' ? 'en' : lang === 'jp' ? 'ja' : 'vi';

    document.querySelectorAll('[data-lang]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-lang') === lang);
    });

    if (!silent) {
      try {
        localStorage.setItem(STORAGE_KEY, lang);
      } catch (e) {}
      document.dispatchEvent(new CustomEvent('site:langchange', { detail: { lang: lang } }));
    }
  }

  Array.prototype.forEach.call(langSwitchEl.querySelectorAll('[data-lang-btn]'), function (btn) {
    btn.addEventListener('click', function () {
      applyLanguage(btn.getAttribute('data-lang-btn'));
    });
  });

  var saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (e) {}
  var initialLang = SUPPORTED.indexOf(saved) !== -1 ? saved : 'vn';
  applyLanguage(initialLang, { silent: true });
})();
