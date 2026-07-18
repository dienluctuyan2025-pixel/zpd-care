# AI_MEMORY — ZPD Care (cập nhật 18/07/2026 · tối)

**Vai trò:** Project memory cho agent/dev tiếp theo  
**Stack chạy thật:** `backend` FastAPI `:8000` · `frontend-next` Next.js `:3000`  
**Login demo GV:** `expert` / `expert123` · admin: `admin` / `admin123`  
**Không dùng:** thư mục `frontend/` (Vite cũ)  
**DB chính:** `backend/mat_than_su_pham.db` (SQLAlchemy `sqlite:///./mat_than_su_pham.db`)

---

## 1. Mục tiêu sản phẩm (đúng hiện tại)

- **Sàng lọc hành vi giáo dục mầm non** + gợi ý can thiệp **ZPD** (scaffolding lớp/nhà).
- **Teacher-only web:** chỉ giáo viên/admin đăng nhập. PH **không** cổng login; GV nhập khảo sát hộ.
- **Human-in-the-loop (HITL):** AI text + media = **nháp** → GV **Xác nhận ghi hồ sơ** mới tính điểm rủi ro.
- **Không chẩn đoán y khoa:** không ADOS-2/CARS-2 license; thang 1–4 là **CARS-like nội bộ**.
- **Dữ liệu HS thật** từ Excel MN Chí Thạnh (roster ~17 HS).
- **Lớp hiển thị thống nhất:** `Lớp MG 5-6 tuổi A4` (đã thay “Chồi 1/2” trong DB + `import_excel.py`).

> Bản memory 14/07 còn ngôn ngữ “bệnh án / chẩn đoán / ADOS game lâm sàng”. **Hướng sản phẩm hiện tại = sàng lọc giáo dục** — ưu tiên mô tả bên dưới.

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
| CSS chết (archive) | `frontend-next/_archive_css/` |
| Layout + dark FOUC fix | `frontend-next/src/app/layout.js` |
| Quan sát | `components/dashboard/BehaviorTab.jsx` |
| Kiểm chứng | `components/dashboard/ProbesTab.jsx` |
| Hồ sơ ZPD + Xuất PDF | `components/dashboard/RadarTab.jsx` |
| Khảo sát PH | `components/dashboard/ParentPortalTab.jsx` |
| Timeline | `components/ui/ClinicalTimeline.jsx` |
| Chat trợ lý | `components/chat/ChatWidget.jsx` |
| Avatar bác sĩ chat | `public/doctor_avatar.jpg` |
| Logo brand | `public/logo-zpd.svg` |

**Chạy (Windows — bắt buộc UTF-8 cho backend):**
```powershell
# Backend
cd MatThanSuPham/backend
$env:PYTHONIOENCODING="utf-8"
python -m uvicorn main:app --host 127.0.0.1 --port 8000

# Frontend
cd MatThanSuPham/frontend-next
npm run dev
```

**Env:** `backend/.env` — `GOOGLE_API_KEY`, `JWT_SECRET`, `ALLOWED_ORIGINS`, `AUTH_DISABLED=0`  
**CORS mặc định:** `http://localhost:3000`, `127.0.0.1:3000` (+ 3001). Chỉ `*` khi set tường minh.  
**Optional FE:** `NEXT_PUBLIC_API_URL` (mặc định `http://<hostname>:8000/api`).

---

## 3. Nghiệp vụ cốt lõi (ổn định — cẩn thận khi sửa)

### 3.1 Tam giác hóa rủi ro (`calculate_final_risk`)
- **GV 30%** · **PH 30%** · **Probe 40%** (thiếu nguồn → tái phân bổ trọng số).
- Red-flag AND: probe gần nhất ≥ 3.5 **và** GV ≥ 2 **và** PH ≥ 2 → nâng trần.
- **Chỉ đếm:**
  - Log: đã xác nhận HITL; bỏ `analysis_failed`, `counts_toward_risk=false`, placeholder/seed.
  - Probe: `scored=1` **và** `scored_by` ∉ `{seed, demo, system-seed, import, placeholder}`.
