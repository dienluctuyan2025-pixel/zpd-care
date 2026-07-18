"use client";
import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Activity, Clock, Sparkles, Layers, Upload, RefreshCw, AlertTriangle, X, Search, Stethoscope,
  ShieldCheck, Target, Brain, BookOpen, ChevronRight, Gauge, CheckCircle2, Scale, Eye, Users, ClipboardList
} from 'lucide-react';
import { api } from '@/lib/api';
import { toastError, toastSuccess, toastWarn } from '@/lib/toast';

// --- TAB 1: Behavior Forensics ---
function BehaviorTab({ studentId, dashboardData, onRefresh }) {
  const [text, setText] = useState(() => {
    if (typeof window === 'undefined') return '';
    try { return sessionStorage.getItem(`draft-${studentId}`) || ''; } catch { return ''; }
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);
  const [isLiveResult, setIsLiveResult] = useState(false);
  const [showAiReasoning, setShowAiReasoning] = useState(false);
  const [pendingLogId, setPendingLogId] = useState(null);
  const abortControllerRef = React.useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(`draft-${studentId}`, text);
  }, [text, studentId]);

  useEffect(() => {
    if (!studentId) return;
    // Reset state khi đổi HS — tránh dính nháp/confirm HS trước
    setPendingLogId(null);
    setIsLiveResult(false);
    setAnalyzing(false);
    setConfirming(false);
    setShowAiReasoning(false);
    api.get(`/students/${studentId}/latest-log`)
      .then(res => {
        if (res.data) {
          const draft = sessionStorage.getItem(`draft-${studentId}`);
          const parsed = res.data.parsed_json || null;
          setText(draft || res.data.raw_text || '');
          setResult(parsed);
          setIsLiveResult(false);
          // Nếu log còn pending confirm → hiện thanh xác nhận
          if (parsed && parsed.pending_confirmation && !parsed.teacher_confirmed && res.data.id) {
            setPendingLogId(res.data.id);
          }
        } else {
          const draft = sessionStorage.getItem(`draft-${studentId}`);
          setText(draft || '');
          setResult(null);
          setIsLiveResult(false);
        }
      })
      .catch(err => console.error(err));
  }, [studentId]);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setAnalyzing(true);
    try {
      const res = await api.post(`/analyze`, { student_id: studentId, raw_text: text }, { signal: controller.signal });
      const draft = {
        ...(res.data.ai_result || {}),
        pending_confirmation: !!res.data.pending_confirmation,
        teacher_confirmed: false,
        counts_toward_risk: false,
        source: 'text',
      };
      setResult(draft);
      setIsLiveResult(true);
      setPendingLogId(res.data.log_id || null);
      if (res.data.analysis_failed || draft.analysis_failed) {
        toastWarn("AI lỗi — không ghi điểm. Thử lại hoặc sửa mô tả.");
        setPendingLogId(null);
      } else {
        toastSuccess("Bản nháp AI sẵn sàng — đọc/sửa rồi bấm Xác nhận ghi hồ sơ.");
      }
      // Không onRefresh risk — nháp chưa tính điểm
    } catch (err) {
      if (err?.code !== 'ERR_CANCELED') {
        console.error(err);
        toastError(err?.response?.data?.detail || "Lỗi kết nối Server AI");
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setAnalyzing(false);
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !studentId) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setAnalyzing(true);
    setPendingLogId(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post(`/analyze-multimodal?student_id=${studentId}`, formData, {
        signal: controller.signal,
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000,
      });
      const draft = {
        ...(res.data.ai_result || {}),
        pending_confirmation: !!res.data.pending_confirmation,
        teacher_confirmed: false,
        counts_toward_risk: false,
        source: 'multimodal',
      };
      setResult(draft);
      setIsLiveResult(true);
      setText(draft.hanh_vi_goc || '');
      setPendingLogId(res.data.log_id || null);

      if (res.data.analysis_failed || draft.analysis_failed) {
        toastWarn("AI không đọc được media — không ghi điểm. Thử file khác hoặc gõ quan sát.");
        setPendingLogId(null);
      } else {
        toastSuccess("Đã có bản nháp AI. Hãy đọc/sửa mô tả rồi bấm Xác nhận ghi hồ sơ.");
      }
      // Không onRefresh risk — draft chưa tính điểm
    } catch (err) {
      if (err?.code !== 'ERR_CANCELED') {
        console.error(err);
        const detail = err?.response?.data?.detail;
        toastError(detail || "Lỗi file — định dạng mp3/wav/m4a/mp4/webm… ≤ 25MB");
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setAnalyzing(false);
      }
      e.target.value = null;
    }
  };

  const handleConfirmObservation = async () => {
    if (!pendingLogId || !studentId || !text.trim()) {
      toastWarn("Thiếu mô tả quan sát hoặc bản nháp.");
      return;
    }
    setConfirming(true);
    try {
      const res = await api.post('/observations/confirm', {
        student_id: studentId,
        log_id: pendingLogId,
        raw_text: text.trim(),
      });
      setResult({
        ...(res.data.ai_result || result),
        pending_confirmation: false,
        teacher_confirmed: true,
        counts_toward_risk: true,
      });
      setPendingLogId(null);
      setIsLiveResult(true);
      toastSuccess("Đã xác nhận — ghi hồ sơ và cập nhật điểm rủi ro.");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      toastError(err?.response?.data?.detail || "Không xác nhận được bản ghi");
    } finally {
      setConfirming(false);
    }
  };

  const handleDiscardDraft = () => {
    setPendingLogId(null);
    setResult(null);
    setText('');
    setIsLiveResult(false);
    try { sessionStorage.removeItem(`draft-${studentId}`); } catch { /* ignore */ }
    toastWarn("Đã bỏ bản nháp (chưa ghi điểm rủi ro).");
  };

  const countKeywordHits = (source, highlights) => {
    if (!source || !Array.isArray(highlights)) return 0;
    const lower = source.toLowerCase();
    return highlights.reduce((n, h) => {
      const kw = (h?.keyword || h?.text || h?.tu_khoa || '').toString().trim().toLowerCase();
      if (kw.length > 1 && lower.includes(kw)) return n + 1;
      // partial: longest word >= 4 chars
      const parts = kw.split(/\s+/).filter((w) => w.length >= 4);
      if (parts.some((w) => lower.includes(w))) return n + 0.5;
      return n;
    }, 0);
  };

  const buildHighlightTerms = (highlights) => {
    const terms = [];
    for (const hl of highlights) {
      if (!hl) continue;
      const rawKw = (hl.keyword || hl.text || hl.tu_khoa || '').toString().trim();
      if (rawKw.length > 1) {
        terms.push({ phrase: rawKw, hl });
      }
      // Also index meaningful tokens so paraphrased summaries still light up
      const stop = new Set(['không','được','trong','nhiều','với','các','một','khi','cho','của','và','là','có','bị','rất','này','đó','lần','bé','cô']);
      const tokens = rawKw.split(/[\s,.;:!?()]+/).filter((w) => w.length >= 5 && !stop.has(w.toLowerCase()));
      for (const t of tokens) {
        if (!terms.some((x) => x.phrase.toLowerCase() === t.toLowerCase())) {
          terms.push({ phrase: t, hl });
        }
      }
    }
    // Longer phrases first to avoid nested replace issues
    return terms.sort((a, b) => b.phrase.length - a.phrase.length);
  };

  const applyHighlights = (sourceText, highlights) => {
    let htmlString = String(sourceText)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const terms = buildHighlightTerms(highlights);
    if (terms.length === 0) {
      return { html: htmlString, hitCount: 0 };
    }

    const hlMap = {};
    const safeParts = [];
    for (const { phrase, hl } of terms) {
      const sanitized = phrase.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const escaped = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      hlMap[sanitized.toLowerCase()] = hl;
      safeParts.push(escaped);
    }

    let hitCount = 0;
    const combinedRegex = new RegExp(`(${safeParts.join('|')})`, 'gi');
    htmlString = htmlString.replace(combinedRegex, (match) => {
      const hl = hlMap[match.toLowerCase()];
      if (!hl) return match;
      hitCount += 1;
      const weight = hl.weight || hl.severity || hl.muc_do || 'Trung bình';
      const isSevere = /nghiêm|severe|cao|high/i.test(String(weight));
      const colorClass = isSevere ? 'xai-severe' : 'xai-moderate';
      const label = isSevere ? 'Mức độ: Nghiêm trọng' : 'Mức độ: Trung bình';
      const reasonStr = (hl.reason || hl.ly_do || 'Không có mô tả chi tiết')
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `<span class="xai-highlight ${colorClass}" data-label="${label}" data-tooltip="${reasonStr}" tabindex="0">${match}</span>`;
    });

    return { html: htmlString, hitCount };
  };

  const renderHighlightedText = (summaryText, highlights, sourceText) => {
    const summary = summaryText || '';
    const source = sourceText || text || '';
    if (!summary && !source) return <span></span>;

    const list = Array.isArray(highlights) ? highlights : [];
    if (list.length === 0) {
      return <span>{summary || source}</span>;
    }

    // Prefer the text that actually contains AI keywords (usually raw teacher note)
    const scoreSummary = countKeywordHits(summary, list);
    const scoreSource = countKeywordHits(source, list);
    const chosen =
      scoreSource > scoreSummary
        ? source
        : summary || source;

    const { html, hitCount } = applyHighlights(chosen, list);

    return (
      <div>
        <div dangerouslySetInnerHTML={{ __html: html }} style={{ lineHeight: '1.8' }} />
        {hitCount === 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
            AI có {list.length} từ khóa nhưng không khớp nguyên văn (tóm tắt khác câu gốc). Danh sách:
            <ul style={{ margin: '6px 0 0 18px' }}>
              {list.slice(0, 6).map((h, i) => (
                <li key={i}>
                  <strong className={/nghiêm/i.test(String(h.weight || '')) ? 'xai-severe' : 'xai-moderate'}
                    style={{
                      background: /nghiêm/i.test(String(h.weight || '')) ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.18)',
                      padding: '1px 6px',
                      borderRadius: 4,
                    }}
                  >
                    {h.keyword || h.text || h.tu_khoa}
                  </strong>
                  {h.reason ? ` — ${h.reason}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="obs-layout">
      <div className="bento-card obs-main-card">
        <div className="bento-header">
          <div>
            <h2 className="bento-title"><FileText size={18}/> Ghi nhận quan sát</h2>
            <p className="obs-subtitle">
              AI chỉ hỗ trợ — văn bản và media đều là bản nháp; GV xác nhận mới tính điểm rủi ro.
            </p>
          </div>
        </div>

        <div className="obs-ops-banner" role="note">
          <ShieldCheck size={15} />
          <div>
            <strong>HITL:</strong> Phân tích văn bản / audio-video → bản nháp (chưa vào điểm).
            Đọc/sửa ô bên dưới → <strong>Xác nhận ghi hồ sơ</strong>.
            Media gửi dịch vụ AI đám mây — chỉ khi có đồng ý nhà trường/PH.
          </div>
        </div>
        
        <textarea 
          className="premium-input"
          placeholder="Nhập chuỗi sự kiện, hành vi quan sát được của trẻ trong giờ học, giờ ăn, hoặc hoạt động ngoại khóa..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        
        <div className="obs-actions">
          <button className="btn-premium" onClick={handleAnalyze} disabled={analyzing || confirming || !text.trim()}>
            {analyzing ? <><div className="loader-spinner"></div> Đang phân tích…</> : <><Layers size={16}/> Phân tích văn bản</>}
          </button>
          <label className={`btn-premium obs-file-btn ${analyzing || confirming ? 'is-disabled' : ''}`}>
            {analyzing ? <><div className="loader-spinner"></div> Đang xử lý media…</> : <><Upload size={16}/> Audio / video</>}
            <input type="file" accept="audio/*,video/*,image/*" capture="environment" style={{display: 'none'}} onChange={handleFileUpload} disabled={analyzing || confirming} />
          </label>
          {result && (
            <button 
              className="btn-secondary" 
              onClick={() => { setText(''); setResult(null); setIsLiveResult(false); setPendingLogId(null); sessionStorage.removeItem(`draft-${studentId}`); }} 
              title="Xóa form để nhập quan sát mới"
              disabled={analyzing || confirming}
            >
              <RefreshCw size={16}/> Quan sát mới
            </button>
          )}
        </div>

        {pendingLogId && result && !result.analysis_failed && (
          <div className="obs-confirm-bar">
            <div className="obs-confirm-copy">
              <AlertTriangle size={16} />
              <div>
                <strong>Bản nháp AI — chưa tính điểm rủi ro</strong>
                <span>Sửa mô tả cho đúng thực tế quan sát, rồi xác nhận. Hoặc bỏ nháp nếu AI sai.</span>
              </div>
            </div>
            <div className="obs-confirm-actions">
              <button type="button" className="btn-secondary" onClick={handleDiscardDraft} disabled={confirming}>
                Bỏ nháp
              </button>
              <button type="button" className="btn-premium" onClick={handleConfirmObservation} disabled={confirming || !text.trim()}>
                {confirming ? <><div className="loader-spinner"></div> Đang ghi…</> : <><ShieldCheck size={16}/> Xác nhận ghi hồ sơ</>}
              </button>
            </div>
          </div>
        )}

        {result && (() => {
          const score = Number(result.diem_nguy_co || 0);
          const riskLv = score >= 3 ? 'high' : (score >= 2 ? 'mid' : 'low');
          const riskLabel = score < 2 ? 'An toàn' : score < 3 ? 'Theo dõi' : score < 3.6 ? 'Đáng kể' : 'Báo động';
          const confRaw = String(result.xai_confidence || '').replace('%', '').trim();
          const confNum = confRaw && !Number.isNaN(Number(confRaw)) ? Math.max(0, Math.min(100, Number(confRaw))) : null;
          const scorePct = Math.max(0, Math.min(100, ((score - 1) / 3) * 100));
          const highlights = Array.isArray(result.xai_highlights) ? result.xai_highlights : [];
          const hlCount = highlights.length;
          const ringR = 54;
          const ringC = 2 * Math.PI * ringR;
          const ringOffset = ringC * (1 - scorePct / 100);

          return (
            <div className="obs-dossier">
              <div className={`obs-dossier-banner risk-${riskLv}`}>
                <div className="obs-dossier-banner-main">
                  <div className="obs-dossier-badge-row">
                    <span className="obs-dossier-badge">Hồ sơ quan sát</span>
                    <span className={`obs-status ${result.analysis_failed ? 'err' : (isLiveResult ? 'live' : 'saved')}`}>
                      {result.analysis_failed ? 'Chưa hoàn tất' : (isLiveResult ? 'Vừa phân tích' : 'Đã lưu')}
                    </span>
                  </div>
                  <h3 className="obs-dossier-title">
                    {result.analysis_failed ? 'Phân tích chưa hoàn tất' : `Mức ${riskLabel} · CARS ${score.toFixed(1)}/4.0`}
                  </h3>
                  <p className="obs-dossier-desc">
                    {score < 2
                      ? 'Biểu hiện trong ngưỡng an toàn. Tiếp tục theo dõi định kỳ và ghi nhận tích cực.'
                      : score < 3
                        ? 'Có dấu hiệu cần theo dõi. Nên bổ sung quan sát và khảo sát phụ huynh.'
                        : 'Dấu hiệu đáng chú ý. Ưu tiên kiểm chứng tại lớp và trao đổi chuyên môn.'}
                  </p>
                  <div className="obs-dossier-actions">
                    <button type="button" className="obs-dossier-btn" onClick={() => setShowAiReasoning(true)}>
                      <Brain size={14} /> Lập luận AI
                    </button>
                    {result.kich_ban_test_kiem_chung && (
                      <span className="obs-dossier-chip"><Stethoscope size={12} /> Có gợi ý kiểm chứng</span>
                    )}
                    {hlCount > 0 && (
                      <span className="obs-dossier-chip"><Sparkles size={12} /> {hlCount} căn cứ XAI</span>
                    )}
                  </div>
                </div>

                <div className="obs-dossier-ring-wrap" aria-label={`Điểm CARS ${score.toFixed(1)}`}>
                  <svg className="obs-dossier-ring" width="140" height="140" viewBox="0 0 140 140">
                    <circle cx="70" cy="70" r={ringR} fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="10" />
                    <circle
                      cx="70" cy="70" r={ringR} fill="none"
                      stroke="currentColor" strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={ringC} strokeDashoffset={ringOffset}
                      transform="rotate(-90 70 70)"
                      className="obs-dossier-ring-progress"
                    />
                  </svg>
                  <div className="obs-dossier-ring-center">
                    <strong>{score.toFixed(1)}</strong>
                    <span>CARS</span>
                  </div>
                </div>
              </div>

              {result.analysis_failed && (
                <div className="obs-alert">
                  AI không hoàn tất. Điểm 1.0 là mức trung lập kỹ thuật — không dùng để kết luận. Thử phân tích lại.
                </div>
              )}

              <div className="obs-kpi-strip">
                <div className="obs-kpi">
                  <div className="obs-kpi-icon cars"><Gauge size={16} /></div>
                  <div>
                    <div className="obs-kpi-label">CARS</div>
                    <div className={`obs-kpi-value risk-${riskLv}`}>{score.toFixed(1)}<em>/4</em></div>
                  </div>
                </div>
                <div className="obs-kpi">
                  <div className="obs-kpi-icon conf"><ShieldCheck size={16} /></div>
                  <div>
                    <div className="obs-kpi-label">Tin cậy</div>
                    <div className="obs-kpi-value">{confNum != null ? `${confNum}%` : '—'}</div>
                  </div>
                  {confNum != null && (
                    <div className="obs-kpi-bar" aria-hidden>
                      <i style={{ width: `${confNum}%` }} />
                    </div>
                  )}
                </div>
                <div className="obs-kpi">
                  <div className="obs-kpi-icon skill"><Target size={16} /></div>
                  <div>
                    <div className="obs-kpi-label">Kỹ năng</div>
                    <div className="obs-kpi-value sm">{result.nhom_ky_nang || 'Chưa có'}</div>
                  </div>
                </div>
                <div className="obs-kpi">
                  <div className="obs-kpi-icon evi"><BookOpen size={16} /></div>
                  <div>
                    <div className="obs-kpi-label">Căn cứ</div>
                    <div className="obs-kpi-value">{hlCount}</div>
                  </div>
                </div>
              </div>

              {hlCount > 0 && (
                <div className="obs-evidence">
                  <div className="obs-evidence-label">Từ khóa nổi bật</div>
                  <div className="obs-evidence-list">
                    {highlights.slice(0, 8).map((h, i) => {
                      const severe = /nghiêm|severe|cao|high/i.test(String(h.weight || h.severity || ''));
                      return (
                        <span key={i} className={`obs-evidence-chip ${severe ? 'severe' : 'mod'}`} title={h.reason || ''}>
                          {h.keyword || h.text || h.tu_khoa}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <section className="obs-panel elevated">
                <div className="obs-panel-head">
                  <div className="obs-panel-head-left">
                    <span className="obs-panel-ico"><Activity size={15} /></span>
                    <div>
                      <h3 className="obs-panel-title">Văn bản có chú thích AI</h3>
                      <p className="obs-panel-sub">Rê chuột cụm bôi màu để xem căn cứ</p>
                    </div>
                  </div>
                  {hlCount > 0 && <span className="obs-panel-badge">{hlCount} căn cứ</span>}
                </div>
                <div className="obs-panel-body">
                  <div className="obs-prose">
                    {renderHighlightedText(
                      result.hanh_vi_goc,
                      result.xai_highlights,
                      text || result.raw_text_ref || result.raw_text
                    )}
                  </div>
                  {hlCount === 0 && (
                    <div className="obs-empty-inline">
                      Chưa có từ khóa bôi màu — thường gặp ở bản ghi cũ hoặc quan sát bình thường.
                    </div>
                  )}
                </div>
              </section>

              <div className="obs-two-col">
                {result.ma_chuan_y_khoa && (
                  <section className="obs-panel elevated">
                    <div className="obs-panel-head">
                      <div className="obs-panel-head-left">
                        <span className="obs-panel-ico"><BookOpen size={15} /></span>
                        <div>
                          <h3 className="obs-panel-title">Tham chiếu sàng lọc</h3>
                          <p className="obs-panel-sub">Không thay thế chẩn đoán</p>
                        </div>
                      </div>
                    </div>
                    <div className="obs-panel-body">
                      <p className="obs-ref-text">{result.ma_chuan_y_khoa}</p>
                    </div>
                  </section>
                )}

                {result.kich_ban_test_kiem_chung && (
                  <section className="obs-panel elevated">
                    <div className="obs-panel-head">
                      <div className="obs-panel-head-left">
                        <span className="obs-panel-ico"><Stethoscope size={15} /></span>
                        <div>
                          <h3 className="obs-panel-title">Gợi ý kiểm chứng</h3>
                          <p className="obs-panel-sub">Thực hành tại lớp</p>
                        </div>
                      </div>
                    </div>
                    <div className="obs-panel-body">
                      {typeof result.kich_ban_test_kiem_chung === 'string' ? (
                        <p className="obs-ref-text">{result.kich_ban_test_kiem_chung}</p>
                      ) : (
                        <div className="obs-protocol">
                          <div className="obs-protocol-name">{result.kich_ban_test_kiem_chung?.ten_bai_tap || 'Bài kiểm chứng'}</div>
                          <dl className="obs-dl">
                            <div><dt>Mục đích</dt><dd>{result.kich_ban_test_kiem_chung?.muc_dich || '—'}</dd></div>
                            <div><dt>Chuẩn bị</dt><dd>{result.kich_ban_test_kiem_chung?.chuan_bi || '—'}</dd></div>
                            <div>
                              <dt>Các bước</dt>
                              <dd>
                                <ol>
                                  {Array.isArray(result.kich_ban_test_kiem_chung?.cac_buoc)
                                    ? result.kich_ban_test_kiem_chung.cac_buoc.map((step, idx) => <li key={idx}>{step}</li>)
                                    : <li>Chưa có hướng dẫn chi tiết</li>}
                                </ol>
                              </dd>
                            </div>
                          </dl>
                          <div className="obs-criteria">
                            <div className="pass">
                              <strong>Đạt</strong>
                              <span>{result.kich_ban_test_kiem_chung?.tieu_chi_dat || '—'}</span>
                            </div>
                            <div className="fail">
                              <strong>Không đạt</strong>
                              <span>{result.kich_ban_test_kiem_chung?.tieu_chi_khong_dat || '—'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </div>
          );
        })()}
      </div>
      
      <div className="bento-card obs-history-card">
        <div className="bento-header obs-history-header">
          <div>
            <h2 className="bento-title"><Clock size={16}/> Lịch sử quan sát</h2>
            <p className="obs-subtitle">
              {(dashboardData?.history_logs || []).length} bản ghi · bấm để xem lại
            </p>
          </div>
        </div>
        <div className="obs-history-list">
          {(!dashboardData?.history_logs || dashboardData.history_logs.length === 0) ? (
            <div className="obs-history-empty">
              <div className="obs-history-empty-title">Chưa có lịch sử</div>
              <div>Phân tích quan sát đầu tiên để bắt đầu theo dõi.</div>
            </div>
          ) : (
            dashboardData.history_logs.map((log, idx) => {
              const score = log.parsed_json?.diem_nguy_co;
              const skill = log.parsed_json?.nhom_ky_nang;
              const conf = log.parsed_json?.xai_confidence;
              const active = result && text === log.raw_text;
              return (
                <button
                  key={log.id}
                  type="button"
                  className={`obs-history-item ${active ? 'active' : ''}`}
                  onClick={() => {
                    setText(log.raw_text);
                    setResult(log.parsed_json);
                    setIsLiveResult(false);
                  }}
                >
                  <div className="obs-history-rail" aria-hidden>
                    <span className="obs-history-dot" />
                    {idx < dashboardData.history_logs.length - 1 && <span className="obs-history-line" />}
                  </div>
                  <div className="obs-history-body">
                    <div className="obs-history-top">
                      <span className="obs-history-date">{log.date}</span>
                      {score != null && (
                        <span className={`obs-history-score risk-${score >= 3 ? 'high' : (score >= 2 ? 'mid' : 'low')}`}>
                          {Number(score).toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="obs-history-text">{log.raw_text}</div>
                    <div className="obs-history-tags">
                      {skill && <span className="obs-history-tag">{skill}</span>}
                      {conf && <span className="obs-history-tag soft">Tin cậy {conf}</span>}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
      
      {showAiReasoning && (() => {
        const score = Number(result?.diem_nguy_co ?? 0);
        const confRaw = String(result?.xai_confidence || '').replace('%', '').trim();
        const confNum = confRaw && !Number.isNaN(Number(confRaw))
          ? Math.max(0, Math.min(100, Number(confRaw)))
          : null;
        const highlights = Array.isArray(result?.xai_highlights) ? result.xai_highlights : [];
        const severeN = highlights.filter((h) => /nghiêm|severe|cao|high/i.test(String(h.weight || h.severity || ''))).length;
        const midN = Math.max(0, highlights.length - severeN);
        const riskLabel = score < 2 ? 'An toàn' : score < 3 ? 'Theo dõi' : score < 3.6 ? 'Đáng kể' : 'Báo động';
        const riskTone = score < 2 ? '#0f766e' : score < 3 ? '#b45309' : score < 3.6 ? '#c2410c' : '#b91c1c';
        const scorePct = Math.max(6, Math.min(100, ((Math.max(score, 1) - 1) / 3) * 100));
        const skill = result?.nhom_ky_nang || result?.skill_group || '—';
        const sourceText = (result?.hanh_vi_goc || text || '').trim();
        const mapRef = result?.ma_chuan_y_khoa || 'Chưa có tham chiếu khung sàng lọc';
        const scoreWhy = result?.diem_nguy_co_giai_thich || 'Chưa có diễn giải điểm.';
        const probe = result?.kich_ban_test_kiem_chung;
        const steps = [
          { n: 1, label: 'Bằng chứng', icon: Eye },
          { n: 2, label: 'Khung tham chiếu', icon: BookOpen },
          { n: 3, label: 'Định lượng', icon: Scale },
          { n: 4, label: 'Căn cứ XAI', icon: Sparkles },
          { n: 5, label: 'Con người quyết', icon: ShieldCheck },
        ];

        return (
          <div
            className="xai-modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="xai-modal-title"
            onClick={() => setShowAiReasoning(false)}
          >
            <div className="xai-modal" onClick={(e) => e.stopPropagation()}>
              <header className="xai-modal-head">
                <div className="xai-modal-head-main">
                  <div className="xai-modal-icon"><Brain size={20} /></div>
                  <div>
                    <h3 id="xai-modal-title">Giải mã lập luận AI</h3>
                    <p>Minh bạch từng bước — sàng lọc giáo dục, không chẩn đoán y khoa.</p>
                  </div>
                </div>
                <button type="button" className="xai-modal-close" onClick={() => setShowAiReasoning(false)} aria-label="Đóng">
                  <X size={18} />
                </button>
              </header>

              <div className="xai-modal-body">
                <div className="xai-disclaimer">
                  <AlertTriangle size={15} />
                  <div>
                    <strong>Không phải chẩn đoán.</strong>
                    {' '}Kết quả chỉ hỗ trợ giáo viên quan sát theo khung tham chiếu (CARS-like 1–4, ngôn ngữ DSM-5-TR).
                    Quyết định cuối cùng thuộc về con người (human-in-the-loop).
                  </div>
                </div>

                <div className="xai-kpi-row">
                  <div className="xai-kpi">
                    <span className="xai-kpi-label">Mức sàng lọc</span>
                    <strong style={{ color: riskTone }}>{riskLabel}</strong>
                    <span className="xai-kpi-sub">CARS-like {Number.isFinite(score) ? score.toFixed(1) : '—'} / 4.0</span>
                  </div>
                  <div className="xai-kpi">
                    <span className="xai-kpi-label">Độ tin cậy AI</span>
                    <strong>{confNum != null ? `${confNum}%` : (result?.xai_confidence || '—')}</strong>
                    <span className="xai-kpi-sub">Tự đánh giá mô hình</span>
                  </div>
                  <div className="xai-kpi">
                    <span className="xai-kpi-label">Căn cứ XAI</span>
                    <strong>{highlights.length}</strong>
                    <span className="xai-kpi-sub">{severeN} cao · {midN} TB</span>
                  </div>
                  <div className="xai-kpi">
                    <span className="xai-kpi-label">Nhóm kỹ năng</span>
                    <strong className="xai-kpi-skill">{skill}</strong>
                    <span className="xai-kpi-sub">Phân loại quan sát</span>
                  </div>
                </div>

                <ol className="xai-pipeline" aria-label="Pipeline 5 bước">
                  {steps.map((s) => {
                    const Icon = s.icon;
                    return (
                      <li key={s.n}>
                        <span className="xai-pipe-n"><Icon size={13} /> {s.n}</span>
                        <span className="xai-pipe-l">{s.label}</span>
                      </li>
                    );
                  })}
                </ol>

                {/* 1 */}
                <section className="xai-step">
                  <div className="xai-step-badge b1"><Eye size={13} /> Bước 1 · Tiếp nhận bằng chứng</div>
                  <p className="xai-step-lead">
                    AI chỉ đọc nội dung giáo viên cung cấp (văn bản / bản nháp media đã chuyển lời). Không suy đoán ngoài dữ liệu.
                  </p>
                  <blockquote className="xai-quote">
                    {sourceText ? `“${sourceText}”` : '— Chưa có nội dung quan sát —'}
                  </blockquote>
                  <div className="xai-meta-chips">
                    <span><FileText size={12} /> Nguồn: ghi chú GV</span>
                    <span><Users size={12} /> Vai trò AI: hỗ trợ</span>
                    <span><ClipboardList size={12} /> Trạng thái: {isLiveResult ? 'vừa phân tích' : 'đã lưu hồ sơ'}</span>
                  </div>
                </section>

                {/* 2 */}
                <section className="xai-step">
                  <div className="xai-step-badge b2"><BookOpen size={13} /> Bước 2 · Ánh xạ khung tham chiếu</div>
                  <p className="xai-step-lead">
                    Hệ thống <strong>không chẩn đoán</strong>. Chỉ ánh xạ mô tả hành vi sang ngôn ngữ khung sàng lọc để GV đối chiếu nhanh.
                  </p>
                  <div className="xai-ref-box">
                    <div className="xai-ref-label">Tham chiếu (DSM-5-TR / CARS-like) — mang tính giáo dục</div>
                    <div className="xai-ref-body">{mapRef}</div>
                  </div>
                </section>

                {/* 3 */}
                <section className="xai-step">
                  <div className="xai-step-badge b3"><Scale size={13} /> Bước 3 · Định lượng CARS-like (1–4)</div>
                  <div className="xai-score-row">
                    <div className="xai-score-num" style={{ color: riskTone }}>
                      {Number.isFinite(score) ? score.toFixed(1) : '—'}
                      <small>/ 4.0</small>
                    </div>
                    <div className="xai-score-side">
                      <div className="xai-score-bar" aria-hidden>
                        <i style={{ width: `${scorePct}%`, background: riskTone }} />
                      </div>
                      <div className="xai-score-scale">
                        <span>1 An toàn</span><span>2 Theo dõi</span><span>3 Đáng kể</span><span>4 Báo động</span>
                      </div>
                    </div>
                  </div>
                  <p className="xai-score-why">{scoreWhy}</p>
                </section>

                {/* 4 */}
                <section className="xai-step">
                  <div className="xai-step-badge b4"><Sparkles size={13} /> Bước 4 · Căn cứ Explainable AI</div>
                  <p className="xai-step-lead">
                    Mỗi điểm dựa trên <strong>dấu hiệu cụ thể</strong> trong câu GV — có thể kiểm chứng ngược, không “hộp đen”.
                  </p>
                  {highlights.length === 0 ? (
                    <div className="xai-empty">Chưa có từ khóa XAI cho quan sát này.</div>
                  ) : (
                    <div className="xai-hl-list">
                      {highlights.map((hl, idx) => {
                        const w = String(hl.weight || hl.severity || hl.muc_do || 'Trung bình');
                        const severe = /nghiêm|severe|cao|high/i.test(w);
                        const kw = hl.keyword || hl.text || hl.tu_khoa || '—';
                        const reason = hl.reason || hl.ly_do || 'Chưa có diễn giải.';
                        return (
                          <article key={idx} className={`xai-hl-card ${severe ? 'sev' : 'mid'}`}>
                            <header>
                              <strong>“{kw}”</strong>
                              <span>{w}</span>
                            </header>
                            <p>{reason}</p>
                            <footer>
                              <CheckCircle2 size={12} />
                              Khớp nguyên văn ghi chú · có thể đối chiếu tay
                            </footer>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* 5 */}
                <section className="xai-step">
                  <div className="xai-step-badge b5"><ShieldCheck size={13} /> Bước 5 · Con người quyết định (HITL)</div>
                  <p className="xai-step-lead">
                    AI dừng ở gợi ý. Giáo viên xác nhận hồ sơ, bổ sung quan sát lớp, khảo sát PH hoặc probe trước khi kết luận chuyên môn.
                  </p>
                  <ul className="xai-next">
                    <li><CheckCircle2 size={14} /> Đọc lại / sửa ghi chú trước khi “Xác nhận ghi hồ sơ”.</li>
                    <li><CheckCircle2 size={14} /> Nếu mức ≥ 2: bổ sung quan sát khác thời điểm + khảo sát PH.</li>
                    <li><CheckCircle2 size={14} /> Dùng tab Kiểm chứng / probe để thu thập bằng chứng quan sát có rubric.</li>
                    {probe?.ten_bai_tap || probe?.name ? (
                      <li><Target size={14} /> Gợi ý kiểm chứng: <em>{probe.ten_bai_tap || probe.name}</em></li>
                    ) : null}
                  </ul>
                </section>

                <footer className="xai-modal-foot">
                  <ShieldCheck size={14} />
                  Đạo đức AI · giải thích được · human-in-the-loop · không thay thế bác sĩ / tâm lý lâm sàng.
                </footer>
              </div>

              <div className="xai-modal-actions">
                <button type="button" className="xai-btn-secondary" onClick={() => setShowAiReasoning(false)}>Đóng</button>
              </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
              .xai-modal-overlay{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px}
              .xai-modal{width:min(820px,100%);max-height:min(92vh,920px);background:#fff;border-radius:18px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 28px 64px rgba(15,23,42,.28);border:1px solid #e2e8f0}
              .xai-modal-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:18px 20px;background:linear-gradient(135deg,#1d2d50 0%,#133b5c 55%,#1d2d50 100%);color:#f0f4f8}
              .xai-modal-head-main{display:flex;gap:12px;align-items:flex-start;min-width:0}
              .xai-modal-icon{width:40px;height:40px;border-radius:12px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;background:rgba(186,55,10,.28);border:1px solid rgba(240,196,168,.35);color:#fdece6}
              .xai-modal-head h3{margin:0;font-size:17px;font-weight:800;letter-spacing:-.02em;color:#fff}
              .xai-modal-head p{margin:4px 0 0;font-size:12.5px;color:#c4d0e0;line-height:1.4}
              .xai-modal-close{border:1px solid rgba(240,244,248,.18);background:rgba(255,255,255,.06);color:#e2e8f0;border-radius:10px;width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
              .xai-modal-body{padding:18px 20px 8px;overflow-y:auto;background:#f5f7fb;display:flex;flex-direction:column;gap:14px}
              .xai-disclaimer{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:12px;background:#fdece6;border:1px solid rgba(186,55,10,.25);color:#7c2d12;font-size:13px;line-height:1.45}
              .xai-disclaimer strong{color:#ba370a}
              .xai-kpi-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
              @media (max-width:720px){.xai-kpi-row{grid-template-columns:repeat(2,minmax(0,1fr))}}
              .xai-kpi{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:2px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
              .xai-kpi-label{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64748b}
              .xai-kpi strong{font-size:18px;color:#0f172a;line-height:1.2}
              .xai-kpi-skill{font-size:14px!important}
              .xai-kpi-sub{font-size:11px;color:#94a3b8;font-weight:600}
              .xai-pipeline{list-style:none;margin:0;padding:10px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;background:#fff;border:1px solid #e2e8f0;border-radius:12px}
              @media (max-width:720px){.xai-pipeline{grid-template-columns:repeat(2,minmax(0,1fr))}}
              .xai-pipeline li{display:flex;flex-direction:column;gap:4px;align-items:flex-start;padding:8px;border-radius:10px;background:#f8fafc}
              .xai-pipe-n{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:800;color:#ba370a}
              .xai-pipe-l{font-size:11.5px;font-weight:700;color:#334155}
              .xai-step{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 16px 14px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
              .xai-step-badge{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:800;color:#fff;padding:5px 10px;border-radius:999px;margin-bottom:10px}
              .xai-step-badge.b1{background:#133b5c}.xai-step-badge.b2{background:#0f766e}.xai-step-badge.b3{background:#ba370a}.xai-step-badge.b4{background:#af5b3f}.xai-step-badge.b5{background:#1d2d50}
              .xai-step-lead{margin:0 0 10px;font-size:13px;color:#475569;line-height:1.5}
              .xai-quote{margin:0;padding:12px 14px;border-radius:10px;background:#f8fafc;border-left:3px solid #ba370a;color:#1e293b;font-size:14px;line-height:1.55;font-style:italic}
              .xai-meta-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
              .xai-meta-chips span{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:#475569;background:#f1f5f9;border:1px solid #e2e8f0;padding:4px 8px;border-radius:999px}
              .xai-ref-box{border:1px solid #d1fae5;background:#ecfdf5;border-radius:12px;padding:12px 14px}
              .xai-ref-label{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#0f766e;margin-bottom:6px}
              .xai-ref-body{font-size:13.5px;color:#134e4a;line-height:1.55}
              .xai-score-row{display:flex;gap:14px;align-items:center;margin-bottom:10px}
              .xai-score-num{font-size:34px;font-weight:900;line-height:1;letter-spacing:-.03em;min-width:88px}
              .xai-score-num small{font-size:14px;font-weight:700;color:#94a3b8;margin-left:2px}
              .xai-score-side{flex:1;min-width:0}
              .xai-score-bar{height:10px;border-radius:999px;background:#e2e8f0;overflow:hidden}
              .xai-score-bar i{display:block;height:100%;border-radius:999px}
              .xai-score-scale{display:flex;justify-content:space-between;gap:4px;margin-top:6px;font-size:10px;font-weight:700;color:#94a3b8}
              .xai-score-why{margin:0;font-size:13.5px;color:#334155;line-height:1.55;padding:10px 12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px}
              .xai-hl-list{display:flex;flex-direction:column;gap:8px}
              .xai-hl-card{border-radius:12px;border:1px solid #e2e8f0;background:#fff;padding:12px 12px 10px;border-left:4px solid #f59e0b}
              .xai-hl-card.sev{border-left-color:#ef4444;background:#fffafa}
              .xai-hl-card header{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:4px}
              .xai-hl-card header strong{font-size:14px;color:#0f172a}
              .xai-hl-card header span{flex-shrink:0;font-size:10.5px;font-weight:800;padding:3px 8px;border-radius:999px;background:#fef3c7;color:#b45309}
              .xai-hl-card.sev header span{background:#fee2e2;color:#b91c1c}
              .xai-hl-card p{margin:0;font-size:13px;color:#475569;line-height:1.45}
              .xai-hl-card footer{margin-top:8px;display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:#0f766e}
              .xai-empty{padding:14px;text-align:center;font-size:13px;color:#64748b;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc}
              .xai-next{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
              .xai-next li{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#334155;line-height:1.45;padding:10px 12px;border-radius:10px;background:#f8fafc;border:1px solid #e2e8f0}
              .xai-next li svg{flex-shrink:0;margin-top:2px;color:#0f766e}
              .xai-modal-foot{display:flex;align-items:center;justify-content:center;gap:8px;font-size:11.5px;font-weight:600;color:#64748b;padding:8px 4px 4px;text-align:center}
              .xai-modal-actions{padding:12px 20px 16px;border-top:1px solid #e2e8f0;background:#fff;display:flex;justify-content:flex-end}
              .xai-btn-secondary{border:1px solid #cbd5e1;background:#fff;color:#1e293b;font-weight:700;font-size:13px;padding:9px 16px;border-radius:10px;cursor:pointer}
              .xai-btn-secondary:hover{background:#f8fafc;border-color:#94a3b8}
            ` }} />
          </div>
        );
      })()}
    </div>
  );
}


export default BehaviorTab;
