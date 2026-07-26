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

        ZPD_CONTEXT = {
            "Bé chơi hòa đồng với các bạn trong lớp, biết chia sẻ đồ chơi.": {
                "hanh_dong": "Khen ngợi cụ thể hành vi chia sẻ ('Cô rất vui vì con nhường đồ chơi cho bạn'). Duy trì các trò chơi luân phiên để củng cố kỹ năng này."
            },
            "Hôm nay bé tham gia hoạt động góc rất tốt, trả lời to rõ ràng khi cô gọi.": {
                "hanh_dong": "Tăng dần độ khó của câu hỏi trong giờ hoạt động góc (từ câu hỏi 'Cái gì' sang 'Tại sao' đơn giản). Cho bé làm trưởng nhóm nhỏ để tăng tự tin."
            },
            "Bé tự xúc ăn ngoan, ngủ trưa ngoan.": {
                "hanh_dong": "Tiếp tục khuyến khích tự lập. Có thể giao thêm việc nhỏ như tự cất khay ăn sau khi ăn xong để tăng trách nhiệm cá nhân."
            },
            "Bé có tiến bộ trong việc làm theo chỉ dẫn của cô giáo.": {
                "hanh_dong": "Chuyển từ chỉ dẫn 1 bước sang chỉ dẫn 2 bước liên tiếp (VD: 'Con lấy cất dép rồi đi rửa tay nhé'). Giảm bớt sự hỗ trợ bằng tay."
            },
            "Bé thỉnh thoảng mất tập trung khi cô kể chuyện, phải nhắc 2-3 lần mới chú ý lại.": {
                "hanh_dong": "Sử dụng đồ vật trực quan (rối ngón tay, tranh ảnh) khi kể chuyện. Gọi tên bé hoặc chạm nhẹ vào vai trước khi bắt đầu câu chuyện để thu hút sự chú ý."
            },
            "Bé hơi ngại giao tiếp, thường thích chơi một mình ở góc xếp hình.": {
                "hanh_dong": "Cô giáo ngồi cạnh bé, tham gia xếp hình cùng bé. Dần dần rủ thêm 1 bạn thân thiết vào chơi chung, tạo vòng tròn giao tiếp nhỏ 3 người."
            },
            "Lúc chuyển giờ học, bé hơi chậm chạp và cần cô dắt tay.": {
                "hanh_dong": "Sử dụng bài hát chuyển tiếp hoặc đồng hồ cát báo trước 3 phút. Khen ngợi ngay lập tức nếu bé tự di chuyển được một đoạn ngắn mà không cần dắt."
            },
            "Bé có biểu hiện không thích tiếng ồn lớn trong giờ âm nhạc.": {
                "hanh_dong": "Sắp xếp cho bé ngồi ở vị trí xa loa hoặc gần cửa. Đeo tai nghe chống ồn nhẹ cho bé nếu cần, hoặc cho bé cầm một đồ vật 'trấn an' khi nhạc bật lên."
            },
            "Bé gọi tên không quay đầu lại, mắt thường nhìn đi chỗ khác khi cô nói chuyện.": {
                "hanh_dong": "Hạ thấp trọng tâm ngang tầm mắt bé. Dùng đồ chơi bé thích (VD: quả bóng phát sáng) đặt ngang tầm mắt cô để kích thích giao tiếp mắt trước khi nói."
            },
            "Bé có thói quen vẩy tay liên tục trước mặt và đi nhón gót trong lớp.": {
                "hanh_dong": "Không cấm cản thô bạo. Cung cấp công cụ thay thế (đồ chơi bóp fidget, vòng dẻo) để bé giải tỏa căng thẳng. Chuyển hướng bé vào một hoạt động vận động có mục đích (VD: nhảy theo nhạc)."
            },
            "Trong giờ chơi, bé giật đồ chơi của bạn và khóc lóc ăn vạ rất lâu, khó dỗ.": {
                "hanh_dong": "Đưa bé vào 'Góc Bình Yên' để tĩnh tâm (time-in, không phải time-out). Khi bé bình tĩnh, dùng Thẻ hình ảnh (PECS) dạy bé cách chỉ vào thẻ 'Cho tớ mượn' thay vì giật đồ."
            },
            "Bé lặp lại lời nói của cô (nhại lời) thay vì trả lời câu hỏi.": {
                "hanh_dong": "Thay đổi cách đặt câu hỏi. Dùng câu hỏi có lựa chọn trực quan (Giơ 2 món đồ chơi: 'Con thích màu xanh hay màu đỏ?'). Hỗ trợ mớm lời (prompt) đáp án đúng ngay sau khi hỏi."
            }
        }

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
                        "cho_nha_truong": {
                            "phac_do_tham_chieu": f"Hướng dẫn {profile} cho trường",
                            "hanh_dong": [ZPD_CONTEXT.get(raw_text, {}).get("hanh_dong", "Quan sát thêm và điều chỉnh ngữ cảnh phù hợp.")]
                        },
                        "cho_phu_huynh": {
                            "phac_do_tham_chieu": f"Hướng dẫn {profile} cho nhà",
                            "hanh_dong": ["Dành thêm 15 phút mỗi tối chơi cùng con để áp dụng đồng nhất phương pháp của cô giáo."]
                        }
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
