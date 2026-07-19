import os
import json
import re
import time
import google.generativeai as genai
from typing import Dict, Any, List, Optional
from database import SessionLocal, TeacherBehaviorLog, ParentSurvey, ProactiveProbe, Student
import datetime
from dotenv import load_dotenv

# Tìm đường dẫn tuyệt đối đến file .env trong thư mục backend
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(current_dir, ".env")

# Tải biến môi trường
load_dotenv(dotenv_path=env_path)

# Cấu hình Gemini API
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY", "YOUR_API_KEY_HERE"))

def build_safe_analysis_fallback(raw_text: str, error_msg: str = "", source: str = "text") -> Dict[str, Any]:
    """
    Fallback an toàn khi AI lỗi: KHÔNG gán điểm rủi ro cao, KHÔNG tạo probe/survey giả.
    Tránh false-positive lâm sàng và ô nhiễm risk score.
    """
    preview = (raw_text or "").strip()
    if len(preview) > 400:
        preview = preview[:400] + "..."
    return {
        "hanh_vi_goc": preview or "[Không có nội dung quan sát]",
        "ma_chuan_y_khoa": "CHƯA PHÂN TÍCH — Hệ thống AI tạm thời không phản hồi. Không áp dụng mã DSM/CARS.",
        "nhom_ky_nang": "Chưa xác định",
        "diem_nguy_co": 1.0,
        "diem_nguy_co_giai_thich": (
            "Điểm 1.0 là mức giữ nguyên (neutral) do AI không hoàn tất phân tích. "
            "Điểm này KHÔNG phản ánh nguy cơ lâm sàng. Vui lòng thử lại hoặc ghi nhận thủ công."
        ),
        "xai_confidence": "0%",
        "kich_ban_test_kiem_chung": None,
        "xai_highlights": [],
        "khao_sat_phu_huynh": [],
        "zpd_recommendation": {
            "cho_nha_truong": {
                "phac_do_tham_chieu": "Chờ phân tích AI",
                "muc_tieu": "Giữ quan sát trung lập, không kết luận sớm.",
                "hanh_dong": [
                    "Thử phân tích lại khi kết nối AI ổn định.",
                    "Ghi chép thêm chi tiết hành vi (bối cảnh, thời lượng, tần suất)."
                ],
                "luu_y": "Không dùng kết quả lỗi AI để xếp loại nguy cơ hoặc thông báo phụ huynh."
            },
            "cho_gia_dinh": {
                "phac_do_tham_chieu": "Chờ phân tích AI",
                "muc_tieu": "Duy trì thói quen ổn định, quan sát thêm.",
                "hanh_dong": [
                    "Tiếp tục theo dõi sinh hoạt hàng ngày của trẻ.",
                    "Liên hệ giáo viên nếu có lo ngại mới."
                ],
                "luu_y": "Hệ thống chỉ hỗ trợ sàng lọc, không thay thế chẩn đoán y khoa."
            }
        },
        "analysis_failed": True,
        "is_screening_only": True,
        "error_detail": (error_msg or "")[:200],
        "source": source
    }

