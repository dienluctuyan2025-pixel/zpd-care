"use client";
import React from 'react';
import {
  Brain, Shield, Award, Users, Lightbulb, Activity, CheckCircle,
  Database, Layers, Target, BookOpen, Scale, ArrowLeft, Sparkles
} from 'lucide-react';

const PILLARS = [
  {
    icon: Brain,
    title: 'ZPD (Vygotsky)',
    body: 'Vùng phát triển gần — khoảng cách giữa việc trẻ tự làm được và việc trẻ làm được với hỗ trợ. Hệ thống gợi ý can thiệp theo bước nhỏ (scaffolding), không áp chuẩn cào bằng.',
  },
  {
    icon: Scale,
    title: 'Tam giác hóa dữ liệu',
    body: 'Điểm tổng hợp 30% quan sát GV + 30% khảo sát PH + 40% module kiểm chứng (rubric 1–4). Giảm thiên kiến một nguồn; không thay đánh giá chuyên khoa.',
  },
  {
    icon: BookOpen,
    title: 'Khung tham chiếu (không chẩn đoán)',
    body: 'Tham chiếu ngôn ngữ DSM-5-TR / CARS-like 1–4 / M-CHAT-R để cấu trúc quan sát. Không phải công cụ chẩn đoán có license; kết quả mang tính sàng lọc giáo dục.',
  },
  {
    icon: Layers,
    title: 'Catalog 7 module cố định',
    body: 'NR · JA · EM · TT · RT · SA · ST — protocol, rubric, telemetry game. AI không bịa bài test; GV chấm cuối theo tiêu chí quan sát.',
  },
  {
    icon: Sparkles,
    title: 'XAI & multimodal có kiểm soát',
    body: 'AI bôi từ khóa + giải thích. Audio/video chỉ tạo bản nháp; phải GV xác nhận mới tính điểm rủi ro. Minh bạch, human-in-the-loop.',
  },
  {
    icon: Shield,
    title: 'An toàn vận hành',
    body: 'Fallback AI an toàn, disclaimer sàng lọc, tài khoản giáo viên; PH trả lời qua cô (không cần login web).',
  },
];

const METHODS = [
  {
    code: 'CARS-like 1–4',
    color: 'rust',
    title: 'Thang rủi ro quan sát',
    points: [
      '1.0–1.9: An toàn / phù hợp lứa tuổi',
      '2.0–2.9: Cần theo dõi',
      '3.0–4.0: Ưu tiên kiểm chứng & phối hợp PH',
    ],
    note: 'Lấy cảm hứng cấu trúc thang CARS (1–4), không thay CARS-2 chuẩn hóa.',
  },
  {
    code: 'Triangulation',
    color: 'navy',
    title: 'Ba nguồn độc lập',
    points: [
      'GV 30% — nhật ký đã xác nhận',
      'PH 30% — khảo sát theo trục Social / Routine / Attention',
      'Probe 40% — rubric module catalog',
    ],
    note: 'Red-flag chỉ khi nhiều nguồn cùng cao (AND), giảm báo động giả.',
  },
  {
    code: 'Probe Catalog',
    color: 'terra',
    title: 'Kiểm chứng có protocol',
    points: [
      '7 module cố định + scientific basis',
      'Rubric 1–4 do GV; game chỉ telemetry',
      'Lưu scored_by, notes, reaction_ms…',
    ],
    note: 'Không tương đương ADOS-2; dùng cho quan sát giáo dục có cấu trúc.',
  },
];

