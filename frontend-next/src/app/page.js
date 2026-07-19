"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  User, ShieldCheck, Activity, BarChart2, Stethoscope,
  LogOut, Info, Search, Moon, Sun, LayoutList, Phone, ArrowUpDown, Menu, X
} from 'lucide-react';
import LoginScreen from '@/components/auth/LoginScreen';
import ToastHost from '@/components/ui/ToastHost';
import CommandPalette from '@/components/ui/CommandPalette';
import ClinicalTimeline from '@/components/ui/ClinicalTimeline';
import { api, getToken, getStoredUser, clearSession } from '@/lib/api';
import { toastSuccess, toastError, toastWarn } from '@/lib/toast';

const BehaviorTab = dynamic(() => import('@/components/dashboard/BehaviorTab'), { ssr: false, loading: () => <TabLoading /> });
const RadarTab = dynamic(() => import('@/components/dashboard/RadarTab'), { ssr: false, loading: () => <TabLoading /> });
const ProbesTab = dynamic(() => import('@/components/dashboard/ProbesTab'), { ssr: false, loading: () => <TabLoading /> });
const ParentPortalTab = dynamic(() => import('@/components/dashboard/ParentPortalTab'), { ssr: false, loading: () => <TabLoading /> });
const AboutProject = dynamic(() => import('@/components/dashboard/AboutProject'), { ssr: false, loading: () => <TabLoading /> });
const ChatWidget = dynamic(() => import('@/components/chat/ChatWidget'), { ssr: false });

function TabLoading() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="sci-loading" style={{ minHeight: 200, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="skeleton skeleton-line" style={{ width: '40%' }} />
      <div className="skeleton skeleton-card" style={{ height: 100 }} />
      {slow && (
        <p style={{ color: '#af5b3f', fontSize: 13, textAlign: 'center', opacity: 0.8, marginTop: 12 }}>
          Đang đánh thức máy chủ API (có thể mất 1-2 phút do chế độ ngủ của Cloud)...
        </p>
      )}
    </div>
  );
}

function riskColorOf(s) {
  if (!s) return 'green';
  if (s.cached_risk_color) return s.cached_risk_color;
  const sc = Number(s.cached_risk_score);
  if (Number.isNaN(sc) || sc < 2) return 'green';
  if (sc <= 2.9) return 'yellow';
  if (sc <= 3.6) return 'orange';
  return 'red';
}

function riskLabel(color) {
  const map = {
    green: 'Mức 1 · An toàn',
    yellow: 'Mức 2 · Theo dõi',
    orange: 'Mức 3 · Đáng kể',
    red: 'Mức 4 · Báo động',
    blue: 'Mức 1 · An toàn',
  };
  return map[color] || color;
}

function riskLevelShort(color, score) {
  const sc = Number(score);
  if (!Number.isNaN(sc)) {
    if (sc < 2) return 'L1';
    if (sc <= 2.9) return 'L2';
    if (sc <= 3.6) return 'L3';
    return 'L4';
  }
  const map = { green: 'L1', blue: 'L1', yellow: 'L2', orange: 'L3', red: 'L4' };
  return map[color] || '—';
}

function riskBarPct(score) {
  const sc = Number(score);
  if (Number.isNaN(sc)) return 8;
  return Math.max(8, Math.min(100, ((sc - 1) / 3) * 100));
}

function isFemaleGender(gender) {
  const g = String(gender || '').toLowerCase().normalize('NFC');
  return g.includes('nữ') || g.includes('nu') || g === 'f' || g === 'female';
}

