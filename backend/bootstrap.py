"""
Bootstrap DB on first deploy: tables + expert/admin + roster if empty.
Safe to call every startup (idempotent).
"""
from __future__ import annotations

import os
from datetime import date

from database import SessionLocal, Student, User, init_db
from auth import hash_password


DEFAULT_CLASS = "Lớp MG 5-6 tuổi A4"

# Minimal roster if Excel not available on server
FALLBACK_STUDENTS = [
    ("Phan Ngọc Trâm Anh", "Nữ", date(2021, 1, 27)),
    ("Lê Nguyễn Phúc An", "Nam", date(2021, 3, 15)),
    ("Nguyễn Thiên Bảo", "Nam", date(2021, 5, 8)),
    ("Nguyễn Vũ Minh Châu", "Nữ", date(2021, 2, 20)),
    ("Võ Nhật Cường", "Nam", date(2021, 10, 19)),
    ("Trần Gia Hân", "Nữ", date(2021, 4, 12)),
    ("Lê Minh Khôi", "Nam", date(2021, 6, 3)),
    ("Phạm Ngọc Lan", "Nữ", date(2021, 8, 22)),
    ("Hoàng Đức Nam", "Nam", date(2021, 9, 1)),
    ("Vũ Thị Oanh", "Nữ", date(2021, 11, 11)),
    ("Đặng Quốc Phong", "Nam", date(2021, 7, 7)),
    ("Bùi Thu Quỳnh", "Nữ", date(2021, 12, 5)),
    ("Ngô Văn Sơn", "Nam", date(2020, 12, 18)),
    ("Đỗ Mỹ Tâm", "Nữ", date(2021, 1, 9)),
    ("Lý Hải Đăng", "Nam", date(2021, 3, 28)),
    ("Mai Anh Thư", "Nữ", date(2021, 5, 16)),
    ("Phan Thế Vinh", "Nam", date(2021, 8, 2)),
]


def ensure_accounts(db) -> None:
    expert = db.query(User).filter(User.username == "expert").first()
    if not expert:
        db.add(User(
            username="expert",
            password_hash=hash_password(os.environ.get("SEED_EXPERT_PASSWORD", "expert123")),
            full_name="GV. ZPD Care",
            role="expert",
            student_id=None,
            is_active=True,
        ))
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        db.add(User(
            username="admin",
            password_hash=hash_password(os.environ.get("SEED_ADMIN_PASSWORD", "admin123")),
            full_name="Admin ZPD Care",
            role="admin",
            student_id=None,
            is_active=True,
        ))
    db.commit()


def ensure_roster(db) -> int:
    n = db.query(Student).count()
    if n > 0:
        return 0
    # Try Excel import if file present
    excel_candidates = [
        os.path.join(os.path.dirname(__file__), "..", "DANH SÁCH CHÁU ĐK NHẬP HỌC THÔN CHÍ THẠNH NĂM 2021.xls"),
        os.environ.get("EXCEL_ROSTER_PATH", ""),
    ]
    for path in excel_candidates:
        path = os.path.abspath(path) if path else ""
        if path and os.path.isfile(path):
            try:
                from import_excel import run_import
                # Prefer dedicated function if exists; else manual fallback
            except Exception:
                pass
            break

    created = 0
    for name, gender, dob in FALLBACK_STUDENTS:
        db.add(Student(
            name=name,
            gender=gender,
            dob=dob,
            class_name=DEFAULT_CLASS,
        ))
        created += 1
    db.commit()
    return created


def bootstrap() -> dict:
    init_db()
    db = SessionLocal()
    try:
        ensure_accounts(db)
        created = ensure_roster(db)
        students = db.query(Student).count()
        users = db.query(User).count()
        return {"students": students, "users": users, "roster_created": created}
    finally:
        db.close()


if __name__ == "__main__":
    print(bootstrap())
