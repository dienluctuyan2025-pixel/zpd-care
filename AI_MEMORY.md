# AI_MEMORY — ZPD Care (Cập nhật 26/07/2026 - Phiên bản Đại tu Vòng Cuối)

**Vai trò:** Project memory cho agent/dev tiếp theo  
**Stack chạy thật:** `backend` FastAPI `:8000` · `frontend-next` Next.js `:3000`  
**Login demo GV:** `expert` / `expert123` · admin: `admin` / `admin123`  
**Không dùng:** thư mục `frontend/` (Vite cũ)  
**DB chính:** `backend/mat_than_su_pham.db` (SQLAlchemy `sqlite:///./mat_than_su_pham.db`)

---

## 1. Mục tiêu sản phẩm (Định vị Chuẩn xác 100%)

- **Sàng lọc hành vi giáo dục mầm non** + gợi ý can thiệp **ZPD** (scaffolding lớp/nhà).
- **Teacher-only web:** chỉ giáo viên/admin đăng nhập. PH **không** cổng login; GV nhập khảo sát hộ.
- **Human-in-the-loop (HITL):** AI text + media = **nháp** → GV **Xác nhận ghi hồ sơ** mới tính điểm rủi ro.
- **Không chẩn đoán y khoa:** không ADOS-2/CARS-2 license; thang 1–4 là **CARS-like nội bộ**. Tuyệt đối không dùng các từ "bệnh án", "đi khám", hay mã bệnh 299.00.
- **Dữ liệu HS thật** từ Excel MN Chí Thạnh (roster ~17 HS).
- **Lớp hiển thị thống nhất:** `Lớp MG 5-6 tuổi A4` (đã thay “Chồi 1/2” trong DB + `import_excel.py`).

---

## 2. Kiến trúc & đường dẫn quan trọng

| Thành phần | Đường dẫn |
|------------|-----------|
| API | `MatThanSuPham/backend/main.py` |
| Risk / AI / chat | `backend/ai_analyzer.py` |
| Auth | `backend/auth.py` |
| Catalog probe | `backend/probe_catalog.py` |
| PDF | `backend/pdf_generator.py` |
| Seed/import | `backend/import_excel.py`, `seed_data.py` |
| Shell UI | `frontend-next/src/app/page.js` |
| CSS sống | `frontend-next/src/app/base.css` + `zpd-ui.css` |
| Layout + dark FOUC fix | `frontend-next/src/app/layout.js` |
| Quan sát | `components/dashboard/BehaviorTab.jsx` |
| Kiểm chứng | `components/dashboard/ProbesTab.jsx` |
| Hồ sơ ZPD + Xuất PDF | `components/dashboard/RadarTab.jsx` |
| Khảo sát PH | `components/dashboard/ParentPortalTab.jsx` |
| Timeline | `components/ui/ClinicalTimeline.jsx` |

---

## 3. Cốt lõi Hệ thống (Đã Audit 9 Vòng - Ổn định Tuyệt đối)

### 3.1 Tam giác hóa rủi ro (Triangulation `calculate_final_risk`)
- **Tỷ trọng CỐ ĐỊNH:** **GV 30%** · **PH 30%** · **Probe 40%**. 
- Nếu thiếu 1 nguồn, hệ thống tự động tái phân bổ tỷ trọng dựa trên các nguồn còn lại (Fallback) thay vì chia cho 0 hoặc giả mạo điểm 1.0.
- **Chỉ đếm:** Log đã xác nhận (HITL); bỏ qua log nháp hoặc import placeholder.

### 3.2 Khảo sát Phụ huynh & Chống Pha loãng (Đại tu 26/07)
- **Cơ chế Sinh câu hỏi:** Hệ thống tổng hợp Data từ **5 log quan sát gần nhất** để sinh danh sách câu hỏi Khảo sát PH. AI có nhiệm vụ **De-duplication (Loại bỏ trùng lặp)** để không hỏi lại những câu đã hỏi.
- **Tính điểm rủi ro:** Chống pha loãng (Dilution) do Survey rỗng. Nếu Khảo sát PH chỉ trả về điểm cho 1 miền (vd: social=3, routine=null), hệ thống **bỏ qua `null`** và chỉ tính trung bình miền social, không chia bừa cho 3.

### 3.3 UI Giao tiếp Liên Module (BehaviorTab)
- Giao diện Draft (Bản nháp AI) đã được làm lại hoàn toàn để xử lý cấu trúc JSON mới:
  - `kich_ban_test_kiem_chung` giờ là mảng ID thay vì chuỗi. UI sẽ báo số lượng bài test ánh xạ.
  - Hiển thị công khai **Panel Xem trước Khảo sát PH (Preview)** ngay trong bản nháp để GV duyệt trước khi bấm Xác nhận.

### 3.4 Thẩm mỹ UI (Premium Visuals)
- Các Risk Cards và XAI Modals sử dụng công nghệ **Glassmorphism (Kính mờ)**: `backdrop-filter: blur(12px)`.
- Hiển thị Radar: Đồng bộ Text UI với thuật toán Backend (sử dụng chuỗi động `radarSources.blend`), gỡ bỏ text hardcode lỗi thời 65-35.
- Hoạt ảnh (Micro-animations): Các thẻ nhô lên mượt mà khi `hover`, Modal trượt `Slide Up` và `Fade In`.

### 3.5 Trợ lý chat & Xuất PDF
- Chatbot sử dụng ngữ cảnh (student_name, risk_score) để tránh AI nói mớ (Hallucination) hoặc bắt lỗi phát âm giọng nói địa phương.
- Cấu trúc PDF (10 phần) giữ nguyên bản sắc "Báo cáo sàng lọc y khoa - giáo dục", có bảng phân tích chéo 3 nguồn.

