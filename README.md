# Lá Số Tử Vi (紫微斗数 / Zi Wei Dou Shu)

Ứng dụng web tĩnh lập lá số Tử Vi (Zi Wei Dou Shu) chạy hoàn toàn trên trình duyệt.
Nhập tên, giới tính, ngày sinh dương lịch và giờ sinh → lập lá số 12 cung với đầy đủ
chính tinh, phụ tinh, Tứ Hóa, Đại hạn, Tiểu hạn — và tải về ảnh PNG.

Hỗ trợ 3 ngôn ngữ: **Tiếng Việt / English / 日本語**.

## Tính năng

- Lập lá số Tử Vi theo lối truyền thống Việt Nam (phái Tử Vi Đẩu Số)
- Nhập tên, giới tính, ngày sinh dương lịch (tự chuyển sang âm lịch), giờ sinh theo 12 chi
- Hiển thị 12 cung: Mệnh, Phụ Mẫu, Phúc Đức, Điền Trạch, Quan Lộc, Nô Bộc, Thiên Di,
  Tật Ách, Tài Bạch, Tử Tức, Phu Thê, Huynh Đệ
- 14 Chính Tinh kèm trạng thái miếu/vượng/đắc/hãm, phụ tinh cát/hung, Tứ Hóa
  (Hóa Lộc, Hóa Quyền, Hóa Khoa, Hóa Kỵ), Trường Sinh, Đại hạn (mỗi cung 10 năm), Tiểu hạn
- Tải lá số dưới dạng **ảnh PNG** độ phân giải cao
- Giao diện phản hồi (responsive), tối ưu cho điện thoại và máy tính

## Công nghệ

- React 18 + Vite
- [tuvi-neo](https://www.npmjs.com/package/tuvi-neo) — engine tính toán Tử Vi Việt Nam
  (chuyển lịch dương âm bằng thư viện `@dqcai/vn-lunar`)
- i18next / react-i18next — đa ngôn ngữ VN / EN / JP
- html-to-image — xuất ảnh PNG
- GitHub Pages + GitHub Actions — deploy tự động

## Chạy tại máy

```bash
npm install
npm run dev      # chạy môi trường phát triển
npm run build    # build bản production vào thư mục dist/
npm run preview  # xem trước bản production
```

## Cấu trúc thư mục

```
├── .github/workflows/deploy.yml   # Deploy lên GitHub Pages
├── public/                        # Tài nguyên tĩnh
├── src/
│   ├── components/                # Giao diện (Controls, ChartGrid, PalaceCell, CenterBlock)
│   ├── core/                      # Lớp bọc engine tính toán Tử Vi
│   ├── i18n/                      # Từ điển đa ngôn ngữ VN/EN/JP
│   ├── styles/                    # CSS
│   ├── App.jsx
│   └── main.jsx
├── package.json
└── README.md
```

## Deploy lên GitHub Pages

1. Đẩy mã nguồn lên nhánh `main` của repository GitHub.
2. Vào **Settings → Pages**, chọn nguồn là **GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` sẽ tự động build và deploy sau mỗi lần push.

> Kết quả mang tính tham khảo, phục vụ mục đích văn hóa, giáo dục và giải trí.