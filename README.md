# ZPD Care — Hệ thống hỗ trợ sàng lọc hành vi & can thiệp ZPD

> **Lưu ý:** Công cụ hỗ trợ giáo dục / sàng lọc. **Không thay thế** chẩn đoán y khoa hay tâm lý lâm sàng.

## Cấu trúc

```
MatThanSuPham/
├── backend/          # FastAPI (API chính — port 8000)
├── frontend-next/    # Next.js UI chính (port 3000)  ← dùng cái này
├── frontend/         # Vite legacy (không dùng cho demo mới)
└── AI_MEMORY.md      # Nhật ký kỹ thuật dự án
```

## Yêu cầu

- Python 3.10+
- Node.js 18+
- Gemini API key (`GOOGLE_API_KEY`)

## Cài đặt nhanh

### 1. Backend

```powershell
cd MatThanSuPham\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# Sửa GOOGLE_API_KEY trong .env
python seed_data.py
# Seed lấy 17 học sinh THẬT từ Excel:
#   ../../DANH SÁCH CHÁU ĐK NHẬP HỌC THÔN CHÍ THẠNH NĂM 2021.xls
# (Trường MN Chí Thạnh — xã Tuy An Bắc)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend (Next.js)

```powershell
cd MatThanSuPham\frontend-next
npm install
npm run dev
```

Mở: http://localhost:3000  
API docs: http://localhost:8000/docs  
Health: http://localhost:8000/api/health

### 3. Script một lệnh (Windows)

```powershell
cd MatThanSuPham
.\start.ps1
```

## Tính năng chính

| Module | Mô tả |
|--------|--------|
| Phân tích hành vi | AI bóc tách + XAI highlight (Gemini) |
| Khảo sát PH | Câu hỏi động / mặc định theo trục Social–Routine–Attention |
| Probes | Kịch bản kiểm chứng + game lâm sàng |
| Triangulation | Risk = 30% GV + 30% PH + 40% Probe (CARS 1–4) |
| Dashboard | Radar + dự báo mô phỏng + PDF |
| Chatbot | Trợ lý ngữ cảnh hồ sơ HS |

## Tài khoản demo (sau `python seed_data.py`)

| User | Pass | Quyền |
|------|------|--------|
| `expert` | `expert123` | Giáo viên — toàn bộ HS (17 cháu MN Chí Thạnh) |
| `admin` | `admin123` | Quản trị |

> **Phụ huynh không cần đăng nhập web.** Cô giáo liên hệ PH và nhập khảo sát hộ tại tab **Khảo sát PH**.

API: `POST /api/auth/login` → Bearer token cho mọi request.

## An toàn lâm sàng (v1.1+)

- Khi AI lỗi: **không** gán điểm nguy cơ cao; `analysis_failed=true`, điểm trung lập 1.0
- Bản ghi fail **không** đưa vào `calculate_final_risk`
- Không tạo probe/survey giả từ fallback
- Upload multimodal: whitelist đuôi file + giới hạn dung lượng (mặc định 25MB)
- CORS cấu hình qua `ALLOWED_ORIGINS`

## API chính

- `GET  /api/health`
- `GET  /api/students`
- `GET  /api/students/{id}/dashboard`
- `POST /api/analyze`
- `POST /api/analyze-multimodal`
- `PUT  /api/probes/{id}`
- `DELETE /api/probes/{id}`
- `GET  /api/students/{id}/survey-questions`
- `POST /api/surveys`
- `POST /api/chat`
- `GET  /api/students/{id}/export-pdf`

## Bảo mật demo

- Không commit file `.env`
- Demo LAN: `ALLOWED_ORIGINS=*`
- Production: whitelist origin + thêm JWT/RBAC (roadmap)

## License / mục đích

Dự án sáng kiến giáo dục — dùng nội bộ trường / hội đồng. Không dùng để chẩn đoán ASD chính thức.
