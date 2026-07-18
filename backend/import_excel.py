"""
Import danh sách học sinh thật từ Excel MN Chí Thạnh.
"""
import json
import os
from datetime import date, timedelta, datetime

import pandas as pd

from database import SessionLocal, init_db, Student, TeacherBehaviorLog, ParentSurvey, ProactiveProbe, User
from auth import hash_password
from ai_analyzer import calculate_final_risk
from probe_catalog import get_module
import json as _json

# File Excel thật trong project
DEFAULT_EXCEL = os.path.normpath(
    os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..",
        "..",
        "DANH SÁCH CHÁU ĐK NHẬP HỌC THÔN CHÍ THẠNH NĂM 2021.xls",
    )
)

# Một số quan sát mẫu gắn theo STT (1-based) để demo đa mức rủi ro — nội dung trung tính
DEMO_OBSERVATIONS = {
    1: {  # Trâm Anh — an toàn
        "raw": "Bé Trâm Anh chơi vui vẻ với các bạn, biết chia sẻ đồ chơi khi được cô nhắc. Ăn ngoan, ngủ đúng giờ.",
        "parsed": {
            "hanh_vi_goc": "chơi vui vẻ với các bạn, biết chia sẻ đồ chơi",
            "ma_chuan_y_khoa": "Phát triển trong ngưỡng theo dõi bình thường",
            "nhom_ky_nang": "Giao tiếp xã hội",
            "diem_nguy_co": 1.0,
            "xai_confidence": "88%",
            "xai_highlights": [
                {"keyword": "chơi vui vẻ", "weight": "Trung bình", "reason": "Tương tác tích cực với bạn bè"},
                {"keyword": "chia sẻ đồ chơi", "weight": "Trung bình", "reason": "Kỹ năng xã hội phù hợp lứa tuổi"},
            ],
            "kich_ban_test_kiem_chung": "Quan sát cách bé chào hỏi bạn mới trong giờ đón.",
            "analysis_failed": False,
            "is_screening_only": True,
            "teacher_confirmed": True,
            "counts_toward_risk": True,
            "source": "text",
        },
        "survey": (1.0, 1.0, 1.0, 1.0),
        "modules": [("name_response", 1), ("turn_taking", 1)],
        "class_name": "Lớp MG 5-6 tuổi A4",
    },
    3: {  # Thiên Bảo — theo dõi
        "raw": "Bé Thiên Bảo khó ngồi yên trong giờ kể chuyện, hay đứng dậy đi lại. Khi cô gọi tên bé có quay lại nhưng chậm.",
        "parsed": {
            "hanh_vi_goc": "khó ngồi yên, hay đứng dậy đi lại, quay lại chậm khi gọi tên",
            "ma_chuan_y_khoa": "Cần theo dõi sự chú ý và điều hòa vận động",
            "nhom_ky_nang": "Tập trung / chú ý",
            "diem_nguy_co": 2.2,
            "xai_confidence": "82%",
            "xai_highlights": [
                {"keyword": "khó ngồi yên", "weight": "Trung bình", "reason": "Khó duy trì tư thế trong hoạt động nhóm"},
                {"keyword": "gọi tên", "weight": "Trung bình", "reason": "Có đáp ứng nhưng chậm"},
            ],
            "analysis_failed": False,
            "is_screening_only": True,
            "teacher_confirmed": True,
            "counts_toward_risk": True,
            "source": "text",
        },
        "survey": (2.0, 1.5, 2.5, 2.0),
        "modules": [("sustained_attention", 2), ("name_response", None)],
        "class_name": "Lớp MG 5-6 tuổi A4",
    },
    5: {  # Nhật Cường — nguy cơ cao hơn (demo)
        "raw": "Giờ ra chơi bé Cường xếp khối gỗ thành hàng dài, cô gọi tên nhiều lần bé không quay lại. Bé chơi một mình, ít giao tiếp bằng mắt.",
        "parsed": {
            "hanh_vi_goc": "xếp khối gỗ thành hàng dài, gọi tên không quay lại, chơi một mình",
            "ma_chuan_y_khoa": "Cần sàng lọc thêm: đáp ứng gọi tên / hành vi lặp (tham chiếu M-CHAT-R) — không phải chẩn đoán",
            "nhom_ky_nang": "Giao tiếp / hành vi lặp",
            "diem_nguy_co": 3.2,
            "xai_confidence": "90%",
            "xai_highlights": [
                {"keyword": "xếp khối gỗ thành hàng dài", "weight": "Trung bình", "reason": "Hành vi sắp xếp lặp, ưu tiên đồ vật"},
                {"keyword": "gọi tên nhiều lần bé không quay lại", "weight": "Nghiêm trọng", "reason": "Thiếu đáp ứng khi gọi tên"},
                {"keyword": "chơi một mình", "weight": "Trung bình", "reason": "Ít tương tác đồng trang lứa"},
            ],
            "analysis_failed": False,
            "is_screening_only": True,
            "teacher_confirmed": True,
            "counts_toward_risk": True,
            "source": "text",
        },
        "survey": (3.2, 3.0, 2.5, 2.9),
        "modules": [("name_response", 4), ("joint_attention", None), ("stereotypy_observe", 3)],
        "class_name": "Lớp MG 5-6 tuổi A4",
    },
}