- Placeholder import: `is_placeholder=true`, `teacher_confirmed=false`, `counts_toward_risk=false`, `source=import_placeholder`.
- Không bịa điểm 1.0 giả khi thiếu nguồn (trung lập kỹ thuật nếu empty).

### 3.2 Quan sát (BehaviorTab)
- Text **và** multimodal → **nháp** (`pending_confirmation`, `counts_toward_risk=false`).
- GV **Xác nhận ghi hồ sơ** → mới tính risk.
- Không tạo probe AI lạ từ text analyze (tránh lệch catalog 7 module).
- Đổi HS: reset pending/result/chat draft state.

### 3.3 Kiểm chứng (ProbesTab + catalog)
- **7 module cố định** — `POST /api/students/{id}/ensure-probes` khi mở hồ sơ.
- **GET dashboard chỉ đọc** (không ghi DB).
- **3 bài có game** (whitelist cứng FE+BE):
  - `name_response` → reaction  
  - `emotion_match` → emotion  
  - `sustained_attention` → shape  
- **4 bài chỉ quan sát** (`game_type=none`): joint_attention, turn_taking, routine_transition, stereotypy_observe.
- **Game = gợi ý rubric** → mở ScoreModal → GV xác nhận mới ghi điểm (HITL).
- Cột UI: Hàng đợi · Đã chấm · Ưu tiên theo dõi (rubric ≥ 3).
- Legacy probe không thuộc catalog → archive `Bỏ qua` khi ensure.

### 3.4 Khảo sát PH
- GV nhập; điểm PH 30%.
- Fallback map trục: **q1–q2 = routine**, **q3–q4 = social**, **q5 = attention**.
- UI gọn — không banner “PH không cần tài khoản”.

### 3.5 Radar / Hồ sơ ZPD (RadarTab)
- Blend trục: **0.65·probe + 0.35·PH** khi đủ; thiếu thì nguồn còn lại.
- Khác công thức risk 30/30/40 — hai lớp số liệu (đã ghi chú UI).
- Hero + method cards + triangulation + sim 6 tháng + ZPD tabs.

### 3.6 Trợ lý chat
- API `POST /api/chat`: `message` + `history` (≤8 lượt).
- Backend `_build_chat_dossier`: T/P/K, log, probe, PH, ZPD.
- Prompt: sàng lọc giáo dục, cấm chẩn đoán, bám hồ sơ.
- UI v4: chip nhanh + icon; **avatar bác sĩ** `/doctor_avatar.jpg` (FAB + header + bubble).
- Props: `studentId`, `studentName`, `riskScore`, `riskStatus`.

### 3.7 PDF hồ sơ (viết lại chi tiết 18/07 tối)
- Generator: `pdf_generator.py` → `generate_medical_report` (= screening report).
- API: `GET /api/students/{id}/export-pdf`
  - Filename: `ZPD_HS00x_Ten_YYYYMMDD_HHMMSS.pdf`
  - `exported_by` từ JWT full_name/username
- **Cấu trúc PDF:**
  1. I — HS (DOB, giới, lớp, mã tài liệu, người xuất) + callout phạm vi  
  2. II — Hero điểm + bảng 3 nguồn (n, %, trạng thái) + formula  
  3. III — Radar 3 miền + probe/PH breakdown  
  4. IV — Pred **list 6 tháng** (without/with/Δ) — không còn dict `6_months`  
  5. V — ZPD trường / nhà  
  6. VI — Probe: mã module, rubric 1–4, DEMO, TB rubric  
  7. VII — Quan sát đã xác nhận + **bảng XAI keywords** + diễn giải  
  8. VIII — Checklist việc làm 2–4 tuần + ma trận đầy đủ dữ liệu  
  9. IX — Phương pháp (tam giác hóa, CARS-like, HITL, disclaimer khoa học)  
  10. X — Chữ ký GV + Tổ CM/BGH  
- Design: header navy + rust bar, footer tiếng Việt có dấu, cold rust.
- **Không** probe Đạt/Không Đạt xanh-đỏ sai; **không** footer không dấu.

