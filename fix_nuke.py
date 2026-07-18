import os

css_path = r"c:\Users\Admin\Desktop\SANG KIEN PHUONG - Gork\MatThanSuPham\frontend-next\src\app\zpd-ui.css"
nuke_css = """
/* Sửa lỗi Drawer bị nén hoàn toàn trên iOS Safari */
@media (max-width: 768px) {
  /* Ghi đè tuyệt đối tất cả các class của sidebar khi mở trên mobile */
  aside.sidebar, 
  aside.sci-sidebar, 
  .sidebar.sci-sidebar.mobile-open {
    position: fixed !important;
    top: 0 !important;
    bottom: 0 !important;
    height: 100vh !important;
    height: -webkit-fill-available !important;
    display: flex !important;
    flex-direction: column !important;
    background: linear-gradient(185deg, #133b5c 0%, #1d2d50 60%, #15243f 100%) !important;
    z-index: 99999 !important;
    max-height: 100vh !important;
    min-height: 100vh !important;
  }

  /* Buộc block học sinh phải chiếm toàn bộ phần còn lại */
  .sci-student-block {
    position: relative !important;
    display: flex !important;
    flex-direction: column !important;
    flex-grow: 1 !important;
    flex-shrink: 0 !important;
    flex-basis: 0 !important;
    height: auto !important;
    min-height: 200px !important;
    overflow: visible !important;
  }

  /* Buộc danh sách học sinh phải cuộn được */
  .sci-student-list {
    position: absolute !important;
    top: 0 !important;
    bottom: 0 !important;
    left: 0 !important;
    right: 0 !important;
    overflow-y: scroll !important;
    -webkit-overflow-scrolling: touch !important;
    flex: none !important;
    height: auto !important;
  }

  /* Đảm bảo menu nav không bị phình to chiếm hết chỗ */
  .sci-nav {
    flex-shrink: 0 !important;
    flex-grow: 0 !important;
  }

  /* Fix lỗi overlay bị lọt thỏm */
  .mobile-overlay.show {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    height: 100vh !important;
    z-index: 99998 !important;
  }
}
"""

with open(css_path, "a", encoding="utf-8") as f:
    f.write(nuke_css)

print("Applied nuke css fixes!")
