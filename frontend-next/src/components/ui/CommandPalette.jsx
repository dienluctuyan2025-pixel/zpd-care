"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Search, User, Activity, BarChart2, Stethoscope, LogOut, Info, Home, Moon, Phone } from "lucide-react";

export default function CommandPalette({
  open,
  onClose,
  students = [],
  onSelectStudent,
  onNavigate,
  onLogout,
  onToggleTheme,
}) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const actions = useMemo(() => {
    const base = [
      { id: "tab-behavior", label: "Tab: Quan sát hành vi", icon: Activity, run: () => onNavigate("behavior") },
      { id: "tab-radar", label: "Tab: Hồ sơ & ZPD", icon: BarChart2, run: () => onNavigate("radar") },
      { id: "tab-probes", label: "Tab: Kiểm chứng", icon: Stethoscope, run: () => onNavigate("probes") },
      { id: "tab-survey", label: "Tab: Khảo sát PH (GV nhập)", icon: Phone, run: () => onNavigate("survey") },
      { id: "page-home", label: "Về bảng làm việc", icon: Home, run: () => onNavigate("dashboard") },
      { id: "page-about", label: "Cơ sở khoa học", icon: Info, run: () => onNavigate("about") },
      ...(onToggleTheme
        ? [{ id: "theme", label: "Đổi sáng / tối", icon: Moon, run: () => onToggleTheme() }]
        : []),
      { id: "logout", label: "Đăng xuất", icon: LogOut, run: () => onLogout() },
    ];
    const hs = students.map((s) => ({
      id: `st-${s.id}`,
      label: `#${String(s.id).padStart(4, "0")} — ${s.name} (${s.class_name})`,
      icon: User,
      run: () => onSelectStudent(s.id),
      score: s.cached_risk_score,
      color: s.cached_risk_color,
    }));
    return [...hs, ...base];
  }, [students, onNavigate, onSelectStudent, onLogout, onToggleTheme]);

  const filtered = actions.filter((a) =>
    a.label.toLowerCase().includes(q.trim().toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk-panel animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="cmdk-input-row">
          <Search size={18} />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm học sinh, tab, lệnh… (Esc để đóng)"
          />
          <kbd className="cmdk-kbd">Ctrl+K</kbd>
        </div>
        <div className="cmdk-list">
          {filtered.length === 0 && (
            <div className="cmdk-empty">Không có kết quả</div>
          )}
          {filtered.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                type="button"
                className="cmdk-item"
                onClick={() => {
                  a.run();
                  onClose();
                }}
              >
                <Icon size={16} />
                <span className="cmdk-item-label">{a.label}</span>
                {a.score != null && (
                  <span className={`risk-pill risk-${a.color || "green"}`}>
                    {Number(a.score).toFixed(1)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
