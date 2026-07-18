"""
Seed database từ danh sách học sinh THẬT (Excel MN Chí Thạnh).
Không còn tên ảo Nguyễn Văn An / Trần Thị Bình / ...
"""
from import_excel import import_from_excel, DEFAULT_EXCEL
import os


def seed_database():
    print("=== Seed từ dữ liệu thật (Excel) ===")
    if not os.path.isfile(DEFAULT_EXCEL):
        print(f"CẢNH BÁO: Không thấy file Excel:\n  {DEFAULT_EXCEL}")
        print("Kiểm tra đường dẫn file danh sách học sinh.")
        return
    n = import_from_excel(with_demo_observations=True)
    print(f"\nSeed hoàn tất: {n} học sinh.")


if __name__ == "__main__":
    seed_database()
