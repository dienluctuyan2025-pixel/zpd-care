import os

# 1. Update BehaviorTab.jsx
bt_path = r"c:\Users\Admin\Desktop\SANG KIEN PHUONG - Gork\MatThanSuPham\frontend-next\src\components\dashboard\BehaviorTab.jsx"
with open(bt_path, "r", encoding="utf-8") as f:
    bt_content = f.read()

bt_content = bt_content.replace('accept="audio/*,video/*"', 'accept="audio/*,video/*,image/*" capture="environment"')

with open(bt_path, "w", encoding="utf-8") as f:
    f.write(bt_content)

# 2. Add Mobile CSS to zpd-ui.css
css_path = r"c:\Users\Admin\Desktop\SANG KIEN PHUONG - Gork\MatThanSuPham\frontend-next\src\app\zpd-ui.css"
mobile_css = """
/* =========================================================
   MOBILE RESPONSIVE (SMARTPHONE)
========================================================= */
@media (max-width: 768px) {
  /* Cho phép cuộn nội dung chính thay vì fix 100vh */
  .app-container, .app-container.sci-shell {
    flex-direction: column;
    height: auto;
    min-height: 100vh;
    overflow: auto;
  }

  /* Ẩn sidebar mặc định, chuyển thành Drawer vuốt từ trái */
  .sidebar.sci-sidebar {
    position: fixed;
    top: 0;
    left: -100%;
    height: 100vh;
    width: 280px;
    z-index: 1000;
    transition: left 0.3s ease;
    box-shadow: 4px 0 24px rgba(0,0,0,0.5);
  }
  
  .sidebar.sci-sidebar.mobile-open {
    left: 0;
  }

  /* Lớp mờ (Overlay) khi mở menu */
  .mobile-overlay {
    display: none;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 999;
    backdrop-filter: blur(2px);
    opacity: 0;
    transition: opacity 0.3s;
  }
  .mobile-overlay.show {
    display: block;
    opacity: 1;
  }

  /* Thanh Topbar: Thêm nút Hamburger */
  .sci-topbar {
    position: sticky;
    top: 0;
    z-index: 50;
    padding: 8px 10px;
    border-radius: 0;
    border-left: none;
    border-right: none;
    border-top: none;
    margin-bottom: 0;
  }
  
  .sci-mobile-menu-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--ink);
    padding: 6px;
    margin-right: 4px;
    cursor: pointer;
  }

  /* Thanh Summary gập lại */
  .sci-summary-bar {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 16px;
    border-radius: 0;
  }
  .sci-summary-sources {
    grid-template-columns: repeat(3, 1fr);
  }
  .sci-summary-risk {
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .sci-summary-risk-top {
    flex-direction: column;
    align-items: flex-start;
  }

  /* Biểu đồ & Widget (Metrics) */
  .obs-layout {
    grid-template-columns: 1fr;
    padding: 10px;
  }
  .obs-metrics, .obs-metrics-dense {
    grid-template-columns: 1fr;
  }
  
  /* Các thẻ tab (Behavior, Radar, Probes...) */
  .sci-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 2px;
    -webkit-overflow-scrolling: touch;
  }
  .sci-tabs::-webkit-scrollbar {
    display: none;
  }
  .sci-tabs button {
    white-space: nowrap;
    padding: 10px 12px;
    font-size: 13px;
  }

  /* Card Bento */
  .bento-card {
    border-radius: 8px;
    padding: 14px;
  }

  /* Các nút hành động bự hơn để dễ bấm */
  .btn-premium, .btn-secondary, .sci-btn {
    padding: 12px 16px;
    font-size: 14px;
  }
}

/* Ẩn nút mobile menu trên PC */
@media (min-width: 769px) {
  .sci-mobile-menu-btn {
    display: none;
  }
}
"""

with open(css_path, "a", encoding="utf-8") as f:
    f.write(mobile_css)

print("Updates completed successfully.")
