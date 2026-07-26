"use client";
import React from 'react';
import {
  BookOpen, Brain, Activity, Database, CheckCircle, 
  MessageSquare, User, Layout, Eye, Sparkles, Scale, Cpu, Search
} from 'lucide-react';

function UserGuide() {
  return (
    <div className="sci-about-container">
      <div className="bento-header" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="bento-title" style={{ fontSize: '28px', color: '#fff' }}>
            <BookOpen size={28} style={{ color: 'var(--brand-primary)', marginRight: '12px' }}/>
            Sổ tay Vận hành ZPD Care
          </h1>
          <p className="obs-subtitle" style={{ fontSize: '15px', marginTop: '8px' }}>
            Hướng dẫn sử dụng chi tiết & Cơ sở khoa học của ứng dụng theo dõi và can thiệp giáo dục hòa nhập bậc mầm non.
          </p>
        </div>
      </div>

      <div className="bento-grid">
        
        {/* Phần 1: Triết lý */}
        <div className="bento-card" style={{ gridColumn: '1 / -1' }}>
          <h2 className="bento-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '20px' }}>
            <Scale size={20} color="#3b82f6"/> 1. Triết lý Vận hành: Tam giác hóa Dữ liệu (Data Triangulation)
          </h2>
          <div style={{ marginTop: '16px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 400px', fontSize: '15px', lineHeight: 1.6, color: '#e7e5e4' }}>
              <p style={{ marginBottom: '12px' }}>
                ZPD Care không phải là một công cụ y tế để dán nhãn chẩn đoán trẻ. Nó là một <strong>Hệ sinh thái Giáo dục</strong> sử dụng triết lý <em>Tam giác hóa Dữ liệu (Data Triangulation)</em> nhằm loại bỏ thiên kiến cá nhân của giáo viên, mang lại góc nhìn 360 độ về trẻ.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <li style={{ display: 'flex', gap: 12 }}>
                  <Eye size={18} color="#f97316" style={{ flexShrink: 0, marginTop: 4 }} />
                  <div>
                    <strong>Quan sát của Giáo viên (30%):</strong> Ghi chép ABC Data (Tiền đề - Hành vi - Hệ quả) hàng ngày tại lớp.
                  </div>
                </li>
                <li style={{ display: 'flex', gap: 12 }}>
                  <User size={18} color="#f97316" style={{ flexShrink: 0, marginTop: 4 }} />
                  <div>
                    <strong>Khảo sát Phụ huynh (30%):</strong> Phụ huynh cung cấp thông tin sinh hoạt ở nhà, tạo sự đồng bộ giữa nhà trường và gia đình.
                  </div>
                </li>
                <li style={{ display: 'flex', gap: 12 }}>
                  <Activity size={18} color="#f97316" style={{ flexShrink: 0, marginTop: 4 }} />
                  <div>
                    <strong>Module Kiểm chứng / Probes (40%):</strong> 7 bài test đo lường chức năng chuẩn hóa thông qua các trò chơi (Play-based assessment) trực tiếp trên lớp.
                  </div>
                </li>
              </ul>
              <p style={{ marginTop: '16px', fontStyle: 'italic', color: '#a8a29e' }}>
                Thuật toán của hệ thống sẽ tự động tổng hợp 3 luồng dữ liệu này để đưa ra Phân tích mức độ (Cảnh báo sớm) và quan trọng nhất là: <strong>Vùng Phát triển Gần (ZPD)</strong>.
              </p>
            </div>
            <div style={{ flex: '1 1 300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <img src="/docs/data_triangulation.png" alt="Data Triangulation Concept" style={{ width: '100%', maxWidth: '400px', borderRadius: '12px', border: '1px solid var(--border)' }} />
            </div>
          </div>
        </div>

        {/* Phần 2: Luồng công việc chính */}
        <div className="bento-card" style={{ gridColumn: 'span 2' }}>
          <h2 className="bento-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '18px' }}>
            <Layout size={18} color="#10b981"/> 2. Tổng quan Giao diện (Dashboard)
          </h2>
          <div style={{ marginTop: '16px', fontSize: '14px', lineHeight: 1.6, color: '#d6d3d1' }}>
            <p>Trang chủ (Dashboard) được thiết kế theo cấu trúc "Split-Pane" (chia 2 màn hình) giúp giáo viên dễ dàng thao tác mà không bị mất dấu học sinh đang theo dõi.</p>
            <ul style={{ paddingLeft: '20px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Thanh Sidebar (Trái):</strong> Hiển thị danh sách học sinh. Các bé được tự động phân loại theo 4 mức độ: Xanh (An toàn), Vàng (Theo dõi), Cam (Lưu ý), Đỏ (Báo động). Thanh này có tích hợp tính năng <em>Sắp xếp thông minh</em> theo mức độ nguy cơ hoặc theo Tên/Lớp.</li>
              <li><strong>Không gian làm việc (Phải):</strong> Nơi thực hiện toàn bộ nghiệp vụ sư phạm (Ghi chép, Khảo sát, Làm bài test, Tra cứu ZPD).</li>
              <li><strong>Thanh Command Palette (Ctrl + K):</strong> Thanh tìm kiếm thần tốc giúp tìm học sinh và truy cập nhanh các tính năng (Nhấn biểu tượng Kính lúp hoặc phím tắt).</li>
            </ul>
          </div>
        </div>

        <div className="bento-card" style={{ gridColumn: 'span 2' }}>
          <h2 className="bento-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '18px' }}>
            <Brain size={18} color="#8b5cf6"/> 3. Phác đồ ZPD & AI Trợ lý
          </h2>
          <div style={{ marginTop: '16px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px', fontSize: '14px', lineHeight: 1.6, color: '#d6d3d1' }}>
              <p>Điểm sáng tạo cốt lõi của đề tài nằm ở việc cung cấp <strong>Khuyến nghị Can thiệp ZPD (Zone of Proximal Development)</strong>. Thay vì chỉ đưa ra con số báo động vô hồn, hệ thống giúp giáo viên "Biết phải làm gì tiếp theo".</p>
              <ul style={{ paddingLeft: '20px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li><strong>ZPD Toàn diện (Holistic ZPD):</strong> Các nguyên tắc sư phạm chung (Ví dụ: <em>Thiết lập Góc Bình Yên</em>, <em>Áp dụng nguyên tắc ABC</em>).</li>
                <li><strong>ZPD Tình huống (Situational ZPD):</strong> AI tự động đọc nhật ký gần nhất của trẻ và sinh ra hướng dẫn đặc trị. <em>(VD: Bé vẩy tay -&gt; Gợi ý cung cấp đồ chơi bóp fidget - Replacement Behavior).</em></li>
                <li><strong>Chatbot AI Nhúng:</strong> Ở góc phải dưới màn hình có một trợ lý ảo ZPD. AI này đã được "đọc" toàn bộ hồ sơ của bé và sẽ trả lời các thắc mắc chuyên môn của cô giáo theo đúng ngữ cảnh thực tế của trẻ đó.</li>
              </ul>
            </div>
            <div style={{ flex: '0 0 200px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
               <img src="/docs/zpd_scaffolding.png" alt="ZPD Scaffolding" style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--border)' }} />
            </div>
          </div>
        </div>

        {/* Phần 3: Hướng dẫn chi tiết các tab */}
        <div className="bento-card" style={{ gridColumn: '1 / -1' }}>
          <h2 className="bento-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '20px', marginBottom: '20px' }}>
            <CheckCircle size={20} color="#ef4444"/> 4. Hướng dẫn Nhập liệu & Thao tác
          </h2>
          
          <div className="guide-steps-container">
            {/* Step 1 */}
            <div className="guide-step">
              <div className="guide-step-header">
                <span className="step-badge">1</span>
                <h3>Tab Nhật ký Sự kiện (ABC Data)</h3>
              </div>
              <div className="guide-step-body">
                <p>Nơi giáo viên ghi lại hành vi của trẻ hàng ngày. Hãy mô tả cụ thể trẻ đã làm gì, trong hoàn cảnh nào.</p>
                <div className="feature-highlight">
                  <Sparkles size={14} color="#f59e0b" style={{ marginRight: 6 }}/>
                  <strong>Tính năng nổi bật: Offline-first Draft.</strong> Nếu bạn đang gõ dở mà mất điện hoặc tắt nhầm trình duyệt, dữ liệu sẽ tự động được lưu nháp tại máy tính. Khi mở lại, bản nháp sẽ còn nguyên.
                </div>
                <p style={{ marginTop: '8px' }}>Sau khi Lưu, hệ thống sẽ gọi AI để phân tích ngữ nghĩa, tự động bóc tách: Hành vi, Tiền đề, Hệ quả và Cảm xúc.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="guide-step">
              <div className="guide-step-header">
                <span className="step-badge">2</span>
                <h3>Tab Khảo sát Phụ huynh</h3>
              </div>
              <div className="guide-step-body">
                <p>Nơi giáo viên phỏng vấn phụ huynh (qua điện thoại hoặc sổ liên lạc) và tick chọn kết quả vào hệ thống. Điểm số từ module này chiếm 30% trọng số.</p>
                <div className="feature-highlight">
                  <Database size={14} color="#3b82f6" style={{ marginRight: 6 }}/>
                  <strong>Bộ câu hỏi động:</strong> Hệ thống tự động trích xuất các câu hỏi dựa trên chính những hành vi bất thường mà giáo viên vừa ghi nhận ở Tab Nhật ký, giúp khảo sát đi đúng vào trọng tâm!
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="guide-step">
              <div className="guide-step-header">
                <span className="step-badge">3</span>
                <h3>Tab Module Kiểm chứng (Telemetry Probes)</h3>
              </div>
              <div className="guide-step-body">
                <p>Gồm 7 bài test siêu tốc (dưới 3 phút/bài) để giáo viên thao tác cùng trẻ trên lớp, nhằm đo lường chính xác các chỉ số:</p>
                <ul className="guide-list">
                  <li><strong>NR (Name Response):</strong> Gọi tên trẻ từ phía sau.</li>
                  <li><strong>JA (Joint Attention):</strong> Chỉ tay vào đồ vật xa.</li>
                  <li><strong>EM (Eye Contact):</strong> Giao tiếp ánh mắt khi tương tác.</li>
                  <li><strong>SA (Social Smile):</strong> Khả năng cười đáp lại.</li>
                </ul>
                <p style={{ marginTop: '8px' }}>Mỗi module có thang đo rubric (0-3 điểm) rõ ràng, giúp giáo viên không cần phải có chuyên môn sâu về y khoa vẫn đánh giá được chính xác mức độ của trẻ.</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="guide-step">
              <div className="guide-step-header">
                <span className="step-badge">4</span>
                <h3>Tab Hồ sơ & ZPD</h3>
              </div>
              <div className="guide-step-body">
                <p>Bảng điều khiển trung tâm nơi thuật toán hội tụ dữ liệu.</p>
                <ul className="guide-list">
                  <li><strong>Biểu đồ Radar:</strong> Phân tích sức khỏe tâm lý của trẻ trên 3 trục: Giao tiếp Xã hội, Mức độ Tập trung, và Hành vi Lặp lại.</li>
                  <li><strong>Phác đồ ZPD Sư phạm:</strong> Hiển thị hướng dẫn can thiệp từng bước cho nhà trường và gia đình. Hãy sử dụng bảng này trong các cuộc họp phụ huynh định kỳ.</li>
                </ul>
              </div>
            </div>

          </div>
        </div>

        {/* Phần footer */}
        <div className="bento-card soft" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px' }}>
          <Cpu size={32} color="#94a3b8" style={{ margin: '0 auto 16px' }}/>
          <h3 style={{ color: '#f1f5f9', marginBottom: '8px' }}>Được thiết kế cho Tương lai của Giáo dục Mầm non</h3>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '600px', margin: '0 auto' }}>
            ZPD Care không thay thế giáo viên, mà trao cho họ một "Con mắt thứ 3" và "Bộ não Sư phạm" để không một đứa trẻ nào bị bỏ lại phía sau. 
            Mọi dữ liệu được mã hóa và bảo mật, tuân thủ đạo đức nghiên cứu giáo dục.
          </p>
        </div>

      </div>

      <style jsx>{`
        .guide-steps-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .guide-step {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s ease;
        }
        .guide-step:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.15);
        }
        .guide-step-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .step-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: var(--brand-primary);
          color: white;
          font-weight: 800;
          font-size: 14px;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(186, 55, 10, 0.3);
        }
        .guide-step-header h3 {
          font-size: 17px;
          color: #f8fafc;
          margin: 0;
        }
        .guide-step-body {
          font-size: 14px;
          line-height: 1.6;
          color: #d6d3d1;
          padding-left: 40px;
        }
        .feature-highlight {
          margin-top: 12px;
          padding: 12px 16px;
          background: rgba(245, 158, 11, 0.1);
          border-left: 3px solid #f59e0b;
          border-radius: 4px;
          color: #fcd34d;
          font-size: 13.5px;
          display: flex;
          align-items: flex-start;
        }
        .guide-list {
          padding-left: 20px;
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .guide-list li {
          color: #d6d3d1;
        }
        .guide-list li strong {
          color: #e2e8f0;
        }
      `}</style>
    </div>
  );
}

export default UserGuide;
