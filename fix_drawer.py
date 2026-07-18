import os

css_path = r"c:\Users\Admin\Desktop\SANG KIEN PHUONG - Gork\MatThanSuPham\frontend-next\src\app\zpd-ui.css"
drawer_css = """
/* Sửa lỗi Drawer bị cắt ngang trên điện thoại */
@media (max-width: 768px) {
  aside.sidebar.sci-sidebar {
    height: 100% !important;
    height: 100dvh !important;
    bottom: 0 !important;
    display: flex !important;
    flex-direction: column !important;
  }
  
  .sci-student-block {
    display: flex !important;
    flex-direction: column !important;
    flex: 1 1 auto !important;
    height: 100% !important;
    min-height: 0 !important;
  }
}
"""

with open(css_path, "a", encoding="utf-8") as f:
    f.write(drawer_css)

print("Applied drawer height fix!")
