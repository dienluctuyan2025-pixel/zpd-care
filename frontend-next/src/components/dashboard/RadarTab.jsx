"use client";
import React, { useMemo, useState } from 'react';
import {
  Download, ShieldCheck, Stethoscope, Target, CheckCircle,
  Activity, BarChart2, Sparkles, Users, Home, Info, Scale,
  FlaskConical, BookOpen, AlertTriangle, Layers, TrendingDown, TrendingUp
} from 'lucide-react';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine
} from 'recharts';
import { api } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';

const WEIGHTS = { teacher: 0.3, parent: 0.3, probe: 0.4 };

const LEVELS = [
  { max: 1.99, key: 'L1', label: 'An toàn', tone: 'green', color: '#059669', hint: 'Duy trì quan sát định kỳ' },
  { max: 2.9, key: 'L2', label: 'Theo dõi', tone: 'yellow', color: '#d97706', hint: 'Bổ sung quan sát + khảo sát PH' },
  { max: 3.6, key: 'L3', label: 'Đáng kể', tone: 'orange', color: '#ea580c', hint: 'Ưu tiên probe & hội chẩn sư phạm' },
  { max: 99, key: 'L4', label: 'Báo động', tone: 'red', color: '#dc2626', hint: 'Hội chẩn + định hướng chuyên môn ngoài' },
];

function levelOf(score) {
  const sc = Number(score);
  if (Number.isNaN(sc)) return LEVELS[0];
  return LEVELS.find((l) => sc <= l.max) || LEVELS[LEVELS.length - 1];
}

function fmt(n, digits = 2) {
  const v = Number(n);
  if (n == null || Number.isNaN(v)) return '—';
  return v.toFixed(digits);
}

function barPct(score) {
  const sc = Number(score);
  if (Number.isNaN(sc)) return 0;
  return Math.max(0, Math.min(100, ((sc - 1) / 3) * 100));
}

function CustomRadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  return (
    <div className="rz-tip">
      <strong>{p?.subject}</strong>
      <span>Chỉ số miền: <b>{fmt(p?.A, 2)}</b> / 4.0</span>
      <em>Thang CARS-like · nguồn khảo sát PH (nếu có)</em>
    </div>
  );
}

function CustomLineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rz-tip">
      <strong>{label}</strong>
      {payload.map((row) => (
        <span key={row.dataKey} style={{ color: row.color }}>
          {row.name}: <b>{fmt(row.value, 2)}</b>
        </span>
      ))}
      <em>Mô phỏng minh họa — không phải dự báo lâm sàng</em>
    </div>
  );
}