def _parse_dob(val) -> date:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return date(2021, 1, 1)
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    s = str(val).strip()
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return date(2021, 1, 1)


def _parse_gender(val) -> str:
    s = str(val or "").strip().lower().replace("\n", "")
    if s in ("nữ", "nu", "female", "gái"):
        return "Nữ"
    if s in ("nam", "male", "trai"):
        return "Nam"
    # Excel sometimes has "Nữ" with spaces
    if "nữ" in s or s == "n":
        return "Nữ"
    return "Nam"


def load_students_from_excel(file_path: str = None):
    path = file_path or DEFAULT_EXCEL
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Không tìm thấy file Excel: {path}")

    # 4 dòng đầu là tiêu đề đơn vị / tên danh sách
    df = pd.read_excel(path, header=None, skiprows=4)
    # row 0 after skip = column headers
    students = []
    for _, row in df.iterrows():
        stt = row.iloc[0]
        name = row.iloc[1]
        if pd.isna(name) or str(name).strip() in ("", "nan", "None", "Họ tên trẻ"):
            continue
        try:
            stt_num = int(float(stt))
        except (TypeError, ValueError):
            continue

        students.append({
            "stt": stt_num,
            "name": str(name).strip(),
            "dob": _parse_dob(row.iloc[4]),
            "gender": _parse_gender(row.iloc[5]),
            "hometown": str(row.iloc[2]).strip() if not pd.isna(row.iloc[2]) else "",
            "note": str(row.iloc[16]).strip() if len(row) > 16 and not pd.isna(row.iloc[16]) else "",
        })
    return students, path


