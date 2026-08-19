# Technical Specification & Documentation
## Static Zi Wei Dou Shu ( Tử Vi ) Web Application

---

## 1. Executive Summary

This document outlines the architecture, technology stack, localization strategy, and visual design requirements for a **static, client-side Zi Wei Dou Shu ( Tử Vi / 紫微斗数 ) web application**. 

The application calculates and renders personalized Zi Wei Dou Shu astrological charts entirely in the user's browser. It features multilingual support (**Vietnamese, English, Japanese**) and allows custom visual branding through user-designed background templates. Hosted on **GitHub Pages**, it requires zero server-side infrastructure, ensuring high performance, zero maintenance overhead, and infinite scalability.

---

## 2. Core Architecture & Technology Stack

```
+-----------------------------------------------------------------------+
|                            Browser (Client)                           |
|                                                                       |
|   +-------------------+    +--------------------+    +------------+   |
|   |  React / Vue UI   | -> |  i18next (VN/EN/JP)| -> | Core Logic |   |
|   +-------------------+    +--------------------+    +------------+   |
|             |                                              |          |
|             v                                              v          |
|   +-------------------+                          +----------------+   |
|   | Background Layer  | <----------------------- | Calculation    |   |
|   | (SVG / Canvas)    |   Renders Stars & Texts  | Engine         |   |
|   +-------------------+                          +----------------+   |
+-----------------------------------------------------------------------+
                                  ^
                                  | Static Hosting
                      +-----------------------+
                      |     GitHub Pages      |
                      +-----------------------+
```

### 2.1 Technology Selection

| Component | Selected Technology | Rationale & Alternatives |
| :--- | :--- | :--- |
| **Hosting Platform** | **GitHub Pages** | Free static web hosting, built-in CI/CD via GitHub Actions, native SSL, custom domain support, zero server maintenance. |
| **Frontend Framework** | **React.js** (or Vue.js / Vanilla JS) | Component-based rendering for 12 palaces, state management for user inputs, seamless reactivity when switching languages. |
| **Astrology Calculation Core** | **Vietnamese Open-Source Engine** (e.g., `tuvi-core`, `tu-vi`, custom port) | High accuracy in computing Lunar/Solar calendars, 14 major stars (*Chính tinh*), auxiliary stars (*Phụ tinh*), transformation stars (*Tứ Hóa*), and palace arrangements. |
| **Localization (i18n)** | **`i18next` / `react-i18next`** | Translates internal Vietnamese star/palace IDs dynamically into English and Japanese dictionary keys. |
| **Visual Rendering** | **Inline SVG Template Engine** | Allows high-DPI scaling, crisp rendering across screens, easy coordinate positioning, and seamless export to image/PDF. |
| **Asset Export** | **`html-to-image` / `jspdf`** | Enables users to download their rendered chart directly as PNG or PDF. |

---

## 3. Localization Strategy (VN / EN / JP)

### 3.1 Architecture
The calculation engine operates strictly using **Vietnamese/Sino-Vietnamese IDs or keys**. The UI layer intercepts these raw keys and maps them against a centralized dictionary before rendering.

```
[User Input: Birth Date/Time] 
         │
         ▼
[Core Engine (Vietnamese Logic)] ────> Output: { palace: "Thê", main_star: "Tử Vi" }
                                                  │
                                                  ▼
                                     [i18n Translation Layer]
                                                  │
               ┌──────────────────────────────────┼──────────────────────────────────┐
               ▼                                  ▼                                  ▼
      [VN]: Cung Thê / Tử Vi           [EN]: Spouse Palace / Emperor       [JP]: 夫妻宮 / 紫微星
```

### 3.2 Terminology Translation Dictionary (Sample)

