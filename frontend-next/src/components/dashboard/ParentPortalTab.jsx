"use client";
import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, ShieldCheck, User } from 'lucide-react';
import { api } from '@/lib/api';
import { toastError, toastSuccess, toastWarn } from '@/lib/toast';

/** Khảo sát PH — giáo viên nhập kết quả vào hồ sơ HS. */
function ParentPortalTab({ studentId, studentName, refreshTrigger, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loadingQs, setLoadingQs] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [contactNote, setContactNote] = useState('');
  const abortControllerRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!studentId) return;
    setIsSubmitted(false);
    setLoadingQs(true);
    setCurrentStep(0);
    setAnswers({});
    setContactNote('');

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    api.get(`/students/${studentId}/survey-questions`, { signal: controller.signal })
      .then((res) => {
        setQuestions(res.data.questions || []);
      })
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return;
        console.error(err);
        setQuestions([
          { id: 'q1', text: 'Khi ở nhà, bé có thường xuyên bị hoảng sợ quá mức bởi các âm thanh lớn không?', type: 'routine', reason: 'Giúp đánh giá độ nhạy cảm giác quan.' },
          { id: 'q2', text: 'Bé có thường xuyên vỗ tay liên tục hoặc lắc lư người một cách vô thức không?', type: 'routine', reason: 'Nhằm xác định các hành vi lặp lại.' },
          { id: 'q3', text: 'Khi bé đang buồn bực, bé có cực kỳ khó bình tĩnh lại ngay cả khi được vỗ về không?', type: 'social', reason: 'Đánh giá khả năng điều chỉnh cảm xúc.' },
          { id: 'q4', text: 'Bé có hay tránh né giao tiếp bằng mắt khi anh/chị gọi tên bé không?', type: 'social', reason: 'Giao tiếp bằng mắt là cột mốc quan trọng để đánh giá kết nối xã hội.' },
          { id: 'q5', text: 'Bé có thường bỏ dở trò chơi chỉ sau 1-2 phút và không thể tập trung không?', type: 'attention', reason: 'Giúp sàng lọc vấn đề duy trì sự chú ý.' },
        ]);
      })
      .finally(() => {
        if (abortControllerRef.current === controller) setLoadingQs(false);
      });
  }, [studentId, refreshTrigger]);

  const handleSelect = (qId, val) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (currentStep < questions.length - 1) {
      timeoutRef.current = setTimeout(() => setCurrentStep((p) => p + 1), 350);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      toastWarn('Vui lòng trả lời đủ các câu (theo thông tin PH cung cấp).');
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setSubmitting(true);
    try {
      const qs = questions.map((q) => ({
        ...q,
        entered_by: 'teacher',
        contact_note: contactNote || undefined,
      }));
      await api.post(
        `/surveys`,
        { student_id: studentId, answers, questions: qs },
        { signal: controller.signal }
      );
      if (abortControllerRef.current === controller) {
        setIsSubmitted(true);
        setSubmitting(false);
        toastSuccess('Đã lưu khảo sát PH (do giáo viên nhập)');
        if (onComplete) onComplete();
      }
    } catch (error) {
      if (error?.code !== 'ERR_CANCELED') {
        console.error(error);
        toastError(error?.response?.data?.detail || 'Không gửi được khảo sát. Thử lại.');
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="bento-card parent-entry-card">
      <div className="bento-header">
        <div>
          <h2 className="bento-title"><User size={18} /> Khảo sát phụ huynh</h2>
          <p className="obs-subtitle">
            {studentName ? `Học sinh: ${studentName}` : 'Nhập kết quả khảo sát từ phụ huynh'}
            {' · '}Điểm PH = 30% tổng hợp
          </p>
        </div>
      </div>

      <div className="parent-survey-container">
        {loadingQs ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
            <div className="loader-spinner" style={{ margin: '0 auto 12px', borderColor: 'rgba(186,55,10,0.25)', borderTopColor: '#ba370a' }} />
            Đang tải câu hỏi khảo sát…
          </div>
        ) : isSubmitted ? (
          <div className="parent-success-box">
            <CheckCircle size={28} />
            <h4>Đã ghi nhận khảo sát</h4>
            <p>Đã cập nhật hồ sơ. Điểm PH (30%) đã vào chỉ số tổng hợp.</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setIsSubmitted(false);
                setAnswers({});
                setCurrentStep(0);
              }}
            >
              Nhập thêm lần khác
            </button>
          </div>
        ) : questions.length === 0 ? (
          <div className="parent-success-box soft">
            <ShieldCheck size={28} />
            <h4>Chưa có bộ câu hỏi</h4>
            <p>Hãy có ít nhất một quan sát hành vi đã phân tích để hệ thống gợi ý câu hỏi phù hợp, hoặc dùng bộ câu hỏi mặc định sau khi tải lại.</p>
          </div>
        ) : (
          <div className="wizard-container">
            <label className="parent-contact-field">
              Ghi chú (tuỳ chọn)
              <input
                type="text"
                value={contactNote}
                onChange={(e) => setContactNote(e.target.value)}
                placeholder="Nguồn / ngày lấy thông tin…"
              />
            </label>

            <div className="parent-wizard-progress">
              <div style={{ width: `${((currentStep + 1) / Math.max(questions.length, 1)) * 100}%` }} />
            </div>
            <div className="wizard-step-counter">
              Câu {currentStep + 1} / {questions.length}
            </div>

            <div className="survey-step-wrapper">
              {questions.map((q, idx) => (
                <div
                  key={q.id || `q-${idx}`}
                  className={`survey-step ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'prev' : ''} ${idx > currentStep ? 'next' : ''}`}
                >
                  <div className="q-text">{q.text}</div>
                  {q.reason && (
                    <div className="q-reason">
                      <strong>Gợi ý:</strong> {q.reason}
                    </div>
                  )}
                  <div className="radio-group">
                    <label
                      className={`radio-btn ${answers[q.id] === 0 ? 'selected no' : ''}`}
                      onClick={(e) => { e.preventDefault(); handleSelect(q.id, 0); }}
                    >
                      <input type="radio" name={q.id} checked={answers[q.id] === 0} readOnly style={{ display: 'none' }} />
                      <div className="radio-content">
                        <span className="r-title">Không</span>
                        <span className="r-desc">PH cho biết không quan sát thấy</span>
                      </div>
                    </label>
                    <label
                      className={`radio-btn ${answers[q.id] === 1 ? 'selected yes' : ''}`}
                      onClick={(e) => { e.preventDefault(); handleSelect(q.id, 1); }}
                    >
                      <input type="radio" name={q.id} checked={answers[q.id] === 1} readOnly style={{ display: 'none' }} />
                      <div className="radio-content">
                        <span className="r-title">Có</span>
                        <span className="r-desc">PH có quan sát thấy dấu hiệu này</span>
                      </div>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="wizard-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={currentStep === 0}
                onClick={() => setCurrentStep((p) => p - 1)}
              >
                Quay lại
              </button>

              <div style={{ display: 'flex', gap: 12 }}>
                {currentStep < questions.length - 1 && answers[questions[currentStep]?.id] !== undefined && (
                  <button
                    type="button"
                    className="btn-premium"
                    onClick={() => {
                      if (timeoutRef.current) clearTimeout(timeoutRef.current);
                      setCurrentStep((p) => p + 1);
                    }}
                  >
                    Tiếp tục
                  </button>
                )}

                {currentStep === questions.length - 1 && Object.keys(answers).length === questions.length && (
                  <button type="button" className="btn-premium" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Đang lưu…' : 'Lưu khảo sát PH vào hồ sơ'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ParentPortalTab;