def import_from_excel(file_path: str = None, with_demo_observations: bool = True):
    print("Khởi tạo database...")
    init_db()
    db = SessionLocal()

    print("Xóa dữ liệu cũ...")
    db.query(TeacherBehaviorLog).delete()
    db.query(ParentSurvey).delete()
    db.query(ProactiveProbe).delete()
    db.query(User).delete()
    db.query(Student).delete()
    db.commit()

    students, path = load_students_from_excel(file_path)
    print(f"Đọc được {len(students)} học sinh từ:\n  {path}")

    today = date.today()
    created = []

    for i, s in enumerate(students):
        # Một lớp thống nhất (MG 5–6 tuổi)
        class_name = "Lớp MG 5-6 tuổi A4"
        demo = DEMO_OBSERVATIONS.get(s["stt"]) if with_demo_observations else None
        if demo and demo.get("class_name"):
            class_name = demo["class_name"]

        student = Student(
            name=s["name"],
            dob=s["dob"],
            gender=s["gender"],
            class_name=class_name,
        )
        db.add(student)
        db.commit()
        db.refresh(student)
        created.append(student)

        if demo:
            raw = demo["raw"]
            parsed = demo["parsed"]
            log = TeacherBehaviorLog(
                student_id=student.id,
                date=today - timedelta(days=2),
                raw_text=raw,
                parsed_json=json.dumps(parsed, ensure_ascii=False),
            )
            db.add(log)
            so, ro, at, tot = demo["survey"]
            db.add(ParentSurvey(
                student_id=student.id,
                date=today - timedelta(days=3),
                social_score=so,
                routine_score=ro,
                attention_score=at,
                total_score=tot,
            ))
            # Gán module catalog + (tuỳ) điểm mẫu
            for mid, rub in demo.get("modules", [("name_response", None)]):
                mod = get_module(mid)
                if not mod:
                    continue
                scenario = _json.dumps({
                    "module_id": mod["id"],
                    "code": mod["code"],
                    "ten_bai_tap": mod["name"],
                    "muc_dich": mod["purpose"],
                    "chuan_bi": ", ".join(mod["materials"]),
                    "cac_buoc": mod["steps"],
                    "tieu_chi_dat": mod["pass_hint"],
                    "tieu_chi_khong_dat": mod["fail_hint"],
                    "rubric": mod["rubric"],
                    "game_type": mod["game_type"],
                    "axis": mod["axis"],
                }, ensure_ascii=False)
                pr = ProactiveProbe(
                    student_id=student.id,
                    date=today - timedelta(days=1),
                    generated_scenario=scenario,
                    test_category=mod["axis_label"],
                    result_status="Chờ kiểm tra" if rub is None else "Hoàn thành",
                    module_id=mod["id"],
                    scored=1 if rub is not None else 0,
                    rubric_score=rub,
                    cars_mapped=float(rub) if rub is not None else None,
                    teacher_notes="Seed demo từ catalog khoa học" if rub is not None else None,
                    scored_by="seed" if rub is not None else None,
                )
                db.add(pr)
        else:
            # Bản ghi nền trung tính — không bịa hành vi
            db.add(TeacherBehaviorLog(
                student_id=student.id,
                date=today - timedelta(days=1),
                raw_text="Chưa có nhật ký quan sát chi tiết từ giáo viên.",
                parsed_json=json.dumps({
                    "hanh_vi_goc": "Chưa có nhật ký quan sát chi tiết từ giáo viên.",
                    "ma_chuan_y_khoa": "Chưa có dữ liệu sàng lọc",
                    "nhom_ky_nang": "Chung",
                    "diem_nguy_co": 1.0,
                    "xai_confidence": "—",
                    "xai_highlights": [],
                    "analysis_failed": False,
                    "is_screening_only": True,
                    "is_placeholder": True,
                    "teacher_confirmed": False,
                    "counts_toward_risk": False,
                    "source": "import_placeholder",
                }, ensure_ascii=False),
            ))
            # Không seed khảo sát PH giả — để trống cho đến khi GV nhập

    db.commit()

    # Cache risk
    for st in created:
        try:
            calculate_final_risk(st.id)
        except Exception as e:
            print(f"  risk cache {st.name}: {e}")

    # Users: expert + parents for first 5 students
    users = [
        User(username="expert", password_hash=hash_password("expert123"),
             full_name="GV. MN Chí Thạnh", role="expert", student_id=None),
        User(username="admin", password_hash=hash_password("admin123"),
             full_name="Quản trị hệ thống", role="admin", student_id=None),
    ]
    for idx, st in enumerate(created[:5], start=1):
        users.append(User(
            username=f"parent{idx}",
            password_hash=hash_password("parent123"),
            full_name=f"PH của {st.name}",
            role="parent",
            student_id=st.id,
        ))
    for u in users:
        db.add(u)
    db.commit()

    print(f"\nĐã nhập {len(created)} học sinh thật:")
    for st in created:
        print(f"  #{st.id:02d} {st.name} · {st.gender} · {st.dob} · {st.class_name}")
    print("\nTài khoản:")
    print("  expert / expert123")
    print("  admin  / admin123")
    print("  parent1..parent5 / parent123  (gắn 5 HS đầu)")
    db.close()
    return len(created)


if __name__ == "__main__":
    import_from_excel()
