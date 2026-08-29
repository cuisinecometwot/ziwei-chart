// Sinh bản "preview" của server/src/data/luangiai/vi.json: giữ nguyên toàn bộ
// cấu trúc key (để interpreter.ts chạy đúng, không thiếu field) nhưng thay các
// đoạn văn luận giải dài bằng một placeholder cố định. Dùng khi cần commit lại
// bản preview sau khi cấu trúc JSON đổi theo code (xem commit-preview-data.sh).
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
  '[Bản xem trước — nội dung luận giải đầy đủ chỉ có ở môi trường phát triển local, không được đưa lên git.]';

const raw = fs.readFileSync(DATA_PATH, 'utf8');
const data = JSON.parse(raw);

const STATUS_KEYS = ['M', 'V', 'Đ', 'H', 'B', 'N'];

for (const entries of Object.values(data.stars || {})) {
  for (const key of STATUS_KEYS) {
    if (typeof entries[key] === 'string') entries[key] = PLACEHOLDER;
  }
  if (typeof entries.meaning === 'string') entries.meaning = PLACEHOLDER;
  for (const group of ['branch', 'palace']) {
    if (entries[group]) {
      for (const k of Object.keys(entries[group])) entries[group][k] = PLACEHOLDER;
    }
  }
  if (entries.tuhua) {
    for (const k of Object.keys(entries.tuhua)) entries.tuhua[k] = PLACEHOLDER;
  }
}

for (const entry of Object.values(data.palaces || {})) {
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
