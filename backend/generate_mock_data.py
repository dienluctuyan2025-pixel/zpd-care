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
                "hanh_dong": [
                    "Củng cố hành vi (Positive Reinforcement): Khen ngợi cụ thể hành vi chia sẻ ngay lập tức ('Cô rất vui vì con đã nhường khối gỗ cho bạn').",
                    "Mở rộng kỹ năng xã hội: Đưa bé vào các trò chơi đóng vai (Role-play) phức tạp hơn để rèn luyện kỹ năng đàm phán và giải quyết xung đột nhóm."
                ]
            },
            "Hôm nay bé tham gia hoạt động góc rất tốt, trả lời to rõ ràng khi cô gọi.": {
                "hanh_dong": [
                    "Nâng cao tư duy (Cognitive Scaffolding): Chuyển từ câu hỏi hội tụ ('Đây là cái gì?') sang câu hỏi phân kỳ ('Tại sao con lại chọn màu này?').",
                    "Trao quyền tự chủ: Cho bé làm trưởng nhóm nhỏ hướng dẫn các bạn khác, giúp củng cố sự tự tin và kỹ năng diễn đạt logic."
                ]
            },
            "Bé tự xúc ăn ngoan, ngủ trưa ngoan.": {
                "hanh_dong": [
                    "Thúc đẩy tự lập (Independence Building): Giao thêm các nhiệm vụ tự phục vụ phức tạp hơn (tự cất khay ăn đúng nơi quy định, tự cất gối sau khi ngủ dậy).",
                    "Giáo dục đồng đẳng: Khuyến khích bé ngồi cạnh những bạn còn ăn chậm để tạo ảnh hưởng tích cực (Peer Modeling)."
                ]
            },
            "Bé có tiến bộ trong việc làm theo chỉ dẫn của cô giáo.": {
                "hanh_dong": [
                    "Tăng độ phức tạp của chuỗi lệnh: Chuyển từ chỉ dẫn 1 bước sang 2-3 bước liên tiếp (VD: 'Con cất đồ chơi, đi rửa tay rồi ra bàn ngồi nhé').",
                    "Phai mờ hỗ trợ (Fading Prompts): Giảm dần sự hỗ trợ bằng hành động mẫu, chuyển sang chỉ dùng lời nói hoặc ám hiệu bằng mắt."
                ]
            },
            "Bé thỉnh thoảng mất tập trung khi cô kể chuyện, phải nhắc 2-3 lần mới chú ý lại.": {
                "hanh_dong": [
                    "Sử dụng mồi nhử thị giác (Visual Prompts): Dùng rối ngón tay hoặc tranh ảnh pop-up ngay khi bé bắt đầu xao nhãng để kéo sự chú ý trở lại.",
                    "Vị trí chiến lược (Proximity Control): Xếp bé ngồi ngay cạnh cô giáo, thỉnh thoảng chạm nhẹ vào vai (Tactile prompt) trước khi đặt câu hỏi để bé chuẩn bị tâm lý."
                ]
            },
            "Bé hơi ngại giao tiếp, thường thích chơi một mình ở góc xếp hình.": {
                "hanh_dong": [
                    "Chơi song song (Parallel Play): Cô giáo hoặc một bạn nhỏ hiền hòa ngồi xếp hình cạnh bé, không ép bé giao tiếp ngay, chỉ bắt chước hành động của bé để tạo sự thân thuộc.",
                    "Can thiệp qua trung gian (Mediated Intervention): Dần dần chia sẻ học liệu chung (để hộp lego ở giữa) để tạo tình huống buộc bé phải tương tác ngắn (VD: 'Cho tớ xin khối màu đỏ')."
                ]
            },
            "Lúc chuyển giờ học, bé hơi chậm chạp và cần cô dắt tay.": {
                "hanh_dong": [
                    "Báo trước quá trình chuyển tiếp (Transition Warning): Báo trước 3 phút và 1 phút bằng đồng hồ cát hoặc một bài hát chuyển tiếp quen thuộc.",
                    "Sử dụng vật chuyển tiếp (Transitional Object): Cho phép bé cầm một món đồ chơi yêu thích mang theo từ góc này sang góc khác để tạo cảm giác an toàn."
                ]
            },
            "Bé có biểu hiện không thích tiếng ồn lớn trong giờ âm nhạc.": {
                "hanh_dong": [
                    "Kiểm soát môi trường (Environmental Accommodation): Bố trí bé ngồi ở vị trí xa nguồn âm thanh nhất, gần cửa ra vào để có lối thoát nếu bé quá tải.",
                    "Giải mẫn cảm dần dần (Systematic Desensitization): Trang bị tai nghe chống ồn nhẹ. Khuyến khích bé tham gia bằng các nhạc cụ gõ nhẹ nhàng thay vì hát to."
                ]
            },
            "Bé gọi tên không quay đầu lại, mắt thường nhìn đi chỗ khác khi cô nói chuyện.": {
                "hanh_dong": [
                    "Định hình lại giao tiếp mắt (Shaping Eye Contact): Hạ thấp người ngang tầm mắt bé. Đưa món đồ bé thích lên ngang tầm mắt cô, đợi bé liếc nhìn cô rồi mới trao đồ chơi.",
                    "Củng cố tích cực (Reinforcement): Không bao giờ mắng khi bé không nhìn. Khen ngợi ngay lập tức (social praise) dù bé chỉ lướt mắt qua cô 1 giây."
                ]
            },
            "Bé có thói quen vẩy tay liên tục trước mặt và đi nhón gót trong lớp.": {
                "hanh_dong": [
                    "Không ngăn chặn thô bạo (No Extinction Burst Triggering): Tuyệt đối không giữ tay bé lại, đây là hành vi tự kích thích (Stimming) để điều hòa cảm giác giác quan.",
                    "Cung cấp hành vi thay thế (Replacement Behavior): Đưa cho bé quả bóng bóp (Stress ball) để thỏa mãn nhu cầu vận động tinh, hoặc tổ chức trò chơi nhảy lò cò để chuyển hóa năng lượng vận động thô."
                ]
            },
            "Trong giờ chơi, bé giật đồ chơi của bạn và khóc lóc ăn vạ rất lâu, khó dỗ.": {
                "hanh_dong": [
                    "Phục hồi tâm lý (De-escalation): Không giảng giải khi bé đang khóc đỉnh điểm. Đưa bé vào 'Góc Bình Yên' (Time-in, có người lớn bên cạnh) để xoa dịu bằng cái ôm chặt hoặc chăn trọng lượng.",
                    "Dạy kỹ năng giao tiếp chức năng (Functional Communication Training - FCT): Khi bé đã bình tĩnh, lấy hệ thống thẻ PECS ra hướng dẫn bé trao thẻ 'Cho tớ mượn' để lấy đồ, thay vì dùng bạo lực."
                ]
            },
            "Bé lặp lại lời nói của cô (nhại lời) thay vì trả lời câu hỏi.": {
                "hanh_dong": [
                    "Sửa lỗi Echolalia (Echolalia Mitigation): Đừng hỏi 'Con uống nước không?'. Hãy chuyển thành câu khẳng định mẫu và mớm lời cho bé: Cô cầm cốc nước và nói 'Cho con uống nước', đợi bé nhắc lại câu đó rồi mới đưa cốc.",
                    "Sử dụng ngôn ngữ bằng hình (Visual Supports): Đưa ra 2 thẻ hình (Uống nước / Đi chơi) và hỏi 'Con chọn cái nào?'. Nhấn mạnh vào thẻ thay vì lời nói để giảm sự nhại lời."
                ]
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
                            "phac_do_tham_chieu": f"Phác đồ theo dõi hành vi mục tiêu ({profile.upper()})",
                            "hanh_dong": ZPD_CONTEXT.get(raw_text, {}).get("hanh_dong", ["Quan sát định lượng (ABC Data) trong 3 ngày tới.", "Lưu hồ sơ để đánh giá phản ứng với can thiệp."])
                        },
                        "cho_phu_huynh": {
                            "phac_do_tham_chieu": f"Mô hình phối hợp phụ huynh ({profile.upper()})",
                            "hanh_dong": ["Dành 15 phút chơi tương tác tự do (Floortime) mỗi tối để củng cố cảm giác an toàn.", "Ghi chép lại các biểu hiện tương tự (nếu có) vào sổ tay gia đình."]
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