---

## 4. UI / Design

- **Palette cold rust:** `#ba370a`, `#af5b3f`, `#f0f4f8`, `#133b5c`, `#1d2d50`.
- **CSS sống:** `base.css` + `zpd-ui.css` only.
- **Dark mode:** Hoạt động chuẩn xác cả 2 lớp layout (tránh FOUC qua script ở thẻ head). 

---

## 5. Quy trình GV chuẩn (Closed-loop)

1. **Chọn HS** 
2. **Quan sát (BehaviorTab):** Nhập liệu bằng Giọng nói/Video → AI Sinh bản Nháp (Draft) → GV Duyệt (Xác nhận ghi hồ sơ).
3. **Kiểm chứng (ProbesTab):** Dựa trên bản nháp đã duyệt, AI Tự động đẩy các bài test vào Hàng đợi → GV thực hành & chấm 1-4.
4. **Khảo sát (ParentPortalTab):** GV trả lời các câu hỏi AI sinh tự động thay cho Phụ huynh.
5. **Hồ sơ ZPD (RadarTab):** Biểu đồ Radar động 30-30-40 cập nhật thời gian thực → Xuất PDF.

---

## 6. Nguyên tắc "Bất di bất dịch" cho Agent sau (READ CAREFULLY)

1. **Khóa chặt Logic 30-30-40:** Tuyệt đối không chỉnh sửa thuật toán chia tỷ trọng trong `calculate_final_risk` hay `_build_student_dashboard` trừ khi có lệnh rất rõ ràng.
2. **Không sửa Giao diện Radar tĩnh:** Radar đang đọc chuỗi động từ Backend để mô tả công thức. Cấm hardcode lại các chuỗi text tính toán trên Frontend.
3. **Không phá Glassmorphism:** Các class CSS `.sci-cars-hero` và `.xai-modal-content` đã được thiết kế tinh xảo, cấm viết đè (override) làm mất hiệu ứng blur hay shadow.
4. **Luôn Test Array/Null:** Khi render UI từ dữ liệu AI, luôn dùng `Array.isArray()` và check `null` để tránh sập React DOM.

## 7. Các bản vá lỗi (Bug Fixes - Đại tu vòng cuối)

- **Lỗi giao diện (BehaviorTab):** Fix triệt để tình trạng UI lấy nội dung nháp trong `sessionStorage` đè lên văn bản gốc của lịch sử quan sát khi người dùng xem lại hồ sơ cũ.
- **Lỗi API 500 (Dashboard):** Fix lỗi 500 khi load dashboard do truy cập vào các trường `entered_by` và `contact_note` chưa được định nghĩa trong SQLAlchemy model `ParentSurvey`. Sử dụng `getattr` để fallback an toàn.
- **Lỗi dữ liệu giả lập (Mock Engine):** Fix lỗi `generate_mock_data.py` phân bổ ngẫu nhiên kịch bản "Bé an toàn" (Safe Logs) cho các bé có điểm CARS cao (Alert). Đã sửa để thuật toán sinh dữ liệu dựa trên `cached_risk_score` thực tế của học sinh.
- **Lỗi kẹt bản nháp cũ (SessionStorage Cache):** Cập nhật key lưu trữ từ `draft-${studentId}` thành `draft-v2-${studentId}` trong `BehaviorTab.jsx` để tự động vô hiệu hóa và bỏ qua các bản nháp cũ bị sai logic trên trình duyệt người dùng mà không cần họ phải xóa thủ công.
- **Lỗi Đồng bộ Timeline (ClinicalTimeline):** 
  - Khắc phục lỗi sắp xếp lộn xộn các sự kiện (Probe/Log) bằng cách convert toàn bộ `sortKey` sang Unix Timestamp `new Date().getTime()`.
  - Hiển thị toàn bộ Lịch sử Khảo sát PH trên Timeline thay vì chỉ hiển thị một block duy nhất "Mới nhất".
- **Giao diện Lịch sử Khảo sát (ParentPortalTab):** Bổ sung API `GET /api/students/{id}/surveys` và xây dựng thêm khối giao diện hiển thị danh sách lịch sử khảo sát bên dưới form nhập liệu. Đồng bộ class CSS `obs-history-list` để có giao diện UI/UX nhất quán với các tab khác.
- **Sửa lỗi Crash màn hình trắng (ParentPortalTab):** Fix triệt để lỗi thiếu khai báo state variables (`history` và `loadingHistory`) gây sập giao diện khi người dùng bấm vào tab Khảo sát PH.
- **Xây dựng Sổ tay Vận hành ZPD Care (UserGuide):** Tạo module hướng dẫn cực kỳ chi tiết, tích hợp ngay trong app với giao diện Bento Grid, phân giải cặn kẽ 7 bài test Probes, phương pháp ABC, kỹ thuật nhắc lệnh AI (Prompt Engineering) và đạo đức dữ liệu lâm sàng.
- **Tối ưu chuẩn hóa PWA & SEO (Frontend):** Sửa lỗi title dài bị cắt xén, bổ sung thẻ OpenGraph cho trang web (`layout.js`) và chuẩn hóa file `manifest.json` để ứng dụng hoạt động 100% như một App Native trên thiết bị di động. Cải thiện tương phản (Contrast) của các khối text màu ở chế độ Light Mode.

---

**Phiên bản memory:** 2026-07-26 12:45 ICT  
**UI 6.0 Premium** · HITL · Triangulation 30-30-40 · Glassmorphism · Survey Anti-Dilution · Cross-Module Sync · Timeline Sorted · PWA & SEO Optimized
