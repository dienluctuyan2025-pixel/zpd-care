# Deploy ZPD Care — chi phí ~0 (Vercel + Render Free)

## Thực tế quan trọng

| Phần | Host free | Ghi chú |
|------|-----------|---------|
| **Frontend** Next.js | **Vercel Hobby** | Ổn định, HTTPS, CDN |
| **Backend** FastAPI | **Render Free** (hoặc Railway trial) | **Sleep ~15 phút** không traffic → request đầu chậm 30–60s |
| **SQLite** | Disk ephemeral trên free | **Redeploy / sleep dài có thể mất DB** → bootstrap lại account + roster |

**Không thể** chạy full FastAPI + SQLite + upload file **chỉ trên Vercel** (serverless, không process dài, filesystem tạm).

---

## A. Backend trên Render (free)

1. Tạo tài khoản https://dashboard.render.com  
2. **New → Web Service**  
3. Connect GitHub repo (hoặc upload)  
4. Settings:
   - **Root Directory:** `backend`  
   - **Runtime:** Python 3  
   - **Build:** `pip install -r requirements.txt`  
   - **Start:** `uvicorn main:app --host 0.0.0.0 --port $PORT`  
5. **Environment:**

```env
JWT_SECRET=<chuỗi dài ngẫu nhiên>
AUTH_DISABLED=0
ALLOWED_ORIGINS=https://YOUR-APP.vercel.app
ALLOWED_ORIGIN_REGEX=https://.*\.vercel\.app
GOOGLE_API_KEY=<key Gemini>
SEED_EXPERT_PASSWORD=expert123
SEED_ADMIN_PASSWORD=admin123
MAX_UPLOAD_MB=15
```

6. Deploy → URL dạng `https://zpd-care-api.onrender.com`  
7. Test: `https://zpd-care-api.onrender.com/api/health`

Lần đầu cold start có thể chậm. Login: `expert` / `expert123` (sau bootstrap).

---

## B. Frontend trên Vercel (free)

### Cách 1 — CLI (thư mục frontend-next)

```bash
cd frontend-next
npx vercel login
npx vercel
# Production:
npx vercel --prod
```

Khi hỏi:
- **Framework:** Next.js  
- **Root:** `frontend-next` (nếu monorepo từ repo gốc)  
- **Env Production:**

```env
NEXT_PUBLIC_API_URL=https://zpd-care-api.onrender.com/api
```

### Cách 2 — Dashboard

1. https://vercel.com/new  
2. Import repo  
3. **Root Directory** = `frontend-next`  
4. Env: `NEXT_PUBLIC_API_URL` = URL backend + `/api`  
5. Deploy  

---

## C. Checklist sau deploy

1. Mở site Vercel → Login `expert` / `expert123`  
2. Nếu CORS lỗi: thêm domain Vercel vào `ALLOWED_ORIGINS` trên Render  
3. Đổi mật khẩu demo ASAP  
4. (Khuyến nghị) Import Excel roster thật qua script local rồi upload DB — free tier khó giữ file lâu  

---

## D. Giới hạn free “mãi mãi”

- Render free **sleep** → mở app lần đầu sau idle sẽ chờ wake.  
- SQLite **không bền** trên free disk. Cần Postgres free (Neon/Supabase) nếu muốn data thật lâu dài (cần migrate code).  
- Gemini API có quota free riêng (Google AI Studio).  
- Vercel Hobby: đủ cho demo/trường nhỏ.  

---

## E. Kiến trúc khuyến nghị zero-cost demo

```
[Trình duyệt]
    → Vercel (Next.js UI)
    → Render Free (FastAPI + SQLite bootstrap)
    → Google Gemini (AI key free tier)
```

---

## F. Lệnh build local trước khi deploy

```bash
cd frontend-next
npm install
npm run build
```

Nếu `npm run build` fail — sửa trước khi push Vercel.
