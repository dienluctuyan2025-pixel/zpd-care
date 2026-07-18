"use client";
import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle, XCircle, Clock, Sparkles, SkipForward, BookOpen,
  X, ShieldCheck, Target, Info,
  Scale, AlertTriangle, HelpCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { toastSuccess, toastError, toastWarn } from '@/lib/toast';

const RUBRIC_META = {
  1: { label: 'Phù hợp lứa tuổi', tone: 'ok', short: 'An toàn quan sát' },
  2: { label: 'Cần theo dõi', tone: 'watch', short: 'Lặp lại quan sát' },
  3: { label: 'Khó khăn rõ', tone: 'risk', short: 'Cần hỗ trợ cấu trúc' },
  4: { label: 'Khó khăn nổi bật', tone: 'alert', short: 'Ưu tiên theo dõi' },
};

function isScoredProbe(p) {
  if (p?.scored) return true;
  return ['Hoàn thành', 'Đạt', 'Không Đạt'].includes(p?.status);
}

function isDemoProbe(p) {
  if (p?.is_demo) return true;
  const by = String(p?.scored_by || '').toLowerCase();
  return by === 'seed' || by === 'demo' || by === 'system-seed';
}

function avgRubric(list) {
  const vals = (list || [])
    .map((p) => (p.rubric_score != null ? Number(p.rubric_score) : Number(p.cars_mapped)))
    .filter((n) => !Number.isNaN(n) && n >= 1 && n <= 4);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function ProbesTab({ dashboardData, onRefresh }) {
  const {
    pending_probes = [],
    history_probes = [],
    student_info,
    probe_disclaimer,
    risk_profile,
  } = dashboardData || {};
  const [catalog, setCatalog] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const [scoreProbe, setScoreProbe] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [loadingCat, setLoadingCat] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingCat(true);
    api.get('/probe-catalog')
      .then((res) => { if (!cancelled) setCatalog(res.data); })
      .catch(() => { if (!cancelled) toastWarn('Không tải được catalog module'); })
      .finally(() => { if (!cancelled) setLoadingCat(false); });
    return () => { cancelled = true; };
  }, []);

  const completed = useMemo(
    () => history_probes.filter((p) => isScoredProbe(p)),
    [history_probes]
  );
  const realScored = useMemo(() => completed.filter((p) => !isDemoProbe(p)), [completed]);
  const demoScored = useMemo(() => completed.filter((p) => isDemoProbe(p)), [completed]);
  const highRisk = useMemo(
    () => completed.filter((p) => {
      const r = p.rubric_score != null ? Number(p.rubric_score) : Number(p.cars_mapped);
      return !Number.isNaN(r) && r >= 3;
    }),
    [completed]
  );
  const avgAll = useMemo(() => avgRubric(completed), [completed]);
  const avgReal = useMemo(() => avgRubric(realScored), [realScored]);
  const headerProbe = risk_profile?.avg_probe_score;
  const probeN = risk_profile?.probe_n_used ?? risk_profile?.probe_n ?? completed.length;

  const skipProbe = async (id) => {
    setBusyId(id);
    try {
      await api.put(`/probes/${id}`, { result_status: 'Bỏ qua', scored: false });
      toastSuccess('Đã bỏ qua (không tính điểm)');
      if (onRefresh) onRefresh();
    } catch (err) {
      toastError(err?.response?.data?.detail || 'Không bỏ qua được');
    } finally {
      setBusyId(null);
    }
  };

  const submitScore = async ({ probeId, rubricScore, notes, telemetry, legacyStatus, silent }) => {
    setBusyId(probeId);
    try {
      const body = {
        result_status: legacyStatus || 'Hoàn thành',
        rubric_score: rubricScore,
        teacher_notes: notes || undefined,
        telemetry: telemetry || undefined,
        scored: true,
      };
      await api.put(`/probes/${probeId}`, body);
      if (!silent) toastSuccess(`Đã ghi điểm ${rubricScore}/4 — cập nhật hồ sơ`);
      setScoreProbe(null);
      setActiveGame(null);
      if (onRefresh) onRefresh();
      return true;
    } catch (err) {
      toastError(err?.response?.data?.detail || 'Không lưu được điểm');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  /** Game xong → CHỈ gợi ý rubric + mở form chấm (HITL). Không tự ghi điểm hồ sơ. */
  const onGameFinished = (probe, payload) => {
    const suggested = Math.max(1, Math.min(4, Number(payload?.suggestedRubric) || 2));
    setScoreProbe({
      ...probe,
      _suggestedRubric: suggested,
      _telemetry: {
        ...(payload?.telemetry || {}),
        source: 'game_suggest',
        auto_scored: false,
      },
    });
    toastSuccess(`Game xong — gợi ý mức ${suggested}/4. Giáo viên xác nhận chấm để ghi hồ sơ.`);
  };

  return (
    <div className="probes-page sci-probes pk5">
      <header className="pk5-hero">
        <div className="pk5-hero-main">
          <div className="pk5-badges">
            <span className="pk5-pill">7 bài có sẵn</span>
            <span className="pk5-pill soft">3 bài có game</span>
            <span className="pk5-pill">4 bài chỉ quan sát</span>
            <span className="pk5-pill soft">40% hồ sơ</span>
          </div>
          <h2>Kiểm chứng khoa học</h2>
          <p>
            7 bài sẵn. <strong>3 bài có game</strong> (gợi ý mức) · <strong>4 bài chỉ quan sát</strong>.
            Chỉ khi GV bấm <strong>Xác nhận chấm 1–4</strong> mới ghi vào hồ sơ (HITL).
          </p>
          <div className="pk5-formula">
            <Scale size={14} />
            <span>
              Rubric GV (TB ≤3 lần gần, loại seed) × <b>40%</b>
              {headerProbe != null ? <> · hiện tại <b>{Number(headerProbe).toFixed(2)}</b> ({probeN} lần)</> : ' · chưa có lần chấm thật'}
            </span>
          </div>
        </div>
        <div className="pk5-hero-actions">
          <button type="button" className="pk5-btn ghost" onClick={() => setHelpOpen(true)}>
            <HelpCircle size={15} /> Cách chấm?
          </button>
        </div>
      </header>

      <div className="pk5-note" role="note">
        <ShieldCheck size={15} />
        <div>
          <strong>Logic:</strong> Game chỉ hiện khi <em>khớp</em> protocol bài (3/7). Bài quan sát thuần = chấm tay sau khi làm bước.
          Điểm vào Kiểm chứng 40%. Sàng lọc giáo dục — không chẩn đoán y khoa.
        </div>
      </div>

      <div className="pk5-kpis">
        <div className="pk5-kpi warn">
          <span>Còn chưa làm</span>
          <strong>{pending_probes.length}</strong>
          <em>Bài sẵn sàng chơi/chấm</em>
        </div>
        <div className="pk5-kpi ok">
          <span>Đã chấm</span>
          <strong>{completed.length}</strong>
          <em>{realScored.length} thật · {demoScored.length} demo</em>
        </div>
        <div className="pk5-kpi risk">
          <span>Rubric ≥ 3</span>
          <strong>{highRisk.length}</strong>
          <em>Cần theo dõi thêm</em>
        </div>
        <div className="pk5-kpi score">
          <span>TB probe (UI)</span>
          <strong>{avgAll == null ? '—' : avgAll.toFixed(2)}</strong>
          <em>
            {avgReal != null ? `Thật: ${avgReal.toFixed(2)}` : 'Chưa có chấm thật'}
            {headerProbe != null ? ` · Risk dùng: ${Number(headerProbe).toFixed(2)}` : ''}
          </em>
        </div>
      </div>

      {demoScored.length > 0 && (
        <div className="pk5-demo-banner">
          <AlertTriangle size={14} />
          Có <b>{demoScored.length}</b> phiên <b>DEMO/seed</b> (dữ liệu minh họa). Không dùng làm bằng chứng đánh giá thật.
        </div>
      )}

      <div className="pk5-board">
        <section className="pk5-col">
          <header>
            <Clock size={15} />
            <div>
              <strong>Hàng đợi</strong>
              <span>Chờ thực hiện / chấm</span>
            </div>
            <b>{pending_probes.length}</b>
          </header>
          <div className="pk5-col-body">
            {pending_probes.length === 0 ? (
              <div className="pk5-empty">
                Đã hoàn tất hết bài đang mở. Tải lại hồ sơ để mở vòng kiểm chứng mới.
              </div>
            ) : (
              pending_probes.map((p) => (
                <ProbeCard
                  key={p.id}
                  probe={p}
                  busy={busyId === p.id}
                  onSkip={() => skipProbe(p.id)}
                  onScore={() => setScoreProbe(p)}
                  onGame={() => setActiveGame(p)}
                />
              ))
            )}
          </div>
        </section>

        <section className="pk5-col">
          <header className="ok">
            <CheckCircle size={15} />
            <div>
              <strong>Đã có điểm</strong>
              <span>GV đã xác nhận chấm</span>
            </div>
            <b>{completed.length}</b>
          </header>
          <div className="pk5-col-body">
            {completed.length === 0 ? (
              <div className="pk5-empty">Chưa có phiên chấm.</div>
            ) : (
              completed.map((p) => <ScoredCard key={p.id} probe={p} highlight={false} />)
            )}
          </div>
        </section>

        <section className="pk5-col">
          <header className="danger">
            <XCircle size={15} />
            <div>
              <strong>Ưu tiên theo dõi</strong>
              <span>Lọc từ đã chấm · rubric ≥ 3</span>
            </div>
            <b>{highRisk.length}</b>
          </header>
          <div className="pk5-col-body">
            {highRisk.length === 0 ? (
              <div className="pk5-empty">Không có phiên rubric cao.</div>
            ) : (
              highRisk.map((p) => <ScoredCard key={`hr-${p.id}`} probe={p} highlight />)
            )}
          </div>
        </section>
      </div>

      {scoreProbe && (
        <ScoreModal
          probe={scoreProbe}
          catalog={catalog}
          busy={busyId === scoreProbe.id}
          onClose={() => setScoreProbe(null)}
          onSubmit={submitScore}
          onOpenGame={() => setActiveGame(scoreProbe)}
        />
      )}

      {activeGame && (
        <GameModal
          probe={activeGame}
          studentInfo={student_info}
          onClose={() => setActiveGame(null)}
          onScoredSuggest={(payload) => {
            const p = activeGame;
            setActiveGame(null);
            onGameFinished(p, payload);
          }}
        />
      )}

      {helpOpen && <RubricHelpModal onClose={() => setHelpOpen(false)} levels={catalog?.rubric_levels} />}
    </div>
  );
}

function ScoredCard({ probe, highlight }) {
  const demo = isDemoProbe(probe);
  const score = probe.rubric_score != null ? Number(probe.rubric_score) : Number(probe.cars_mapped);
  const lv = Number.isFinite(score) ? Math.round(score) : null;
  const meta = lv ? RUBRIC_META[lv] : null;
  return (
    <article className={`pk5-card scored ${highlight ? 'hi' : ''} ${demo ? 'demo' : ''}`}>
      <div className="pk5-card-top">
        <span className="pk5-code">{probe.module_code || probe.category || '—'}</span>
        <div className="pk5-card-tags">
          {demo && <span className="pk5-tag demo">DEMO</span>}
          {probe.axis_label && <span className="pk5-tag axis">{probe.axis_label}</span>}
          <span className={`pk5-score r${lv || 0}`}>{Number.isFinite(score) ? `${score}/4` : probe.status}</span>
        </div>
      </div>
      <h4>{probe.module_name || probe.category}</h4>
      <p className="pk5-meta">
        {probe.date || '—'}
        {probe.scored_by ? ` · ${probe.scored_by}` : ''}
        {meta ? ` · ${meta.label}` : ''}
      </p>
      {probe.teacher_notes && <p className="pk5-notes">{probe.teacher_notes}</p>}
      {probe.telemetry && (
        <div className="pk5-telem">
          {probe.telemetry.reaction_ms != null && <span>RT {probe.telemetry.reaction_ms}ms</span>}
          {probe.telemetry.errors != null && <span>Lỗi {probe.telemetry.errors}</span>}
          {probe.telemetry.correct != null && <span>Đúng {probe.telemetry.correct}</span>}
          <em>Telemetry tham khảo</em>
        </div>
      )}
    </article>
  );
}

function RubricHelpModal({ onClose, levels }) {
  const rows = levels || RUBRIC_META;
  return (
    <div className="game-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="game-modal-panel score-panel pk5-help" onClick={(e) => e.stopPropagation()}>
        <div className="game-modal-head">
          <div>
            <div className="game-modal-kicker">Giải thích nhanh</div>
            <h3>Chấm rubric là gì?</h3>
          </div>
          <button type="button" className="game-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <p className="game-modal-help">
          Rubric = bảng tiêu chí 1–4 có sẵn trong từng module. Giáo viên đối chiếu hành vi quan sát được rồi chọn mức khớp nhất.
          Game chỉ gợi ý; <b>không</b> tự ghi điểm hồ sơ.
        </p>
        <div className="pk5-help-grid">
          {[1, 2, 3, 4].map((n) => {
            const row = rows[n] || rows[String(n)] || RUBRIC_META[n];
            const label = row?.label || RUBRIC_META[n].label;
            const desc = row?.desc || RUBRIC_META[n].short;
            return (
              <div key={n} className={`pk5-help-item lv-${n}`}>
                <b>{n}</b>
                <div>
                  <strong>{label}</strong>
                  <span>{desc}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="score-actions">
          <button type="button" className="btn-premium" onClick={onClose}>Đã hiểu</button>
        </div>
      </div>
    </div>
  );
}

function parseScenario(probe) {
  try {
    const d = typeof probe.scenario === 'string' ? JSON.parse(probe.scenario) : probe.scenario;
    if (d && typeof d === 'object') return d;
  } catch { /* plain */ }
  return { ten_bai_tap: probe.module_name || 'Module', muc_dich: String(probe.scenario || '') };
}

/**
 * Chỉ trả game khi catalog/module cho phép và khớp protocol.
 * Không fallback lung tung (tránh game phản xạ dính bài quan sát ABC).
 */
function resolveGameType(probe) {
  const meta = parseScenario(probe);
  const mid = (probe.module_id || meta.module_id || '').toLowerCase();
  // Whitelist cứng — khớp probe_catalog.GAME_ALLOWED
  const ALLOWED = {
    name_response: 'reaction',
    emotion_match: 'emotion',
    sustained_attention: 'shape',
  };
  if (mid && ALLOWED[mid]) return ALLOWED[mid];

  const explicit = (probe.game_type || meta.game_type || '').toLowerCase();
  if (!explicit || explicit === 'none') return null;
  if (explicit === 'reaction' || explicit === 'emotion' || explicit === 'shape') {
    // Chỉ chấp nhận nếu module nằm whitelist
    if (mid && !ALLOWED[mid]) return null;
    return explicit;
  }
  return null;
}

function gameTypeLabel(t) {
  if (t === 'emotion') return 'Game cảm xúc';
  if (t === 'shape') return 'Game ghép hình / chú ý';
  if (t === 'reaction') return 'Game phản xạ';
  return 'Game';
}

function ProbeCard({ probe, busy, onSkip, onScore, onGame }) {
  const meta = parseScenario(probe);
  const title = probe.module_name || meta.ten_bai_tap || probe.category;
  const purpose = meta.muc_dich || '';
  const steps = Array.isArray(meta.cac_buoc) ? meta.cac_buoc : [];
  const gameType = resolveGameType(probe);
  const hasGame = Boolean(gameType);
  const materials = meta.chuan_bi || (Array.isArray(meta.materials) ? meta.materials.join(', ') : '');

  return (
    <article className={`pk5-card pending ${busy ? 'busy' : ''} ${hasGame ? 'has-game' : 'observe-only'}`}>
      <div className="pk5-card-top">
        <span className="pk5-code">{probe.module_code || probe.category || 'Module'}</span>
        <div className="pk5-card-tags">
          {(probe.axis_label || meta.axis_label) && (
            <span className="pk5-tag axis">{probe.axis_label || meta.axis_label}</span>
          )}
          <span className={`pk5-tag ${hasGame ? 'game' : 'obs'}`}>
            {hasGame ? 'Có game' : 'Chỉ quan sát'}
          </span>
          <button type="button" className="pk5-skip" onClick={onSkip} disabled={busy} title="Bỏ qua — không tính điểm">
            <SkipForward size={12} /> Bỏ qua
          </button>
        </div>
      </div>
      <h4>{title}</h4>
      {purpose && <p className="pk5-purpose">{purpose}</p>}
      {materials && <p className="pk5-mat"><Target size={12} /> {materials}</p>}
      {steps.length > 0 && (
        <ol className="pk5-steps">
          {steps.slice(0, 4).map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
      <div className="pk5-actions">
        {hasGame ? (
          <>
            <button type="button" className="pk5-btn primary sm" onClick={onGame} disabled={busy}>
              <Sparkles size={14} /> {gameTypeLabel(gameType)} · ghi điểm
            </button>
            <button type="button" className="pk5-btn ghost sm" onClick={onScore} disabled={busy}>
              <BookOpen size={14} /> Chấm tay 1–4
            </button>
          </>
        ) : (
          <button type="button" className="pk5-btn primary sm" onClick={onScore} disabled={busy} style={{ flex: 1 }}>
            <BookOpen size={14} /> Quan sát xong → Chấm 1–4
          </button>
        )}
      </div>
      <p className="pk5-foot-note">
        {hasGame
          ? 'Game khớp protocol · xong mở form gợi ý mức · GV xác nhận mới ghi điểm.'
          : 'Bài quan sát trực tiếp — không gắn game. Làm đúng bước → Chấm 1–4.'}
      </p>
    </article>
  );
}

function ScoreModal({ probe, catalog, busy, onClose, onSubmit, onOpenGame }) {
  const meta = parseScenario(probe);
  const mid = probe.module_id || meta.module_id;
  const full = (catalog?.full_modules || []).find((m) => m && m.id === mid)
    || (catalog?.full_modules || []).find((m) => m && m.code === (probe.module_code || meta.code));
  // Ưu tiên rubric chi tiết từ catalog module — không dùng label ngắn lặp
  const rubric = full?.rubric || null;
  const levels = catalog?.rubric_levels || {};
  const steps = (full?.steps && full.steps.length) ? full.steps : (Array.isArray(meta.cac_buoc) ? meta.cac_buoc : []);
  const title = full?.name || probe.module_name || meta.ten_bai_tap || 'Chấm rubric 1–4';
  const code = full?.code || probe.module_code || meta.code || 'Rubric';
  const [score, setScore] = useState(probe._suggestedRubric || 2);
  const [notes, setNotes] = useState('');
  const gameType = resolveGameType({ ...probe, module_id: mid || probe.module_id, game_type: full?.game_type || probe.game_type });
  const suggested = probe._suggestedRubric;
  const observeOnly = !gameType;

  return (
    <div className="game-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="game-modal-panel score-panel pk5-score-modal" onClick={(e) => e.stopPropagation()}>
        <div className="game-modal-head">
          <div>
            <div className="game-modal-kicker">
              {code} · {observeOnly ? 'Chỉ quan sát — chấm tay' : 'Có game — hoặc chấm tay'}
            </div>
            <h3>{title}</h3>
          </div>
          <button type="button" className="game-modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="pk5-score-explain">
          <Info size={14} />
          <div>
            {observeOnly
              ? <>Làm đúng protocol bên dưới, rồi chọn <b>một mức 1–4</b>. Bài này <b>không có game máy</b>.</>
              : <>Chọn <b>một mức 1–4</b>. Game chỉ gợi ý — bấm xác nhận mới ghi hồ sơ.</>}
            {' '}Điểm vào TB probe × 40% hồ sơ.
            {suggested != null && gameType && <> Game gợi ý mức <b>{suggested}</b>.</>}
          </div>
        </div>

        {full?.scientific_basis && (
          <div className="score-basis">
            <strong>Cơ sở tham chiếu (giáo dục)</strong>
            <ul>
              {full.scientific_basis.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </div>
        )}

        {steps.length > 0 && (
          <div className="pk5-protocol">
            <strong>Protocol quan sát</strong>
            <ol>
              {steps.slice(0, 6).map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </div>
        )}

        {probe._telemetry && (
          <div className="score-telem-box">
            <strong>Telemetry game (đã ghi kèm)</strong>
            <div className="probe-telem">
              {probe._telemetry.reaction_ms != null && <span>RT {probe._telemetry.reaction_ms}ms</span>}
              {probe._telemetry.errors != null && <span>Lỗi {probe._telemetry.errors}</span>}
              {probe._telemetry.correct != null && <span>Đúng {probe._telemetry.correct}</span>}
              {probe._telemetry.rounds != null && <span>Lượt {probe._telemetry.rounds}</span>}
            </div>
          </div>
        )}

        <div className="rubric-grid pk5-rubric">
          {[1, 2, 3, 4].map((lv) => {
            const lvMeta = levels[lv] || levels[String(lv)] || RUBRIC_META[lv];
            const label = lvMeta?.label || RUBRIC_META[lv].label;
            const rawDesc = rubric
              ? (rubric[lv] || rubric[String(lv)] || '')
              : (lvMeta?.desc || RUBRIC_META[lv].short || '');
            // Tránh lặp "Cần theo dõi / Cần theo dõi"
            const desc = String(rawDesc).trim();
            const same = desc && desc.toLowerCase() === String(label).toLowerCase();
            return (
              <button
                key={lv}
                type="button"
                className={`rubric-option ${score === lv ? 'active' : ''} lv-${lv} ${suggested === lv && gameType ? 'suggested' : ''}`}
                onClick={() => setScore(lv)}
              >
                <span className="rubric-lv">{lv}</span>
                <span className="rubric-body">
                  <span className="rubric-label">{label}</span>
                  {desc && !same ? <span className="rubric-desc">{desc}</span> : null}
                </span>
                {suggested === lv && gameType ? <span className="rubric-sug">Gợi ý game</span> : null}
              </button>
            );
          })}
        </div>

        <label className="score-notes-label">
          Ghi chú giáo viên (khuyến nghị)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Mô tả hành vi quan sát được, bối cảnh, số lần thử, mức hỗ trợ…"
          />
        </label>

        <div className="score-actions">
          {gameType ? (
            <button type="button" className="btn-secondary" onClick={onOpenGame}>
              <Sparkles size={14} /> {gameTypeLabel(gameType)}
            </button>
          ) : null}
          <button
            type="button"
            className="btn-premium"
            disabled={busy}
            onClick={() => onSubmit({
              probeId: probe.id,
              rubricScore: score,
              notes,
              telemetry: probe._telemetry || undefined,
            })}
          >
            {busy ? 'Đang lưu…' : `Xác nhận chấm ${score}/4 · ${RUBRIC_META[score]?.label || ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===================== GAMES (hỗ trợ, không tự chẩn đoán) ===================== */

function GameModal({ probe, studentInfo, onClose, onScoredSuggest }) {
  const meta = parseScenario(probe);
  const gameType = resolveGameType(probe);
  let age = 4;
  try {
    const birth = new Date(studentInfo?.dob || '2021-01-01');
    if (!Number.isNaN(birth.getTime())) {
      age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 3600 * 1000));
    }
  } catch { /* 4 */ }
  age = Math.max(3, Math.min(6, age));

  if (!gameType) {
    return (
      <div className="game-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="game-modal-panel" onClick={(e) => e.stopPropagation()}>
          <div className="game-modal-head">
            <div>
              <div className="game-modal-kicker">Không có game</div>
              <h3>{probe.module_name || meta.ten_bai_tap || 'Module quan sát'}</h3>
            </div>
            <button type="button" className="game-modal-close" onClick={onClose}><X size={16} /></button>
          </div>
          <p className="game-modal-help">
            Bài này là <b>quan sát trực tiếp</b> theo protocol — không gắn game máy (tránh lệch khoa học).
            Hãy làm các bước trên thẻ, rồi bấm <b>Chấm tay 1–4</b>.
          </p>
          <div className="score-actions">
            <button type="button" className="btn-premium" onClick={onClose}>Đã hiểu</button>
          </div>
        </div>
      </div>
    );
  }

  const common = { probe, age, meta, onClose, onScoredSuggest };
  if (gameType === 'emotion') return <EmotionMatchGame {...common} />;
  if (gameType === 'shape') return <ShapeMatchGame {...common} />;
  return <AttentionReactionGame {...common} />;
}

function AttentionReactionGame({ age, onClose, onScoredSuggest }) {
  const [gameState, setGameState] = useState('start');
  const [startTime, setStartTime] = useState(0);
  const [reactionTime, setReactionTime] = useState(0);
  const [isPractice, setIsPractice] = useState(true);
  const passThreshold = age <= 3 ? 2500 : (age === 4 ? 1800 : 1200);

  const startGame = () => {
    setGameState('wait');
    const delay = Math.floor(Math.random() * 2000) + 1500;
    setTimeout(() => {
      setGameState('react');
      setStartTime(Date.now());
    }, delay);
  };

  const handleClick = () => {
    if (gameState === 'start') startGame();
    else if (gameState === 'wait') {
      toastWarn('Bấm quá sớm — đợi biểu tượng.');
      setGameState('start');
    } else if (gameState === 'react') {
      setReactionTime(Date.now() - startTime);
      setGameState('result');
    }
  };

  const finish = () => {
    if (isPractice) {
      setIsPractice(false);
      setGameState('start');
      return;
    }
    const suggested = reactionTime <= passThreshold ? 1 : (reactionTime <= passThreshold * 1.5 ? 2 : 3);
    onScoredSuggest({
      suggestedRubric: suggested,
      telemetry: {
        game: 'reaction',
        reaction_ms: reactionTime,
        threshold_ms: passThreshold,
        age,
        practice: false,
      },
    });
  };

  return (
    <div className="game-modal-overlay" role="dialog" aria-modal="true">
      <div className="game-modal-panel">
        <div className="game-modal-head">
          <div>
            <div className="game-modal-kicker">Game đánh giá · ghi điểm hồ sơ</div>
            <h3>Phản xạ chú ý</h3>
          </div>
          <button type="button" className="game-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className={`game-mode-pill ${isPractice ? 'practice' : 'scored'}`}>
          {isPractice ? 'Làm quen — chưa ghi điểm' : 'Lượt chính — xong gợi ý mức, GV xác nhận'}
        </div>
        <p className="game-modal-meta">~{age} tuổi · Ngưỡng gợi ý ≤ {passThreshold} ms</p>
        <button type="button" className={`game-hit-circle state-${gameState}`} onClick={handleClick}>
          {gameState === 'start' && <span>BẮT ĐẦU</span>}
          {gameState === 'wait' && <span>ĐỢI…</span>}
          {gameState === 'react' && <span className="game-emoji">🐸</span>}
          {gameState === 'result' && <span className="game-time">{reactionTime} ms</span>}
        </button>
        {gameState === 'result' && (
          <div className="game-result-box">
            <div className={reactionTime <= passThreshold ? 'ok' : 'slow'}>
              {reactionTime <= passThreshold ? 'Trong ngưỡng gợi ý' : 'Chậm hơn ngưỡng gợi ý'}
            </div>
            <button type="button" className="btn-premium game-next-btn" onClick={finish}>
              {isPractice ? 'Đo lượt chính thức' : 'Sang chấm rubric GV'}
            </button>
          </div>
        )}
        {gameState !== 'result' && <button type="button" className="game-cancel" onClick={onClose}>Đóng</button>}
      </div>
    </div>
  );
}

function EmotionMatchGame({ age, onClose, onScoredSuggest }) {
  const allEmotions = [
    { id: 'vui', emoji: '😀', label: 'Vui vẻ' },
    { id: 'buon', emoji: '😢', label: 'Buồn bã' },
    { id: 'gian', emoji: '😡', label: 'Tức giận' },
    { id: 'so', emoji: '😨', label: 'Sợ hãi' },
  ];
  const numOptions = age <= 3 ? 2 : 3;
  const [gameState, setGameState] = useState('start');
  const [isPractice, setIsPractice] = useState(true);
  const [options, setOptions] = useState([]);
  const [target, setTarget] = useState(null);
  const [fails, setFails] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [round, setRound] = useState(0);
  const totalRounds = 3;

  const gen = () => {
    const shuffled = [...allEmotions].sort(() => 0.5 - Math.random());
    const opts = shuffled.slice(0, numOptions);
    setOptions(opts);
    setTarget(opts[Math.floor(Math.random() * opts.length)]);
    setGameState('play');
  };

  const select = (opt) => {
    if (gameState === 'result') return;
    if (opt.id === target.id) {
      const c = correct + 1;
      setCorrect(c);
      const r = round + 1;
      setRound(r);
      if (r >= totalRounds) {
        setGameState('result');
      } else {
        gen();
      }
    } else {
      setFails((f) => f + 1);
    }
  };

  const finish = () => {
    if (isPractice) {
      setIsPractice(false);
      setCorrect(0);
      setFails(0);
      setRound(0);
      gen();
      return;
    }
    const ratio = correct / totalRounds;
    const suggested = ratio >= 0.67 && fails <= 1 ? 1 : ratio >= 0.34 ? 2 : 3;
    onScoredSuggest({
      suggestedRubric: suggested,
      telemetry: { game: 'emotion', correct, errors: fails, rounds: totalRounds, age, practice: false },
    });
  };

  return (
    <div className="game-modal-overlay" role="dialog" aria-modal="true">
      <div className="game-modal-panel">
        <div className="game-modal-head">
          <div>
            <div className="game-modal-kicker">Game · gợi ý rubric (HITL)</div>
            <h3>Nhận diện cảm xúc</h3>
          </div>
          <button type="button" className="game-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className={`game-mode-pill ${isPractice ? 'practice' : 'scored'}`}>
          {isPractice ? 'Làm quen' : `Scored ${Math.min(round, totalRounds)}/${totalRounds}`}
        </div>
        {gameState === 'start' ? (
          <>
            <p className="game-modal-help">Chọn mặt đúng cảm xúc. Xong → gợi ý mức 1–4, GV xác nhận mới ghi hồ sơ.</p>
            <button type="button" className="btn-premium game-next-btn" onClick={gen}>Bắt đầu</button>
          </>
        ) : gameState === 'play' ? (
          <>
            <div className="game-prompt">Ai đang <strong>{target?.label}</strong>?</div>
            <div className="game-options">
              {options.map((o) => (
                <button type="button" key={o.id} className="game-option" onClick={() => select(o)}>
                  <span className="game-emoji">{o.emoji}</span>
                </button>
              ))}
            </div>
            <div className="game-modal-meta">Đúng {correct} · Lỗi {fails}</div>
          </>
        ) : (
          <div className="game-result-box">
            <div className="ok">Hoàn thành: đúng {correct}/{totalRounds}, lỗi {fails}</div>
            <button type="button" className="btn-premium game-next-btn" onClick={finish}>
              {isPractice ? 'Chơi lượt scored' : 'Sang chấm rubric GV'}
            </button>
          </div>
        )}
        {gameState !== 'result' && <button type="button" className="game-cancel" onClick={onClose}>Đóng</button>}
      </div>
    </div>
  );
}

function ShapeMatchGame({ age, onClose, onScoredSuggest }) {
  const shapes = [
    { id: 'vuong', emoji: '🟦', label: 'Vuông' },
    { id: 'tron', emoji: '🔴', label: 'Tròn' },
    { id: 'tam', emoji: '🔺', label: 'Tam giác' },
    { id: 'sao', emoji: '⭐', label: 'Sao' },
  ];
  const numOptions = age <= 3 ? 2 : 3;
  const [gameState, setGameState] = useState('start');
  const [isPractice, setIsPractice] = useState(true);
  const [options, setOptions] = useState([]);
  const [target, setTarget] = useState(null);
  const [fails, setFails] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [round, setRound] = useState(0);
  const totalRounds = 3;

  const gen = () => {
    const shuffled = [...shapes].sort(() => 0.5 - Math.random());
    const opts = shuffled.slice(0, numOptions);
    setOptions(opts);
    setTarget(opts[Math.floor(Math.random() * opts.length)]);
    setGameState('play');
  };

  const select = (opt) => {
    if (gameState !== 'play') return;
    if (opt.id === target.id) {
      const c = correct + 1;
      setCorrect(c);
      const r = round + 1;
      setRound(r);
      if (r >= totalRounds) setGameState('result');
      else gen();
    } else setFails((f) => f + 1);
  };

  const finish = () => {
    if (isPractice) {
      setIsPractice(false);
      setCorrect(0); setFails(0); setRound(0);
      gen();
      return;
    }
    const ratio = correct / totalRounds;
    const suggested = ratio >= 0.67 && fails <= 1 ? 1 : ratio >= 0.34 ? 2 : 3;
    onScoredSuggest({
      suggestedRubric: suggested,
      telemetry: { game: 'shape', correct, errors: fails, rounds: totalRounds, age, practice: false },
    });
  };

  return (
    <div className="game-modal-overlay" role="dialog" aria-modal="true">
      <div className="game-modal-panel">
        <div className="game-modal-head">
          <div>
            <div className="game-modal-kicker">Game · gợi ý rubric (HITL)</div>
            <h3>Ghép hình / chú ý</h3>
          </div>
          <button type="button" className="game-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className={`game-mode-pill ${isPractice ? 'practice' : 'scored'}`}>
          {isPractice ? 'Làm quen' : `Scored ${Math.min(round, totalRounds)}/${totalRounds}`}
        </div>
        {gameState === 'start' ? (
          <>
            <p className="game-modal-help">Chọn đúng hình. Kết quả game chỉ gợi ý rubric.</p>
            <button type="button" className="btn-premium game-next-btn" onClick={gen}>Bắt đầu</button>
          </>
        ) : gameState === 'play' ? (
          <>
            <div className="game-shadow-target"><span>{target?.emoji}</span></div>
            <div className="game-prompt">Chọn hình: <strong>{target?.label}</strong></div>
            <div className="game-options">
              {options.map((o) => (
                <button type="button" key={o.id} className="game-option" onClick={() => select(o)}>
                  <span className="game-emoji">{o.emoji}</span>
                </button>
              ))}
            </div>
            <div className="game-modal-meta">Đúng {correct} · Lỗi {fails}</div>
          </>
        ) : (
          <div className="game-result-box">
            <div className="ok">Đúng {correct}/{totalRounds}, lỗi {fails}</div>
            <button type="button" className="btn-premium game-next-btn" onClick={finish}>
              {isPractice ? 'Chơi lượt scored' : 'Sang chấm rubric GV'}
            </button>
          </div>
        )}
        {gameState !== 'result' && <button type="button" className="game-cancel" onClick={onClose}>Đóng</button>}
      </div>
    </div>
  );
}

export default ProbesTab;
