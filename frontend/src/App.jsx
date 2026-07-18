import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { 
  FileText, Activity, Clock, LogOut, User, Target, BarChart2, CheckCircle, XCircle, UserCog, Stethoscope, Layers, Users, Home, Sparkles, ShieldCheck, Download, MessageCircle, X, Send, Upload, RefreshCw
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const API_URL = `http://${window.location.hostname}:8000/api`;

function App() {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTab, setActiveTab] = useState('tab1');
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState('expert'); // 'expert' | 'parent'
  const abortControllerRef = React.useRef(null);

  const loadDashboard = (id, softRefresh = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (!softRefresh) {
      setDashboardData(null);
      setLoading(true);
    }
    axios.get(`${API_URL}/students/${id}/dashboard`, { signal: controller.signal })
      .then(res => {
        setDashboardData(res.data);
      })
      .catch(err => {
        if (!axios.isCancel(err)) {
          console.error(err);
        }
      })
      .finally(() => {
        if (abortControllerRef.current === controller) {
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    axios.get(`${API_URL}/students`).then(res => {
      setStudents(res.data);
      if (res.data.length > 0) setSelectedStudentId(res.data[0].id);
    }).catch(err => console.error(err));
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      loadDashboard(selectedStudentId, false);
    }
  }, [selectedStudentId]);

  if (!students.length) return <div style={{padding: '3rem', textAlign: 'center'}}>Đang kết nối cơ sở dữ liệu học đường...</div>;

  return (
    <div className="app-container">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand-area">
          <div className="brand-icon" style={{background: 'transparent', boxShadow: 'none'}}>
            <img src="/logo.jpg" alt="ZPD Analytics Logo" style={{width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'}} />
          </div>
          <div>
            <div className="brand-title">ZPD Analytics</div>
            <div className="brand-sub">HỆ THỐNG ĐÁNH GIÁ TÂM LÝ</div>
          </div>
        </div>
        
        <div className="role-switch">
          <button className={`role-btn ${currentRole === 'expert' ? 'active' : ''}`} onClick={() => { setCurrentRole('expert'); setActiveTab('tab1'); }}>Chuyên gia</button>
          <button className={`role-btn ${currentRole === 'parent' ? 'active' : ''}`} onClick={() => { setCurrentRole('parent'); setActiveTab('parent'); }}>Phụ huynh</button>
        </div>

        <div className="nav-section">
          <div className="nav-label">HỒ SƠ HỌC SINH</div>
          <select 
            className="custom-select"
            value={selectedStudentId} 
            onChange={e => setSelectedStudentId(Number(e.target.value))}
          >
            {students.map(s => (
              <option key={s.id} value={s.id} style={{color:'#000'}}>Mã: #{s.id.toString().padStart(4, '0')} - {s.name}</option>
            ))}
          </select>
        </div>

        <div className="user-profile">
          <div className="user-avatar"><UserCog size={18} color="var(--sidebar-bg)"/></div>
          <div>
            <div className="user-name">{currentRole === 'expert' ? 'GV. Nguyễn Văn A' : 'Phụ huynh học sinh'}</div>
            <div className="user-role">{currentRole === 'expert' ? 'Chuyên viên Tâm lý' : 'Tài khoản Gia đình'}</div>
          </div>
          <LogOut size={16} style={{marginLeft:'auto', cursor:'pointer'}} />
        </div>
      </aside>

      {/* HEADER & MAIN */}
      <div className="main-wrapper">
        <header className="top-header">
          <div style={{fontWeight:'700', color:'var(--text-main)', fontSize:'15px'}}>
            HỆ THỐNG ĐÁNH GIÁ TÂM LÝ - GIÁO DỤC VÀ THEO DÕI ZPD
          </div>
          
          <div className="header-actions">
            <span style={{fontSize:'12px', color:'var(--text-muted)', fontWeight:'600'}}>Phiên bản nội bộ v1.0.2</span>
          </div>
        </header>

        <main className="content-area">
          <div className="page-header">
            <div>
              <h1 className="page-title">
                {currentRole === 'expert' ? (
                  'Dashboard Y Khoa Lâm Sàng'
                ) : (
                  'Cổng Khảo Sát Tại Nhà (M-CHAT-R)'
                )}
              </h1>
              <div className="page-subtitle">Hồ sơ đang chọn: <strong>{dashboardData?.student_info.name}</strong></div>
            </div>
          </div>

          <div className="layout-grid">
            {/* LEFT PROFILE COLUMN */}
            <div className="profile-column">
              <div className="glass-panel profile-card animate-fade-in delay-1">
                <h3><User size={14} /> THÔNG TIN HỌC SINH</h3>
                {dashboardData && (
                  <>
                    <div className="info-list">
                      <div className="info-row">
                        <span className="info-key">Họ và tên</span>
                        <span className="info-val">{dashboardData.student_info.name}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-key">Mã định danh</span>
                        <span className="info-val">#{dashboardData.student_info.id.toString().padStart(4, '0')}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-key">Lớp quản lý</span>
                        <span className="info-val">{dashboardData.student_info.class_name}</span>
                      </div>
                    </div>

                    <div className="risk-box">
                      <h4>CHỈ SỐ RỦI RO ZPD</h4>
                      <div className="score">{dashboardData.risk_profile.risk_score}</div>
                      <div className="status" style={{color: dashboardData.risk_profile.color === 'red' ? 'var(--danger)' : 'var(--success)'}}>
                        {dashboardData.risk_profile.status}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* RIGHT CONTENT COLUMN */}
            <div className="content-column">
              {loading ? (
                 <div style={{padding:'40px', textAlign:'center', color:'var(--text-muted)'}}>Đang tải dữ liệu mô hình...</div>
              ) : !dashboardData ? (
                 <div style={{padding:'40px', textAlign:'center', color:'var(--danger)'}}>Không thể kết nối đến Backend AI. Vui lòng kiểm tra lại server.</div>
              ) : (
                <>
                  <div style={{ display: currentRole === 'expert' ? 'block' : 'none', height: '100%' }}>
                    {/* TOP LEVEL TABS TO REDUCE CLUTTER */}
                    <div className="expert-tabs-nav" style={{display: 'flex', gap: '8px', marginBottom: '32px', borderBottom: '1px solid var(--glass-border)', paddingBottom: '16px'}}>
                      <button 
                        className={`card-tab ${activeTab === 'behavior' || activeTab === 'tab1' ? 'active' : ''}`}
                        onClick={() => setActiveTab('behavior')}
                        style={{fontSize: '15px'}}
                      >
                        <Activity size={16} style={{display:'inline', marginRight:'6px'}}/> PHÂN TÍCH HÀNH VI
                      </button>
                      <button 
                        className={`card-tab ${activeTab === 'radar' ? 'active' : ''}`}
                        onClick={() => setActiveTab('radar')}
                        style={{fontSize: '15px'}}
                      >
                        <BarChart2 size={16} style={{display:'inline', marginRight:'6px'}}/> HỒ SƠ ĐÁNH GIÁ
                      </button>
                      <button 
                        className={`card-tab ${activeTab === 'probes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('probes')}
                        style={{fontSize: '15px'}}
                      >
                        <Stethoscope size={16} style={{display:'inline', marginRight:'6px'}}/> THỰC NGHIỆM LÂM SÀNG
                      </button>
                    </div>

                    <div className="expert-tab-content animate-fade-in">
                      {(activeTab === 'behavior' || activeTab === 'tab1') && (
                        <div style={{maxWidth: '900px'}}>
                          <BehaviorTab key={`behavior-${selectedStudentId}`} studentId={selectedStudentId} onRefresh={() => loadDashboard(selectedStudentId, true)} />
                        </div>
                      )}
                      
                      {activeTab === 'radar' && (
                        <div style={{maxWidth: '1000px'}}>
                          <RadarTab key={`radar-${selectedStudentId}`} dashboardData={dashboardData} />
                        </div>
                      )}

                      {activeTab === 'probes' && (
                        <div style={{maxWidth: '900px'}}>
                          <ProbesTab key={`probes-${selectedStudentId}`} dashboardData={dashboardData} onRefresh={() => loadDashboard(selectedStudentId, true)} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: currentRole === 'parent' ? 'block' : 'none', height: '100%' }}>
                    <div className="bento-dashboard animate-fade-in delay-1">
                      <div className="bento-col-left" style={{flex: 1}}>
                        <ParentPortalTab key={`parent-${selectedStudentId}`} studentId={selectedStudentId} refreshTrigger={dashboardData?.latest_log_id} onComplete={() => loadDashboard(selectedStudentId, true)} />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Floating Chatbot */}
      {selectedStudentId && <ChatWidget studentId={selectedStudentId} />}
    </div>
  );
}

// --- Chat Widget ---
function ChatWidget({ studentId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Xin chào, tôi là Trợ lý Y khoa AI. Bạn cần tôi phân tích hay hỗ trợ gì về hồ sơ của học sinh này?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = React.useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !studentId) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/chat`, { student_id: studentId, message: userMsg });
      setMessages(prev => [...prev, { role: 'assistant', text: res.data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Xin lỗi, đã có lỗi kết nối đến hệ thống.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-widget-container">
      {isOpen ? (
        <div className="chat-window animate-fade-in">
          <div className="chat-header">
            <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
              <Sparkles size={16} /> TRỢ LÝ AI Y KHOA
            </div>
            <button onClick={() => setIsOpen(false)} style={{background:'transparent', border:'none', color:'#fff', cursor:'pointer'}}><X size={18}/></button>
          </div>
          <div className="chat-body">
            {messages.map((m, i) => {
              const formattedText = m.text
                .replace(/</g, '&lt;').replace(/>/g, '&gt;') // escape tags
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // bold
                .replace(/\*(.*?)\*/g, '<em>$1</em>') // italic
                .replace(/\n/g, '<br/>'); // line breaks
                
              return (
                <div key={i} className={`chat-bubble ${m.role}`}>
                  <div dangerouslySetInnerHTML={{ __html: formattedText }} style={{ lineHeight: '1.6' }} />
                </div>
              );
            })}
            {loading && <div className="chat-bubble assistant"><div className="loader-dots"><span>.</span><span>.</span><span>.</span></div></div>}
            <div ref={endRef} />
          </div>
          <div className="chat-footer">
            <input 
              type="text" 
              placeholder="Nhập câu hỏi (Vd: Gợi ý bài tập 5 phút...)" 
              value={input} 
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button onClick={handleSend} disabled={loading || !input.trim()}><Send size={16} /></button>
          </div>
        </div>
      ) : (
        <button className="chat-fab pulse-anim" onClick={() => setIsOpen(true)}>
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
}

// --- TAB 1: Behavior Forensics ---
function BehaviorTab({ studentId, onRefresh }) {
  const [text, setText] = useState(() => sessionStorage.getItem(`draft-${studentId}`) || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
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
    axios.get(`${API_URL}/students/${studentId}/latest-log`)
      .then(res => {
        if (res.data) {
          const draft = sessionStorage.getItem(`draft-${studentId}`);
          setText(draft || res.data.raw_text || '');
          setResult(res.data.parsed_json || null);
        } else {
          const draft = sessionStorage.getItem(`draft-${studentId}`);
          setText(draft || '');
          setResult(null);
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
      const res = await axios.post(`${API_URL}/analyze`, { student_id: studentId, raw_text: text }, { signal: controller.signal });
      setResult(res.data.ai_result);
      if (onRefresh) onRefresh();
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error(err);
        alert("Lỗi kết nối đến Server AI. Vui lòng thử lại!");
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
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await axios.post(`${API_URL}/analyze-multimodal?student_id=${studentId}`, formData, { 
        signal: controller.signal,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data.ai_result);
      setText(res.data.ai_result.hanh_vi_goc || '');
      if (onRefresh) onRefresh();
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error(err);
        alert("Lỗi khi phân tích file. Đảm bảo Backend hỗ trợ Multimodal AI.");
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setAnalyzing(false);
      }
      e.target.value = null; // reset input
    }
  };

  const renderHighlightedText = (text, highlights) => {
    if (!text) return <span></span>;
    if (!Array.isArray(highlights) || highlights.length === 0) return <span>{text}</span>;
    
    // Sanitize HTML tags to prevent XSS
    let htmlString = String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // Filter & sort
    const validHighlights = highlights.filter(h => h && typeof h.keyword === 'string' && h.keyword.trim().length > 1);
    const sortedHighlights = [...validHighlights].sort((a, b) => b.keyword.length - a.keyword.length);
    
    if (sortedHighlights.length === 0) {
       return <div dangerouslySetInnerHTML={{ __html: htmlString }} style={{ lineHeight: '1.8' }} />;
    }

    const hlMap = {};
    const safeKeywords = sortedHighlights.map(hl => {
      const sanitizedKeyword = String(hl.keyword).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const safeKeyword = sanitizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      hlMap[sanitizedKeyword.toLowerCase()] = hl;
      return safeKeyword;
    });

    const combinedRegex = new RegExp(`(${safeKeywords.join('|')})`, 'gi');
    
    htmlString = htmlString.replace(combinedRegex, (match) => {
      const hl = hlMap[match.toLowerCase()];
      if (!hl) return match;
      const colorClass = hl.severity === 'Nghiêm trọng' ? 'xai-severe' : 'xai-moderate';
      const reasonStr = hl.reason ? hl.reason.replace(/"/g, '&quot;') : '';
      const tooltipAttr = `data-tooltip="${reasonStr}"`;
      return `<span class="xai-highlight ${colorClass}" ${tooltipAttr}>${match}</span>`;
    });
    
    return <div dangerouslySetInnerHTML={{ __html: htmlString }} style={{ lineHeight: '1.8' }} />;
  };

  return (
    <div className="bento-card animate-fade-in delay-2">
      <div className="bento-header">
        <h2 className="bento-title"><FileText size={18}/> DỮ LIỆU ĐẦU VÀO TỪ GIÁO VIÊN</h2>
      </div>
      
      <textarea 
        className="premium-input"
        placeholder="Nhập chuỗi sự kiện, hành vi quan sát được của trẻ trong giờ học, giờ ăn, hoặc hoạt động ngoại khóa..."
        value={text}
        onChange={e => setText(e.target.value)}
      />
      
      <div style={{display:'flex', gap:'12px', marginTop:'12px'}}>
        <button className="btn-premium" onClick={handleAnalyze} disabled={analyzing || !text.trim()} style={{flex: 1}}>
          {analyzing ? <><div className="loader-spinner"></div> Đang gọi AI Engine...</> : <><Layers size={16}/> Khởi chạy Phân tích Văn bản</>}
        </button>
        <label className="btn-premium" style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: analyzing ? 'not-allowed' : 'pointer', opacity: analyzing ? 0.7 : 1}}>
          {analyzing ? <><div className="loader-spinner"></div> Đang xử lý Media...</> : <><Upload size={16}/> Phân tích File Âm thanh/Video (AI)</>}
          <input type="file" accept="audio/*,video/*,image/*" style={{display: 'none'}} onChange={handleFileUpload} disabled={analyzing} />
        </label>
        {result && (
          <button 
            className="btn-secondary" 
            onClick={() => { setText(''); setResult(null); sessionStorage.removeItem(`draft-${studentId}`); }} 
            style={{display:'flex', alignItems:'center', gap:'8px', padding:'0 16px'}}
            title="Xóa dữ liệu cũ để nhập báo cáo mới"
          >
            <RefreshCw size={16}/> Nhập Báo Cáo Mới
          </button>
        )}
      </div>

      {result && (
        <div className="data-grid">
          <div className="d-box full" style={{background: 'rgba(255, 255, 255, 0.7)', border: '1px solid #B3D4FF'}}>
            <div className="d-label" style={{color: '#0052CC', display: 'flex', alignItems: 'center', gap: '6px'}}>
              <Activity size={14}/> EXPLAINABLE AI (XAI) - BÓC TÁCH NGỮ NGHĨA
            </div>
            <div className="d-val" style={{paddingTop: '12px', fontSize: '15px', color: 'var(--text-main)'}}>
              {renderHighlightedText(result.hanh_vi_goc, result.xai_highlights)}
            </div>
            <div style={{fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', fontStyle: 'italic'}}>
              * Rê chuột vào các cụm từ được bôi màu để xem luận cứ y khoa (DSM-5-TR) được phân tích bởi AI.
            </div>
          </div>
          <div className="d-box">
            <div className="d-label">THAM CHIẾU DẤU HIỆU (DSM-5-TR)</div>
            <div className="d-val"><span className="badge light-orange">{result.ma_chuan_y_khoa}</span></div>
          </div>
          <div className="d-box">
            <div className="d-label">THANG ĐIỂM CARS</div>
            <div className="d-val">
              <span className={`badge ${result.diem_nguy_co >= 3.0 ? 'light-red' : (result.diem_nguy_co >= 2.0 ? 'light-orange' : 'light-blue')}`} style={{fontSize:'12px'}}>
                <Activity size={12}/> MỨC ĐỘ: {result.diem_nguy_co}/4.0
              </span>
            </div>
          </div>
          <div className="d-box">
            <div className="d-label">ĐỘ TIN CẬY (EXPLAINABLE AI)</div>
            <div className="d-val"><span className="badge solid-blue">{result.xai_confidence}</span></div>
          </div>
          <div className="d-box">
            <div className="d-label">NHÓM ZPD BỊ ẢNH HƯỞNG</div>
            <div className="d-val"><span className="badge light-green">{result.nhom_ky_nang}</span></div>
          </div>
          <div className="d-box">
            <div className="d-label">TRẠNG THÁI HỆ THỐNG</div>
            <div className="d-val"><span className="badge solid-blue">Ghi log thành công</span></div>
          </div>
          {result.kich_ban_test_kiem_chung && (
            <div className="d-box full">
              <div className="d-label" style={{color:'var(--success)'}}>HƯỚNG DẪN THỰC NGHIỆM ĐÁNH GIÁ CHUYÊN SÂU (MÔ HÌNH ADOS-2)</div>
              <div className="d-val" style={{paddingTop:'8px', lineHeight: '1.6'}}>
                {typeof result.kich_ban_test_kiem_chung === 'string' ? (
                  <p>{result.kich_ban_test_kiem_chung}</p>
                ) : (
                  <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#111827', fontSize: '15px' }}>{result.kich_ban_test_kiem_chung?.ten_bai_tap || 'Bài Test Lâm Sàng'}</h4>
                    <div style={{ marginBottom: '8px' }}><strong>Mục đích:</strong> {result.kich_ban_test_kiem_chung?.muc_dich || 'Đánh giá chuyên sâu'}</div>
                    <div style={{ marginBottom: '8px' }}><strong>Chuẩn bị:</strong> {result.kich_ban_test_kiem_chung?.chuan_bi || 'Không yêu cầu đặc biệt'}</div>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Các bước thực hiện:</strong>
                      <ul style={{ margin: '4px 0 0 20px', padding: 0 }}>
                        {Array.isArray(result.kich_ban_test_kiem_chung?.cac_buoc) 
                          ? result.kich_ban_test_kiem_chung.cac_buoc.map((step, idx) => (
                              <li key={idx} style={{ marginBottom: '4px' }}>{step}</li>
                            ))
                          : <li style={{ marginBottom: '4px', color: 'var(--text-muted)' }}>Không có hướng dẫn chi tiết</li>
                        }
                      </ul>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                      <div style={{ flex: 1, padding: '12px', background: '#ECFDF5', borderLeft: '4px solid #10B981', borderRadius: '4px' }}>
                        <strong style={{ color: '#065F46', display: 'block', marginBottom: '4px' }}>Tiêu chí ĐẠT:</strong>
                        <span style={{ fontSize: '13px', color: '#047857' }}>{result.kich_ban_test_kiem_chung?.tieu_chi_dat || 'Trẻ thực hiện được yêu cầu cơ bản'}</span>
                      </div>
                      <div style={{ flex: 1, padding: '12px', background: '#FEF2F2', borderLeft: '4px solid #EF4444', borderRadius: '4px' }}>
                        <strong style={{ color: '#991B1B', display: 'block', marginBottom: '4px' }}>Dấu hiệu KHÔNG ĐẠT (Cờ đỏ):</strong>
                        <span style={{ fontSize: '13px', color: '#B91C1C' }}>{result.kich_ban_test_kiem_chung?.tieu_chi_khong_dat || 'Trẻ có biểu hiện chống đối, hoảng loạn hoặc không tương tác'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div style={{marginTop:'16px', display:'flex', gap:'8px', alignItems:'center'}}>
                 <span style={{fontSize:'12px', color:'var(--text-muted)'}}>Nguồn phát sinh: </span>
                 <span className="badge solid-blue" style={{background:'#F4F5F7', color:'var(--text-main)', border:'1px solid var(--border-color)'}}>AI Core Engine v2.0 - Medical Protocol</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- TAB 2: Proactive Probes ---
function ProbesTab({ dashboardData, onRefresh }) {
  const { pending_probes, history_probes } = dashboardData;
  const [activeGame, setActiveGame] = useState(null);

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/probes/${id}`, { result_status: status });
      if (onRefresh) onRefresh(); 
    } catch (err) {
      console.error(err);
    }
  };

  const deleteProbe = async (id) => {
    try {
      await axios.delete(`${API_URL}/probes/${id}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{display:'flex', gap:'16px', marginBottom:'24px'}}>
        <div style={{flex:1, background:'#fff', padding:'16px', borderRadius:'6px', border:'1px solid var(--border-color)', borderTop:'3px solid var(--warning)'}}>
           <div style={{fontSize:'12px', fontWeight:'700', color:'var(--text-muted)', marginBottom:'8px'}}>CẦN THỰC HIỆN ĐÁNH GIÁ</div>
           <div style={{fontSize:'24px', fontWeight:'700'}}>{pending_probes.length}</div>
        </div>
        <div style={{flex:1, background:'#fff', padding:'16px', borderRadius:'6px', border:'1px solid var(--border-color)', borderTop:'3px solid var(--success)'}}>
           <div style={{fontSize:'12px', fontWeight:'700', color:'var(--text-muted)', marginBottom:'8px'}}>ĐÃ CÓ KẾT QUẢ</div>
           <div style={{fontSize:'24px', fontWeight:'700'}}>{history_probes.length}</div>
        </div>
      </div>

      <div className="bento-card animate-fade-in delay-2">
        <div className="bento-header">
          <h2 className="bento-title"><Stethoscope size={18} /> NHIỆM VỤ THỰC NGHIỆM ĐANG CHỜ</h2>
        </div>
        
        {pending_probes.length === 0 ? (
          <div style={{padding:'24px', border:'1px dashed var(--border-color)', textAlign:'center', color:'var(--text-muted)', borderRadius:'4px'}}>Tất cả thực nghiệm đã hoàn thành.</div>
        ) : (
          <div>
            {pending_probes.map(p => (
              <div key={p.id} className="k-card warning animate-fade-in delay-1">
                <div className="k-header">
                  <span className="badge light-blue">{p.category}</span>
                  <span className="badge solid-blue">Yêu cầu từ AI</span>
                </div>
                <div className="k-content">
                  {(() => {
                    try {
                      const data = JSON.parse(p.scenario);
                      return (
                        <div style={{background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '16px', marginTop: '12px'}}>
                          <div style={{fontWeight: 'bold', marginBottom: '8px', fontSize: '15px'}}>{data?.ten_bai_tap || 'Bài Test Lâm Sàng'}</div>
                          <div style={{fontSize: '13px', marginBottom: '8px'}}><strong>Mục đích:</strong> {data?.muc_dich || 'Đánh giá chuyên sâu'}</div>
                          <div style={{fontSize: '13px', marginBottom: '12px'}}><strong>Chuẩn bị:</strong> {data?.chuan_bi || 'Không yêu cầu đặc biệt'}</div>
                          <div style={{fontSize: '13px', marginBottom: '12px'}}>
                            <strong>Các bước thực hiện:</strong>
                            <ul style={{marginTop: '4px', paddingLeft: '20px'}}>
                              {(data?.cac_buoc || []).map((step, i) => <li key={i} style={{marginBottom:'4px'}}>{step}</li>)}
                            </ul>
                          </div>
                          <div style={{display: 'flex', gap: '16px', marginTop: '16px'}}>
                            <div style={{ flex: 1, padding: '12px', background: '#ECFDF5', borderLeft: '4px solid #10B981', borderRadius: '4px' }}>
                              <strong style={{ color: '#065F46', display: 'block', marginBottom: '4px' }}>Tiêu chí ĐẠT:</strong>
                              <span style={{ fontSize: '13px', color: '#047857' }}>{data?.tieu_chi_dat || 'Trẻ thực hiện được yêu cầu cơ bản'}</span>
                            </div>
                            <div style={{ flex: 1, padding: '12px', background: '#FEF2F2', borderLeft: '4px solid #EF4444', borderRadius: '4px' }}>
                              <strong style={{ color: '#991B1B', display: 'block', marginBottom: '4px' }}>Dấu hiệu KHÔNG ĐẠT (Cờ đỏ):</strong>
                              <span style={{ fontSize: '13px', color: '#B91C1C' }}>{data?.tieu_chi_khong_dat || 'Trẻ có biểu hiện chống đối, hoảng loạn hoặc không tương tác'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    } catch(e) {
                      return <p>{p.scenario}</p>;
                    }
                  })()}
                </div>
                <div className="k-footer">
                  <div style={{fontSize:'11px', color:'var(--text-muted)', display:'flex', alignItems:'center', gap:'4px'}}><Clock size={12}/> Ngày sinh: {p.date}</div>
                  <div style={{display:'flex', gap:'8px'}}>
                    <button className="action-btn" style={{background:'var(--primary)', color:'white', border:'none'}} onClick={() => setActiveGame(p)}>
                      <Sparkles size={14}/> 
                      {(p.category || "").toLowerCase().match(/cảm xúc|giao tiếp|tương tác/) ? "Game Nhận Diện Cảm Xúc" : (p.category || "").toLowerCase().match(/nhận thức|logic|vận động/) ? "Game Hình Khối Logic" : "Game Phản Xạ"}
                    </button>
                    <button className="action-btn green" onClick={() => updateStatus(p.id, 'Đạt')}><CheckCircle size={14}/> Ghi nhận ĐẠT</button>
                    <button className="action-btn red" onClick={() => updateStatus(p.id, 'Không Đạt')}><XCircle size={14}/> KHÔNG ĐẠT</button>
                    <button className="btn-secondary" style={{padding:'4px 8px'}} onClick={() => deleteProbe(p.id)} title="Xóa bỏ báo cáo này">Bỏ qua</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bento-card animate-fade-in delay-3">
        <div className="bento-header">
          <h2 className="bento-title"><Activity size={18}/> NHẬT KÝ LÂM SÀNG</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{width: '20%'}}>NGÀY THỰC HIỆN</th>
              <th style={{width: '60%'}}>PHÂN LOẠI TEST</th>
              <th style={{width: '20%'}}>KẾT QUẢ</th>
            </tr>
          </thead>
          <tbody>
            {history_probes.length === 0 ? (
              <tr><td colSpan="3" style={{textAlign:'center'}}>Trống</td></tr>
            ) : (
              history_probes.map(h => (
                <tr key={h.id}>
                  <td>{h.date}</td>
                  <td><strong>{h.category}</strong></td>
                  <td><span className={`badge ${h.status === 'Đạt' ? 'light-green' : 'light-red'}`}>{h.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {activeGame && (
        <GameModal 
          probe={activeGame} 
          studentInfo={dashboardData?.student_info}
          onClose={() => setActiveGame(null)} 
          onComplete={(id, status) => {
            updateStatus(id, status);
            setActiveGame(null);
          }} 
        />
      )}
    </div>
  );
}

function GameModal({ probe, studentInfo, onClose, onComplete }) {
  const dob = studentInfo?.dob || "2021-01-01";
  const birthYear = parseInt(dob.split('-')[0]);
  let age = new Date().getFullYear() - birthYear;
  if (age < 3) age = 3;
  if (age > 5) age = 5;

  const category = (probe.category || "").toLowerCase();
  let GameComponent = AttentionReactionGame;
  
  if (category.includes('cảm xúc') || category.includes('giao tiếp') || category.includes('tương tác')) {
    GameComponent = EmotionMatchGame;
  } else if (category.includes('nhận thức') || category.includes('logic') || category.includes('vận động')) {
    GameComponent = ShapeMatchGame;
  }

  return <GameComponent probe={probe} age={age} onClose={onClose} onComplete={onComplete} />;
}

function AttentionReactionGame({ probe, age, onClose, onComplete }) {
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
    if (gameState === 'start') {
      startGame();
    } else if (gameState === 'wait') {
      alert("Bấm quá sớm! Hãy đợi chú Ếch 🐸 xuất hiện.");
      setGameState('start');
    } else if (gameState === 'react') {
      const time = Date.now() - startTime;
      setReactionTime(time);
      setGameState('result');
    }
  };

  const handleNext = () => {
    if (isPractice) {
      setIsPractice(false);
      setGameState('start');
    } else {
      const status = reactionTime <= passThreshold ? 'Đạt' : 'Không Đạt';
      onComplete(probe.id, status);
    }
  };

  return (
    <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div className="glass-panel animate-fade-in" style={{textAlign:'center', padding:'30px', maxWidth:'450px', width:'90%', background:'#fff'}}>
        <h3 style={{marginTop:0, color:'#2563eb'}}>Bắt Chú Ếch (Phản Xạ)</h3>
        {isPractice ? (
           <div style={{background:'#FEF3C7', color:'#92400E', padding:'8px', borderRadius:'6px', marginBottom:'16px', fontSize:'13px', fontWeight:'bold'}}>CHẾ ĐỘ LÀM QUEN (Không chấm điểm)</div>
        ) : (
           <div style={{background:'#DBEAFE', color:'#1E3A8A', padding:'8px', borderRadius:'6px', marginBottom:'16px', fontSize:'13px', fontWeight:'bold'}}>CHẾ ĐỘ KIỂM TRA CHÍNH THỨC</div>
        )}
        <p style={{fontSize:'14px', color:'var(--text-muted)'}}>Trẻ: {age} tuổi | Ngưỡng thời gian: {passThreshold}ms</p>
        <p style={{fontSize:'14px', color:'var(--text-muted)', marginBottom:'24px'}}>Hướng dẫn: Hãy bấm vào vòng tròn NGAY KHI chú Ếch 🐸 xuất hiện!</p>
        
        <div 
          onClick={handleClick}
          style={{
            width: '180px', height: '180px', margin: '0 auto', borderRadius: '50%',
            background: gameState === 'start' ? '#E5E7EB' : (gameState === 'wait' ? '#E5E7EB' : '#10B981'),
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px', cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)', userSelect:'none', transition: 'background 0.2s'
          }}
        >
          {gameState === 'start' && <span style={{fontSize:'18px', fontWeight:'bold', color:'#6B7280'}}>BẮT ĐẦU</span>}
          {gameState === 'wait' && <span style={{fontSize:'18px', fontWeight:'bold', color:'#6B7280'}}>ĐỢI...</span>}
          {gameState === 'react' && '🐸'}
          {gameState === 'result' && <span style={{fontSize:'24px', fontWeight:'bold', color:'#fff'}}>{reactionTime}ms</span>}
        </div>

        {gameState === 'result' && (
          <div style={{marginTop:'24px'}}>
            <div style={{marginBottom:'16px', fontSize:'16px'}}>
              Kết quả: {reactionTime <= passThreshold ? <strong style={{color:'var(--success)'}}>Tốt! Kịp thời gian.</strong> : <strong style={{color:'var(--danger)'}}>Hơi chậm một chút.</strong>}
            </div>
            <button className="btn-premium" onClick={handleNext} style={{width:'100%', padding:'12px', fontSize:'15px'}}>
              {isPractice ? 'Đã hiểu cách chơi, Thi thật!' : 'Lưu kết quả & Đóng'}
            </button>
          </div>
        )}
        
        {gameState !== 'result' && (
           <button onClick={onClose} style={{background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', marginTop:'24px', padding:'8px'}}>Hủy bỏ</button>
        )}
      </div>
    </div>
  );
}

function EmotionMatchGame({ probe, age, onClose, onComplete }) {
  const [gameState, setGameState] = useState('start'); 
  const [isPractice, setIsPractice] = useState(true);
  const [fails, setFails] = useState(0);
  
  const allEmotions = [
    { id: 'vui', emoji: '😀', label: 'Vui vẻ' },
    { id: 'buon', emoji: '😢', label: 'Buồn bã' },
    { id: 'gian', emoji: '😡', label: 'Tức giận' },
    { id: 'so', emoji: '😨', label: 'Sợ hãi' },
    { id: 'ngac_nhien', emoji: '😲', label: 'Ngạc nhiên' }
  ];

  const numOptions = age <= 3 ? 2 : (age === 4 ? 3 : 4);
  const [options, setOptions] = useState([]);
  const [target, setTarget] = useState(null);
  const [resultMsg, setResultMsg] = useState('');

  const generateRound = () => {
    let shuffled = [...allEmotions].sort(() => 0.5 - Math.random());
    let selectedOpts = shuffled.slice(0, numOptions);
    setOptions(selectedOpts);
    setTarget(selectedOpts[Math.floor(Math.random() * selectedOpts.length)]);
    setGameState('play');
    setResultMsg('');
    setFails(0);
  };

  const handleStart = () => generateRound();

  const handleSelect = (opt) => {
    if (gameState === 'result') return;
    if (opt.id === target.id) {
      setResultMsg('CHÍNH XÁC!');
      setGameState('result');
    } else {
      setResultMsg('Chưa đúng rồi, thử lại nhé!');
      setFails(f => f + 1);
    }
  };

  const handleNext = () => {
    if (isPractice) {
      setIsPractice(false);
      generateRound();
    } else {
      const status = fails === 0 ? 'Đạt' : 'Không Đạt';
      onComplete(probe.id, status);
    }
  };

  return (
    <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div className="glass-panel animate-fade-in" style={{textAlign:'center', padding:'30px', maxWidth:'450px', width:'90%', background:'#fff'}}>
        <h3 style={{marginTop:0, color:'#2563eb'}}>Nhận Diện Cảm Xúc</h3>
        {isPractice ? (
           <div style={{background:'#FEF3C7', color:'#92400E', padding:'8px', borderRadius:'6px', marginBottom:'16px', fontSize:'13px', fontWeight:'bold'}}>CHẾ ĐỘ LÀM QUEN</div>
        ) : (
           <div style={{background:'#DBEAFE', color:'#1E3A8A', padding:'8px', borderRadius:'6px', marginBottom:'16px', fontSize:'13px', fontWeight:'bold'}}>CHẾ ĐỘ KIỂM TRA CHÍNH THỨC</div>
        )}
        
        {gameState === 'start' ? (
          <div>
            <p style={{fontSize:'14px', color:'var(--text-muted)', marginBottom:'24px'}}>Tìm đúng khuôn mặt biểu lộ cảm xúc được yêu cầu.</p>
            <button className="btn-premium" onClick={handleStart}>BẮT ĐẦU</button>
          </div>
        ) : (
          <div>
            <div style={{fontSize:'18px', fontWeight:'bold', marginBottom:'24px'}}>
              Ai đang <span style={{color:'#D97706', fontSize:'22px'}}>{target?.label}</span> ?
            </div>
            <div style={{display:'flex', gap:'16px', justifyContent:'center', flexWrap:'wrap', marginBottom:'24px'}}>
              {options.map(o => (
                <div 
                  key={o.id} 
                  onClick={() => handleSelect(o)}
                  style={{
                    width:'80px', height:'80px', background:'#F3F4F6', borderRadius:'12px',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'40px',
                    cursor:'pointer', border:'2px solid transparent', transition:'all 0.2s',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#3B82F6'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  {o.emoji}
                </div>
              ))}
            </div>
            
            <div style={{minHeight:'30px', fontWeight:'bold', color: resultMsg === 'CHÍNH XÁC!' ? 'var(--success)' : 'var(--danger)', marginBottom:'16px'}}>
              {resultMsg}
            </div>

            {gameState === 'result' && (
              <button className="btn-premium" onClick={handleNext} style={{width:'100%', padding:'12px'}}>
                {isPractice ? 'Đã hiểu cách chơi, Thi thật!' : 'Lưu kết quả & Đóng'}
              </button>
            )}
          </div>
        )}
        
        {gameState !== 'result' && (
           <button onClick={onClose} style={{background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', marginTop:'24px', padding:'8px'}}>Hủy bỏ</button>
        )}
      </div>
    </div>
  );
}

function ShapeMatchGame({ probe, age, onClose, onComplete }) {
  const [gameState, setGameState] = useState('start'); 
  const [isPractice, setIsPractice] = useState(true);
  const [fails, setFails] = useState(0);
  
  const allShapes = [
    { id: 'vuong', emoji: '🟦', label: 'Hình Vuông' },
    { id: 'tron', emoji: '🔴', label: 'Hình Tròn' },
    { id: 'tam_giac', emoji: '🔺', label: 'Hình Tam Giác' },
    { id: 'sao', emoji: '⭐', label: 'Ngôi Sao' }
  ];

  const numOptions = age <= 3 ? 2 : (age === 4 ? 3 : 4);
  const [options, setOptions] = useState([]);
  const [target, setTarget] = useState(null);
  const [resultMsg, setResultMsg] = useState('');

  const generateRound = () => {
    let shuffled = [...allShapes].sort(() => 0.5 - Math.random());
    let selectedOpts = shuffled.slice(0, numOptions);
    setOptions(selectedOpts);
    setTarget(selectedOpts[Math.floor(Math.random() * selectedOpts.length)]);
    setGameState('play');
    setResultMsg('');
    setFails(0);
  };

  const handleStart = () => generateRound();

  const handleSelect = (opt) => {
    if (gameState === 'result') return;
    if (opt.id === target.id) {
      setResultMsg('ĐÚNG RỒI!');
      setGameState('result');
    } else {
      setResultMsg('Sai rồi, thử lại nhé!');
      setFails(f => f + 1);
    }
  };

  const handleNext = () => {
    if (isPractice) {
      setIsPractice(false);
      generateRound();
    } else {
      const status = fails === 0 ? 'Đạt' : 'Không Đạt';
      onComplete(probe.id, status);
    }
  };

  return (
    <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.6)', zIndex:99999, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div className="glass-panel animate-fade-in" style={{textAlign:'center', padding:'30px', maxWidth:'450px', width:'90%', background:'#fff'}}>
        <h3 style={{marginTop:0, color:'#2563eb'}}>Ghép Hình Logic</h3>
        {isPractice ? (
           <div style={{background:'#FEF3C7', color:'#92400E', padding:'8px', borderRadius:'6px', marginBottom:'16px', fontSize:'13px', fontWeight:'bold'}}>CHẾ ĐỘ LÀM QUEN</div>
        ) : (
           <div style={{background:'#DBEAFE', color:'#1E3A8A', padding:'8px', borderRadius:'6px', marginBottom:'16px', fontSize:'13px', fontWeight:'bold'}}>CHẾ ĐỘ KIỂM TRA CHÍNH THỨC</div>
        )}
        
        {gameState === 'start' ? (
          <div>
            <p style={{fontSize:'14px', color:'var(--text-muted)', marginBottom:'24px'}}>Ghép hình khối vào đúng vị trí cái bóng của nó.</p>
            <button className="btn-premium" onClick={handleStart}>BẮT ĐẦU</button>
          </div>
        ) : (
          <div>
            <div style={{marginBottom:'24px', padding:'20px', background:'#F3F4F6', borderRadius:'12px', display:'inline-block', border:'2px dashed #9CA3AF'}}>
               <div style={{fontSize:'60px', opacity:0.2, filter:'grayscale(100%)'}}>{target?.emoji}</div>
            </div>
            <div style={{fontSize:'16px', fontWeight:'bold', marginBottom:'16px'}}>Hãy chọn hình khớp với cái bóng!</div>
            <div style={{display:'flex', gap:'16px', justifyContent:'center', flexWrap:'wrap', marginBottom:'24px'}}>
              {options.map(o => (
                <div 
                  key={o.id} 
                  onClick={() => handleSelect(o)}
                  style={{
                    width:'70px', height:'70px', background:'#fff', borderRadius:'8px',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'36px',
                    cursor:'pointer', border:'2px solid #E5E7EB', transition:'all 0.2s',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                  }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#3B82F6'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                >
                  {o.emoji}
                </div>
              ))}
            </div>
            
            <div style={{minHeight:'30px', fontWeight:'bold', color: resultMsg === 'ĐÚNG RỒI!' ? 'var(--success)' : 'var(--danger)', marginBottom:'16px'}}>
              {resultMsg}
            </div>

            {gameState === 'result' && (
              <button className="btn-premium" onClick={handleNext} style={{width:'100%', padding:'12px'}}>
                {isPractice ? 'Đã hiểu cách chơi, Thi thật!' : 'Lưu kết quả & Đóng'}
              </button>
            )}
          </div>
        )}
        
        {gameState !== 'result' && (
           <button onClick={onClose} style={{background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', marginTop:'24px', padding:'8px'}}>Hủy bỏ</button>
        )}
      </div>
    </div>
  );
}

function RadarTab({ dashboardData }) {
  const [activeZpdTab, setActiveZpdTab] = useState('school');
  const { radar_data, risk_profile, predictive_data = [] } = dashboardData;
  const safeRadarData = radar_data || { social: 1.0, routine: 1.0, attention: 1.0 };
  
  const data = [
    { subject: 'Giao Tiếp', A: safeRadarData.social, fullMark: 4 },
    { subject: 'Hành Vi', A: safeRadarData.routine, fullMark: 4 },
    { subject: 'Tập Trung', A: safeRadarData.attention, fullMark: 4 },
  ];

  const statusColorMap = {
    'green': '#00875A',
    'blue': '#0052CC',
    'yellow': '#FF991F',
    'red': '#DE350B'
  };
  const mainColor = statusColorMap[risk_profile.color] || '#0052CC';

  const exportPDF = () => {
    const input = document.getElementById('zpd-report-content');
    if (!input) return;
    
    // Lưu lại style cũ
    const originalBackground = input.style.background;
    const originalPadding = input.style.padding;
    
    // Cài đặt style chuẩn in ấn
    input.style.background = '#ffffff';
    input.style.padding = '30px';
    
    html2canvas(input, { scale: 2, useCORS: true }).then((canvas) => {
      // Phục hồi style
      input.style.background = originalBackground;
      input.style.padding = originalPadding;
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
      pdf.save(`HoSo_DanhGia_ZPD_${dashboardData?.student_info?.name || 'HocSinh'}.pdf`);
    });
  };

  const renderZpdSection = (data) => {
    if (typeof data === 'string' || Array.isArray(data)) {
      return <div style={{lineHeight: 1.6}}>{data}</div>;
    }
    return (
      <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
        {data?.phac_do_tham_chieu && (
          <div style={{background: 'linear-gradient(to right, #eff6ff, #ffffff)', color: '#1E3A8A', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', borderLeft: '4px solid #2563EB', boxShadow: '0 2px 4px rgba(37,99,235,0.05)', display: 'flex', alignItems: 'center', gap: '8px'}}>
            <Stethoscope size={18} color="#2563EB" />
            <div><strong style={{color: '#1D4ED8'}}>Tiêu chuẩn áp dụng:</strong> {data.phac_do_tham_chieu}</div>
          </div>
        )}
        
        <div style={{background: '#ffffff', borderRadius: '10px', padding: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)'}}>
          <div style={{fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
            <Target size={16} color="#3B82F6" /> MỤC TIÊU CỐT LÕI
          </div>
          <div style={{fontSize: '14.5px', color: '#334155', lineHeight: '1.6', paddingLeft: '24px'}}>{data?.muc_tieu || '...'}</div>
        </div>
        
        <div style={{background: '#ffffff', borderRadius: '10px', padding: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)'}}>
          <div style={{fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
            <CheckCircle size={16} color="#10B981" /> CÁC BƯỚC THỰC HIỆN CỤ THỂ
          </div>
          <ul style={{listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '14px'}}>
            {(data?.hanh_dong || []).map((step, idx) => (
              <li key={idx} style={{display: 'flex', alignItems: 'flex-start', gap: '12px', fontSize: '14.5px', color: '#334155', lineHeight: '1.6'}}>
                <div style={{width: '24px', height: '24px', borderRadius: '6px', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', color: '#2563eb', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', boxShadow: '0 2px 4px rgba(37,99,235,0.1)'}}>{idx + 1}</div>
                {step}
              </li>
            ))}
          </ul>
        </div>

        {data?.luu_y && (
          <div style={{background: 'linear-gradient(to right, #fffbeb, #ffffff)', borderLeft: '4px solid #F59E0B', padding: '14px 16px', borderRadius: '8px', fontSize: '13.5px', color: '#92400E', display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: '4px', boxShadow: '0 2px 4px rgba(245,158,11,0.05)'}}>
             <Activity size={16} style={{marginTop: '2px', flexShrink: 0, color: '#D97706'}}/>
             <div><strong style={{color: '#B45309'}}>Mẹo lưu ý:</strong> {data.luu_y}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn-premium" onClick={exportPDF}>
          <Download size={16} /> Xuất Báo Cáo (PDF)
        </button>
      </div>
      
      <div id="zpd-report-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px', background: '#ffffff', padding: '16px', borderRadius: '8px' }}>
        {/* HEADER BÁO CÁO KHI IN */}
        <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '2px solid #E5E7EB', paddingBottom: '16px' }}>
           <h2 style={{ margin: 0, color: '#1E3A8A', fontSize: '20px', textTransform: 'uppercase' }}>Hồ Sơ Đánh Giá Phát Triển Tâm Lý - Giáo Dục</h2>
           <div style={{ fontSize: '14px', color: '#4B5563', marginTop: '6px' }}>Học sinh: <strong>{dashboardData?.student_info?.name}</strong> | Lớp: {dashboardData?.student_info?.class_name} | Mã: #{dashboardData?.student_info?.id.toString().padStart(4, '0')}</div>
           <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Ngày đánh giá: {new Date().toLocaleDateString('vi-VN')}</div>
        </div>

      {/* KHỐI 1: TRIANGULATION RADAR */}
      <div className="bento-card animate-fade-in delay-1" style={{ border: '1px solid #E5E7EB', boxShadow: 'none' }}>
        <div className="bento-header">
          <h2 className="bento-title"><BarChart2 size={18} /> PHÂN TÍCH ĐA CHIỀU (TRIANGULATION)</h2>
        </div>
        
        <div className="mobile-col-flex">
          <div className="glass-panel" style={{flex:1.5, height:'350px', padding:'24px', display:'flex', flexDirection:'column', justifyContent:'center'}}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                <PolarGrid stroke="var(--border-color)" />
                <PolarAngleAxis dataKey="subject" tick={{fill: 'var(--text-main)', fontSize: 13, fontWeight: 700}} />
                <PolarRadiusAxis angle={30} domain={[0, 4]} tickCount={5} tick={{fill:'var(--text-muted)', fontSize: 11}} />
                <Tooltip cursor={{strokeDasharray: '3 3'}} contentStyle={{fontSize:'12px', borderRadius:'4px', boxShadow:'var(--shadow-sm)', border:'1px solid var(--border-color)'}} />
                <Radar name="Chỉ số ZPD" dataKey="A" stroke={mainColor} strokeWidth={2} fill={mainColor} fillOpacity={0.15} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div style={{flex:1}}>
            <div className="k-card">
               <div className="k-header"><span className="badge light-blue">TRỌNG SỐ</span> <span className="badge solid-blue">MA TRẬN ĐIỂM</span></div>
               <div className="k-content">
                 <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #F4F5F7'}}>
                   <span style={{fontSize:'13px', color:'var(--text-muted)'}}>Giáo viên (Qualitative)</span>
                   <span style={{fontWeight:'700'}}>{risk_profile.avg_teacher_score} <span style={{color:'var(--text-muted)', fontWeight:'400'}}>(30%)</span></span>
                 </div>
                 <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #F4F5F7'}}>
                   <span style={{fontSize:'13px', color:'var(--text-muted)'}}>Phụ huynh (Survey)</span>
                   <span style={{fontWeight:'700'}}>{risk_profile.avg_parent_score} <span style={{color:'var(--text-muted)', fontWeight:'400'}}>(30%)</span></span>
                 </div>
                 <div style={{display:'flex', justifyContent:'space-between', padding:'8px 0'}}>
                   <span style={{fontSize:'13px', color:'var(--text-muted)'}}>Thực nghiệm (Quantitative)</span>
                   <span style={{fontWeight:'700'}}>{risk_profile.avg_probe_score} <span style={{color:'var(--text-muted)', fontWeight:'400'}}>(40%)</span></span>
                 </div>
               </div>
            </div>
            
            <div style={{padding:'16px', background:'#DEEBFF', borderLeft:'3px solid #0052CC', borderRadius:'4px', color:'#0052CC', fontSize:'12px', lineHeight:'1.5'}}>
              <strong>MÔ HÌNH CROSS-VALIDATION:</strong> Kết hợp 3 nguồn quan sát độc lập, đảm bảo loại bỏ sai số chủ quan.
            </div>
          </div>
        </div>
      </div>

      {/* KHỐI 2: PREDICTIVE ANALYTICS */}
      <div className="bento-card animate-fade-in delay-2">
        <div className="bento-header">
          <h2 className="bento-title"><Target size={18} /> MÔ HÌNH DỰ BÁO CHUỖI THỜI GIAN (PREDICTIVE AI)</h2>
        </div>
        <div style={{height: '350px', marginTop: '16px'}}>
           <ResponsiveContainer width="100%" height="100%">
            <LineChart data={predictive_data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{fontSize: 12, fill: '#6B7280'}} axisLine={false} tickLine={false} />
              <YAxis domain={[1, 4]} tick={{fontSize: 12, fill: '#6B7280'}} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                labelStyle={{fontWeight: 'bold', color: '#374151', marginBottom: '4px'}}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{fontSize: '12px'}}/>
              <Line 
                type="monotone" 
                dataKey="without_zpd" 
                name="Rủi ro NẾU KHÔNG Can thiệp" 
                stroke="#DE350B" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#DE350B', strokeWidth: 2, stroke: '#FFF' }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="with_zpd" 
                name="Dự kiến tiến bộ NẾU ÁP DỤNG ZPD" 
                stroke="#00875A" 
                strokeWidth={3}
                dot={{ r: 4, fill: '#00875A', strokeWidth: 2, stroke: '#FFF' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center'}}>
          Mô hình Hồi quy dự báo dựa trên tỷ lệ đáp ứng lâm sàng trung bình đối với phương pháp can thiệp ZPD cường độ cao.
        </div>
      </div>

      {/* KHỐI 3: ZPD RECOMMENDATIONS */}
      {dashboardData.zpd_recommendation && (
        <div className="zpd-premium-panel animate-fade-in delay-3" style={{ border: '1px solid #E5E7EB', boxShadow: 'none' }}>
          <div className="zpd-premium-header">
            <h2 className="zpd-premium-title">
              <Sparkles className="ai-pulse-icon" size={22} />
              KHUYẾN NGHỊ CAN THIỆP IEP & ZPD (AI SYNTHESIS)
            </h2>
            <div className="badge solid-blue" style={{ borderRadius: '20px', padding: '4px 12px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563EB', border: '1px solid rgba(37, 99, 235, 0.2)'}}>
              <ShieldCheck size={14} /> BẢO MẬT GIÁO DỤC
            </div>
          </div>
          <div className="zpd-card" style={{marginTop: '24px'}}>
            <div className="card-tabs">
              <button 
                className={`card-tab ${activeZpdTab === 'school' ? 'active' : ''}`}
                onClick={() => setActiveZpdTab('school')}
              >
                <Users size={14} style={{display:'inline', marginRight:'4px'}}/> DÀNH CHO NHÀ TRƯỜNG
              </button>
              <button 
                className={`card-tab ${activeZpdTab === 'home' ? 'active' : ''}`}
                onClick={() => setActiveZpdTab('home')}
              >
                <Home size={14} style={{display:'inline', marginRight:'4px'}}/> DÀNH CHO GIA ĐÌNH
              </button>
            </div>

            <div className="zpd-card-content scrollable-content">
              {activeZpdTab === 'school' && renderZpdSection(dashboardData.zpd_recommendation.cho_nha_truong)}
              {activeZpdTab === 'home' && renderZpdSection(dashboardData.zpd_recommendation.cho_gia_dinh)}
            </div>
          </div>
          <div className="zpd-status-bar">
            <span>Dựa trên Khuyến nghị Can thiệp Cá nhân hóa (IEP) kết hợp mô hình ZPD.</span>
            <span>Cập nhật tự động bởi hệ thống AI</span>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// --- TAB 4: Parent Portal ---
function ParentPortalTab({ studentId, refreshTrigger, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loadingQs, setLoadingQs] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const abortControllerRef = React.useRef(null);
  const timeoutRef = React.useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (!studentId) return;
    setIsSubmitted(false);
    setLoadingQs(true);
    setCurrentStep(0);
    setAnswers({});
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    axios.get(`${API_URL}/students/${studentId}/survey-questions`, { signal: controller.signal })
      .then(res => {
        setQuestions(res.data.questions || []);
      })
      .catch(err => {
        if (axios.isCancel(err)) return;
        console.error(err);
        // Fallback khẩn cấp nếu API lỗi
        setQuestions([
          { id: 'q1', text: 'Khi ở nhà, bé có thường xuyên bị hoảng sợ quá mức bởi các âm thanh lớn không?', type: 'routine', reason: 'Giúp đánh giá độ nhạy cảm giác quan.' },
          { id: 'q2', text: 'Bé có thường xuyên vỗ tay liên tục hoặc lắc lư người một cách vô thức không?', type: 'routine', reason: 'Nhằm xác định các hành vi lặp lại.' },
          { id: 'q3', text: 'Khi bé đang buồn bực, bé có cực kỳ khó bình tĩnh lại ngay cả khi được vỗ về không?', type: 'social', reason: 'Đánh giá khả năng điều chỉnh cảm xúc.' },
          { id: 'q4', text: 'Bé có hay tránh né giao tiếp bằng mắt khi anh/chị gọi tên bé không?', type: 'social', reason: 'Giao tiếp bằng mắt là cột mốc quan trọng để đánh giá kết nối xã hội.' },
          { id: 'q5', text: 'Bé có thường bỏ dở trò chơi chỉ sau 1-2 phút và không thể tập trung không?', type: 'attention', reason: 'Giúp sàng lọc vấn đề duy trì sự chú ý.' }
        ]);
      })
      .finally(() => {
        if (abortControllerRef.current === controller) {
          setLoadingQs(false);
        }
      });
  }, [studentId, refreshTrigger]);

  const handleSelect = (qId, val) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    if (currentStep < questions.length - 1) {
      timeoutRef.current = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 400);
    }
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      alert("Vui lòng trả lời đầy đủ các câu hỏi.");
      return;
    }
    
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/surveys`, { student_id: studentId, answers, questions }, { signal: controller.signal });
      if (abortControllerRef.current === controller) {
        setIsSubmitted(true);
        setSubmitting(false);
        if (onComplete) onComplete();
      }
    } catch (error) {
      if (!axios.isCancel(error)) {
        console.error(error);
        alert("Có lỗi kết nối mạng, không thể gửi khảo sát. Vui lòng thử lại.");
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="bento-card animate-fade-in delay-2">
      <div className="bento-header">
        <h2 className="bento-title"><User size={18}/> KHẢO SÁT HÀNH VI TẠI NHÀ</h2>
      </div>
      <div style={{marginBottom: '24px', color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6'}}>
        Để hỗ trợ giáo viên đưa ra chiến lược can thiệp ZPD tốt nhất, xin phụ huynh vui lòng trả lời khách quan các câu hỏi sau dựa trên quan sát tại nhà trong 1 tháng qua. 
      </div>

      <div className="parent-survey-container">
        {loadingQs ? (
           <div style={{padding:'40px', textAlign:'center', color:'var(--text-muted)'}}>
             <div className="loader-spinner" style={{borderColor: 'rgba(79,70,229,0.3)', borderTopColor: 'var(--primary)', margin: '0 auto 12px'}}></div> 
             Đang khởi tạo câu hỏi dựa trên hồ sơ lâm sàng của trẻ...
           </div>
        ) : isSubmitted ? (
          <div style={{textAlign:'center', padding:'40px', color:'var(--success)', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0'}}>
            <h4 style={{margin: '0 0 8px 0', color: '#166534'}}>Cảm ơn phụ huynh đã hoàn thành khảo sát!</h4>
            <p style={{margin: 0, fontSize: '14px', color: '#15803D'}}>Dữ liệu của bạn đã được ghi nhận vào hệ thống để các chuyên gia phân tích và thiết kế lộ trình can thiệp phù hợp (ZPD).</p>
          </div>
        ) : questions.length === 0 ? (
          <div style={{textAlign:'center', padding:'40px', color:'var(--success)', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0'}}>
            <h4 style={{margin: '0 0 8px 0', color: '#166534'}}>Không yêu cầu khảo sát</h4>
            <p style={{margin: 0, fontSize: '14px', color: '#15803D'}}>Dựa trên báo cáo gần nhất, hành vi của trẻ hoàn toàn bình thường. Không cần thiết thực hiện khảo sát bổ sung vào lúc này.</p>
          </div>
        ) : (
          <div className="wizard-container animate-fade-in">
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{width: `${((currentStep) / questions.length) * 100}%`}}></div>
            </div>
            <div className="wizard-step-counter">
              Câu hỏi {currentStep + 1} / {questions.length}
            </div>

            <div className="survey-step-wrapper">
              {questions.map((q, idx) => (
                <div key={q.id || `q-${idx}`} className={`survey-step ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'prev' : ''} ${idx > currentStep ? 'next' : ''}`}>
                  <div className="q-text">{q.text}</div>
                  {q.reason && (
                    <div className="q-reason">
                      <strong>AI Giải thích:</strong> {q.reason}
                    </div>
                  )}
                  <div className="radio-group">
                    <label 
                      className={`radio-btn ${answers[q.id] === 0 ? 'selected no' : ''}`}
                      onClick={(e) => { e.preventDefault(); handleSelect(q.id, 0); }}
                    >
                      <input type="radio" name={q.id} checked={answers[q.id] === 0} readOnly style={{display:'none'}} />
                      <div className="radio-content">
                        <span className="r-title">Không</span>
                        <span className="r-desc">Bé vẫn sinh hoạt bình thường</span>
                      </div>
                    </label>
                    <label 
                      className={`radio-btn ${answers[q.id] === 1 ? 'selected yes' : ''}`}
                      onClick={(e) => { e.preventDefault(); handleSelect(q.id, 1); }}
                    >
                      <input type="radio" name={q.id} checked={answers[q.id] === 1} readOnly style={{display:'none'}} />
                      <div className="radio-content">
                        <span className="r-title">Có</span>
                        <span className="r-desc">Tôi có quan sát thấy dấu hiệu này</span>
                      </div>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="wizard-actions">
              <button 
                className="btn-secondary" 
                disabled={currentStep === 0} 
                onClick={() => setCurrentStep(p => p - 1)}>
                Quay lại
              </button>

              <div style={{display: 'flex', gap: '12px'}}>
                {currentStep < questions.length - 1 && answers[questions[currentStep]?.id] !== undefined && (
                  <button 
                    className="btn-premium animate-fade-in" 
                    onClick={() => {
                      if (timeoutRef.current) clearTimeout(timeoutRef.current);
                      setCurrentStep(p => p + 1);
                    }}>
                    Tiếp tục
                  </button>
                )}

                {currentStep === questions.length - 1 && Object.keys(answers).length === questions.length && (
                  <button className="btn-premium animate-fade-in" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Đang gửi...' : 'Gửi Đánh Giá Chuyên Sâu'}
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

export default App;