/** Avatar MN kawaii — bé trai (flat colors, no shared gradient IDs) */
function IconBoy({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <ellipse cx="32" cy="58" rx="16" ry="3.5" fill="#0EA5E9" opacity="0.12" />
      <path d="M16 58c2.2-11 8.5-17 16-17s13.8 6 16 17" fill="#38BDF8" />
      <path d="M18 56c1.6-8 7-12.5 14-12.5S46.4 48 48 56" fill="#7DD3FC" opacity="0.55" />
      <path d="M22 46.5h20" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.65" />
      <circle cx="17.5" cy="30" r="3.2" fill="#F5C89A" />
      <circle cx="46.5" cy="30" r="3.2" fill="#F5C89A" />
      <circle cx="32" cy="29" r="14.5" fill="#FFE0C2" />
      <circle cx="32" cy="31" r="13" fill="#FFD7B0" opacity="0.35" />
      <path d="M17.5 28c.8-12 7.2-18 14.5-18S46.8 16 47.5 28c-3.5-5.5-8.2-8.2-15.5-8.2S21 22.5 17.5 28z" fill="#4A2F22" />
      <path d="M19 24c2.5-5 7-8 13-8s10.5 3 13 8c-3-3.8-7.2-5.5-13-5.5S22 20.2 19 24z" fill="#3D2418" />
      <ellipse cx="26.2" cy="29.5" rx="2.15" ry="2.7" fill="#1E293B" />
      <ellipse cx="37.8" cy="29.5" rx="2.15" ry="2.7" fill="#1E293B" />
      <circle cx="26.9" cy="28.6" r="0.75" fill="#fff" />
      <circle cx="38.5" cy="28.6" r="0.75" fill="#fff" />
      <path d="M23.5 25.2c1.4-.9 3.2-.9 4.4 0" stroke="#3D2418" strokeWidth="1.25" strokeLinecap="round" opacity="0.5" />
      <path d="M36.1 25.2c1.4-.9 3.2-.9 4.4 0" stroke="#3D2418" strokeWidth="1.25" strokeLinecap="round" opacity="0.5" />
      <ellipse cx="22.5" cy="33.6" rx="2.9" ry="1.65" fill="#FB7185" opacity="0.38" />
      <ellipse cx="41.5" cy="33.6" rx="2.9" ry="1.65" fill="#FB7185" opacity="0.38" />
      <path d="M28.2 35.8c1.6 2.2 6 2.2 7.6 0" stroke="#B45309" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

/** Avatar MN kawaii — bé gái */
function IconGirl({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <ellipse cx="32" cy="58" rx="16" ry="3.5" fill="#F97316" opacity="0.12" />
      <path d="M16 58c2.2-11 8.5-17 16-17s13.8 6 16 17" fill="#FB923C" />
      <path d="M18 56c1.6-8 7-12.5 14-12.5S46.4 48 48 56" fill="#FDBA74" opacity="0.55" />
      <circle cx="32" cy="48" r="2.3" fill="#fff" opacity="0.75" />
      <ellipse cx="13" cy="30" rx="5.2" ry="7.2" fill="#6B4226" />
      <circle cx="12.2" cy="37.5" r="3.4" fill="#5C3A1E" />
      <ellipse cx="51" cy="30" rx="5.2" ry="7.2" fill="#6B4226" />
      <circle cx="51.8" cy="37.5" r="3.4" fill="#5C3A1E" />
      <circle cx="13" cy="25.5" r="2.15" fill="#FB7185" />
      <circle cx="51" cy="25.5" r="2.15" fill="#FB7185" />
      <circle cx="18" cy="30.5" r="2.8" fill="#F8C9A8" />
      <circle cx="46" cy="30.5" r="2.8" fill="#F8C9A8" />
      <circle cx="32" cy="29.5" r="14.2" fill="#FFE4CC" />
      <circle cx="32" cy="31.5" r="12.5" fill="#FFD7B0" opacity="0.35" />
      <path d="M18 28c1-12 7-18.5 14-18.5S45 16 46 28c-3.2-5.8-8-8.8-14-8.8S21.2 22.2 18 28z" fill="#6B4226" />
      <path d="M20 24c2.2-5 6.5-8 12-8s9.8 3 12 8c-2.8-3.6-6.8-5.2-12-5.2S22.8 20.4 20 24z" fill="#5C3A1E" />
      <path d="M26.5 9.5c-3.2-3.5-7.2-2.2-7.5.9-.2 2.2 1.8 3.4 4.5 3" fill="#FDA4AF" />
      <path d="M37.5 9.5c3.2-3.5 7.2-2.2 7.5.9.2 2.2-1.8 3.4-4.5 3" fill="#FDA4AF" />
      <circle cx="32" cy="11" r="2.45" fill="#FB7185" />
      <circle cx="32" cy="11" r="1" fill="#FECDD3" />
      <path d="M24.2 28.8c1.1-1.6 3.2-1.7 4.2 0" stroke="#1E293B" strokeWidth="2.05" strokeLinecap="round" />
      <path d="M35.6 28.8c1.1-1.6 3.2-1.7 4.2 0" stroke="#1E293B" strokeWidth="2.05" strokeLinecap="round" />
      <ellipse cx="22.8" cy="34" rx="3.1" ry="1.75" fill="#FB7185" opacity="0.42" />
      <ellipse cx="41.2" cy="34" rx="3.1" ry="1.75" fill="#FB7185" opacity="0.42" />
      <path d="M28.5 36.2c1.5 2 5.5 2 7 0" stroke="#B45309" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

export default function Home() {
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingList, setFetchingList] = useState(true);
  const [schoolStats, setSchoolStats] = useState(null);
  const [activeTab, setActiveTab] = useState('behavior');
  const [activePage, setActivePage] = useState('dashboard');
  const [connError, setConnError] = useState('');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentSort, setStudentSort] = useState('risk'); // risk | name | class
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const abortControllerRef = useRef(null);

  useEffect(() => {
    try {
      const token = getToken();
      const user = getStoredUser();
      // Chỉ giáo viên / admin — không dùng cổng PH
      if (token && user && user.role !== 'parent') setAuthUser(user);
      else if (user?.role === 'parent') {
        clearSession();
      }
      const dm = localStorage.getItem('zpd_dark') === '1';
      setDarkMode(dm);
      document.documentElement.setAttribute('data-theme', dm ? 'dark' : 'light');
      document.documentElement.style.colorScheme = dm ? 'dark' : 'light';
      document.documentElement.setAttribute('data-density', 'clinical');
    } catch (e) {
      console.error(e);
    }
    setAuthReady(true);

    const onExpired = () => {
      setAuthUser(null);
      setStudents([]);
      setDashboardData(null);
      toastWarn('Phiên đăng nhập hết hạn');
    };
    window.addEventListener('zpd-auth-expired', onExpired);
    return () => window.removeEventListener('zpd-auth-expired', onExpired);
  }, []);

  useEffect(() => {
    if (!authUser) return;
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setCmdOpen((v) => !v);
        return;
      }
      if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA' || e.target?.isContentEditable) return;
      if (e.key === '1') setActiveTab('behavior');
      if (e.key === '2') setActiveTab('radar');
      if (e.key === '3') setActiveTab('probes');
      if (e.key === '4') setActiveTab('survey');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [authUser]);

  const handleLogout = () => {
    clearSession();
    setAuthUser(null);
    setStudents([]);
    setDashboardData(null);
    setSchoolStats(null);
    toastSuccess('Đã đăng xuất');
  };

  const toggleDark = () => {
    setDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('zpd_dark', next ? '1' : '0');
        document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
        document.documentElement.style.colorScheme = next ? 'dark' : 'light';
      } catch { /* ignore */ }
      return next;
    });
  };

  const loadDashboard = useCallback((studentId, isRefresh) => {
    if (!studentId) return;
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    if (!isRefresh) setLoading(true);

    // POST ensure-probes (ghi DB) rồi GET dashboard (chỉ đọc)
    api.post(`/students/${studentId}/ensure-probes`, null, { signal: controller.signal })
      .catch(() => { /* ensure best-effort */ })
      .then(() => api.get(`/students/${studentId}/dashboard`, { signal: controller.signal }))
      .then(res => {
        if (res?.data) {
          setDashboardData(res.data);
          // Đồng bộ sidebar điểm + thống kê trường sau chấm/confirm
          if (isRefresh) {
            api.get('/students')
              .then((r) => setStudents(r.data || []))
              .catch(() => {});
            api.get('/school-dashboard')
              .then((r) => setSchoolStats(r.data))
              .catch(() => {});
          }
        }
      })
      .catch(err => {
        if (err?.code !== 'ERR_CANCELED') {
          console.error(err);
          setConnError(err?.response?.data?.detail || 'Không tải được hồ sơ');
          toastError('Không tải được hồ sơ học sinh');
        }
      })
      .finally(() => {
        if (abortControllerRef.current === controller) setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!authUser) return;
    if (authUser.role === 'parent') {
      clearSession();
      setAuthUser(null);
      toastWarn('Hệ thống dành cho giáo viên — PH trả lời khảo sát qua cô giáo');
      return;
    }
    setConnError('');
    setFetchingList(true);
    api.get('/students')
      .then(res => {
        const list = res.data || [];
        setStudents(list);
        if (list.length > 0) {
          setSelectedStudentId(list[0].id);
        }
        setActiveTab('behavior');
      })
      .catch(err => {
        console.error(err);
        setConnError(err?.response?.data?.detail || 'Không kết nối API');
      })
      .finally(() => {
        setFetchingList(false);
      });

    // refresh=1 lần đầu sau login để đồng bộ cache sau đổi thuật toán risk
    api.get('/school-dashboard', { params: { refresh: 1 } })
      .then(res => setSchoolStats(res.data))
      .catch(() => setSchoolStats(null));
  }, [authUser]);

  useEffect(() => {
    if (selectedStudentId && authUser) loadDashboard(selectedStudentId, false);
  }, [selectedStudentId, authUser, loadDashboard]);

  const handleCmdNavigate = (key) => {
    if (key === 'behavior' || key === 'radar' || key === 'probes' || key === 'survey') {
      setActivePage('dashboard');
      setActiveTab(key);
    } else if (key === 'dashboard') {
      setActivePage('dashboard');
    } else if (key === 'about') {
      setActivePage('about');
    }
  };

  if (!authReady) {
    return <div className="sci-boot">Đang khởi tạo…</div>;
  }

  if (!authUser) {
    return (
      <>
        <ToastHost />
        <LoginScreen onSuccess={(user) => {
          if (user?.role === 'parent') {
            toastWarn('Hệ thống dành cho giáo viên');
            return;
          }
          setAuthUser(user);
        }} />
      </>
    );
  }

  if (connError && !students.length) {
    return (
      <>
        <ToastHost />
        <div className="sci-boot">
          <p className="sci-error-text">{connError}</p>
          <button type="button" className="sci-btn primary" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </>
    );
  }

  if (fetchingList) {
    return (
      <>
        <ToastHost />
        <TabLoading />
      </>
    );
  }

  if (!students.length) {
    return (
      <>
        <ToastHost />
        <div className="sci-boot" style={{ flexDirection: 'column', gap: 12, textAlign: 'center', padding: 24 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>Chưa có học sinh trong hệ thống</p>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.75, maxWidth: 360 }}>
            Import danh sách từ Excel (backend) hoặc kiểm tra kết nối API :8000.
          </p>
          <button type="button" className="sci-btn primary" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </>
    );
  }

  const selected = students.find(s => s.id === selectedStudentId);
  const rp = dashboardData?.risk_profile;
  const riskColor = rp?.color || riskColorOf(selected);

  const filteredStudents = (() => {
    const q = studentQuery.trim().toLowerCase();
    let list = !q
      ? [...students]
      : students.filter((s) => {
          const blob = `${s.name || ''} ${s.class_name || ''} ${s.id}`.toLowerCase();
          return blob.includes(q);
        });
    list.sort((a, b) => {
      if (studentSort === 'name') {
        return String(a.name || '').localeCompare(String(b.name || ''), 'vi');
      }
      if (studentSort === 'class') {
        const c = String(a.class_name || '').localeCompare(String(b.class_name || ''), 'vi');
        if (c !== 0) return c;
        return String(a.name || '').localeCompare(String(b.name || ''), 'vi');
      }
      // risk desc (alerts first), then name
      const ra = Number(a.cached_risk_score);
      const rb = Number(b.cached_risk_score);
      const sa = Number.isNaN(ra) ? -1 : ra;
      const sb = Number.isNaN(rb) ? -1 : rb;
      if (sb !== sa) return sb - sa;
      return String(a.name || '').localeCompare(String(b.name || ''), 'vi');
    });
    return list;
  })();

  const alertCount = students.filter((s) => Number(s.cached_risk_score) >= 2).length;

  return (
    <div className="app-container sci-shell">
      <style dangerouslySetInnerHTML={{ __html: `
        /* ===== Brand header (stack: logo + full text, no clip) ===== */
        aside.sci-sidebar .zpd-brand,
        .zpd-brand{
          display:flex!important;flex-direction:column!important;align-items:stretch!important;
          gap:12px!important;padding:16px 14px 18px!important;position:relative!important;
          background:linear-gradient(180deg,rgba(0,0,0,.22),rgba(0,0,0,.08))!important;
          border-bottom:1px solid rgba(240,244,248,.1)!important;
        }
        .zpd-brand::after{
          content:"";position:absolute;left:14px;right:14px;bottom:0;height:2px;
          border-radius:2px;background:linear-gradient(90deg,#ba370a 0%,rgba(175,91,63,.55) 42%,transparent 100%);
          opacity:.9;
        }
        aside.sci-sidebar .zpd-brand-mark,
        .zpd-brand-mark{
          flex:0 0 auto!important;width:88px!important;height:88px!important;
          min-width:88px!important;min-height:88px!important;align-self:flex-start!important;
          border-radius:20px!important;padding:4px!important;
          background:linear-gradient(145deg,rgba(240,244,248,.35),rgba(186,55,10,.55))!important;
          box-shadow:0 10px 24px rgba(0,0,0,.32)!important;
          box-sizing:border-box!important;
        }
        aside.sci-sidebar .zpd-brand-mark .sci-brand-logo,
        aside.sci-sidebar .zpd-brand .sci-brand-logo,
        .zpd-brand-mark .sci-brand-logo,
        .zpd-brand .sci-brand-logo{
          width:100%!important;height:100%!important;
          min-width:0!important;min-height:0!important;
          max-width:none!important;max-height:none!important;
          display:block!important;
          border-radius:16px!important;object-fit:contain!important;
          border:none!important;
          box-shadow:none!important;background:transparent!important;
        }
        .zpd-brand-text{min-width:0;width:100%;flex:none}
        .zpd-brand-row{
          display:flex;align-items:center;gap:8px;min-width:0;flex-wrap:nowrap;
        }
        aside.sci-sidebar .zpd-brand .sci-brand-name,
        .zpd-brand .sci-brand-name{
          font-size:20px!important;font-weight:800!important;letter-spacing:-.03em!important;
          color:#fff!important;line-height:1.2!important;
          white-space:nowrap!important;overflow:visible!important;text-overflow:clip!important;
        }
        .zpd-brand-badge{
          flex-shrink:0;font-size:10px;font-weight:900;letter-spacing:.08em;
          padding:4px 7px;border-radius:7px;line-height:1;
          color:#fdece6;background:rgba(186,55,10,.35);
          border:1px solid rgba(186,55,10,.55);
        }
        aside.sci-sidebar .zpd-brand .sci-brand-tag,
        .zpd-brand .sci-brand-tag{
          margin-top:5px!important;font-size:12px!important;font-weight:600!important;
          color:#c4b0a6!important;letter-spacing:.01em!important;line-height:1.4!important;
          white-space:normal!important;overflow:visible!important;text-overflow:clip!important;
          word-break:keep-all!important;
        }

        .zpd-hs-list{display:flex;flex-direction:column;gap:6px;padding:0 8px 10px;overflow-y:auto;flex:1;min-height:0}
        .zpd-hs-item{
          display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;
          min-height:58px;padding:10px 10px 10px 14px;margin:0;border:0;border-radius:14px;
          border:1px solid rgba(240,244,248,.14);background:rgba(240,244,248,.07);
          cursor:pointer;color:#fff;font:inherit;text-align:left;position:relative;
        }
        .zpd-hs-item.is-on{
          border-color:rgba(186,55,10,.55);
          background:linear-gradient(90deg,rgba(186,55,10,.32),rgba(19,59,92,.48));
          box-shadow:0 6px 18px rgba(0,0,0,.22);
        }
        .zpd-hs-item::before{
          content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;
          border-radius:0 3px 3px 0;background:#64748b;
        }
        .zpd-hs-item.r-green::before{background:#10b981}
        .zpd-hs-item.r-yellow::before{background:#f59e0b}
        .zpd-hs-item.r-orange::before{background:#f97316}
        .zpd-hs-item.r-red::before{background:#ef4444}
        .zpd-hs-av{
          flex:0 0 46px;width:46px;height:46px;border-radius:50%;
          display:inline-flex;align-items:center;justify-content:center;
          border:2px solid rgba(255,255,255,.2);
          background:linear-gradient(165deg,#ffffff 0%,#f0f4f8 100%);
          box-shadow:0 4px 12px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.7);
          user-select:none;overflow:hidden;
        }
        .zpd-hs-av svg{width:40px;height:40px;display:block}
        .zpd-hs-av.is-boy{
          background:linear-gradient(165deg,#eff6ff 0%,#dbeafe 55%,#bfdbfe 100%);
          border-color:rgba(96,165,250,.45);
        }
        .zpd-hs-av.is-girl{
          background:linear-gradient(165deg,#fff7ed 0%,#ffedd5 55%,#fed7aa 100%);
          border-color:rgba(251,146,60,.4);
        }
        .zpd-hs-av.r-green{box-shadow:0 0 0 2px rgba(16,185,129,.45),0 4px 12px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.7)}
        .zpd-hs-av.r-yellow{box-shadow:0 0 0 2px rgba(245,158,11,.5),0 4px 12px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.7)}
        .zpd-hs-av.r-orange{box-shadow:0 0 0 2px rgba(249,115,22,.5),0 4px 12px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.7)}
        .zpd-hs-av.r-red{box-shadow:0 0 0 2px rgba(239,68,68,.55),0 4px 12px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.7)}
        .zpd-hs-item.is-on .zpd-hs-av{
          box-shadow:0 0 0 2.5px rgba(186,55,10,.6),0 6px 16px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.8);
          transform:scale(1.05);
        }
        .zpd-hs-mid{flex:1 1 auto;min-width:0;overflow:hidden}
        .zpd-hs-name{
          display:block;color:#fff;font-family:"Segoe UI",Arial,sans-serif;
          font-size:13px;font-weight:700;line-height:1.35;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        }
        .zpd-hs-meta{
          display:block;margin-top:2px;color:#c9b0a4;font-family:"Segoe UI",Arial,sans-serif;
          font-size:11px;font-weight:600;line-height:1.3;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
        }
        .zpd-hs-right{flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
        .zpd-hs-lv{font-size:9px;font-weight:800;letter-spacing:.04em;padding:2px 6px;border-radius:4px;background:rgba(0,0,0,.22)}
        .zpd-hs-lv.r-green{color:#6ee7b7}.zpd-hs-lv.r-yellow{color:#fcd34d}
        .zpd-hs-lv.r-orange{color:#fdba74}.zpd-hs-lv.r-red{color:#fca5a5}
        .zpd-hs-sc{min-width:38px;text-align:center;font-size:12.5px;font-weight:800;padding:5px 8px;border-radius:8px;color:#fff}
        .zpd-hs-sc.r-green{background:linear-gradient(180deg,#10b981,#059669)}
        .zpd-hs-sc.r-yellow{background:linear-gradient(180deg,#fbbf24,#f59e0b);color:#1c1917}
        .zpd-hs-sc.r-orange{background:linear-gradient(180deg,#fb923c,#ea580c)}
        .zpd-hs-sc.r-red{background:linear-gradient(180deg,#f87171,#dc2626)}
      ` }} />
      <ToastHost />
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        students={students}
        onSelectStudent={(id) => setSelectedStudentId(id)}
        onNavigate={handleCmdNavigate}
        onLogout={handleLogout}
        onToggleTheme={toggleDark}
      />
      <div className={`mobile-overlay ${isMobileMenuOpen ? 'show' : ''}`} onClick={() => setIsMobileMenuOpen(false)}></div>
      <aside className={`sidebar sci-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sci-brand zpd-brand">
          <div
            className="zpd-brand-mark"
            style={{ width: 88, height: 88, minWidth: 88, minHeight: 88 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-zpd.svg"
              alt="ZPD Care"
              className="sci-brand-logo"
              width={80}
              height={80}
              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: 'transparent' }}
            />
          </div>
          <div className="zpd-brand-text">
            <div className="zpd-brand-row">
              <span className="sci-brand-name">ZPD Care</span>
              <span className="zpd-brand-badge">GV</span>
            </div>
            <div className="sci-brand-tag">Sàng lọc hành vi · Mầm non</div>
          </div>
        </div>

        <nav className="sci-nav">
          <button type="button" className={activePage === 'dashboard' ? 'active' : ''} onClick={() => setActivePage('dashboard')}>
            <User size={15} /> Hồ sơ làm việc
          </button>
          <button type="button" className={activePage === 'about' ? 'active' : ''} onClick={() => setActivePage('about')}>
            <Info size={15} /> Giới thiệu dự án
          </button>
          <button type="button" onClick={() => setCmdOpen(true)}>
            <Search size={15} /> Tìm kiếm
            <kbd className="sci-kbd">Ctrl+K</kbd>
          </button>
        </nav>

        <div className="sci-student-block">
          <div className="sci-section-label">
            <span>Học sinh</span>
            <span className="sci-count-pill">{students.length}</span>
          </div>

          <div className="sci-student-toolbar">
            <div className="sci-student-search">
              <Search size={13} />
              <input
                type="search"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                placeholder="Tìm tên, lớp, mã…"
                aria-label="Tìm học sinh"
              />
            </div>
            <button
              type="button"
              className="sci-student-sort"
              title="Đổi cách sắp xếp"
              onClick={() => setStudentSort((prev) => (prev === 'risk' ? 'name' : prev === 'name' ? 'class' : 'risk'))}
            >
              <ArrowUpDown size={13} />
              {studentSort === 'risk' ? 'Rủi ro' : studentSort === 'name' ? 'Tên' : 'Lớp'}
            </button>
          </div>

          {alertCount > 0 && (
            <div className="sci-student-alert-strip">
              <span className="dot" />
              {alertCount} HS cần theo dõi (CARS ≥ 2.0)
            </div>
          )}

          <div className="zpd-hs-list sci-student-list">
            {filteredStudents.length === 0 ? (
              <div className="sci-student-empty">Không khớp “{studentQuery}”</div>
            ) : (
              filteredStudents.map((s) => {
                const color = riskColorOf(s);
                const fullName = String(s?.name ?? '').trim() || 'Chưa có tên';
                const girl = isFemaleGender(s.gender);
                const score = s.cached_risk_score;
                const hasScore = score != null && !Number.isNaN(Number(score));
                const cls = s.class_name || '—';
                const idLabel = `#${String(s.id).padStart(3, '0')}`;
                const level = riskLevelShort(color, score);
                const scoreLabel = hasScore ? Number(score).toFixed(1) : '—';
                const on = selectedStudentId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`zpd-hs-item r-${color}${on ? ' is-on' : ''}`}
                    onClick={() => { setSelectedStudentId(s.id); setIsMobileMenuOpen(false); }}
                    title={`${fullName} · ${cls} · CARS ${scoreLabel}`}
                  >
                    <span
                      className={`zpd-hs-av r-${color} ${girl ? 'is-girl' : 'is-boy'}`}
                      aria-hidden
                      title={girl ? 'Bé gái' : 'Bé trai'}
                    >
                      {girl ? <IconGirl size={40} /> : <IconBoy size={40} />}
                    </span>
                    <span className="zpd-hs-mid">
                      <span className="zpd-hs-name">{fullName}</span>
                      <span className="zpd-hs-meta">{cls} · {idLabel}</span>
                    </span>
                    <span className="zpd-hs-right">
                      <span className={`zpd-hs-lv r-${color}`}>{level}</span>
                      <span className={`zpd-hs-sc r-${color}`}>{scoreLabel}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {schoolStats && (
          <div className="sci-school-strip">
            <div className="sci-section-label">Phân bố rủi ro</div>
            <div className="sci-level-bars">
              {Object.entries(schoolStats.levels_count || {}).map(([k, v]) => {
                const total = schoolStats.total_students || 1;
                const pct = Math.round((v / total) * 100);
                const level = k.includes('1') ? 'green' : k.includes('2') ? 'yellow' : k.includes('3') ? 'orange' : 'red';
                return (
                  <div key={k} className="sci-level-row">
                    <span>{k.replace('Level ', 'L').replace(/ \(.*\)/, '')}</span>
                    <div className="sci-level-track"><div className={`sci-level-fill ${level}`} style={{ width: `${Math.max(pct, v > 0 ? 8 : 0)}%` }} /></div>
                    <strong>{v}</strong>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="sci-user-footer">
          <div className="sci-user-avatar-circle">
            {(authUser.full_name || authUser.username || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="sci-user-info">
            <div className="sci-user-name" title={authUser.full_name || authUser.username}>
              {authUser.full_name || authUser.username}
            </div>
            <div className="sci-user-role">
              {authUser.role === 'admin' ? 'Quản trị' : 'Giáo viên'}
            </div>
          </div>
          <button type="button" className="sci-icon-btn sci-logout-btn" onClick={handleLogout} title="Đăng xuất">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      <div className="main-wrapper sci-main">
        <header className="sci-topbar">
          <div className="sci-topbar-left">
            <button className="sci-mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={18} />
            </button>
            <div className="sci-breadcrumb">
              <span className="sci-topbar-title">Bảng làm việc GV</span>
              {selected && (
                <>
                  <span className="sci-topbar-sep">/</span>
                  <span className="sci-topbar-context">{selected.name}</span>
                </>
              )}
            </div>
          </div>
          <div className="sci-topbar-right">
            <span className="sci-version-badge" title="Teacher-only workspace">UI 5.5</span>
            <button type="button" className="sci-search-chip" onClick={() => setCmdOpen(true)}>
              <Search size={14} />
              <span>Tìm học sinh, lệnh…</span>
              <kbd>Ctrl+K</kbd>
            </button>
            <button type="button" className="sci-icon-btn" onClick={toggleDark} title="Sáng / tối">
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              className={`sci-icon-btn ${showTimeline ? 'active' : ''}`}
              onClick={() => setShowTimeline((v) => !v)}
              title="Timeline"
            >
              <LayoutList size={15} />
            </button>
          </div>
        </header>

        <div className="sci-disclaimer" role="note">
          <ShieldCheck size={14} />
          <span>Công cụ hỗ trợ <strong>sàng lọc giáo dục</strong> — không thay thế chẩn đoán y khoa hay tâm lý lâm sàng.</span>
        </div>

        <main className="content-area sci-content">
          {activePage === 'about' ? (
            <AboutProject onBack={() => setActivePage('dashboard')} />
          ) : loading ? (
            <TabLoading />
          ) : !dashboardData ? (
            <div className="sci-error-text">Không tải được hồ sơ. {connError}</div>
          ) : (
            <>
              <section className={`sci-summary-bar risk-${riskColor}`}>
                <div className="sci-summary-identity">
                  <div className={`sci-patient-avatar ${riskColor}`}>
                    {(dashboardData.student_info.name || '?').charAt(0)}
                  </div>
                  <div>
                    <div className="sci-patient-name">{dashboardData.student_info.name}</div>
                    <div className="sci-summary-meta">
                      <span>#{String(dashboardData.student_info.id).padStart(4, '0')}</span>
                      <span className="dot">·</span>
                      <span>{dashboardData.student_info.class_name}</span>
                    </div>
                  </div>
                </div>

                {rp && (
                  <div className="sci-summary-sources">
                    <div className="sci-source-cell">
                      <span className="sci-source-label">Giáo viên 30%</span>
                      <strong>{Number(rp.avg_teacher_score ?? 0).toFixed(1)}</strong>
                    </div>
                    <div className="sci-source-cell">
                      <span className="sci-source-label">Phụ huynh 30%</span>
                      <strong>{Number(rp.avg_parent_score ?? 0).toFixed(1)}</strong>
                    </div>
                    <div className="sci-source-cell">
                      <span className="sci-source-label">Kiểm chứng 40%</span>
                      <strong>{Number(rp.avg_probe_score ?? 0).toFixed(1)}</strong>
                    </div>
                  </div>
                )}

                {rp && (() => {
                  const score = Number(rp.risk_score || 1);
                  const pct = Math.max(0, Math.min(100, ((score - 1) / 3) * 100));
                  const r = 36;
                  const c = 2 * Math.PI * r;
                  const offset = c * (1 - pct / 100);
                  return (
                    <div className={`sci-cars-hero ${riskColor}`} title="Chỉ số rủi ro quan sát (tham chiếu CARS-like 1–4)">
                      <div className="sci-cars-ring-wrap" aria-hidden>
                        <svg width="88" height="88" viewBox="0 0 88 88" className="sci-cars-ring">
                          <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="7" />
                          <circle
                            cx="44" cy="44" r={r} fill="none"
                            stroke="currentColor" strokeWidth="7" strokeLinecap="round"
                            strokeDasharray={c} strokeDashoffset={offset}
                            transform="rotate(-90 44 44)"
                            className="sci-cars-ring-progress"
                          />
                        </svg>
                        <div className="sci-cars-ring-center">
                          <strong>{score.toFixed(2)}</strong>
                          <span>CARS</span>
                        </div>
                      </div>
                      <div className="sci-cars-meta">
                        <div className="sci-cars-level">{riskLabel(riskColor)}</div>
                        <div className="sci-cars-scale">Thang quan sát 1.0 – 4.0</div>
                        <div className="sci-cars-hint">Chỉ số tổng hợp · sàng lọc</div>
                      </div>
                    </div>
                  );
                })()}
              </section>

              <div className="sci-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={activeTab === 'behavior'} className={activeTab === 'behavior' ? 'active' : ''} onClick={() => setActiveTab('behavior')}>
                  <Activity size={16} /> Quan sát
                </button>
                <button type="button" role="tab" aria-selected={activeTab === 'radar'} className={activeTab === 'radar' ? 'active' : ''} onClick={() => setActiveTab('radar')}>
                  <BarChart2 size={16} /> Hồ sơ & ZPD
                </button>
                <button type="button" role="tab" aria-selected={activeTab === 'probes'} className={activeTab === 'probes' ? 'active' : ''} onClick={() => setActiveTab('probes')}>
                  <Stethoscope size={16} /> Kiểm chứng
                </button>
                <button type="button" role="tab" aria-selected={activeTab === 'survey'} className={activeTab === 'survey' ? 'active' : ''} onClick={() => setActiveTab('survey')}>
                  <Phone size={16} /> Khảo sát PH
                </button>
              </div>

              <div className={`sci-workbench ${showTimeline ? 'split' : ''}`}>
                <div className="sci-workbench-main" key={activeTab}>
                  {activeTab === 'behavior' && (
                    <BehaviorTab
                      studentId={selectedStudentId}
                      dashboardData={dashboardData}
                      onRefresh={() => loadDashboard(selectedStudentId, true)}
                    />
                  )}
                  {activeTab === 'radar' && <RadarTab dashboardData={dashboardData} />}
                  {activeTab === 'probes' && (
                    <ProbesTab
                      dashboardData={dashboardData}
                      onRefresh={() => loadDashboard(selectedStudentId, true)}
                    />
                  )}
                  {activeTab === 'survey' && (
                    <ParentPortalTab
                      studentId={selectedStudentId}
                      studentName={dashboardData.student_info?.name}
                      onComplete={() => loadDashboard(selectedStudentId, true)}
                    />
                  )}
                </div>
                {showTimeline && (
                  <aside className="sci-workbench-side">
                    <ClinicalTimeline dashboardData={dashboardData} />
                  </aside>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {selectedStudentId ? (
        <ChatWidget
          studentId={selectedStudentId}
          studentName={selected?.name}
          riskScore={rp?.risk_score ?? selected?.cached_risk_score}
          riskStatus={rp?.status ?? selected?.cached_risk_status}
        />
      ) : null}
    </div>
  );
}
