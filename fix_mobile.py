import os

css_path = r"c:\Users\Admin\Desktop\SANG KIEN PHUONG - Gork\MatThanSuPham\frontend-next\src\app\zpd-ui.css"
mobile_css_fixes = """
/* Bổ sung Tối ưu hóa UI Mobile Tuyệt đối (Hotfix) */
@media (max-width: 768px) {
  body, html {
    overflow-x: hidden;
    width: 100%;
  }

  .sci-topbar {
    flex-wrap: wrap;
    padding: 10px 12px;
  }

  .sci-topbar-left {
    width: 100%;
    margin-bottom: 8px;
    display: flex;
    align-items: center;
  }

  .sci-breadcrumb {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sci-topbar-context {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline-block;
    max-width: 120px;
    vertical-align: bottom;
  }

  .sci-topbar-right {
    width: 100%;
    justify-content: space-between;
  }

  .sci-search-chip {
    min-width: 0;
    flex: 1;
  }

  .sci-search-chip kbd {
    display: none;
  }

  .sci-summary-sources {
    gap: 4px;
  }

  .sci-source-cell {
    padding: 6px;
  }

  .sci-source-label {
    font-size: 9px;
  }

  .sci-source-cell strong {
    font-size: 14px;
  }

  .main-wrapper.sci-main, .main-wrapper {
    padding: 10px 12px 16px;
  }
}
"""

with open(css_path, "a", encoding="utf-8") as f:
    f.write(mobile_css_fixes)

print("Applied perfect mobile hotfixes!")