### 3.8 School dashboard
- `GET /api/school-dashboard?refresh=true` — tính lại cache toàn trường.
- Login FE gọi refresh=1 lần; sau confirm/chấm → refresh students + school stats.

---

## 4. UI / Design

- **Palette cold rust:** `#ba370a`, `#af5b3f`, `#f0f4f8`, `#133b5c`, `#1d2d50`.
- **CSS sống:** `base.css` + `zpd-ui.css` only.
- **Brand:** `logo-zpd.svg`; badge UI **5.5**.
- **Sidebar HS:** search, sort risk/name/class, score chips, class `Lớp MG 5-6 tuổi A4`.
- **Shortcut:** Ctrl+K.
- **Chat FAB:** doctor photo + badge ZPD.
- **Dark mode (đã sửa 18/07 tối):**
  - Toggle ☀/🌙 topbar → `localStorage.zpd_dark` + `html[data-theme=dark|light]` + `colorScheme`.
  - `layout.js` script sớm chống FOUC.
  - **Nguyên nhân hỏng trước:** `:root { --bg: ... !important }` ép light; nhiều `#fff` hardcode.
  - **Sửa:** bỏ !important token light; block `html[data-theme=dark]` đầy đủ (shell, card, input, tabs, radar, probes, chat, modal, login).
  - Sidebar navy **giữ tối** cả hai theme (đúng design cold rust).

---

## 5. Bảo mật / vận hành

| Mục | Trạng thái |
|-----|------------|
| JWT HMAC + PBKDF2 | Có; cảnh báo console nếu secret mặc định |
| Rate-limit login | 8 lần sai / 5 phút / IP+username → 429 |
| Parent login | clearSession, chặn vào app |
| CORS | localhost mặc định |
| GET dashboard | chỉ đọc; ensure-probes = POST |
| Delete probe | recalc risk |
| Seed/demo khỏi risk | có |
| AUTH_DISABLED | chỉ debug; prod = 0 |
| Windows console | print auth ASCII only (tránh crash cp1252) |

**Production còn cần:** JWT_SECRET mạnh, xoay GOOGLE_API_KEY, HTTPS, không commit `.env`.

---

## 6. Bug đã gặp (18/07) & cách xử lý

| Bug | Nguyên nhân | Sửa |
|-----|-------------|-----|
| Modal chấm hình tròn | Class `pk5-score` pill đè panel | `pk5-score-modal` |
| Game dính bài quan sát ABC | Fallback game_type → reaction | Whitelist 3 module |
| Protocol AI “điều tiết cảm giác” | Probe legacy ngoài catalog | Archive + sync scenario |
| API crash Windows | print tiếng Việt cp1252 | ASCII warning only |
| Risk bẩn | seed + placeholder 1.0 | Filter risk engine |
| Text auto-risk | asymmetry multimodal | Text = nháp + confirm |
| Game auto-ghi điểm | mâu thuẫn HITL | Game chỉ gợi ý |
| Empty students spinner | không empty state | Màn “chưa có HS” |
| Chat dính HS cũ | không reset | Reset theo studentId |
| PDF pred trống | parse dict `6_months` trong khi API list | Parse list tháng |
| PDF probe sai màu | Đạt/Không Đạt | Rubric 1–4 + DEMO |
| Dark mode không đổi | CSS light `!important` | Dark tokens + overrides |
| Lớp “Chồi 1/2” | seed cũ | DB + import → `Lớp MG 5-6 tuổi A4` |

---

## 7. Quy trình GV chuẩn

**Chọn HS → Quan sát (AI nháp → Xác nhận) → Kiểm chứng (quan sát/game → Chấm 1–4) → Khảo sát PH → Hồ sơ ZPD / Xuất PDF / Chat.**

---

## 8. Catalog 7 module (tham chiếu nhanh)

| id | code | game |
|----|------|------|
| name_response | NR-01 | reaction |
| joint_attention | JA-02 | none |
| emotion_match | EM-03 | emotion |
| turn_taking | TT-04 | none |
| routine_transition | RT-05 | none |
| sustained_attention | SA-06 | shape |
| stereotypy_observe | ST-07 | none |

