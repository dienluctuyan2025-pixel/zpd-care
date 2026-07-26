import random
import datetime
import json
from sqlalchemy.orm import Session
from database import SessionLocal, Student, TeacherBehaviorLog, ParentSurvey, ProactiveProbe
from ai_analyzer import calculate_final_risk

def clear_existing_data(db: Session):
    print("Xóa dữ liệu cũ (logs, probes, surveys)...")
    db.query(TeacherBehaviorLog).delete()
    db.query(ParentSurvey).delete()
    db.query(ProactiveProbe).delete()
    db.commit()

def generate_mock_data():
    db = SessionLocal()
    try:
        clear_existing_data(db)
        students = db.query(Student).all()
        if not students:
            print("Không có học sinh nào trong DB. Vui lòng chạy import_excel.py trước.")
            return

        print(f"Bắt đầu sinh dữ liệu cho {len(students)} học sinh...")
        
        # Risk profiles distribution
        # 60% safe (1.0 - 1.5), 25% monitor (1.8 - 2.5), 15% alert (3.0 - 3.8)
        
        probe_modules = [
            ("name_response", "Giao tiếp xã hội"),
            ("joint_attention", "Giao tiếp xã hội"),
            ("emotion_match", "Giao tiếp xã hội"),
            ("turn_taking", "Giao tiếp xã hội"),
            ("routine_transition", "Hành vi / thói quen"),
            ("sustained_attention", "Chú ý / tập trung"),
            ("stereotypy_observe", "Hành vi / thói quen")
        ]

        safe_logs = [
            "Bé chơi hòa đồng với các bạn trong lớp, biết chia sẻ đồ chơi.",
            "Hôm nay bé tham gia hoạt động góc rất tốt, trả lời to rõ ràng khi cô gọi.",
            "Bé tự xúc ăn ngoan, ngủ trưa ngoan.",
            "Bé có tiến bộ trong việc làm theo chỉ dẫn của cô giáo."
        ]
        
        monitor_logs = [
            "Bé thỉnh thoảng mất tập trung khi cô kể chuyện, phải nhắc 2-3 lần mới chú ý lại.",
            "Bé hơi ngại giao tiếp, thường thích chơi một mình ở góc xếp hình.",
            "Lúc chuyển giờ học, bé hơi chậm chạp và cần cô dắt tay.",
            "Bé có biểu hiện không thích tiếng ồn lớn trong giờ âm nhạc."
        ]
        
        alert_logs = [
            "Bé gọi tên không quay đầu lại, mắt thường nhìn đi chỗ khác khi cô nói chuyện.",
            "Bé có thói quen vẩy tay liên tục trước mặt và đi nhón gót trong lớp.",
            "Trong giờ chơi, bé giật đồ chơi của bạn và khóc lóc ăn vạ rất lâu, khó dỗ.",
            "Bé lặp lại lời nói của cô (nhại lời) thay vì trả lời câu hỏi."
        ]

        today = datetime.date.today()

        for i, student in enumerate(students):
            score = student.cached_risk_score or 1.0
            if score < 1.8:
                profile = "safe"
                log_pool = safe_logs
                base_score = random.uniform(1.0, 1.5)
            elif score < 3.0:
                profile = "monitor"
                log_pool = monitor_logs
                base_score = random.uniform(1.8, 2.5)
            else:
                profile = "alert"
                log_pool = alert_logs
                base_score = random.uniform(3.0, 3.8)

            num_logs = random.randint(2, 5)
            
            # Generate logs
            for _ in range(num_logs):
                log_date = today - datetime.timedelta(days=random.randint(1, 60))
                raw_text = random.choice(log_pool)
                
                # Mock AI parsed JSON
                parsed = {
                    "diem_nguy_co": round(base_score + random.uniform(-0.2, 0.2), 1),
                    "diem_nguy_co_giai_thich": f"Mức độ {profile} dựa trên mô phỏng",
                    "xai_confidence": f"{random.randint(70, 95)}%",
                    "kich_ban_test_kiem_chung": [random.choice(probe_modules)[0] for _ in range(random.randint(1, 2))],
                    "xai_highlights": [
                        {"keyword": raw_text[:15], "weight": "Trung bình", "reason": "Mô phỏng AI"}
                    ],
                    "khao_sat_phu_huynh": [
                        {"text": f"Ở nhà bé có biểu hiện giống '{raw_text[:15]}' không?", "reason": "Tham chiếu chéo"}
                    ],
                    "zpd_recommendation": {
                        "cho_nha_truong": {"phac_do_tham_chieu": f"Hướng dẫn {profile} cho trường"},
                        "cho_phu_huynh": {"phac_do_tham_chieu": f"Hướng dẫn {profile} cho nhà"}
                    },
                    "ma_chuan_y_khoa": "Sàng lọc giáo dục (Không y khoa)",
                    "counts_toward_risk": True
                }
                
                log = TeacherBehaviorLog(
                    student_id=student.id,
                    date=log_date,
                    raw_text=raw_text,
                    parsed_json=json.dumps(parsed, ensure_ascii=False)
                )
                db.add(log)

            # Generate Parent Survey
            num_surveys = random.randint(1, 2)
            for _ in range(num_surveys):
                survey_date = today - datetime.timedelta(days=random.randint(1, 30))
                s_score = round(base_score + random.uniform(-0.3, 0.3), 1)
                r_score = round(base_score + random.uniform(-0.3, 0.3), 1)
                a_score = round(base_score + random.uniform(-0.3, 0.3), 1)
                
                # clamp 1-4
                s_score = max(1.0, min(4.0, s_score))
                r_score = max(1.0, min(4.0, r_score))
                a_score = max(1.0, min(4.0, a_score))
                
                survey = ParentSurvey(
                    student_id=student.id,
                    date=survey_date,
                    social_score=s_score,
                    routine_score=r_score,
                    attention_score=a_score,
                    total_score=round((s_score + r_score + a_score)/3, 2)
                )
                db.add(survey)

            # Generate Probes
            num_probes = random.randint(2, 4)
            for _ in range(num_probes):
                probe_date = today - datetime.timedelta(days=random.randint(1, 40))
                mod_id, cat = random.choice(probe_modules)
                
                p_score = round(base_score + random.uniform(-0.2, 0.3))
                p_score = max(1, min(4, p_score))
                
                probe = ProactiveProbe(
                    student_id=student.id,
                    date=probe_date,
                    generated_scenario=f"Thực hành module {mod_id}",
                    test_category=cat,
                    result_status="Hoàn thành",
                    module_id=mod_id,
                    rubric_score=p_score,
                    cars_mapped=float(p_score),
                    scored=1,
                    scored_by="Mock System",
                    scored_at=datetime.datetime.now()
                )
                db.add(probe)
            
            db.commit()
            calculate_final_risk(student.id)
            print(f"Đã tạo dữ liệu cho: {student.name} ({profile})")
            
        print("HOÀN TẤT BƠM DỮ LIỆU!")
        
    except Exception as e:
        db.rollback()
        print(f"Lỗi: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    generate_mock_data()
