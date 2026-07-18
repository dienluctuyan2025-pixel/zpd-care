import os

css_path = r"c:\Users\Admin\Desktop\SANG KIEN PHUONG - Gork\MatThanSuPham\frontend-next\src\app\zpd-ui.css"
fix_css = """
/* Sửa lỗi Danh sách học sinh đè lên thanh tìm kiếm */
@media (max-width: 768px) {
  .sci-student-block {
    position: relative !important;
    display: flex !important;
    flex-direction: column !important;
    flex: 1 1 0% !important;
    height: auto !important;
    overflow: hidden !important; /* Quan trọng để flex list bên trong cuộn được */
  }

  .sci-student-list {
    position: relative !important;
    top: auto !important;
    bottom: auto !important;
    left: auto !important;
    right: auto !important;
    flex: 1 1 0% !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch !important;
    height: auto !important;
    padding-top: 4px !important;
  }
}
"""

with open(css_path, "a", encoding="utf-8") as f:
    f.write(fix_css)

print("Applied overlap fix!")