---

## 9. Deploy zero-cost (18/07 tối - Đã Deploy Thành Công)

- **Trạng thái:** Live 100%
- **FE (Vercel):** `https://zpd-care.vercel.app`
- **API (Render):** `https://zpd-care-api.onrender.com`
- **Cấu hình Environment:**
  - FE Vercel: `NEXT_PUBLIC_API_URL` = `https://zpd-care-api.onrender.com/api` (Lưu ý: KHÔNG có dấu cách thừa ở đầu, KHÔNG có trailing slash ở cuối, bắt buộc kết thúc bằng `/api`)
  - BE Render: `ALLOWED_ORIGINS` = `https://zpd-care.vercel.app` (Lưu ý: KHÔNG để dấu `/` ở cuối)
- Files cấu hình: `DEPLOY.md`, `frontend-next/vercel.json`, `backend/render.yaml`, `backend/Dockerfile`, `backend/bootstrap.py`
- Startup: `init_db()` + `bootstrap()` (expert/admin + roster nếu trống)
- CORS: Backend đã config `ALLOWED_ORIGINS` chuẩn.
- **Giới hạn free:** Render sleep ~15p; SQLite ephemeral khi redeploy — không “data vĩnh viễn” trừ khi gắn Postgres sau
- Chi tiết từng bước: xem `MatThanSuPham/DEPLOY.md`

## 10. Việc còn mở (backlog)

1. Rà copy About / prompt AI còn từ “clinical” cũ.
2. Closed-loop ZPD: mục tiêu → làm → đo lại 2–4 tuần.
3. Audit log (ai nhập PH / chấm rubric).
4. Deploy production: JWT mạnh + HTTPS + (tuỳ) Neon Postgres thay SQLite.
5. E2E: triangulation + confirm + probe + PDF.
6. Demo ngoài: không để seed risk trên tên HS thật (đã filter; kiểm tra seed_data).
7. (Tuỳ) 2 GV chấm / IRR; dọn hardcode `#fff` còn sót trong CSS light-only components.
8. Legacy `backend/app.py` Streamlit — không dùng song song production.

---

## 11. Lệnh hữu ích

```powershell
# Backend UTF-8 + start
cd MatThanSuPham/backend
$env:PYTHONIOENCODING="utf-8"
python -m uvicorn main:app --host 127.0.0.1 --port 8000

# Tính lại cache risk toàn trường (Bearer token)
# GET /api/school-dashboard?refresh=true

# Đổi tên lớp toàn DB (nếu cần lại)
# UPDATE students SET class_name = N'Lớp MG 5-6 tuổi A4';

# Import Excel lại (wipe + seed roster — cẩn thận)
python import_excel.py

# Test PDF local
python -c "from main import _build_student_dashboard; from pdf_generator import generate_medical_report; d=_build_student_dashboard(5); generate_medical_report(d,'temp_pdfs/t.pdf',exported_by='GV')"
```

---

## 12. Nguyên tắc cho agent sau

1. **Không** đưa lại ngôn ngữ chẩn đoán/bệnh án lên UI/PDF/prompt.
2. **Không** auto-ghi điểm risk từ AI/game mà không HITL.
3. **Không** gắn game cho module `game_type=none`.
4. **Không** import lại `globals.css` / `zpd-product.css` (đã archive).
5. **Không** thêm `:root { --token: x !important }` — phá dark mode.
6. Windows: tránh Unicode trong `print()` console (cp1252 crash).
7. Đổi thuật toán risk → refresh school-dashboard / recompute cache.
8. Chat avatar: giữ `/doctor_avatar.jpg` trừ khi user đổi asset.
9. Lớp mặc định seed: `Lớp MG 5-6 tuổi A4`.
10. PDF: giữ cấu trúc I–X chi tiết; pred = list; probe = rubric.

---

**Phiên bản memory:** 2026-07-18 21:40 ICT  
**UI 5.5** · HITL · scientific probes · doctor chat · PDF chi tiết I–X · dark mode hoạt động · lớp MG 5-6 tuổi A4 · Đã lên Cloud Vercel/Render
