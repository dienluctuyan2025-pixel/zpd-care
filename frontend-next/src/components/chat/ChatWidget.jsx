"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Send, RotateCcw, BarChart3, ListChecks, FlaskConical, Users, Target,
} from 'lucide-react';
import { api } from '@/lib/api';

const DOCTOR_SRC = '/doctor_avatar.jpg';

const WELCOME =
  'Xin chào. Tôi là trợ lý hồ sơ ZPD — bám sát dữ liệu học sinh đang mở. Hỏi về điểm, quan sát, probe, khảo sát PH hoặc gợi ý việc làm lớp/nhà. Không chẩn đoán y khoa.';

const QUICK_PROMPTS = [
  { id: 'explain', label: 'Giải thích điểm', icon: BarChart3, text: 'Giải thích điểm sàng lọc hiện tại và các nguồn GV / PH / Probe đóng góp thế nào?' },
  { id: 'next', label: 'Việc làm tiếp', icon: ListChecks, text: 'Dựa trên hồ sơ, 3 việc giáo viên nên làm tiếp theo tại lớp là gì?' },
  { id: 'probe', label: 'Gợi ý probe', icon: FlaskConical, text: 'Nên ưu tiên module kiểm chứng nào và vì sao? Nếu thiếu dữ liệu hãy nói rõ.' },
  { id: 'parent', label: 'Gợi ý PH', icon: Users, text: 'Gợi ý cách trao đổi với phụ huynh ngắn gọn, không gây hoang mang, dựa trên hồ sơ hiện có.' },
  { id: 'zpd', label: 'ZPD lớp/nhà', icon: Target, text: 'Tóm tắt gợi ý ZPD cho nhà trường và gia đình; nếu chưa có thì đề xuất scaffolding cơ bản theo mức điểm.' },
];

function DoctorAvatar({ size = 40, className = '', alt = '' }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={DOCTOR_SRC}
      alt={alt}
      width={size}
      height={size}
      className={className}
      draggable={false}
    />
  );
}

function formatChatText(text) {
  const safe = String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return safe
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

function ChatWidget({ studentId, studentName, riskScore, riskStatus }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', text: WELCOME }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const riskLabel = useMemo(() => {
    if (riskScore == null || Number.isNaN(Number(riskScore))) return null;
    return Number(riskScore).toFixed(2);
  }, [riskScore]);

  const riskTone = useMemo(() => {
    const sc = Number(riskScore);
    if (Number.isNaN(sc)) return 'neutral';
    if (sc < 2) return 'ok';
    if (sc < 3) return 'watch';
    if (sc < 3.6) return 'risk';
    return 'alert';
  }, [riskScore]);

  useEffect(() => {
    setMessages([{ role: 'assistant', text: WELCOME }]);
    setInput('');
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, loading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [isOpen]);

  const sendMessage = async (rawText) => {
    const userMsg = String(rawText || '').trim();
    if (!userMsg || !studentId || loading) return;

    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-8)
      .map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);
    try {
      const res = await api.post('/chat', {
        student_id: studentId,
        message: userMsg,
        history,
      });
      const reply = res.data?.reply || 'Không có nội dung trả lời.';
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Không kết nối được trợ lý lúc này. Kiểm tra API :8000 rồi thử lại.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => sendMessage(input);

  const resetChat = () => {
    setMessages([{ role: 'assistant', text: WELCOME }]);
    setInput('');
    setLoading(false);
  };

  return (
    <div className="chat-widget-container chat-v4">
      {isOpen ? (
        <div className="chat-panel" role="dialog" aria-label="Trợ lý hồ sơ ZPD">
          <header className="chat-panel-head">
            <div className="chat-brand">
              <span className="chat-brand-mark photo" aria-hidden>
                <DoctorAvatar size={40} className="chat-doctor-img" />
              </span>
              <div className="chat-brand-text">
                <div className="chat-brand-title">Trợ lý ZPD</div>
                <div className="chat-brand-sub">
                  {studentName || 'Học sinh đang chọn'}
                </div>
              </div>
            </div>
            <div className="chat-head-right">
              {riskLabel != null && (
                <span className={`chat-risk-pill tone-${riskTone}`} title={riskStatus || 'Điểm sàng lọc'}>
                  {riskLabel}
                  <small>/4</small>
                </span>
              )}
              <button type="button" className="chat-icon-btn" onClick={resetChat} title="Làm mới hội thoại" aria-label="Làm mới">
                <RotateCcw size={14} />
              </button>
              <button type="button" className="chat-icon-btn danger" onClick={() => setIsOpen(false)} aria-label="Đóng">
                <X size={15} />
              </button>
            </div>
          </header>

          <div className="chat-trust">
            <span className="chat-trust-dot" />
            Sàng lọc giáo dục · bám hồ sơ · không chẩn đoán
          </div>

          <div className="chat-stream">
            {messages.map((m, i) => (
              <div key={i} className={`chat-row ${m.role}`}>
                {m.role === 'assistant' && (
                  <span className="chat-avatar photo" aria-hidden>
                    <DoctorAvatar size={28} className="chat-doctor-img" />
                  </span>
                )}
                <div
                  className={`chat-bubble ${m.role}`}
                  dangerouslySetInnerHTML={{ __html: formatChatText(m.text) }}
                />
              </div>
            ))}
            {loading && (
              <div className="chat-row assistant">
                <span className="chat-avatar photo" aria-hidden>
                  <DoctorAvatar size={28} className="chat-doctor-img" />
                </span>
                <div className="chat-bubble assistant typing">
                  <span className="chat-typing"><span /><span /><span /></span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="chat-chips">
            {QUICK_PROMPTS.map((q) => {
              const Icon = q.icon;
              return (
                <button
                  key={q.id}
                  type="button"
                  className="chat-chip"
                  disabled={loading || !studentId}
                  onClick={() => sendMessage(q.text)}
                >
                  <Icon size={12} strokeWidth={2.4} />
                  {q.label}
                </button>
              );
            })}
          </div>

          <footer className="chat-compose">
            <input
              ref={inputRef}
              type="text"
              placeholder="Hỏi về điểm, probe, PH, việc làm lớp…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
              maxLength={1500}
            />
            <button
              type="button"
              className="chat-send"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              aria-label="Gửi"
            >
              <Send size={16} strokeWidth={2.2} />
            </button>
          </footer>
        </div>
      ) : (
        <button
          type="button"
          className="chat-fab photo"
          onClick={() => setIsOpen(true)}
          title="Mở trợ lý hồ sơ ZPD"
          aria-label="Mở trợ lý hồ sơ ZPD"
        >
          <span className="chat-fab-ring" aria-hidden />
          <span className="chat-fab-core photo">
            <DoctorAvatar size={52} className="chat-doctor-img fab" alt="" />
          </span>
          <span className="chat-fab-label">ZPD</span>
        </button>
      )}
    </div>
  );
}

export default ChatWidget;
