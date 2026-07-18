"use client";
import React, { useMemo, useState } from "react";
import { Activity, ClipboardList, FlaskConical, Filter } from "lucide-react";

function parseProbeTitle(p) {
  if (p?.module_name) return p.module_name;
  if (p?.module_code) return p.module_code;
  const scenario = p?.scenario;
  if (!scenario) return "Kiểm chứng";
  try {
    const d = typeof scenario === "string" ? JSON.parse(scenario) : scenario;
    return d?.ten_bai_tap || d?.name || "Kiểm chứng";
  } catch {
    return String(scenario).slice(0, 80);
  }
}

function probeTone(p) {
  if (p?.is_demo) return "info";
  if (p?.status === "Bỏ qua") return "info";
  if (p?.status === "Chờ kiểm tra") return "warn";
  const r = p?.rubric_score != null ? Number(p.rubric_score) : Number(p?.cars_mapped);
  if (!Number.isFinite(r)) return "info";
  if (r >= 3) return "danger";
  if (r >= 2) return "warn";
  return "ok";
}

function probeMeta(p) {
  if (p?.is_demo) return "DEMO";
  if (p?.status === "Bỏ qua") return "Bỏ qua";
  if (p?.status === "Chờ kiểm tra") return "Chờ";
  if (p?.rubric_score != null) return `Rubric ${p.rubric_score}/4`;
  if (p?.cars_mapped != null) return `${Number(p.cars_mapped).toFixed(1)}/4`;
  return p?.status || "—";
}

function probeDetail(p) {
  const axis = p?.axis_label || p?.category || "";
  const notes = (p?.teacher_notes || "").slice(0, 100);
  if (p?.status === "Chờ kiểm tra") return `Chờ thực hiện${axis ? ` · ${axis}` : ""}`;
  if (p?.status === "Bỏ qua") return `Đã bỏ qua${axis ? ` · ${axis}` : ""}`;
  const base = p?.scored ? "Đã chấm" : (p?.status || "Hoàn thành");
  return `${base}${axis ? ` · ${axis}` : ""}${notes ? ` · ${notes}${notes.length >= 100 ? "…" : ""}` : ""}`;
}

export default function ClinicalTimeline({ dashboardData }) {
  const [filter, setFilter] = useState("all"); // all | log | survey | probe

  const events = useMemo(() => {
    const items = [];
    const logs = dashboardData?.history_logs || [];
    logs.forEach((log) => {
      const parsed = log.parsed_json || {};
      const score = parsed.diem_nguy_co;
      const failed = parsed.analysis_failed;
      const pending = parsed.pending_confirmation && !parsed.teacher_confirmed;
      const placeholder = parsed.is_placeholder || parsed.source === "import_placeholder";
      if (placeholder) return; // ẩn placeholder import
      items.push({
        id: `log-${log.id}`,
        type: "log",
        date: log.date || "",
        title: failed
          ? "Phân tích AI (lỗi)"
          : pending
            ? "Nháp quan sát — chờ xác nhận"
            : "Nhật ký quan sát",
        detail: (log.raw_text || "").slice(0, 160) + ((log.raw_text || "").length > 160 ? "…" : ""),
        meta: failed
          ? "Không chấm"
          : pending
            ? "Nháp"
            : score != null
              ? `Mức ${Number(score).toFixed(1)}/4`
              : null,
        tone: failed || pending ? "warn" : score >= 3 ? "danger" : score >= 2 ? "warn" : "ok",
        sortKey: log.id || 0,
      });
    });

    const pending = dashboardData?.pending_probes || [];
    pending.forEach((p) => {
      items.push({
        id: `probe-p-${p.id}`,
        type: "probe",
        date: p.date || "",
        title: parseProbeTitle(p),
        detail: probeDetail(p),
        meta: "Chờ",
        tone: "warn",
        sortKey: p.id || 0,
      });
    });

    const history = dashboardData?.history_probes || [];
    history.forEach((h) => {
      items.push({
        id: `probe-h-${h.id}`,
        type: "probe",
        date: h.date || "",
        title: parseProbeTitle(h),
        detail: probeDetail(h),
        meta: probeMeta(h),
        tone: probeTone(h),
        sortKey: h.id || 0,
      });
    });

    const radar = dashboardData?.radar_data;
    const rp = dashboardData?.risk_profile;
    if (radar && (rp?.parent_n > 0 || rp?.avg_parent_score != null)) {
      items.push({
        id: "survey-latest",
        type: "survey",
        date: "",
        title: "Khảo sát phụ huynh (mới nhất)",
        detail: `Giao tiếp ${radar.social ?? "—"} · Hành vi ${radar.routine ?? "—"} · Tập trung ${radar.attention ?? "—"}`,
        meta: "PH 30%",
        tone: "info",
        sortKey: 999999,
      });
    }

    return items.sort((a, b) => b.sortKey - a.sortKey);
  }, [dashboardData]);

  const filtered = events.filter((e) => filter === "all" || e.type === filter);

  const iconOf = (type) => {
    if (type === "log") return Activity;
    if (type === "survey") return ClipboardList;
    return FlaskConical;
  };

  return (
    <div className="timeline-panel animate-fade-in">
      <div className="timeline-header">
        <div>
          <h3 className="timeline-title">Nhật ký sự kiện</h3>
          <p className="timeline-sub">Quan sát · Kiểm chứng · Khảo sát</p>
        </div>
        <div className="timeline-filters">
          <Filter size={14} />
          {[
            { id: "all", label: "Tất cả" },
            { id: "log", label: "Hành vi" },
            { id: "probe", label: "Probe" },
            { id: "survey", label: "PH" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              className={`timeline-filter-btn ${filter === f.id ? "active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="timeline-track">
        {filtered.length === 0 ? (
          <div className="timeline-empty">Chưa có sự kiện — hãy ghi nhận hành vi hoặc chạy probe.</div>
        ) : (
          filtered.map((ev) => {
            const Icon = iconOf(ev.type);
            return (
              <div key={ev.id} className={`timeline-item tone-${ev.tone}`}>
                <div className="timeline-dot">
                  <Icon size={13} />
                </div>
                <div className="timeline-body">
                  <div className="timeline-row">
                    <strong>{ev.title}</strong>
                    {ev.meta ? <span className="timeline-meta">{ev.meta}</span> : null}
                  </div>
                  {ev.date ? <div className="timeline-date">{ev.date}</div> : null}
                  <p className="timeline-detail">{ev.detail}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
