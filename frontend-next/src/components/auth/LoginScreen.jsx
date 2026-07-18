"use client";
import React, { useState } from 'react';
import { loginRequest, clearSession } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';

const DEMO = [
  { user: 'expert', pass: 'expert123', role: 'Giáo viên', desc: 'Toàn bộ học sinh' },
  { user: 'admin', pass: 'admin123', role: 'Quản trị', desc: 'Hệ thống' },
];

export default function LoginScreen({ onSuccess }) {
  const [username, setUsername] = useState('expert');
  const [password, setPassword] = useState('expert123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await loginRequest(username.trim(), password);
      if (data?.user?.role === 'parent') {
        clearSession();
        const msg = 'Hệ thống dành cho giáo viên. Phụ huynh trả lời khảo sát qua cô giáo.';
        setError(msg);
        toastError(msg);
        return;
      }
      toastSuccess('Đăng nhập thành công');
      onSuccess(data.user);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Đăng nhập thất bại. Kiểm tra backend :8000.';
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sci-login sci-login-v2">
      <div className="sci-login-shell">
        <aside className="sci-login-hero">
          <div className="sci-login-hero-badge">ZPD Care</div>
          <h1>Công cụ của<br />giáo viên mầm non</h1>
          <p>
            Theo dõi hành vi, nhập khảo sát phụ huynh (do cô thu thập), kiểm chứng module
            và can thiệp ZPD — một tài khoản giáo viên là đủ.
          </p>
          <ul className="sci-login-points">
            <li>Quan sát AI có xác nhận giáo viên</li>
            <li>Khảo sát PH do cô nhập hộ sau khi liên hệ</li>
            <li>Catalog kiểm chứng + rubric 1–4</li>
          </ul>
        </aside>

        <div className="sci-login-card">
          <div className="sci-login-head">
            <div className="sci-login-mark">ZPD</div>
            <h2>Đăng nhập giáo viên</h2>
            <p>Phụ huynh không cần tài khoản web — trả lời qua cô giáo</p>
          </div>

          <div className="sci-login-note">
            Chỉ mang tính hỗ trợ giáo dục. Không dùng để chẩn đoán y khoa.
          </div>

          <form onSubmit={handleSubmit} className="sci-login-form">
            <label>
              Tên đăng nhập
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
            </label>
            <label>
              Mật khẩu
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </label>
            {error ? <div className="sci-login-error">{error}</div> : null}
            <button type="submit" className="sci-btn primary block" disabled={loading}>
              {loading ? 'Đang xác thực…' : 'Vào bảng làm việc'}
            </button>
          </form>

          <div className="sci-login-demo">
            <div className="sci-section-label">Tài khoản demo</div>
            <div className="sci-demo-grid">
              {DEMO.map((a) => (
                <button key={a.user} type="button" onClick={() => { setUsername(a.user); setPassword(a.pass); setError(''); }}>
                  <strong>{a.user}</strong>
                  <span>{a.role} · {a.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
