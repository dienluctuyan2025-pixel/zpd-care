"""
Bộ module kiểm chứng giáo dục cố định (không AI bịa game).
Tham chiếu khung quan sát sàng lọc mầm non — KHÔNG thay ADOS-2 / CARS chuẩn hóa.
Mỗi module: protocol + rubric 1–4 + game hỗ trợ (tuỳ chọn) + trục Social/Routine/Attention.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional

DISCLAIMER = (
    "Bộ module hỗ trợ quan sát / kiểm chứng giáo dục theo trục Social–Routine–Attention. "
    "Không phải công cụ chẩn đoán y khoa (ADOS-2, CARS có license). "
    "Điểm 1–4 do giáo viên chấm theo rubric; game chỉ hỗ trợ kích thích quan sát."
)

# Rubric chung (mức độ quan sát)
RUBRIC_LEVELS = {
    1: {
        "label": "Phù hợp lứa tuổi",
        "desc": "Phản ứng / hành vi trong ngưỡng mong đợi; ít cần hỗ trợ.",
    },
    2: {
        "label": "Cần theo dõi",
        "desc": "Có dấu hiệu nhẹ hoặc không nhất quán; cần lặp lại quan sát.",
    },
    3: {
        "label": "Khó khăn rõ",
        "desc": "Khó khăn lặp lại, ảnh hưởng tham gia hoạt động; cần hỗ trợ có cấu trúc.",
    },
    4: {
        "label": "Khó khăn nổi bật",
        "desc": "Thiếu đáp ứng / hành vi cứng nhắc rõ; ưu tiên theo dõi chuyên sâu và phối hợp PH.",
    },
}

MODULES: List[Dict[str, Any]] = [
    {
        "id": "name_response",
        "code": "NR-01",
        "name": "Đáp ứng khi gọi tên",
        "axis": "attention",
        "axis_label": "Chú ý / đáp ứng",
        "age_min": 3,
        "age_max": 6,
        "duration_min": 3,
        "game_type": "reaction",
        "scientific_basis": [
            "M-CHAT-R item liên quan đáp ứng tên gọi (sàng lọc, không chẩn đoán)",
            "Quan sát joint attention / orienting to name trong phát triển giao tiếp sớm",
        ],
        "purpose": "Đánh giá trẻ có quay lại / chú ý khi nghe tên trong môi trường yên tương đối.",
        "materials": ["Không gian yên", "1–2 đồ chơi trung tính"],
        "steps": [
            "Bé chơi tự do 30–60 giây.",
            "GV đứng ngoài tầm nhìn trực diện, gọi tên giọng bình thường 1 lần.",
            "Chờ tối đa 5 giây; ghi nhận quay đầu / nhìn / đáp lời.",
            "Lặp tối đa 3 lần nếu không đáp ứng (giãn cách ≥10 giây).",
        ],
        "pass_hint": "Quay lại hoặc có phản ứng rõ trong 5 giây ở ≥2/3 lần gọi.",
        "fail_hint": "Không phản ứng sau 3 lần gọi trong điều kiện yên.",
        "rubric": {
            1: "Đáp ứng nhanh (≥2/3 lần), quay đầu/nhìn trong 3 giây.",
            2: "Đáp ứng chậm hoặc chỉ 1/3 lần; cần gọi to hơn.",
            3: "Hiếm khi đáp ứng; chủ yếu tiếp tục chơi đồ vật.",
            4: "Không đáp ứng cả 3 lần; không định hướng theo giọng gọi.",
        },
        "scoring_notes": "Game phản xạ (nếu dùng) chỉ tham khảo thời gian; điểm chính theo rubric quan sát.",
    },
    {
        "id": "joint_attention",
        "code": "JA-02",
        "name": "Chú ý chung (chỉ trỏ / nhìn theo)",
        "axis": "social",
        "axis_label": "Giao tiếp xã hội",
        "age_min": 3,
        "age_max": 6,
        "duration_min": 4,
        "game_type": "none",
        "scientific_basis": [
            "Joint attention — mốc giao tiếp xã hội sớm (sàng lọc phát triển)",
            "Quan sát gaze following / pointing response",
        ],
        "purpose": "Trẻ có nhìn theo hướng chỉ của GV và chia sẻ chú ý không.",
        "materials": ["Đồ chơi hấp dẫn đặt xa ~2m", "Không gian đủ sáng"],
        "steps": [
            "Đặt đồ chơi ngoài tầm với, trong tầm nhìn.",
            "GV chỉ tay + nói 'Nhìn kìa!' về phía đồ chơi.",
            "Quan sát: trẻ có nhìn theo tay/mắt GV sang đồ chơi không.",
            "Thử 2 hướng khác nhau (trái/phải).",
        ],
        "pass_hint": "Nhìn theo chỉ trỏ ở ≥1/2 lần và có biểu hiện chia sẻ (nhìn lại GV).",
        "fail_hint": "Không nhìn theo; chỉ nhìn tay GV hoặc bỏ qua.",
        "rubric": {
            1: "Nhìn theo chỉ trỏ rõ, có nhìn lại GV (chia sẻ chú ý).",
            2: "Nhìn theo đôi khi; ít nhìn lại GV.",
            3: "Hiếm nhìn theo; chủ yếu tập trung đồ vật gần.",
            4: "Không theo chỉ trỏ; không định hướng chung với người lớn.",
        },
        "scoring_notes": "Chỉ quan sát trực tiếp tại lớp — không gắn game máy (game ≠ joint attention).",
    },
    {
        "id": "emotion_match",
        "code": "EM-03",
        "name": "Nhận diện cảm xúc cơ bản",
        "axis": "social",
        "axis_label": "Giao tiếp xã hội",
        "age_min": 3,
        "age_max": 6,
        "duration_min": 5,
        "game_type": "emotion",
        "scientific_basis": [
            "Nhận diện cảm xúc cơ bản hỗ trợ lý thuyết tâm trí sơ khai (mầm non)",
            "Dùng làm kích thích quan sát — không thay trắc nghiệm cảm xúc chuẩn hóa",
        ],
        "purpose": "Trẻ nhận ra và chỉ đúng cảm xúc vui/buồn/giận ở mức cơ bản.",
        "materials": ["Thẻ mặt / game emoji trên máy", "Ngồi đối diện trẻ"],
        "steps": [
            "Làm quen 1 lượt (practice) — không chấm.",
            "Lượt scored: hỏi 3 cảm xúc (vui, buồn, giận).",
            "Ghi số câu đúng /3 và mức cần gợi ý.",
            "Quan sát giao tiếp mắt khi trả lời.",
        ],
        "pass_hint": "Đúng ≥2/3 không cần gợi ý nhiều.",
        "fail_hint": "Đúng 0–1/3 dù đã gợi ý.",
        "rubric": {
            1: "Đúng ≥2/3, tự chỉ nhanh, có giao tiếp mắt.",
            2: "Đúng 2/3 nhưng cần nhắc hoặc chậm.",
            3: "Đúng 1/3; nhầm lẫn cảm xúc rõ.",
            4: "Không chỉ đúng hoặc không tham gia nhiệm vụ.",
        },
        "scoring_notes": "Game emotion hỗ trợ trình bày kích thích; điểm theo rubric GV.",
    },
    {
        "id": "turn_taking",
        "code": "TT-04",
        "name": "Chia sẻ / chờ lượt",
        "axis": "social",
        "axis_label": "Giao tiếp xã hội",
        "age_min": 3,
        "age_max": 6,
        "duration_min": 5,
        "game_type": "none",
        "scientific_basis": [
            "Kỹ năng xã hội sớm: turn-taking, sharing trong play-based assessment",
        ],
        "purpose": "Trẻ chờ lượt và chia sẻ đồ chơi với người lớn/bạn trong 3–5 phút.",
        "materials": ["1 đồ chơi hấp dẫn", "Đồng hồ/đếm 3 lượt"],
        "steps": [
            "GV và trẻ luân phiên chơi 1 đồ chơi (mỗi lượt ~20–30s).",
            "Báo trước khi hết lượt ('Đến lượt cô / đến lượt con').",
            "Quan sát: trẻ có nhường, chờ, phản ứng khi mất lượt.",
            "Ghi nhận hành vi phản kháng nếu có (cường độ, thời gian).",
        ],
        "pass_hint": "Chờ lượt ≥2/3 lần với nhắc nhẹ.",
        "fail_hint": "Không nhường; phản kháng kéo dài khi mất lượt.",
        "rubric": {
            1: "Chờ lượt tốt, chia sẻ khi được nhắc nhẹ.",
            2: "Chờ được nhưng khó chịu nhẹ; cần nhắc nhiều.",
            3: "Thường giành đồ; khó chuyển lượt.",
            4: "Không tham gia luân phiên; phản kháng mạnh khi mất đồ.",
        },
        "scoring_notes": "Chỉ quan sát chơi thật với đồ chơi — không dùng game máy.",
    },
    {
        "id": "routine_transition",
        "code": "RT-05",
        "name": "Chuyển hoạt động / linh hoạt",
        "axis": "routine",
        "axis_label": "Hành vi / thói quen",
        "age_min": 3,
        "age_max": 6,
        "duration_min": 5,
        "game_type": "none",
        "scientific_basis": [
            "Linh hoạt hành vi / chuyển tiếp (transition) trong quan sát lớp học",
            "Liên quan tiêu chí hành vi lặp–cứng nhắc (khung sàng lọc, không chẩn đoán)",
        ],
        "purpose": "Trẻ chuyển từ hoạt động A sang B khi được báo trước 1 phút.",
        "materials": ["2 hoạt động (xếp hình → xếp hàng)", "Đồng hồ/còi nhẹ"],
        "steps": [
            "Cho chơi hoạt động ưa thích 2 phút.",
            "Báo trước 1 phút: 'Sắp đến giờ xếp hình/xếp hàng'.",
            "Hết giờ: chuyển hoạt động, quan sát phản ứng.",
            "Ghi thời gian bình tĩnh lại nếu có khó chịu.",
        ],
        "pass_hint": "Chuyển được với 1–2 nhắc; bình tĩnh trong ~1 phút.",
        "fail_hint": "Khóc/chống đối kéo dài >3 phút hoặc không chuyển được.",
        "rubric": {
            1: "Chuyển mượt với báo trước; ít phản kháng.",
            2: "Lần đầu khó chịu nhẹ; chuyển được sau nhắc.",
            3: "Phản kháng rõ; cần hỗ trợ tay-cầm-tay / dài hơn 2 phút.",
            4: "Không chuyển; cơn khó chịu kéo dài hoặc hành vi cứng nhắc mạnh.",
        },
        "scoring_notes": "Chỉ quan sát chuyển tiếp thật tại lớp — game máy không đo được transition.",
    },
    {
        "id": "sustained_attention",
        "code": "SA-06",
        "name": "Duy trì chú ý ngắn",
        "axis": "attention",
        "axis_label": "Chú ý / tập trung",
        "age_min": 3,
        "age_max": 6,
        "duration_min": 4,
        "game_type": "shape",
        "scientific_basis": [
            "Sustained attention trong hoạt động có cấu trúc ngắn (mầm non)",
            "Game hình chỉ là kích thích chú ý — không phải test IQ",
        ],
        "purpose": "Trẻ duy trì chú ý vào nhiệm vụ có hướng dẫn trong 2–3 phút.",
        "materials": ["Bài ghép hình đơn giản / game shape", "Bàn yên tĩnh"],
        "steps": [
            "Giới thiệu nhiệm vụ 10 giây.",
            "Yêu cầu hoàn thành 3–5 lượt chọn hình (scored).",
            "Ghi số lần rời chỗ / nhìn chỗ khác >5 giây.",
            "Kết thúc khen cụ thể hành vi chú ý.",
        ],
        "pass_hint": "Hoàn thành nhiệm vụ với ≤2 lần xao nhãng cần nhắc.",
        "fail_hint": "Không ngồi/chú ý đủ để hoàn thành dù đã hỗ trợ.",
        "rubric": {
            1: "Tập trung tốt 2–3 phút; ít cần nhắc.",
            2: "Hoàn thành nhưng xao nhãng 2–3 lần.",
            3: "Xao nhãng nhiều; cần nhắc liên tục.",
            4: "Không duy trì chú ý; rời nhiệm vụ liên tục.",
        },
        "scoring_notes": "Game shape hỗ trợ; điểm theo quan sát chú ý + hoàn thành.",
    },
    {
        "id": "stereotypy_observe",
        "code": "ST-07",
        "name": "Quan sát hành vi lặp / tự kích thích",
        "axis": "routine",
        "axis_label": "Hành vi / thói quen",
        "age_min": 3,
        "age_max": 6,
        "duration_min": 5,
        "game_type": "none",
        "scientific_basis": [
            "Quan sát repetitive behaviors trong bối cảnh lớp (sàng lọc giáo dục)",
            "Ghi nhận tần suất/thời lượng — không gắn nhãn chẩn đoán",
        ],
        "purpose": "Ghi nhận có/không hành vi lặp (vỗ tay, xếp hàng dài, lắc lư…) và mức cản trở học.",
        "materials": ["Đồng hồ", "Phiếu ghi tần suất 5 phút"],
        "steps": [
            "Quan sát 5 phút chơi tự do + 1 hoạt động có cấu trúc.",
            "Ghi loại hành vi lặp (nếu có), ước lượng số lần / thời lượng.",
            "Ghi hành vi có cản trở tương tác/học không.",
            "Không ngăn cản hung hãn; ưu tiên an toàn.",
        ],
        "pass_hint": "Không có hành vi lặp đáng kể hoặc rất thoáng, không cản trở.",
        "fail_hint": "Hành vi lặp chiếm ưu thế, khó chuyển hướng chú ý.",
        "rubric": {
            1: "Không quan sát thấy hành vi lặp đáng kể.",
            2: "Có thoáng qua; dễ chuyển hướng khi gọi.",
            3: "Lặp lại rõ trong phiên; cản trở một phần tương tác.",
            4: "Lặp lại chiếm nhiều thời gian; khó ngắt/chuyển hướng.",
        },
        "scoring_notes": "Chỉ quan sát + ghi chép ABC/tần suất — tuyệt đối không gắn game máy.",
    },
]

# Module nào được gắn game máy (phải khớp protocol)
GAME_ALLOWED = {
    "name_response": "reaction",       # phản xạ / định hướng
    "emotion_match": "emotion",        # nhận diện cảm xúc
    "sustained_attention": "shape",    # duy trì chú ý trên nhiệm vụ
}


def list_modules(age: Optional[int] = None) -> List[Dict[str, Any]]:
    out = []
    for m in MODULES:
        if age is not None and (age < m["age_min"] or age > m["age_max"]):
            continue
        gt = m["game_type"] if m["game_type"] != "none" else None
        out.append({
            "id": m["id"],
            "code": m["code"],
            "name": m["name"],
            "axis": m["axis"],
            "axis_label": m["axis_label"],
            "age_min": m["age_min"],
            "age_max": m["age_max"],
            "duration_min": m["duration_min"],
            "game_type": m["game_type"],
            "has_game": bool(gt and gt != "none"),
            "purpose": m["purpose"],
            "mode": "game+observe" if gt and gt != "none" else "observe_only",
        })
    return out


def get_module(module_id: str) -> Optional[Dict[str, Any]]:
    for m in MODULES:
        if m["id"] == module_id:
            return m
    return None


def rubric_to_cars(score: int) -> float:
    """Rubric 1–4 đã cùng thang quan sát với CARS-like 1–4 dùng trong triangulation."""
    try:
        s = int(score)
    except (TypeError, ValueError):
        return 1.0
    return float(max(1, min(4, s)))


def catalog_payload(age: Optional[int] = None) -> Dict[str, Any]:
    return {
        "disclaimer": DISCLAIMER,
        "rubric_levels": RUBRIC_LEVELS,
        "modules": list_modules(age),
        "full_modules": [get_module(m["id"]) for m in list_modules(age)],
        "version": "probe-catalog-1.0",
    }
