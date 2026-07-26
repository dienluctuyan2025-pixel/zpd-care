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
          <h1 className="bento-title" style={{ fontSize: '28px', color: 'var(--text-main)' }}>
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
            <div style={{ flex: '1 1 400px', fontSize: '15px', lineHeight: 1.6, color: 'var(--text-main)' }}>
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
              <p style={{ marginTop: '16px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
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
          <div style={{ marginTop: '16px', fontSize: '14px', lineHeight: 1.6, color: 'var(--text-main)' }}>
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
            <div style={{ flex: '1 1 200px', fontSize: '14px', lineHeight: 1.6, color: 'var(--text-main)' }}>
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
            <CheckCircle size={20} color="#ef4444"/> 4. Sổ tay Thao tác Lâm sàng (Clinical Operations)
          </h2>
          
          <div className="guide-steps-container">
            {/* Step 1 */}
            <div className="guide-step">
              <div className="guide-step-header">
                <span className="step-badge">1</span>
                <h3>Phân hệ Nhật ký Sự kiện (ABC Data Collection)</h3>
              </div>
              <div className="guide-step-body">
                <p>Nơi giáo viên ghi lại hành vi của trẻ hàng ngày. Hãy mô tả cụ thể trẻ đã làm gì, trong hoàn cảnh nào. Hệ thống sử dụng mô hình ABC (Antecedent - Behavior - Consequence) tiêu chuẩn quốc tế.</p>
                <ul className="guide-list">
                  <li><strong>A - Tiền đề (Antecedent):</strong> Chuyện gì xảy ra ngay trước khi hành vi xuất hiện? (VD: Cô giáo yêu cầu dọn đồ chơi, Tiếng ồn lớn phát ra từ loa...)</li>
                  <li><strong>B - Hành vi (Behavior):</strong> Mô tả khách quan những gì trẻ làm (VD: Trẻ nằm vạ, ném đồ chơi, đập đầu) thay vì phán xét (VD: Trẻ hư, lười biếng).</li>
                  <li><strong>C - Hệ quả (Consequence):</strong> Giáo viên hoặc bạn bè phản ứng thế nào? Trẻ nhận được gì sau hành vi đó? (VD: Trẻ được miễn dọn dẹp, trẻ thu hút được sự chú ý).</li>
                </ul>
                <div className="feature-highlight">
                  <Sparkles size={14} color="#f59e0b" style={{ marginRight: 6, flexShrink: 0 }}/>
                  <div>
                    <strong>Tính năng nổi bật: Phân tích AI Tự động.</strong> Không cần giáo viên phải ngồi bóc tách A, B, C bằng tay. Cô giáo chỉ cần viết tự do (VD: "Nay gọi Bo cất đồ chơi mà Bo không nghe, bực quá ném luôn cái siêu nhân, mình phạt ra góc ngồi"). Trí tuệ nhân tạo (NLP) sẽ tự động phân tách ngữ nghĩa và trích xuất đúng 3 thành phần này để lưu vào CSDL.
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="guide-step">
              <div className="guide-step-header">
                <span className="step-badge">2</span>
                <h3>Phân hệ Khảo sát Phụ huynh (Parent Engagement)</h3>
              </div>
              <div className="guide-step-body">
                <p>Nơi giáo viên phỏng vấn phụ huynh (qua điện thoại hoặc sổ liên lạc) và tick chọn kết quả vào hệ thống. Điểm số từ module này đóng vai trò quan trọng (30% trọng số) để đánh giá hành vi đó là "rối loạn" (xảy ra ở nhiều môi trường) hay chỉ là "thích nghi kém" (chỉ xảy ra ở trường).</p>
                <div className="feature-highlight">
                  <Database size={14} color="#3b82f6" style={{ marginRight: 6, flexShrink: 0 }}/>
                  <div>
                    <strong>Công nghệ Bộ câu hỏi động (Dynamic Routing):</strong> Khác với các form cố định khô khan, ZPD Care tự động trích xuất các câu hỏi khảo sát <em>dựa trên chính những hành vi bất thường</em> mà giáo viên vừa ghi nhận ở Tab Nhật ký. Nếu bé hay xoay tròn bánh xe ở lớp, hệ thống sẽ hỏi mẹ: "Ở nhà bé có hay nhìn chăm chú vào quạt trần hay xoay lốp xe ô tô đồ chơi không?".
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="guide-step">
              <div className="guide-step-header">
                <span className="step-badge">3</span>
                <h3>Phân hệ Đo lường Chuyên sâu (Telemetry Probes Catalog)</h3>
              </div>
              <div className="guide-step-body">
                <p>Gồm 7 bài test siêu tốc (Play-based Assessment) để giáo viên thao tác cùng trẻ trên lớp, không làm trẻ sợ hãi vì nó giống như trò chơi (Dưới 3 phút/bài):</p>
                <ul className="guide-list" style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                  <li><strong>NR (Name Response):</strong> Gọi tên trẻ từ phía sau cách 1m. Đánh giá độ nhạy cảm thính giác và sự chú ý.</li>
                  <li><strong>JA (Joint Attention):</strong> Chỉ tay vào đồ vật ở xa. Đánh giá khả năng chia sẻ sự chú ý (Dấu hiệu then chốt của ASD).</li>
                  <li><strong>EM (Eye Contact):</strong> Giao tiếp ánh mắt khi đưa đồ chơi. Đánh giá chất lượng tương tác xã hội.</li>
                  <li><strong>TT (Turn Taking):</strong> Chơi lăn bóng qua lại. Đánh giá nhận thức về sự luân phiên, tính tương hỗ.</li>
                  <li><strong>RT (Response to Touch):</strong> Chạm nhẹ vào vai/tay trẻ. Đánh giá rối loạn xử lý cảm giác (SPD - Quá nhạy cảm hoặc kém nhạy cảm).</li>
                  <li><strong>SA (Social Smile):</strong> Cười với trẻ xem trẻ có cười đáp lại. Đánh giá sự đồng cảm và phản xạ cảm xúc.</li>
                  <li><strong>ST (Stereotypy Test):</strong> Cung cấp đồ chơi có bánh xe/động cơ. Quan sát hành vi chơi rập khuôn (Spinning/Lining up).</li>
                </ul>
                <div className="feature-highlight" style={{ marginTop: '16px', background: 'rgba(16, 185, 129, 0.1)', borderLeft: '3px solid #10b981', color: '#6ee7b7' }}>
                  <strong>Thang đo Rubric Chuẩn hóa:</strong> Mỗi bài test có hệ thống chấm điểm từ 0 (Điển hình) đến 3 (Bất thường nghiêm trọng), có mô tả chi tiết bằng tiếng Việt. Giúp giáo viên mầm non dù không học chuyên ngành Y khoa vẫn chấm điểm chính xác (Inter-rater reliability).
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="guide-step">
              <div className="guide-step-header">
                <span className="step-badge">4</span>
                <h3>Đọc hiểu Hồ sơ & Áp dụng Phác đồ ZPD</h3>
              </div>
              <div className="guide-step-body">
                <p>Phần cốt lõi tạo nên giá trị của dự án, nằm ở việc diễn giải dữ liệu thành <strong>Kế hoạch hành động sư phạm</strong>.</p>
                <ul className="guide-list">
                  <li><strong>Biểu đồ Radar đa chiều:</strong> Hiển thị trực quan sức khỏe tâm lý của trẻ trên các trục <em>Giao tiếp Xã hội, Mức độ Tập trung, Cảm giác</em>. Diện tích biểu đồ càng lớn, nguy cơ càng cao.</li>
                  <li><strong>ZPD Gia đình:</strong> Cung cấp kịch bản để giáo viên tư vấn cho Phụ huynh, với nguyên tắc "Đồng bộ môi trường" (Ví dụ: Giảm thời gian xem iPad, tạo góc chơi ít kích thích âm thanh).</li>
                  <li><strong>Kỹ năng Prompting (Gợi ý):</strong> ZPD Care hướng dẫn cô giáo cách dùng <em>Fading Prompts</em> (Rút dần hỗ trợ): Từ cầm tay trẻ làm (Physical) -&gt; Chỉ tay (Gestural) -&gt; Nhắc lời (Verbal) -&gt; Trẻ tự làm (Independent). Không để trẻ bị phụ thuộc vào cô.</li>
                </ul>
              </div>
            </div>

            {/* Step 5 */}
            <div className="guide-step">
              <div className="guide-step-header">
                <span className="step-badge">5</span>
                <h3>Làm chủ Trợ lý AI (Prompt Engineering cho Giáo viên)</h3>
              </div>
              <div className="guide-step-body">
                <p>Trợ lý ảo nằm ở góc phải màn hình không phải là ChatGPT thông thường. Nó được trang bị kỹ thuật <strong>RAG (Retrieval-Augmented Generation)</strong>, nghĩa là nó <em>đã đọc trước toàn bộ lịch sử 30 ngày qua của đứa trẻ bạn đang chọn</em>.</p>
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <strong>Mẹo hỏi AI (Prompt Tips) hiệu quả:</strong>
                  <ul className="guide-list">
                    <li>❌ <em>Không nên hỏi:</em> "Trẻ tự kỷ là gì?" (Quá chung chung, bạn có thể tra Google).</li>
                    <li>✅ <em>Nên hỏi:</em> "Dựa vào bài test JA và EM tuần trước, gợi ý cho tôi 2 trò chơi tương tác phù hợp cho Bo vào giờ ra chơi chiều nay".</li>
                    <li>✅ <em>Nên hỏi:</em> "Mẹ bé không tin con mình có nguy cơ, tôi nên nói gì trong cuộc họp phụ huynh tới dựa trên biểu đồ Radar này?".</li>
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Phần footer */}
        <div className="bento-card soft" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px' }}>
          <Cpu size={32} color="#94a3b8" style={{ margin: '0 auto 16px' }}/>
          <h3 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>Được thiết kế cho Tương lai của Giáo dục Mầm non</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '600px', margin: '0 auto' }}>
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
          color: var(--text-main);
          margin: 0;
        }
        .guide-step-body {
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-main);
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
          color: var(--text-main);
        }
        .guide-list li strong {
          color: var(--text-main);
        }
      `}</style>
    </div>
  );
}

export default UserGuide;