export default function AboutProject({ onBack }) {
  return (
    <div className="about-page">
      <button type="button" className="about-back" onClick={onBack}>
        <ArrowLeft size={16} /> Về bảng làm việc
      </button>

      {/* Hero — cold rust */}
      <header className="about-hero">
        <div className="about-hero-inner">
          <span className="about-hero-badge">Cơ sở khoa học · ZPD Care</span>
          <h1>
            AI hỗ trợ theo dõi & can thiệp ZPD<br />
            <em>cho giáo dục mầm non hòa nhập</em>
          </h1>
          <p>
            Nền tảng số hóa quan sát hành vi, chiếu chéo ba nguồn dữ liệu và module kiểm chứng
            có rubric — giúp giáo viên và phụ huynh phối hợp sớm, minh bạch, không thay thế
            chẩn đoán y khoa.
          </p>
          <div className="about-hero-chips">
            <span>Sàng lọc giáo dục</span>
            <span>Human-in-the-loop</span>
            <span>Catalog 7 module</span>
            <span>MN Chí Thạnh</span>
          </div>
        </div>
        <div className="about-hero-glow" aria-hidden />
      </header>

      {/* Author + school */}
      <section className="about-author-row">
        <div className="about-author-card">
          <img src="/author.png" alt="Võ Thị Vỹ Phượng" className="about-author-photo" />
          <div>
            <div className="about-author-role">Tác giả · Giáo viên</div>
            <div className="about-author-name">Võ Thị Vỹ Phượng</div>
            <div className="about-author-org">
              <Shield size={14} /> Trường Mầm non Chí Thạnh
            </div>
          </div>
        </div>
        <div className="about-stat-cards">
          <div className="about-stat">
            <strong>30 / 30 / 40</strong>
            <span>GV · PH · Kiểm chứng</span>
          </div>
          <div className="about-stat">
            <strong>1.0 – 4.0</strong>
            <span>Thang rủi ro quan sát</span>
          </div>
          <div className="about-stat">
            <strong>7</strong>
            <span>Module catalog cố định</span>
          </div>
        </div>
      </section>

      {/* ZPD Philosophy */}
      <section className="about-section">
        <div className="about-section-head">
          <Target size={18} />
          <h2>Triết lý ZPD Care là gì?</h2>
        </div>
        
        <div className="about-section-lead" style={{ textAlign: 'justify', lineHeight: '1.7', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p>
            <strong>ZPD (Zone of Proximal Development)</strong> — hay <em>Vùng phát triển gần</em> — là học thuyết nền tảng do nhà tâm lý học lỗi lạc Lev Vygotsky đề xướng. Thuyết này khẳng định rằng sự phát triển nhận thức của trẻ không diễn ra cô lập, mà được thúc đẩy mạnh mẽ nhất thông qua tương tác xã hội và sự hướng dẫn đúng mức.
          </p>
          <p>
            Vygotsky định nghĩa ZPD là khoảng cách giữa <strong>"trình độ phát triển thực tế"</strong> (những gì trẻ có thể tự làm một mình một cách độc lập) và <strong>"trình độ phát triển tiềm năng"</strong> (những gì trẻ có thể đạt được khi có sự hướng dẫn, dìu dắt của người lớn hoặc bạn bè đồng trang lứa có năng lực hơn).
          </p>
          <p>
            Trong bối cảnh giáo dục mầm non, đặc biệt đối với trẻ có rối loạn phát triển, triết lý ZPD mang một thông điệp vô cùng sâu sắc: <strong>Không một đứa trẻ nào bị bỏ lại phía sau nếu chúng ta tìm đúng "Vùng phát triển" của chúng.</strong> Thay vì đánh giá trẻ bằng những chuẩn mực cào bằng cứng nhắc, giáo viên cần xác định chính xác "vùng" mà trẻ đang đứng để cung cấp sự hỗ trợ vừa vặn nhất.
          </p>
        </div>

        <div className="about-practice-grid" style={{ marginTop: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          <div className="about-practice">
            <Layers size={18} />
            <h3>Scaffolding (Thiết lập giàn giáo)</h3>
            <p style={{ textAlign: 'justify' }}>Thuật ngữ ẩn dụ cho việc cung cấp các bậc thang hỗ trợ. ZPD Care ứng dụng AI và dữ liệu tam giác hóa (từ giáo viên, phụ huynh và hệ thống kiểm chứng) không phải để gán nhãn trẻ, mà để <strong>dựng lên những chiếc "giàn giáo" vô hình</strong>. Hệ thống phân tích và gợi ý cho giáo viên những bước can thiệp chia nhỏ, vừa sức, giúp "nâng đỡ" trẻ từng bước tiến lên vùng tiềm năng. Khi trẻ đã vững vàng, chiếc giàn giáo này sẽ dần được rút ra để trẻ tự lập.</p>
          </div>
          <div className="about-practice">
            <Shield size={18} />
            <h3>Care (Sự thấu cảm & Chăm sóc)</h3>
            <p style={{ textAlign: 'justify' }}>Từ <em>Care</em> được đặt cạnh ZPD để khẳng định triết lý cốt lõi của toàn bộ dự án: Công nghệ AI tiên tiến hay hệ thống đo lường phức tạp đến đâu cũng chỉ là công cụ hỗ trợ giải phóng giáo viên khỏi gánh nặng sổ sách. Giá trị đích thực làm nên sự thay đổi kỳ diệu ở mỗi đứa trẻ không đến từ thuật toán, mà xuất phát từ <strong>tình yêu thương, sự kiên nhẫn thấu cảm và trái tim chăm sóc</strong> của người giáo viên mầm non trên hành trình giáo dục hòa nhập.</p>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="about-section">
        <div className="about-section-head">
          <Layers size={18} />
          <h2>Trụ cột phương pháp</h2>
        </div>
        <div className="about-pillar-grid">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <article key={p.title} className="about-pillar">
                <div className="about-pillar-icon"><Icon size={20} /></div>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Methods detail */}
      <section className="about-section">
        <div className="about-section-head">
          <Database size={18} />
          <h2>Cách hệ thống dùng khung tham chiếu</h2>
        </div>
        <p className="about-section-lead">
          Các khung quốc tế được dùng để <strong>cấu trúc quan sát và ngôn ngữ chuyên môn</strong>,
          không để tự động chẩn đoán. Mọi điểm số phục vụ sàng lọc và theo dõi tại trường.
        </p>
        <div className="about-method-grid">
          {METHODS.map((m) => (
            <article key={m.code} className={`about-method tone-${m.color}`}>
              <div className="about-method-code">{m.code}</div>
              <h3>{m.title}</h3>
              <ul>
                {m.points.map((pt) => (
                  <li key={pt}><CheckCircle size={14} /> {pt}</li>
                ))}
              </ul>
              <p className="about-method-note">{m.note}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Practical meaning */}
      <section className="about-section">
        <div className="about-section-head">
          <Lightbulb size={18} />
          <h2>Ý nghĩa thực tiễn</h2>
        </div>
        <div className="about-practice-grid">
          <div className="about-practice">
            <Activity size={18} />
            <h3>Sàng lọc sớm có cấu trúc</h3>
            <p>Ghi nhận hành vi có XAI, module kiểm chứng lặp lại được — hỗ trợ phát hiện sớm dấu hiệu cần theo dõi trong giai đoạn mầm non.</p>
          </div>
          <div className="about-practice">
            <Database size={18} />
            <h3>Hồ sơ số theo thời gian</h3>
            <p>Lịch sử quan sát, khảo sát PH, rubric probe và telemetry — phục vụ trao đổi chuyên môn và báo cáo sáng kiến.</p>
          </div>
          <div className="about-practice">
            <Users size={18} />
            <h3>Nhà trường · Gia đình</h3>
            <p>Giáo viên liên hệ PH và nhập khảo sát hộ; khuyến nghị ZPD cho lớp và nhà — không bắt PH đăng nhập web.</p>
          </div>
        </div>
      </section>

      {/* Honest boundary */}
      <section className="about-boundary">
        <Shield size={20} />
        <div>
          <h3>Ranh giới chuyên môn (bắt buộc)</h3>
          <p>
            ZPD Care là công cụ <strong>hỗ trợ sàng lọc và theo dõi giáo dục</strong>.
            Không thay thế chẩn đoán của bác sĩ / tâm lý lâm sàng; không tương đương ADOS-2, CARS-2 hay M-CHAT-R đã chuẩn hóa.
            Kết quả AI và game chỉ mang tính tham khảo — quyết định can thiệp tại trường do giáo viên và nhà trường chịu trách nhiệm,
            phối hợp phụ huynh và chuyên khoa khi cần.
          </p>
        </div>
      </section>
    </div>
  );
}
