// Sinh bản "preview" của server/src/data/luangiai/vi.json: giữ nguyên toàn bộ
// cấu trúc key (để interpreter.ts chạy đúng, không thiếu field) nhưng thay các
// đoạn văn luận giải dài bằng một placeholder cố định. Dùng khi cần commit lại
// bản preview sau khi cấu trúc JSON đổi theo code (xem commit-preview-data.sh).
//
// Hai chỗ được GIỮ NGUYÊN nội dung thật (không thay placeholder), vì đây là
// đúng phần interpreter.ts (toPreview()) hứa hẹn hiển thị miễn phí, không phụ
// thuộc lá số của người dùng:
//   - entries.meaning của riêng 14 chính tinh — "bản chất tổng quát", luôn
//     hiển thị cho mọi cung kể cả cung bị khoá (toPreview() lọc theo
//     block.isChinh nên phụ tinh không bao giờ lộ ra ngoài cung Mệnh — meaning
//     của phụ tinh vẫn bị ẩn ở đây để khớp, tránh lộ qua chính file git).
//   - entries.palace['Mệnh'] của mỗi sao (bất kể chính/phụ tinh), và
//     dict.palaces['Mệnh'] — vì cung Mệnh luôn được xem đầy đủ trong preview.
// Các field còn lại (status M/V/Đ/H/B/N, branch, tuhua, palace-text của 11
// cung khác, patterns/cohabitations/oppositions/relationships) vẫn ẩn vì
// không thể giới hạn theo cung Mệnh cụ thể (sao/chi/hóa ở Mệnh phụ thuộc lá
// số từng người) — un-redact chúng sẽ lộ gần hết nội dung trả phí.
//
// LƯU Ý: script này ghi đè trực tiếp lên vi.json. Chỉ chạy qua
// commit-preview-data.sh (script đó tự backup/khôi phục bản đầy đủ), không
// chạy tay trên bản vi.json đầy đủ nếu chưa backup.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.resolve(__dirname, '../src/data/luangiai/vi.json');

const PLACEHOLDER =
  '[Bản xem trước — tạm ẩn nội dung luận giải đầy đủ.]';

const raw = fs.readFileSync(DATA_PATH, 'utf8');
const data = JSON.parse(raw);

const STATUS_KEYS = ['M', 'V', 'Đ', 'H', 'B', 'N'];

// 14 chính tinh — duy nhất nhóm này được xem "bản chất" (entries.meaning)
// miễn phí ở mọi cung; phụ tinh chỉ lộ thật khi nằm trong cung Mệnh (qua
// entries.palace['Mệnh'], không phải qua entries.meaning).
const CHINH_TINH = [
  'Tử vi', 'Liêm trinh', 'Thiên đồng', 'Vũ khúc', 'Thái dương', 'Thiên cơ',
  'Thiên phủ', 'Thái âm', 'Tham lang', 'Cự môn', 'Thiên tướng', 'Thiên lương',
  'Thất sát', 'Phá quân',
];

for (const [name, entries] of Object.entries(data.stars || {})) {
  for (const key of STATUS_KEYS) {
    if (typeof entries[key] === 'string') entries[key] = PLACEHOLDER;
  }
  if (!CHINH_TINH.includes(name) && typeof entries.meaning === 'string') {
    entries.meaning = PLACEHOLDER;
  }
  if (entries.branch) {
    for (const k of Object.keys(entries.branch)) entries.branch[k] = PLACEHOLDER;
  }
  if (entries.palace) {
    for (const k of Object.keys(entries.palace)) {
      if (k === 'Mệnh') continue; // cung Mệnh luôn xem đầy đủ, giữ thật
      entries.palace[k] = PLACEHOLDER;
    }
  }
  if (entries.tuhua) {
    for (const k of Object.keys(entries.tuhua)) entries.tuhua[k] = PLACEHOLDER;
  }
}

for (const [name, entry] of Object.entries(data.palaces || {})) {
  if (name === 'Mệnh') continue; // cung Mệnh luôn xem đầy đủ, giữ thật
  if (typeof entry.general === 'string') entry.general = PLACEHOLDER;
  if (typeof entry.reading === 'string') entry.reading = PLACEHOLDER;
}

if (data.voChinhDieu) {
  if (typeof data.voChinhDieu.general === 'string') data.voChinhDieu.general = PLACEHOLDER;
  if (typeof data.voChinhDieu.borrowNote === 'string') data.voChinhDieu.borrowNote = PLACEHOLDER;
  if (data.voChinhDieu.palace) {
    for (const k of Object.keys(data.voChinhDieu.palace)) data.voChinhDieu.palace[k] = PLACEHOLDER;
  }
}

for (const item of data.patterns || []) {
  if (typeof item.text === 'string') item.text = PLACEHOLDER;
}
for (const item of data.cohabitations || []) {
  if (typeof item.text === 'string') item.text = PLACEHOLDER;
}
for (const item of data.oppositions || []) {
  if (typeof item.text === 'string') item.text = PLACEHOLDER;
}
for (const group of Object.values(data.relationships || {})) {
  for (const rule of group.rules || []) {
    if (typeof rule.text === 'string') rule.text = PLACEHOLDER;
  }
}

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
console.log(`Đã ghi bản preview vào ${DATA_PATH}`);