function RadarTab({ dashboardData }) {
  const [activeZpdTab, setActiveZpdTab] = useState('school');
  const {
    radar_data,
    risk_profile,
    predictive_data = [],
    student_info,
    history_logs = [],
    history_probes = [],
    pending_probes = [],
  } = dashboardData || {};

  const rp = risk_profile || {};
  const safeRadar = radar_data || { social: 1.0, routine: 1.0, attention: 1.0 };
  const radarSources = safeRadar.sources || {};
  const score = Number(rp.risk_score);
  const level = levelOf(score);
  const mainColor = level.color;

  const teacher = rp.avg_teacher_score;
  const parent = rp.avg_parent_score;
  const probe = rp.avg_probe_score;
  const probeN = rp.probe_n_used ?? rp.probe_n;
  const teacherN = rp.teacher_n;
  const parentN = rp.parent_n;

  const sources = useMemo(() => {
    const hasT = teacher != null && !Number.isNaN(Number(teacher));
    const hasP = parent != null && !Number.isNaN(Number(parent));
    const hasK = probe != null && !Number.isNaN(Number(probe));
    const filled = [hasT, hasP, hasK].filter(Boolean).length;
    return {
      hasT, hasP, hasK, filled,
      completeness: Math.round((filled / 3) * 100),
      logN: Array.isArray(history_logs) ? history_logs.length : 0,
      probeDone: Array.isArray(history_probes) ? history_probes.length : 0,
      probePending: Array.isArray(pending_probes) ? pending_probes.length : 0,
    };
  }, [teacher, parent, probe, history_logs, history_probes, pending_probes]);

  const radarSeries = [
    {
      subject: 'Giao tiếp',
      short: 'GT',
      A: Number(safeRadar.social) || 1,
      fullMark: 4,
      note: 'Tương tác xã hội / đáp ứng giao tiếp',
    },
    {
      subject: 'Hành vi',
      short: 'HV',
      A: Number(safeRadar.routine) || 1,
      fullMark: 4,
      note: 'Lặp lại · thói quen · điều hòa',
    },
    {
      subject: 'Tập trung',
      short: 'TT',
      A: Number(safeRadar.attention) || 1,
      fullMark: 4,
      note: 'Chú ý · duy trì nhiệm vụ',
    },
  ];

  const domainMax = radarSeries.reduce((m, d) => Math.max(m, d.A), 1);
  const focusDomain = radarSeries.find((d) => d.A === domainMax) || radarSeries[0];

  const pred = Array.isArray(predictive_data) ? predictive_data : [];
  const first = pred[0];
  const last = pred[pred.length - 1];
  const deltaWith = first && last ? Number(last.with_zpd) - Number(first.with_zpd) : null;
  const deltaWithout = first && last ? Number(last.without_zpd) - Number(first.without_zpd) : null;
  const gapEnd = last ? Number(last.without_zpd) - Number(last.with_zpd) : null;

  const exportPDF = async () => {
    try {
      const sid = dashboardData?.student_info?.id;
      if (!sid) return;
      const response = await api.get(`/students/${sid}/export-pdf`, { responseType: 'blob' });
      // Lấy tên file từ header nếu có
      let filename = `ZPD_HS${String(sid).padStart(3, '0')}_HoSo.pdf`;
      const cd = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition'];
      if (cd) {
        const m = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(cd);
        if (m?.[1]) {
          try {
            filename = decodeURIComponent(m[1].replace(/"/g, '').trim());
          } catch {
            filename = m[1].replace(/"/g, '').trim();
          }
        }
      } else {
        const nm = (dashboardData?.student_info?.name || 'HocSinh').replace(/[^\w\-]+/g, '_');
        filename = `ZPD_HS${String(sid).padStart(3, '0')}_${nm}.pdf`;
      }
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toastSuccess('Đã tải hồ sơ PDF sàng lọc');
    } catch (err) {
      console.error(err);
      toastError('Không xuất được PDF lúc này');
    }
  };

  const renderZpdSection = (block) => {
    if (!block) {
      return (
        <div className="rz-empty">
          <Info size={16} />
          Chưa có khuyến nghị cho nhóm này. Hoàn tất quan sát + xác nhận hồ sơ để sinh gợi ý ZPD.
        </div>
      );
    }
    if (typeof block === 'string' || Array.isArray(block)) {
      return <div className="rz-prose">{block}</div>;
    }

    const steps = Array.isArray(block.hanh_dong) ? block.hanh_dong : [];
    return (
      <div className="rz-zpd-grid">
        {block.phac_do_tham_chieu && (
          <article className="rz-zpd-card ref">
            <header>
              <BookOpen size={15} />
              <div>
                <span className="rz-kicker">Khung tham chiếu</span>
                <strong>Evidence-informed · giáo dục</strong>
              </div>
            </header>
            <p>{block.phac_do_tham_chieu}</p>
            <footer>
              Lấy cảm hứng phương pháp (TEACCH / ESDM / RBI / DIR…) — <b>không</b> tương đương phác đồ lâm sàng có license.
            </footer>
          </article>
        )}

        <article className="rz-zpd-card goal">
          <header>
            <Target size={15} />
            <div>
              <span className="rz-kicker">Mục tiêu ZPD</span>
              <strong>Trong vùng phát triển gần</strong>
            </div>
          </header>
          <p>{block.muc_tieu || '—'}</p>
        </article>

        <article className="rz-zpd-card acts">
          <header>
            <CheckCircle size={15} />
            <div>
              <span className="rz-kicker">Hành động gợi ý</span>
              <strong>{steps.length} bước có thể quan sát–đo được</strong>
            </div>
          </header>
          {steps.length === 0 ? (
            <div className="rz-empty soft">Chưa có hành động cụ thể.</div>
          ) : (
            <ol className="rz-steps">
              {steps.map((step, idx) => (
                <li key={idx}>
                  <span className="rz-step-n">{idx + 1}</span>
                  <div>
                    <p>{step}</p>
                    <em>Gợi ý thực hành lớp/nhà · GV điều chỉnh theo ngữ cảnh</em>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </article>

        {block.luu_y && (
          <article className="rz-zpd-card note">
            <header>
              <AlertTriangle size={15} />
              <div>
                <span className="rz-kicker">Lưu ý an toàn sư phạm</span>
                <strong>Tránh quá tải / phản ứng ngược</strong>
              </div>
            </header>
            <p>{block.luu_y}</p>
          </article>
        )}
      </div>
    );
  };

  const weightRows = [
    {
      key: 't',
      label: 'Giáo viên',
      sub: `Nhật ký đã xác nhận${teacherN != null ? ` · n=${teacherN}` : ''}`,
      w: WEIGHTS.teacher,
      val: teacher,
      ok: teacher != null && !Number.isNaN(Number(teacher)),
      icon: Users,
    },
    {
      key: 'p',
      label: 'Phụ huynh',
      sub: `Khảo sát PH (GV nhập hộ)${parentN != null ? ` · n=${parentN}` : ''}`,
      w: WEIGHTS.parent,
      val: parent,
      ok: parent != null && !Number.isNaN(Number(parent)),
      icon: Home,
    },
    {
      key: 'k',
      label: 'Kiểm chứng',
      sub: `Probe rubric 1–4${probeN != null ? ` · n=${probeN} (TB ≤3 lần gần)` : ''}`,
      w: WEIGHTS.probe,
      val: probe,
      ok: probe != null && !Number.isNaN(Number(probe)),
      icon: FlaskConical,
    },
  ];

  return (
    <div className="rz-page">
      {/* Hero khoa học */}
      <header className={`rz-hero tone-${level.tone}`}>
        <div className="rz-hero-main">
          <div className="rz-hero-badges">
            <span className="rz-pill">Hồ sơ đa nguồn</span>
            <span className="rz-pill soft">Sàng lọc giáo dục · không chẩn đoán</span>
            <span className={`rz-pill level ${level.tone}`}>{level.key} · {level.label}</span>
          </div>
          <h2 className="rz-title">
            Hồ sơ đánh giá & can thiệp ZPD
            {student_info?.name ? <em> · {student_info.name}</em> : null}
          </h2>
          <p className="rz-sub">
            Tam giác hóa 3 nguồn (GV 30% · PH 30% · Probe 40%) theo thang <strong>CARS-like 1–4</strong>.
            Radar miền blend probe×0.65 + PH×0.35 khi đủ dữ liệu. Không thay ADOS-2 / CARS-2 / chẩn đoán y khoa.
          </p>
          <div className="rz-hero-meta">
            <span><Layers size={13} /> Độ đầy đủ nguồn: <b>{rp.sources_completeness ?? sources.completeness}%</b> ({rp.sources_filled ?? sources.filled}/3)</span>
            <span><Activity size={13} /> GV n={teacherN ?? '—'} · PH n={parentN ?? '—'} · Probe n={probeN ?? sources.probeDone}</span>
            <span><FlaskConical size={13} /> Probe chờ: <b>{sources.probePending}</b></span>
          </div>
        </div>

        <div className="rz-hero-score">
          <div className="rz-score-ring" style={{ '--tone': mainColor }}>
            <svg viewBox="0 0 120 120" aria-hidden>
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(15,23,42,.08)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="50" fill="none"
                stroke="var(--tone)" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 50}`}
                strokeDashoffset={`${2 * Math.PI * 50 * (1 - barPct(score) / 100)}`}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="rz-score-center">
              <strong style={{ color: mainColor }}>{fmt(score, 2)}</strong>
              <span>CARS-like</span>
            </div>
          </div>
          <div className="rz-score-side">
            <div className="rz-level-name" style={{ color: mainColor }}>{level.label}</div>
            <p>{level.hint}</p>
            <button type="button" className="rz-pdf-btn" onClick={exportPDF}>
              <Download size={15} /> Xuất PDF hồ sơ
            </button>
          </div>
        </div>
      </header>

      <div className="rz-method">
        <div className="rz-method-item">
          <Scale size={15} />
          <div>
            <strong>Công thức tổng hợp</strong>
            <span>R = 0.30·GV + 0.30·PH + 0.40·Probe · red-flag AND khi có</span>
          </div>
        </div>
        <div className="rz-method-item">
          <BookOpen size={15} />
          <div>
            <strong>Thang tham chiếu</strong>
            <span>CARS-like 1–4 · ngôn ngữ DSM-5-TR (giáo dục) · M-CHAT-R gợi ý</span>
          </div>
        </div>
        <div className="rz-method-item">
          <ShieldCheck size={15} />
          <div>
            <strong>Human-in-the-loop</strong>
            <span>AI/media = nháp · chỉ tính rủi ro sau xác nhận GV</span>
          </div>
        </div>
      </div>

      <div className="rz-grid">
        {/* Phân tích đa chiều */}
        <section className="rz-card">
          <div className="rz-card-head">
            <div>
              <h3><BarChart2 size={17} /> Phân tích đa chiều</h3>
              <p>Biểu đồ radar 3 miền · nguồn chính: khảo sát PH (bổ sung quan sát GV/probe khi có)</p>
            </div>
            <span className="rz-chip">Miền nổi: {focusDomain.subject}</span>
          </div>

          <div className="rz-multi">
            <div className="rz-chart-panel">
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarSeries}>
                  <PolarGrid stroke="#d5dee9" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#1d2d50', fontSize: 12, fontWeight: 700 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 4]}
                    tickCount={5}
                    tick={{ fill: '#8b9bb3', fontSize: 10 }}
                  />
                  <Tooltip content={<CustomRadarTooltip />} />
                  <Radar
                    name="Chỉ số miền"
                    dataKey="A"
                    stroke={mainColor}
                    strokeWidth={2.4}
                    fill={mainColor}
                    fillOpacity={0.16}
                  />
                </RadarChart>
              </ResponsiveContainer>
              <div className="rz-domain-legend">
                {radarSeries.map((d) => {
                  const key = d.subject === 'Giao tiếp' ? 'social' : d.subject === 'Hành vi' ? 'routine' : 'attention';
                  const pAx = radarSources.probe?.[key];
                  const sAx = radarSources.parent?.[key];
                  const cnt = radarSources.probe_counts?.[key];
                  return (
                    <div key={d.subject} className="rz-domain-item">
                      <div className="rz-domain-top">
                        <strong>{d.subject}</strong>
                        <b style={{ color: mainColor }}>{fmt(d.A, 2)}</b>
                      </div>
                      <div className="rz-mini-bar"><i style={{ width: `${barPct(d.A)}%`, background: mainColor }} /></div>
                      <span>{d.note}</span>
                      <span className="rz-domain-src">
                        Probe {pAx != null ? fmt(pAx, 2) : '—'}{cnt ? ` (n=${cnt})` : ''} · PH {sAx != null ? fmt(sAx, 2) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rz-tri">
              <div className="rz-tri-title">
                <Layers size={14} /> Tam giác hóa nguồn
              </div>
              {weightRows.map((row) => {
                const Icon = row.icon;
                const v = Number(row.val);
                const show = row.ok && !Number.isNaN(v);
                return (
                  <div key={row.key} className={`rz-src ${row.ok ? 'ok' : 'miss'}`}>
                    <div className="rz-src-head">
                      <span className="rz-src-ico"><Icon size={14} /></span>
                      <div>
                        <strong>{row.label}</strong>
                        <em>{row.sub}</em>
                      </div>
                      <div className="rz-src-w">{Math.round(row.w * 100)}%</div>
                    </div>
                    <div className="rz-src-score">
                      <b>{show ? fmt(v, 2) : 'Chưa có'}</b>
                      <span>/ 4.0</span>
                    </div>
                    <div className="rz-mini-bar">
                      <i style={{ width: show ? `${barPct(v)}%` : '0%', background: row.ok ? mainColor : '#cbd5e1' }} />
                    </div>
                    {!row.ok && <div className="rz-src-miss">Thiếu nguồn · trọng số tái phân bổ khi tính tổng hợp</div>}
                  </div>
                );
              })}

              <div className="rz-total" style={{ borderColor: mainColor, background: `${mainColor}12` }}>
                <div>
                  <span>Tổng hợp CARS-like</span>
                  <p>Điểm sàng lọc đa nguồn (1.0 an toàn → 4.0 báo động)</p>
                </div>
                <strong style={{ color: mainColor }}>{fmt(score, 2)}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* Dự báo */}
        <section className="rz-card">
          <div className="rz-card-head">
            <div>
              <h3><Target size={17} /> Xu hướng mô phỏng 6 tháng</h3>
              <p>Kịch bản giả định có/không scaffolding ZPD — chỉ để trao đổi định hướng</p>
            </div>
            <span className="rz-chip warn">Không phải dự báo y khoa</span>
          </div>

          <div className="rz-sim-kpis">
            <div className="rz-sim-kpi">
              <span>Δ có ZPD</span>
              <strong className={deltaWith != null && deltaWith <= 0 ? 'down' : 'up'}>
                {deltaWith == null ? '—' : `${deltaWith <= 0 ? '' : '+'}${fmt(deltaWith, 2)}`}
                {deltaWith != null && deltaWith <= 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              </strong>
            </div>
            <div className="rz-sim-kpi">
              <span>Δ không can thiệp</span>
              <strong className={deltaWithout != null && deltaWithout > 0 ? 'up' : 'down'}>
                {deltaWithout == null ? '—' : `${deltaWithout >= 0 ? '+' : ''}${fmt(deltaWithout, 2)}`}
              </strong>
            </div>
            <div className="rz-sim-kpi">
              <span>Khe hở cuối kỳ</span>
              <strong>{gapEnd == null ? '—' : fmt(gapEnd, 2)}</strong>
            </div>
          </div>

          <div className="rz-chart-panel line">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={pred} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis domain={[1, 4]} ticks={[1, 2, 3, 4]} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomLineTooltip />} />
                <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                <ReferenceLine y={2} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.7} />
                <ReferenceLine y={3} stroke="#ea580c" strokeDasharray="4 4" strokeOpacity={0.55} />
                <Line type="monotone" dataKey="without_zpd" name="Không can thiệp" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3.5 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="with_zpd" name="Có scaffolding ZPD" stroke="#059669" strokeWidth={2.5} dot={{ r: 3.5 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rz-sim-note">
            <Info size={14} />
            <div>
              Đường <b>vàng đứt</b> = ngưỡng Theo dõi (2.0); <b>cam đứt</b> = Đáng kể (3.0).
              Biểu đồ <strong>minh họa định hướng</strong> (không ước lượng nhân quả lâm sàng). Dùng khi họp PH / tổ chuyên môn để thống nhất mức hỗ trợ.
            </div>
          </div>
        </section>
      </div>

      {/* ZPD */}
      {dashboardData?.zpd_recommendation && (
        <section className="rz-card rz-zpd">
          <div className="rz-card-head">
            <div>
              <h3><Sparkles size={17} /> Khuyến nghị can thiệp ZPD</h3>
              <p>Scaffolding theo ngữ cảnh nhà trường / gia đình · evidence-informed · điều chỉnh bởi GV</p>
            </div>
            <span className="rz-privacy"><ShieldCheck size={13} /> Nội bộ giáo dục · không thay thế chuyên môn y khoa</span>
          </div>

          <div className="rz-zpd-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeZpdTab === 'school'}
              className={activeZpdTab === 'school' ? 'active' : ''}
              onClick={() => setActiveZpdTab('school')}
            >
              <Users size={14} /> Nhà trường
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeZpdTab === 'home'}
              className={activeZpdTab === 'home' ? 'active' : ''}
              onClick={() => setActiveZpdTab('home')}
            >
              <Home size={14} /> Gia đình
            </button>
          </div>

          <div className="rz-zpd-body" role="tabpanel">
            {activeZpdTab === 'school' && renderZpdSection(dashboardData.zpd_recommendation.cho_nha_truong)}
            {activeZpdTab === 'home' && renderZpdSection(dashboardData.zpd_recommendation.cho_gia_dinh)}
          </div>
        </section>
      )}

      <footer className="rz-foot">
        <Stethoscope size={13} />
        Tài liệu sàng lọc–can thiệp sư phạm. Không tương đương ADOS-2, CARS-2, M-CHAT-R chuẩn hóa hay chẩn đoán DSM-5-TR của bác sĩ / tâm lý lâm sàng.
      </footer>
    </div>
  );
}

export default RadarTab;