#### A. The 12 Palaces (Thập Nhị Cung)
| ID / Key | Vietnamese (VN) | English (EN) | Japanese (JP - Kanji) |
| :--- | :--- | :--- | :--- |
| `palace_menh` | Mệnh | Life Palace | 命宮 (Mei-kyō) |
| `palace_phu_mau` | Phụ Mẫu | Parents Palace | 父母宮 (Fubo-kyō) |
| `palace_phuc_duc` | Phúc Đức | Ancestral / Karma Palace | 福徳宮 (Fukutoku-kyō) |
| `palace_dien_trach` | Điền Trạch | Property / Real Estate Palace | 田宅宮 (Dentaku-kyō) |
| `palace_quan_loc` | Quan Lộc | Career / Officer Palace | 官禄宮 (Kanroku-kyō) |
| `palace_no_truc` | Nô Bộc | Friends / Servants Palace | 奴僕宮 (Doboku-kyō) |
| `palace_thiên_di` | Thiên Di | Travel / Migration Palace | 遷移宮 (Sen'i-kyō) |
| `palace_tat_ach` | Tật Ách | Health / Sickness Palace | 疾厄宮 (Shitsuyaku-kyō) |
| `palace_tai_bach` | Tài Bạch | Wealth / Money Palace | 財帛宮 (Zaihaku-kyō) |
| `palace_tu_tuc` | Tử Tức | Children Palace | 子女宮 (Shijo-kyō) |
| `palace_the_thiep` | Thê Thiếp (Phu Thê) | Spouse Palace | 夫妻宮 (Fukai-kyō) |
| `palace_huynh_de` | Huynh Đệ | Siblings Palace | 兄弟宮 (Keitei-kyō) |

#### B. 14 Major Stars (Thập Tứ Chính Tinh)
| Key | Vietnamese (VN) | English (EN) | Japanese (JP) |
| :--- | :--- | :--- | :--- |
| `star_tu_vi` | Tử Vi | Emperor Star (Zi Wei) | 紫微星 (Shibi-sei) |
| `star_thien_co` | Thiên Cơ | Heavenly Secret / Advisor | 天機星 (Tenki-sei) |
| `star_thai_duong` | Thái Dương | The Sun | 太陽星 (Taiyō-sei) |
| `star_vu_khuc` | Vũ Khúc | Finance / Warrior Star | 武曲星 (Bukyoku-sei) |
| `star_thien_dong` | Thiên Đồng | Heavenly Child / Pleasure | 天同星 (Tentō-sei) |
| `star_liem_trinh` | Liêm Trinh | Diplomat / Chaperone | 廉貞星 (Renshei-sei) |
| `star_thien_phu` | Thiên Phủ | Treasury / Controller | 天府星 (Tenfu-sei) |
| `star_thai_am` | Thái Âm | The Moon | 太陰星 (Taiin-sei) |
| `star_tham_lang` | Tham Lang | Greed / Flirtation Star | 貪狼星 (Donrō-sei) |
| `star_cu_mon` | Cự Môn | Big Gate / Eloquence | 巨門星 (Kyomon-sei) |
| `star_thien_tuong` | Thiên Tướng | General / Minister | 天相星 (Tensō-sei) |
| `star_thien_luong` | Thiên Lương | Heavenly Beam / Physician | 天梁星 (Tenryō-sei) |
| `star_that_sat` | Thất Sát | Seven Swords / Marshal | 七殺星 (Shichisatsu-sei) |
| `star_pha_quan` | Phá Quân | Army / Breaker | 破軍星 (Hagun-sei) |

---

## 4. Required Custom Assets & Template Design

To ensure a unique visual branding, custom background templates must be designed internally.

### 4.1 Asset Requirements & Technical Format

* **Primary Recommended Format:** **SVG (Scalable Vector Graphics)**
  * **File Extension:** `.svg`
  * **Resolution:** Vector-based (native responsive scale, target canvas ratio: `1:1` or `4:3`, e.g., `1200 x 1200 px`).
  * **Color Profile:** sRGB.
  * **Structure:** Must have clearly named group elements (`<g id="palace-ty">`, `<g id="center-info">`, etc.) or defined coordinate regions for absolute text overlay.

* **Alternative Format:** **PNG High-Resolution Background**
  * **File Extension:** `.png` (24-bit with alpha channel support).
  * **Dimensions:** `2400 x 2400 px` @ 300 DPI (for sharp print/export).
  * **Usage:** Placed as CSS `background-image` or rendered directly onto an HTML5 Canvas.

### 4.2 Template Layout & Grid Specifications

The background design must follow the traditional **Zi Wei Dou Shu 12-Palace Grid Layout**:

```
+-------------------------------------------------------+
|  Tị (Snake)  | Ngọ (Horse)  | Mùi (Goat)   | Thân (Monkey)|
+--------------+--------------+--------------+--------------+
|  Thìn (Dragon|                             | Dậu (Rooster)|
+--------------+        CENTER BLOCK         +--------------+
|  Mão (Rabbit)|    (Personal Info, Chart    | Tuất (Dog)   |
+--------------+     Metadata, Heavenly      +--------------+
|  Dần (Tiger) |      Stems & Branches)      | Hợi (Pig)    |
+--------------+--------------+--------------+--------------+
|  Tý (Rat)    | Sửu (Ox)     | -- (Border)  | -- (Border)  |
+-------------------------------------------------------+
```

### 4.3 Visual Layering Structure

When combining custom background designs with dynamic data, the application uses a 3-layer sandwich stack:

1. **Layer 0 (Base Background):** Custom SVG/PNG graphic (borders, grid lines, ornate headers, watermarks, paper texture).
2. **Layer 1 (Dynamic Content):** 
   * **Center Box:** User Name, Solar Date, Lunar Date, Element (*Mệnh*), Bureau (*Cục*), Life/Body Palace positions.
   * **12 Outer Grid Cells:** Major Stars (red/purple), Auxiliary Stars (blue/green/black), Transformation Indicators (*Hóa Lộc, Hóa Quyền, Hóa Khoa, Hóa Kỵ*), Decadal Ranges (*Đại Hạn*), Yearly Ranges (*Tiểu Hạn*).
3. **Layer 2 (Overlays & Branding):** Custom watermark, application logo, site URL, dynamic QR code linking to the interactive chart.

---

## 5. Deployment & GitHub Pages Workflow

Since the web application is fully static, deployment is automated via **GitHub Actions**.

### 5.1 Deployment Pipeline (`.github/workflows/deploy.yml`)

1. **Trigger:** Code push to `main` branch.
2. **Build Stage:**
   * Install dependencies (`npm ci` / `yarn install`).
   * Compile localized JSON dictionaries.
   * Bundle static JavaScript, CSS, and SVG assets via Vite / Webpack (`npm run build`).
3. **Deploy Stage:** Push production build output to the `gh-pages` branch or directly to GitHub Pages deployment artifact.

### 5.2 Folder Structure

```
├── .github/workflows/       # GitHub Actions deploy script
├── public/
│   ├── assets/
│   │   ├── templates/       # Custom SVG/PNG background templates
│   │   │   ├── default-paper.svg
│   │   │   └── ornate-gold.png
│   │   └── fonts/           # Custom Asian calligraphy / serif fonts
├── src/
│   ├── components/          # React/Vue components (Chart Grid, Palace Cell, Controls)
│   ├── core/                # Zi Wei Dou Shu calculation engine
│   ├── i18n/                # Translation dictionary files
│   │   ├── en.json
│   │   ├── jp.json
│   │   └── vn.json
│   ├── styles/              # CSS styling & SVG positioning
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── README.md
```

---

## 6. Summary of Action Items

1. **Engine Setup:** Import/port a Vietnamese Zi Wei core library into JS/TS.
2. **i18n Mapping:** Build dictionary files mapping all Vietnamese star and palace terms to English and Japanese Hán Tự.
3. **Template Design:** Draw a high-resolution SVG or PNG template following the 12-palace grid layout with an open center block.
4. **Integration:** Overlay dynamic calculated stars onto template coordinates.
5. **Publish:** Push to GitHub and enable GitHub Pages under repository settings.