def analyze_behavior_log(raw_text: str) -> Dict[str, Any]:
    """
    Phân tích bằng kiến trúc Đa tác tử (Multi-Agent) và RAG (Medical Grounding).
    Tích hợp XAI (Explainable AI) để trích xuất mảng từ khóa bất thường.
    """
    system_prompt = """Bạn là trợ lý SÀNG LỌC GIÁO DỤC mầm non (ZPD Care) — KHÔNG phải hệ thống chẩn đoán y khoa.
VAI TRÒ:
- Tóm tắt quan sát giáo viên.
- Gợi ý mức theo dõi sư phạm thang 1–4 (CARS-like nội bộ, KHÔNG phải CARS-2 chuẩn hóa / ADOS).
- Chỉ dùng ngôn ngữ DSM-5-TR như THAM CHIẾU GIÁO DỤC (không ghi mã chẩn đoán kiểu 299.00 ASD như kết luận).
- Trích từ khóa trong văn bản gốc để minh bạch (XAI).
- Human-in-the-loop: kết quả chỉ là gợi ý cho giáo viên xác nhận.

TUYỆT ĐỐI KHÔNG:
- Kết luận "tự kỷ", "rối loạn", "chẩn đoán", "bệnh".
- Bảo phụ huynh đưa trẻ đi khám như chỉ định y khoa (chỉ được gợi ý "cân nhắc trao đổi chuyên môn nếu dấu hiệu kéo dài").
- Bịa chi tiết không có trong văn bản quan sát.

NẾU HÀNH VI BÌNH THƯỜNG / TÍCH CỰC:
- "ma_chuan_y_khoa": "Không có dấu hiệu cần theo dõi đặc biệt (sàng lọc giáo dục)".
- "diem_nguy_co": 1.0
- "kich_ban_test_kiem_chung": null
- "khao_sat_phu_huynh": []
- "xai_highlights": []

BẮT BUỘC trả về đúng 1 JSON:
{
  "hanh_vi_goc": "Tóm tắt sự kiện (bám sát văn bản GV)",
  "ma_chuan_y_khoa": "Tham chiếu khung sàng lọc giáo dục (VD: Cần theo dõi giao tiếp xã hội — ngôn ngữ tiêu chí A mang tính giáo dục, không chẩn đoán)",
  "nhom_ky_nang": "Chỉ chọn 1: Giao tiếp (Social) / Rập khuôn (Routine) / Tập trung (Attention)",
  "diem_nguy_co": 2.0,
  "diem_nguy_co_giai_thich": "Giải thích mức 1–4 theo quan sát sư phạm (1 an toàn · 2 theo dõi · 3 đáng kể · 4 báo động theo dõi nội bộ).",
  "xai_confidence": "Độ tin cậy gợi ý AI (VD: 75%)",
  "kich_ban_test_kiem_chung": null,
  "xai_highlights": [
      {
          "keyword": "CHỈ trích NGUYÊN VĂN 2-8 từ có trong hanh_vi_goc",
          "weight": "Nghiêm trọng / Trung bình",
          "reason": "Lý do quan sát giáo dục ngắn gọn"
      }
  ],
  "khao_sat_phu_huynh": [
      {
          "id": "q1",
          "text": "Câu YES/NO: 'CÓ' = dấu hiệu cần theo dõi (VD: Bé có thường không quay lại khi được gọi tên ở nhà không?)",
          "type": "social",
          "reason": "Giải thích ngắn, không gây hoang mang"
      }
  ],
  "zpd_recommendation": {
      "cho_nha_truong": {
          "phac_do_tham_chieu": "Tên phác đồ chuẩn y khoa thế giới đang áp dụng (VD: TEACCH, PECS, ABA, ESDM...)",
          "muc_tieu": "Mục tiêu bình dân, dễ hiểu (VD: Giúp trẻ giảm căng thẳng)",
          "hanh_dong": ["Hành động cụ thể 1 (VD: Tạo góc yên tĩnh)", "Hành động cụ thể 2"],
          "luu_y": "Mẹo nhỏ gọn (VD: Tuyệt đối không lớn tiếng)"
      },
      "cho_gia_dinh": {
          "phac_do_tham_chieu": "Tên phác đồ chuẩn y khoa (VD: DIRFloortime, Routine Management, ABA...)",
          "muc_tieu": "Mục tiêu bình dân, dễ hiểu",
          "hanh_dong": ["Hành động cụ thể 1", "Hành động cụ thể 2"],
          "luu_y": "Mẹo nhỏ gọn"
      }
  }
}"""
    
    try:
        models_to_try = ["gemini-3.1-flash-lite", "gemini-2.5-flash-lite", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"]
        response = None
        for m_name in models_to_try:
            try:
                model = genai.GenerativeModel(
                    model_name=m_name,
                    system_instruction=system_prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                response = model.generate_content(raw_text)
                break
            except Exception as e:
                print(f"Model {m_name} failed: {e}")
                continue
                
        if not response:
            raise Exception("All models exhausted or failed.")
            
        # Hàm làm sạch JSON nếu AI trả về block markdown hoặc text chèn lời chào
        def clean_json_string(raw: str) -> str:
            match = re.search(r'\{[\s\S]*\}', raw)
            if match:
                return match.group(0).strip()
            return raw.strip()
            
        cleaned = clean_json_string(response.text)
        result = json.loads(cleaned)
        if not isinstance(result, dict):
            raise ValueError("AI returned a non-dictionary JSON.")
        result["analysis_failed"] = False
        result["is_screening_only"] = True
        result = align_xai_highlights(result, raw_text)
        return result
    except Exception as e:
        print(f"AI Analyzer Error: {e}")
        return build_safe_analysis_fallback(raw_text, str(e), source="text")

def align_xai_highlights(result: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
    """
    Ensure xai_highlights keywords appear in display text (hanh_vi_goc or raw).
    If AI paraphrased, rewrite keyword to a matching substring when possible.
    """
    if not isinstance(result, dict):
        return result
    highlights = result.get("xai_highlights")
    if not isinstance(highlights, list):
        return result

    display = str(result.get("hanh_vi_goc") or "").strip()
    raw = str(raw_text or "").strip()
    # Prefer raw for matching if richer
    primary = raw if len(raw) >= len(display) else display
    secondary = display if primary is raw else raw
    primary_l = primary.lower()
    secondary_l = secondary.lower()

    fixed = []
    for h in highlights:
        if not isinstance(h, dict):
            continue
        kw = str(h.get("keyword") or h.get("text") or h.get("tu_khoa") or "").strip()
        if len(kw) < 2:
            continue
        kw_l = kw.lower()
        new_kw = None
        if kw_l in primary_l:
            # keep original casing from primary
            idx = primary_l.find(kw_l)
            new_kw = primary[idx:idx + len(kw)]
        elif kw_l in secondary_l:
            idx = secondary_l.find(kw_l)
            new_kw = secondary[idx:idx + len(kw)]
        else:
            # try longest meaningful token that exists in text
            stop = {
                "không", "được", "trong", "nhiều", "với", "các", "một", "khi",
                "cho", "của", "và", "là", "có", "bị", "rất", "này", "đó", "lần"
            }
            tokens = sorted(
                [t for t in re.split(r"[\s,.;:!?()]+", kw) if len(t) >= 5 and t.lower() not in stop],
                key=len,
                reverse=True,
            )
            for t in tokens:
                t_l = t.lower()
                if t_l in primary_l:
                    idx = primary_l.find(t_l)
                    new_kw = primary[idx:idx + len(t)]
                    break
                if t_l in secondary_l:
                    idx = secondary_l.find(t_l)
                    new_kw = secondary[idx:idx + len(t)]
                    break
        if new_kw:
            item = dict(h)
            item["keyword"] = new_kw
            fixed.append(item)

    result["xai_highlights"] = fixed
    # If summary has no matches but raw does, keep hanh_vi_goc as summary for cards
    # but attach raw for frontend highlight preference
    result["raw_text_ref"] = raw
    return result

def _is_demo_scorer(scored_by) -> bool:
    s = str(scored_by or "").strip().lower()
    return s in ("seed", "demo", "system-seed", "import", "placeholder")


def _log_counts_toward_risk(data: dict) -> bool:
    """Chỉ đếm quan sát GV đã xác nhận, không phải nháp/seed/placeholder."""
    if not isinstance(data, dict):
        return False
    if data.get("analysis_failed") is True:
        return False
    if data.get("counts_toward_risk") is False:
        return False
    if data.get("teacher_confirmed") is False:
        return False
    # Placeholder import: chưa có nhật ký thật
    if data.get("is_placeholder") is True or data.get("is_seed") is True:
        return False
    src = str(data.get("source") or "").lower()
    if src in ("seed", "placeholder", "import_placeholder"):
        return False
    raw = str(data.get("hanh_vi_goc") or "")
    if "Chưa có nhật ký" in raw or raw.strip() in ("", "[placeholder]"):
        # Chỉ loại nếu đồng thời điểm trung lập 1.0 (seed import)
        try:
            if float(data.get("diem_nguy_co", 1.0)) == 1.0 and not data.get("teacher_confirmed"):
                return False
        except (TypeError, ValueError):
            return False
    return True


def calculate_final_risk(student_id: int) -> Dict[str, Any]:
    """
    Tam giác hóa sàng lọc giáo dục (1.0–4.0).
    Chỉ đếm: quan sát GV đã xác nhận, khảo sát PH thật, probe scored=1 và không seed/demo.
    """
    db = SessionLocal()
    try:
        # 1. GV — tối đa 5 log gần nhất đủ điều kiện
        logs = db.query(TeacherBehaviorLog).filter(TeacherBehaviorLog.student_id == student_id).order_by(TeacherBehaviorLog.id.desc()).limit(12).all()
        teacher_scores = []
        for log in logs:
            if log.parsed_json:
                try:
                    data = json.loads(log.parsed_json)
                    if not _log_counts_toward_risk(data):
                        continue
                    score = float(data.get("diem_nguy_co", 1.0))
                    if score < 1.0 or score > 4.0:
                        continue
                    teacher_scores.append(score)
                    if len(teacher_scores) >= 5:
                        break
                except (ValueError, TypeError, json.JSONDecodeError):
                    pass
        avg_teacher = sum(teacher_scores) / len(teacher_scores) if teacher_scores else None

        # 2. PH — tối đa 3 khảo sát; bỏ total_score placeholder 1.0 đơn lẻ nếu gắn cờ (không có cờ → vẫn đếm)
        surveys = db.query(ParentSurvey).filter(ParentSurvey.student_id == student_id).order_by(ParentSurvey.id.desc()).limit(5).all()
        parent_scores = []
        for s in surveys:
            try:
                ts = float(s.total_score)
            except (TypeError, ValueError):
                continue
            if ts < 1.0 or ts > 4.0:
                continue
            parent_scores.append(ts)
            if len(parent_scores) >= 3:
                break
        avg_parent = sum(parent_scores) / len(parent_scores) if parent_scores else None

        # 3. Probe — CHỈ scored==1, không seed/demo
        probes = db.query(ProactiveProbe).filter(ProactiveProbe.student_id == student_id).order_by(ProactiveProbe.id.desc()).all()
        probe_scores = []
        red_flag_triggered = False

        def _probe_cars(p):
            # Demo/seed không vào risk
            if _is_demo_scorer(getattr(p, "scored_by", None)):
                return None
            # Bắt buộc scored=1
            if int(getattr(p, "scored", 0) or 0) != 1:
                return None
            if p.result_status in ("Bỏ qua", "Chờ kiểm tra"):
                return None
            if p.cars_mapped is not None:
                try:
                    v = float(p.cars_mapped)
                    if 1.0 <= v <= 4.0:
                        return v
                except (TypeError, ValueError):
                    pass
            if getattr(p, "rubric_score", None) is not None:
                try:
                    v = float(int(p.rubric_score))
                    if 1.0 <= v <= 4.0:
                        return v
                except (TypeError, ValueError):
                    pass
            # Legacy binary chỉ khi scored=1
            if p.result_status == "Không Đạt":
                return 4.0
            if p.result_status == "Đạt":
                return 1.0
            return None

        completed_probes = []
        for p in probes:
            cars = _probe_cars(p)
            if cars is None:
                continue
            completed_probes.append((p, cars))
            if len(completed_probes) >= 5:
                break

        recent_probes = completed_probes[:3]
        for p, cars in recent_probes:
            probe_scores.append(cars)

        t_for_flag = avg_teacher if avg_teacher is not None else 0.0
        p_for_flag = avg_parent if avg_parent is not None else 0.0
        if recent_probes:
            latest_p, latest_cars = recent_probes[0]
            if latest_cars >= 3.5 and t_for_flag >= 2.0 and p_for_flag >= 2.0:
                red_flag_triggered = True
            elif latest_p.result_status == "Không Đạt" and t_for_flag >= 2.0 and p_for_flag >= 2.0:
                red_flag_triggered = True

        avg_probe = sum(probe_scores) / len(probe_scores) if probe_scores else None
        probe_n = len(probe_scores)

        # 3b. Trục Social / Routine / Attention từ probe đã chấm (catalog module.axis)
        from probe_catalog import get_module as _get_probe_module
        axis_buckets = {"social": [], "routine": [], "attention": []}
        for p, cars in completed_probes:
            axis = None
            mid = getattr(p, "module_id", None)
            if mid:
                mod = _get_probe_module(mid)
                if mod:
                    axis = mod.get("axis")
            if not axis and getattr(p, "test_category", None):
                cat = str(p.test_category).lower()
                if "giao" in cat or "xã hội" in cat or "social" in cat:
                    axis = "social"
                elif "hành" in cat or "thói" in cat or "routine" in cat or "lặp" in cat:
                    axis = "routine"
                elif "chú" in cat or "tập trung" in cat or "attention" in cat or "đáp ứng" in cat:
                    axis = "attention"
            if axis in axis_buckets:
                axis_buckets[axis].append(cars)
        axis_scores = {
            k: (round(sum(v) / len(v), 2) if v else None)
            for k, v in axis_buckets.items()
        }
        axis_counts = {k: len(v) for k, v in axis_buckets.items()}

        # 4. Triangulation — thiếu nguồn → tái phân bổ; không bịa điểm 1.0 giả
        has_t = avg_teacher is not None
        has_p = avg_parent is not None
        has_k = avg_probe is not None
        t_val = avg_teacher
        p_val = avg_parent
        k_val = avg_probe

        if red_flag_triggered and has_k:
            risk_final = max(3.5, (0.2 * (t_val or 2.0)) + (0.2 * (p_val or 2.0)) + (0.6 * k_val))
        else:
            parts = []
            if has_t:
                parts.append((0.30, t_val))
            if has_p:
                parts.append((0.30, p_val))
            if has_k:
                parts.append((0.40, k_val))
            if not parts:
                # Chưa có nguồn thật → trung lập kỹ thuật (không gọi là "đã sàng lọc")
                risk_final = 1.0
            else:
                wsum = sum(w for w, _ in parts)
                risk_final = sum((w / wsum) * v for w, v in parts)

        risk_final = round(float(risk_final), 2)
        avg_teacher_out = round(avg_teacher, 2) if has_t else None
        avg_parent_out = round(avg_parent, 2) if has_p else None
        avg_probe_out = round(avg_probe, 2) if has_k else None

        # 5. Phân loại sàng lọc giáo dục (không dùng ngôn ngữ chẩn đoán)
        if risk_final < 2.0:
            status = "Mức 1 · An toàn (sàng lọc)"
            color = "green"
        elif 2.0 <= risk_final <= 2.9:
            status = "Mức 2 · Theo dõi"
            color = "yellow"
        elif 3.0 <= risk_final <= 3.6:
            status = "Mức 3 · Đáng kể"
            color = "orange"
        else:
            status = "Mức 4 · Báo động theo dõi"
            color = "red"

        sources_filled = sum([has_t, has_p, has_k])
        profile = {
            "avg_teacher_score": avg_teacher_out,
            "avg_parent_score": avg_parent_out,
            "avg_probe_score": avg_probe_out,
            "teacher_n": len(teacher_scores),
            "parent_n": len(parent_scores),
            "probe_n": probe_n,
            "probe_n_used": min(probe_n, 3),
            "axis_scores": axis_scores,
            "axis_counts": axis_counts,
            "sources_filled": sources_filled,
            "sources_completeness": round((sources_filled / 3) * 100),
            "red_flag": red_flag_triggered,
            "weights": {"teacher": 0.30, "parent": 0.30, "probe": 0.40},
            "formula": "R = 0.30·GV + 0.30·PH + 0.40·Probe (tái phân bổ nếu thiếu nguồn); red-flag AND nâng trần",
            "risk_score": risk_final,
            "status": status,
            "color": color,
            "scientific_explanations": {
                "triangulation_method": (
                    "Chiếu chéo 3 nguồn độc lập (triangulation): "
                    "(1) GV — nhật ký quan sát đã xác nhận [30%]; "
                    "(2) PH — khảo sát nhập bởi GV [30%]; "
                    "(3) Probe — module catalog + rubric 1–4 [40%]. "
                    "Thiếu nguồn thì tái phân bổ trọng số các nguồn còn lại. "
                    "Red-flag chỉ khi probe gần nhất ≥3.5 VÀ cả GV lẫn PH ≥2.0."
                ),
                "cars_scale_meaning": f"Điểm sàng lọc CARS-like {risk_final}/4.0: " + (
                    "Biểu hiện trong ngưỡng an toàn theo dữ liệu hiện có. Duy trì quan sát định kỳ." if risk_final < 2.0 else
                    "Có dấu hiệu cần theo dõi. Bổ sung quan sát khác thời điểm, khảo sát PH và/hoặc probe." if risk_final <= 2.9 else
                    "Dấu hiệu đáng chú ý trên nhiều nguồn. Ưu tiên kiểm chứng tại lớp và trao đổi chuyên môn sư phạm; cân nhắc định hướng đánh giá ngoài nếu kéo dài." if risk_final <= 3.6 else
                    "Mức báo động theo dõi nội bộ. Không phải chẩn đoán. Hội chẩn nhà trường–gia đình và định hướng chuyên môn phù hợp."
                ),
                "dsm5_radar_axes": {
                    "social": "Trục giao tiếp xã hội (tham chiếu ngôn ngữ DSM-5-TR tiêu chí A — chỉ để cấu trúc quan sát giáo dục).",
                    "routine": "Trục hành vi / thói quen lặp (tham chiếu ngôn ngữ tiêu chí B — không chẩn đoán).",
                    "attention": "Trục chú ý / đáp ứng / điều hòa giác quan — chỉ số hỗ trợ quan sát lớp.",
                },
                "disclaimer": (
                    "Hệ thống hỗ trợ sàng lọc–can thiệp sư phạm. "
                    "Không tương đương ADOS-2, CARS-2, M-CHAT-R chuẩn hóa hay chẩn đoán y khoa."
                ),
            },
        }

        # Persist cache for school dashboard O(N) without recompute
        student = db.query(Student).filter(Student.id == student_id).first()
        if student:
            student.cached_risk_score = risk_final
            student.cached_risk_status = status
            student.cached_risk_color = color
            student.risk_updated_at = datetime.datetime.utcnow()
            db.commit()

        return profile
    finally:
        db.close()

def generate_predictive_trajectory(current_risk: float) -> Dict[str, Any]:
    """
    Thuật toán Dự báo chuỗi thời gian (Time-Series Forecasting Simulation).
    Dự báo diễn biến rủi ro ZPD trong 6 tháng tới (Có can thiệp vs Không can thiệp).
    """
    months = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6"]
    
    # Giả lập baseline: Nếu không can thiệp, xu hướng rủi ro tăng dần (Aggravation curve)
    without_intervention = []
    base = current_risk
    for i in range(6):
        without_intervention.append(round(base, 2))
        base = min(4.0, base + 0.15) # Tăng dần rủi ro, max là 4.0
        
    # Giả lập ZPD: Nếu can thiệp đúng Vùng phát triển gần, rủi ro giảm dần (Regression curve)
    with_intervention = []
    base_zpd = current_risk
    for i in range(6):
        with_intervention.append(round(base_zpd, 2))
        base_zpd = max(1.0, base_zpd - 0.25) # Giảm rủi ro, min là 1.0

    # Chuyển đổi thành mảng object cho Recharts
    chart_data = []
    for i in range(6):
        chart_data.append({
            "month": months[i],
            "without_zpd": without_intervention[i],
            "with_zpd": with_intervention[i]
        })
        
    return chart_data

def chat_with_medical_ai(
    student_name: str,
    current_risk: float,
    zpd_context: str,
    message: str,
    dossier: Optional[str] = None,
    history: Optional[List[Dict[str, str]]] = None,
) -> str:
    """Trợ lý hồ sơ sàng lọc giáo dục — ngữ cảnh đầy đủ + lịch sử hội thoại."""
    dossier_block = (dossier or "Chưa có thêm chi tiết hồ sơ.").strip()
    if len(dossier_block) > 4500:
        dossier_block = dossier_block[:4500] + "\n…(đã rút gọn)"

    system_prompt = f"""Bạn là **trợ lý hồ sơ ZPD Care** cho giáo viên mầm non (sàng lọc giáo dục).

## Hồ sơ đang mở
- Học sinh: {student_name}
- Điểm sàng lọc nội bộ (CARS-like 1–4): {current_risk}/4.0
  · 1 An toàn · 2 Theo dõi · 3 Đáng kể · 4 Báo động theo dõi
  · Đây KHÔNG phải CARS-2 / ADOS / chẩn đoán y khoa.
- Gợi ý ZPD (nếu có): {zpd_context}

## Dữ liệu hồ sơ (bám sát — không bịa thêm)
{dossier_block}

## Nhiệm vụ
1) Trả lời câu hỏi giáo viên ngắn gọn, rõ, có cấu trúc (bullet khi cần).
2) Ưu tiên: giải thích chỉ số, gợi ý quan sát/probe/PH, việc làm được ngay tại lớp/nhà.
3) Khi thiếu dữ liệu: nói rõ còn thiếu gì (vd chưa có probe, chưa khảo sát PH).
4) Kết thúc bằng 1–3 việc làm tiếp theo cụ thể khi phù hợp.

## Cấm
- Chẩn đoán bệnh, mã ICD/DSM như kết luận, kê đơn, hù dọa.
- Bịa điểm số / sự kiện không có trong hồ sơ.
- Dài dòng sáo rỗng.

Giọng điệu: chuyên nghiệp, thấu cảm, cầm tay chỉ việc.
"""
    # Build multi-turn contents
    contents: List[Any] = []
    if history:
        for turn in history[-8:]:
            if not isinstance(turn, dict):
                continue
            role = str(turn.get("role") or "").lower()
            text = str(turn.get("text") or turn.get("content") or "").strip()
            if not text:
                continue
            # Gemini: user / model
            g_role = "user" if role in ("user", "teacher", "human") else "model"
            contents.append({"role": g_role, "parts": [text[:1200]]})
    contents.append({"role": "user", "parts": [message.strip()[:1500]]})

    try:
        models_to_try = [
            "gemini-3.1-flash-lite",
            "gemini-2.5-flash-lite",
            "gemini-3.5-flash",
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-flash-latest",
        ]
        response = None
        last_err = None
        for m_name in models_to_try:
            try:
                model = genai.GenerativeModel(
                    model_name=m_name,
                    system_instruction=system_prompt,
                )
                response = model.generate_content(contents)
                break
            except Exception as e:
                last_err = e
                print(f"Model {m_name} failed: {e}")
                continue

        if not response:
            raise Exception(f"All models exhausted: {last_err}")

        text = getattr(response, "text", None) or ""
        if not text.strip():
            return "Tôi chưa tạo được câu trả lời. Hãy hỏi cụ thể hơn (vd: giải thích điểm, gợi ý việc làm lớp)."
        return text.strip()
    except Exception as e:
        print(f"Chatbot Error: {e}")
        try:
            with open("chatbot_debug_error.txt", "w", encoding="utf-8") as f:
                f.write(str(e))
        except OSError:
            pass
        return (
            "Xin lỗi, trợ lý AI tạm thời không phản hồi. "
            "Bạn vẫn có thể dùng tab Quan sát / Kiểm chứng / Hồ sơ ZPD bình thường."
        )

def analyze_multimodal_log(file_path: str) -> Dict[str, Any]:
    """
    Multimodal AI: Đọc trực tiếp Audio/Video để phân tích hành vi.
    """
    system_prompt = """Bạn là trợ lý SÀNG LỌC GIÁO DỤC mầm non (ZPD Care) — KHÔNG chẩn đoán y khoa.
Nhận audio/video quan sát trẻ. Nhiệm vụ:
1) Mô tả trung thực những gì nghe/thấy → hanh_vi_goc.
2) Gợi ý mức theo dõi sư phạm 1–4 (CARS-like nội bộ, không phải CARS-2/ADOS).
3) Không kết luận bệnh, không mã chẩn đoán 299.00, không bảo “đi khám ngay” như chỉ định y khoa.
4) Trả đúng 1 JSON:

{
  "hanh_vi_goc": "Mô tả sự kiện từ file",
  "ma_chuan_y_khoa": "Tham chiếu khung sàng lọc giáo dục (không chẩn đoán)",
  "nhom_ky_nang": "Giao tiếp / Rập khuôn / Tập trung",
  "diem_nguy_co": 2.0,
  "diem_nguy_co_giai_thich": "Giải thích mức 1–4 theo quan sát sư phạm",
  "xai_confidence": "70%",
  "kich_ban_test_kiem_chung": null,
  "xai_timestamps": [
      {"time": "00:15", "description": "Mô tả chi tiết hành vi tại mốc thời gian này"}
  ],
  "xai_highlights": [
      {"keyword": "cụm từ có trong hanh_vi_goc", "weight": "Trung bình", "reason": "Lý do quan sát giáo dục"}
  ],
  "khao_sat_phu_huynh": [],
  "zpd_recommendation": {
      "cho_nha_truong": {
          "phac_do_tham_chieu": "Gợi ý scaffolding lớp (evidence-informed, không phải phác đồ lâm sàng)",
          "muc_tieu": "Mục tiêu quan sát/hỗ trợ ngắn",
          "hanh_dong": ["Bước thực hành 1", "Bước 2"],
          "luu_y": "Không ép buộc; ưu tiên an toàn cảm xúc"
      },
      "cho_gia_dinh": {
          "phac_do_tham_chieu": "Gợi ý phối hợp nhà",
          "muc_tieu": "Mục tiêu ngắn tại nhà",
          "hanh_dong": ["Bước 1"],
          "luu_y": "Giọng điệu bình tĩnh, không dán nhãn"
      }
  }
}"""
    try:
        uploaded_file = genai.upload_file(path=file_path)
        
        # Wait for media processing (essential for video files)
        while uploaded_file.state.name == "PROCESSING":
            print(f"Waiting for media processing... {uploaded_file.name}")
            time.sleep(2)
            uploaded_file = genai.get_file(uploaded_file.name)
            
        if uploaded_file.state.name == "FAILED":
            raise Exception("Media processing failed on Gemini server.")
            
        models_to_try = ["gemini-3.1-flash-lite", "gemini-2.5-flash-lite", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"]
        response = None
        for m_name in models_to_try:
            try:
                model = genai.GenerativeModel(
                    model_name=m_name,
                    system_instruction=system_prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                response = model.generate_content([
                    uploaded_file,
                    "Phân tích hành vi theo trình tự thời gian. Chỉ rõ hành vi xảy ra ở giây thứ mấy trong mảng xai_timestamps. Trả về JSON sàng lọc giáo dục (không chẩn đoán y khoa).",
                ])
                break
            except Exception as e:
                print(f"Model {m_name} failed: {e}")
                continue
                
        if not response:
            raise Exception("All models exhausted or failed.")
            
        def clean_json_string(raw: str) -> str:
            match = re.search(r'\{[\s\S]*\}', raw)
            if match:
                return match.group(0).strip()
            return raw.strip()
            
        result = json.loads(clean_json_string(response.text))
        if not isinstance(result, dict):
            raise ValueError("AI returned a non-dictionary JSON.")
        result["analysis_failed"] = False
        result["is_screening_only"] = True
        return result
    except Exception as e:
        print(f"Multimodal AI Error: {e}")
        return build_safe_analysis_fallback(
            "[Multimodal] Không trích xuất được nội dung từ file.",
            str(e),
            source="multimodal"
        )

