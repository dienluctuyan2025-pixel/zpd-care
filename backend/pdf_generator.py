"""
ZPD Care — Hồ sơ sàng lọc giáo dục (PDF)
ReportLab A4 · cold rust brand · không chẩn đoán y khoa
"""
from __future__ import annotations

import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# Cold rust palette (đồng bộ web)
NAVY = colors.HexColor("#1d2d50")
NAVY_MID = colors.HexColor("#133b5c")
RUST = colors.HexColor("#ba370a")
RUST_SOFT = colors.HexColor("#af5b3f")
CREAM = colors.HexColor("#fdece6")
SLATE = colors.HexColor("#334155")
MUTED = colors.HexColor("#64748b")
LINE = colors.HexColor("#e2e8f0")
BG = colors.HexColor("#f8fafc")
WHITE = colors.white
GREEN = colors.HexColor("#059669")
AMBER = colors.HexColor("#d97706")
ORANGE = colors.HexColor("#ea580c")
RED = colors.HexColor("#dc2626")


def _safe_float(v, default=None):
    try:
        if v is None:
            return default
        return float(v)
    except (TypeError, ValueError):
        return default


def _fmt(v, digits=2, empty="—"):
    n = _safe_float(v)
    if n is None:
        return empty
    return f"{n:.{digits}f}"


def _esc(s) -> str:
    if s is None:
        return ""
    t = str(s)
    return (
        t.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def get_risk_level_info(score) -> Tuple[str, colors.Color, str]:
    sc = _safe_float(score, 1.0) or 1.0
    if sc < 2.0:
        return (
            "Mức 1 · An toàn (sàng lọc)",
            GREEN,
            "Theo dữ liệu hiện có, biểu hiện trong ngưỡng an toàn theo dõi sư phạm. Duy trì quan sát định kỳ.",
        )
    if sc <= 2.9:
        return (
            "Mức 2 · Theo dõi",
            AMBER,
            "Có dấu hiệu cần theo dõi thêm. Bổ sung quan sát, khảo sát PH và/hoặc kiểm chứng tại lớp.",
        )
    if sc <= 3.6:
        return (
            "Mức 3 · Đáng kể",
            ORANGE,
            "Dấu hiệu đáng chú ý trên dữ liệu sàng lọc. Ưu tiên hội chẩn sư phạm và kế hoạch hỗ trợ ZPD; "
            "cân nhắc định hướng chuyên môn ngoài nếu kéo dài.",
        )
    return (
        "Mức 4 · Báo động theo dõi",
        RED,
        "Mức báo động nội bộ (không phải chẩn đoán). Hội chẩn nhà trường–gia đình và định hướng chuyên môn phù hợp.",
    )


def get_radar_interpretation(score, category: str) -> str:
    sc = _safe_float(score, 1.0) or 1.0
    if sc < 2.0:
        return "Trong ngưỡng theo dõi thường"
    if sc < 3.0:
        return "Cần theo dõi thêm" if category == "attention" else "Có dấu hiệu nhẹ"
    return "Cần hỗ trợ có cấu trúc" if category == "attention" else "Khó khăn rõ — ưu tiên quan sát thêm"


def _register_fonts() -> Tuple[str, str, str]:
    candidates = [
        ("C:\\Windows\\Fonts\\arial.ttf", "C:\\Windows\\Fonts\\arialbd.ttf", "C:\\Windows\\Fonts\\ariali.ttf"),
        ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf"),
    ]
    for reg, bold, italic in candidates:
        if os.path.exists(reg):
            try:
                pdfmetrics.registerFont(TTFont("ZPD-Sans", reg))
                if os.path.exists(bold):
                    pdfmetrics.registerFont(TTFont("ZPD-Sans-Bold", bold))
                    fb = "ZPD-Sans-Bold"
                else:
                    fb = "ZPD-Sans"
                if os.path.exists(italic):
                    pdfmetrics.registerFont(TTFont("ZPD-Sans-Italic", italic))
                    fi = "ZPD-Sans-Italic"
                else:
                    fi = "ZPD-Sans"
                return "ZPD-Sans", fb, fi
            except Exception:
                continue
    return "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"


def _styles(font: str, font_bold: str, font_italic: str):
    base = getSampleStyleSheet()
    return {
        "cover_kicker": ParagraphStyle(
            "cover_kicker", parent=base["Normal"], fontName=font_bold, fontSize=8,
            textColor=RUST, alignment=TA_CENTER, letterSpacing=1.2, spaceAfter=4,
        ),
        "cover_title": ParagraphStyle(
            "cover_title", parent=base["Heading1"], fontName=font_bold, fontSize=18,
            textColor=NAVY, alignment=TA_CENTER, leading=22, spaceAfter=6,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub", parent=base["Normal"], fontName=font, fontSize=9.5,
            textColor=MUTED, alignment=TA_CENTER, leading=13, spaceAfter=14,
        ),
        "h1": ParagraphStyle(
            "h1", parent=base["Heading2"], fontName=font_bold, fontSize=11.5,
            textColor=NAVY, spaceBefore=14, spaceAfter=8, leading=14,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading3"], fontName=font_bold, fontSize=10.5,
            textColor=NAVY_MID, spaceBefore=10, spaceAfter=6, leading=13,
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"], fontName=font, fontSize=9.5,
            textColor=SLATE, leading=13.5, spaceAfter=4,
        ),
        "body_bold": ParagraphStyle(
            "body_bold", parent=base["Normal"], fontName=font_bold, fontSize=9.5,
            textColor=SLATE, leading=13.5, spaceAfter=4,
        ),
        "small": ParagraphStyle(
            "small", parent=base["Normal"], fontName=font, fontSize=8,
            textColor=MUTED, leading=11, spaceAfter=2,
        ),
        "small_bold": ParagraphStyle(
            "small_bold", parent=base["Normal"], fontName=font_bold, fontSize=8,
            textColor=SLATE, leading=11,
        ),
        "cell": ParagraphStyle(
            "cell", parent=base["Normal"], fontName=font, fontSize=9,
            textColor=SLATE, leading=12,
        ),
        "cell_b": ParagraphStyle(
            "cell_b", parent=base["Normal"], fontName=font_bold, fontSize=9,
            textColor=NAVY, leading=12,
        ),
        "bullet": ParagraphStyle(
            "bullet", parent=base["Normal"], fontName=font, fontSize=9.5,
            textColor=SLATE, leading=13, leftIndent=14, spaceAfter=3,
        ),
        "note": ParagraphStyle(
            "note", parent=base["Normal"], fontName=font, fontSize=8.5,
            textColor=colors.HexColor("#9a3412"), leading=12,
            backColor=CREAM, borderPadding=8, spaceBefore=6, spaceAfter=6,
        ),
        "disclaimer": ParagraphStyle(
            "disclaimer", parent=base["Normal"], fontName=font_italic, fontSize=8,
            textColor=MUTED, leading=11, alignment=TA_CENTER, spaceBefore=4,
        ),
        "footer": ParagraphStyle(
            "footer", parent=base["Normal"], fontName=font, fontSize=7.5,
            textColor=MUTED, alignment=TA_CENTER,
        ),
        "score_big": ParagraphStyle(
            "score_big", parent=base["Normal"], fontName=font_bold, fontSize=22,
            alignment=TA_CENTER, leading=26,
        ),
        "score_lbl": ParagraphStyle(
            "score_lbl", parent=base["Normal"], fontName=font_bold, fontSize=8,
            textColor=MUTED, alignment=TA_CENTER, leading=10,
        ),
    }


def _section_title(text: str, styles) -> KeepTogether:
    return KeepTogether([
        Paragraph(_esc(text), styles["h1"]),
        HRFlowable(width="100%", thickness=1.2, color=RUST, spaceBefore=0, spaceAfter=8),
    ])


def _kv_table(rows: List[List[Any]], col_widths: List[float]) -> Table:
    t = Table(rows, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eef2f7")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#eef2f7")),
    ]))
    return t


def _data_table(header: List[Any], body: List[List[Any]], col_widths: List[float]) -> Table:
    data = [header] + body
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "ZPD-Sans-Bold" if "ZPD-Sans-Bold" in pdfmetrics.getRegisteredFontNames() else "Helvetica-Bold"),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, BG]),
    ]
    t.setStyle(TableStyle(style_cmds))
    return t


def _make_header_footer(meta: Dict[str, str], font: str, font_bold: str):
    def _draw(canvas, doc):
        canvas.saveState()
        w, h = A4
        # Top brand bar
        canvas.setFillColor(NAVY)
        canvas.rect(0, h - 14 * mm, w, 14 * mm, fill=1, stroke=0)
        canvas.setFillColor(RUST)
        canvas.rect(0, h - 15.2 * mm, w, 1.2 * mm, fill=1, stroke=0)

        canvas.setFillColor(WHITE)
        canvas.setFont(font_bold, 9)
        canvas.drawString(14 * mm, h - 8.5 * mm, "ZPD Care")
        canvas.setFont(font, 7.5)
        canvas.setFillColor(colors.HexColor("#c4d0e0"))
        canvas.drawString(32 * mm, h - 8.5 * mm, "· Hồ sơ sàng lọc hành vi · Mầm non")
        canvas.setFillColor(CREAM)
        canvas.setFont(font, 7)
        canvas.drawRightString(w - 14 * mm, h - 8.5 * mm, meta.get("doc_id", ""))

        # Footer
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.6)
        canvas.line(14 * mm, 12 * mm, w - 14 * mm, 12 * mm)
        canvas.setFillColor(MUTED)
        canvas.setFont(font, 7)
        canvas.drawString(14 * mm, 7 * mm, "ZPD Care — Sàng lọc giáo dục · Không thay thế chẩn đoán y khoa")
        canvas.drawCentredString(w / 2, 7 * mm, meta.get("exported_at", ""))
        canvas.drawRightString(w - 14 * mm, 7 * mm, f"Trang {doc.page}")
        canvas.restoreState()

    return _draw


def _probe_label(p: dict) -> Tuple[str, colors.Color]:
    if p.get("is_demo"):
        return "DEMO", MUTED
    if p.get("status") == "Bỏ qua":
        return "Bỏ qua", MUTED
    rub = _safe_float(p.get("rubric_score"), None)
    if rub is None:
        rub = _safe_float(p.get("cars_mapped"), None)
    if rub is None:
        st = str(p.get("status") or "—")
        return st, SLATE
    r = int(round(rub))
    label = f"{r}/4"
    if r <= 1:
        return label, GREEN
    if r == 2:
        return label, AMBER
    if r == 3:
        return label, ORANGE
    return label, RED


def _log_counts(parsed: dict) -> bool:
    if not isinstance(parsed, dict):
        return False
    if parsed.get("analysis_failed"):
        return False
    if parsed.get("is_placeholder") or parsed.get("source") == "import_placeholder":
        return False
    if parsed.get("counts_toward_risk") is False:
        return False
    if parsed.get("teacher_confirmed") is False:
        return False
    if parsed.get("pending_confirmation") and not parsed.get("teacher_confirmed"):
        return False
    return True


def _callout_box(title: str, body: str, styles, border_color=RUST, bg=CREAM) -> Table:
    inner = [
        [Paragraph(f"<b>{_esc(title)}</b>", styles["body_bold"])],
        [Paragraph(_esc(body), styles["body"])],
    ]
    t = Table(inner, colWidths=[A4[0] - 28 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.8, border_color),
        ("LINEBEFORE", (0, 0), (0, -1), 3.5, border_color),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def _checklist_next_actions(score: float, risk: dict, has_probe: bool, has_ph: bool, has_log: bool) -> List[str]:
    """Checklist việc làm tiếp — dựa trên mức điểm + độ đầy đủ nguồn."""
    sc = _safe_float(score, 1.0) or 1.0
    acts = []
    if not has_log:
        acts.append("Ghi nhận ít nhất 1–2 quan sát có cấu trúc và bấm Xác nhận ghi hồ sơ (HITL).")
    if not has_ph:
        acts.append("Hoàn tất khảo sát phụ huynh (GV nhập hộ) để đủ nguồn PH 30%.")
    if not has_probe:
        acts.append("Chạy 1–2 module kiểm chứng catalog (ưu tiên trục còn thiếu) và chấm rubric 1–4.")
    if sc < 2.0:
        acts.extend([
            "Duy trì quan sát định kỳ (2–4 tuần/lần) trong sinh hoạt hàng ngày.",
            "Ghi nhận điểm mạnh của trẻ để làm điểm tựa scaffolding ZPD.",
        ])
    elif sc < 3.0:
        acts.extend([
            "Tăng tần suất quan sát ở bối cảnh trẻ khó (chuyển hoạt động, chơi nhóm).",
            "Thống nhất 1 mục tiêu ZPD nhỏ trong 2 tuần và ghi nhận lại sau can thiệp.",
            "Trao đổi ngắn với PH theo ngôn ngữ mô tả hành vi, tránh dán nhãn.",
        ])
    elif sc < 3.6:
        acts.extend([
            "Ưu tiên hội chẩn tổ chuyên môn / BGH trong tuần.",
            "Lập checklist hỗ trợ lớp (góc yên, thẻ hình, báo trước chuyển tiếp).",
            "Nếu dấu hiệu kéo dài sau 2–4 tuần hỗ trợ có cấu trúc: định hướng đánh giá chuyên môn ngoài (không thay chẩn đoán).",
        ])
    else:
        acts.extend([
            "Báo cáo nội bộ mức báo động theo dõi — không đồng nghĩa chẩn đoán.",
            "Đảm bảo an toàn cảm xúc–thể chất; giảm kích thích quá tải.",
            "Hẹn trao đổi PH + định hướng chuyên môn phù hợp trong thời gian sớm.",
        ])
    # unique keep order
    seen = set()
    out = []
    for a in acts:
        if a not in seen:
            seen.add(a)
            out.append(a)
    return out[:7]


def _extract_xai(parsed: dict) -> List[dict]:
    hl = parsed.get("xai_highlights") or []
    if not isinstance(hl, list):
        return []
    out = []
    for h in hl[:6]:
        if not isinstance(h, dict):
            continue
        kw = h.get("keyword") or h.get("text") or h.get("tu_khoa")
        if not kw:
            continue
        out.append({
            "keyword": str(kw)[:80],
            "weight": str(h.get("weight") or h.get("severity") or h.get("muc_do") or "—")[:40],
            "reason": str(h.get("reason") or h.get("ly_do") or "—")[:200],
        })
    return out


def generate_medical_report(student_data: dict, output_path: str, exported_by: Optional[str] = None):
    """
    Tạo PDF hồ sơ sàng lọc. Giữ tên hàm để tương thích import cũ.
    """
    font, font_bold, font_italic = _register_fonts()
    styles = _styles(font, font_bold, font_italic)

    info = student_data.get("student_info") or {}
    risk = student_data.get("risk_profile") or {}
    radar = student_data.get("radar_data") or {}
    zpd = student_data.get("zpd_recommendation") or {}
    probes = student_data.get("history_probes") or []
    logs = student_data.get("history_logs") or []
    pred = student_data.get("predictive_data")
    disclaimer = student_data.get("probe_disclaimer") or (
        "Hỗ trợ quan sát–sàng lọc sư phạm. Không tương đương ADOS-2, CARS-2 hay chẩn đoán y khoa."
    )

    sid = info.get("id", "—")
    name = info.get("name") or "Học sinh"
    now = datetime.now()
    doc_id = f"ZPD-HS{str(sid).zfill(3)}-{now.strftime('%Y%m%d')}"
    exported_at = now.strftime("%d/%m/%Y %H:%M")

    meta = {"doc_id": doc_id, "exported_at": exported_at}
    header_footer = _make_header_footer(meta, font, font_bold)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=20 * mm,
        bottomMargin=16 * mm,
        title=f"Hồ sơ sàng lọc ZPD — {name}",
        author="ZPD Care",
        subject="Sàng lọc hành vi giáo dục mầm non",
    )

    story: List[Any] = []
    page_w = A4[0] - 28 * mm

    # ========== COVER / TITLE ==========
    story.append(Paragraph("HỒ SƠ SÀNG LỌC HÀNH VI &amp; GỢI Ý ZPD", styles["cover_title"]))
    story.append(Paragraph(
        "Báo cáo chuyên môn nội bộ · ZPD Care · Giáo dục mầm non · <b>Không thay thế chẩn đoán y khoa</b>",
        styles["cover_sub"],
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=RUST, spaceBefore=0, spaceAfter=8))

    # Mục lục nhanh
    toc = Paragraph(
        "<b>Nội dung:</b> "
        "I. Học sinh · II. Chỉ số đa nguồn · III. Đa chiều · IV. Mô phỏng · "
        "V. ZPD · VI. Probe · VII. Quan sát &amp; XAI · VIII. Việc làm tiếp · "
        "IX. Phương pháp · X. Xác nhận",
        styles["small"],
    )
    story.append(toc)
    story.append(Spacer(1, 6))

    # ========== I. THÔNG TIN ==========
    story.append(_section_title("I. Thông tin học sinh &amp; phạm vi báo cáo", styles))
    dob = info.get("dob") or "—"
    gender = info.get("gender") or "—"
    cls = info.get("class_name") or "—"
    info_rows = [
        [
            Paragraph("Họ và tên", styles["small_bold"]),
            Paragraph(f"<b>{_esc(name)}</b>", styles["cell_b"]),
            Paragraph("Mã hồ sơ", styles["small_bold"]),
            Paragraph(f"HS-{str(sid).zfill(3)}", styles["cell"]),
        ],
        [
            Paragraph("Lớp", styles["small_bold"]),
            Paragraph(_esc(cls), styles["cell"]),
            Paragraph("Ngày sinh", styles["small_bold"]),
            Paragraph(_esc(str(dob)), styles["cell"]),
        ],
        [
            Paragraph("Giới tính", styles["small_bold"]),
            Paragraph(_esc(str(gender)), styles["cell"]),
            Paragraph("Ngày xuất", styles["small_bold"]),
            Paragraph(exported_at, styles["cell"]),
        ],
        [
            Paragraph("Người xuất", styles["small_bold"]),
            Paragraph(_esc(exported_by or "Giáo viên / chuyên viên"), styles["cell"]),
            Paragraph("Mã tài liệu", styles["small_bold"]),
            Paragraph(doc_id, styles["cell"]),
        ],
    ]
    story.append(_kv_table(info_rows, [28 * mm, 55 * mm, 30 * mm, page_w - 113 * mm]))
    story.append(Spacer(1, 6))
    story.append(_callout_box(
        "Phạm vi sử dụng",
        "Tài liệu phục vụ giáo viên / tổ chuyên môn theo dõi–hỗ trợ sư phạm. "
        "Không phải bệnh án, không phải kết quả test chuẩn hóa (CARS-2 / ADOS-2 / M-CHAT-R). "
        "Mọi điểm số là chỉ số sàng lọc nội bộ sau human-in-the-loop.",
        styles,
        border_color=NAVY_MID,
        bg=colors.HexColor("#eef2f7"),
    ))
    story.append(Spacer(1, 8))

    # ========== II. ĐIỂM SÀNG LỌC ==========
    story.append(_section_title("II. Chỉ số sàng lọc đa nguồn (CARS-like 1–4)", styles))
    score = _safe_float(risk.get("risk_score"), 1.0) or 1.0
    level_str, level_color, level_desc = get_risk_level_info(score)
    t_val = risk.get("avg_teacher_score")
    p_val = risk.get("avg_parent_score")
    k_val = risk.get("avg_probe_score")
    t_n = risk.get("teacher_n")
    p_n = risk.get("parent_n")
    k_n = risk.get("probe_n") or risk.get("probe_n_used")
    completeness = risk.get("sources_completeness")
    formula = risk.get("formula") or "R = 0.30·GV + 0.30·PH + 0.40·Probe (tái phân bổ nếu thiếu nguồn)"

    score_style = ParagraphStyle(
        "score_big_dyn", parent=styles["score_big"], textColor=level_color,
    )
    hero = Table(
        [[
            [
                Paragraph("ĐIỂM TỔNG HỢP", styles["score_lbl"]),
                Paragraph(f"{score:.2f}<font size='11'> / 4.0</font>", score_style),
                Paragraph(_esc(level_str), ParagraphStyle(
                    "lvl", parent=styles["small_bold"], textColor=level_color,
                    alignment=TA_CENTER, spaceBefore=4,
                )),
            ],
            [
                Paragraph("<b>Gợi ý sư phạm</b>", styles["body_bold"]),
                Paragraph(_esc(level_desc), styles["body"]),
                Paragraph(
                    f"<b>Độ đầy đủ nguồn:</b> {completeness if completeness is not None else '—'}% "
                    f"· <b>Red-flag:</b> {'Có' if risk.get('red_flag') else 'Không'}",
                    styles["small"],
                ),
                Paragraph(f"<i>{_esc(formula)}</i>", styles["small"]),
            ],
        ]],
        colWidths=[48 * mm, page_w - 48 * mm],
    )
    hero.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#fff7f2")),
        ("BACKGROUND", (1, 0), (1, 0), WHITE),
        ("BOX", (0, 0), (-1, -1), 1, RUST_SOFT),
        ("LINEBEFORE", (1, 0), (1, 0), 2.5, RUST),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(hero)
    story.append(Spacer(1, 8))

    # Sources table
    story.append(Paragraph("Phân rã 3 nguồn (tam giác hóa)", styles["h2"]))
    src_header = [
        Paragraph("<font color='white'><b>Nguồn</b></font>", styles["cell"]),
        Paragraph("<font color='white'><b>Trọng số</b></font>", styles["cell"]),
        Paragraph("<font color='white'><b>Điểm TB</b></font>", styles["cell"]),
        Paragraph("<font color='white'><b>Số phiên (n)</b></font>", styles["cell"]),
        Paragraph("<font color='white'><b>Trạng thái</b></font>", styles["cell"]),
    ]
    src_body = [
        [
            Paragraph("Giáo viên (nhật ký đã xác nhận)", styles["cell"]),
            Paragraph("30%", styles["cell"]),
            Paragraph(_fmt(t_val), styles["cell_b"]),
            Paragraph(str(t_n if t_n is not None else "—"), styles["cell"]),
            Paragraph("Có dữ liệu" if t_val is not None else "Chưa có", styles["cell"]),
        ],
        [
            Paragraph("Phụ huynh (khảo sát GV nhập)", styles["cell"]),
            Paragraph("30%", styles["cell"]),
            Paragraph(_fmt(p_val), styles["cell_b"]),
            Paragraph(str(p_n if p_n is not None else "—"), styles["cell"]),
            Paragraph("Có dữ liệu" if p_val is not None else "Chưa có", styles["cell"]),
        ],
        [
            Paragraph("Kiểm chứng (probe rubric 1–4)", styles["cell"]),
            Paragraph("40%", styles["cell"]),
            Paragraph(_fmt(k_val), styles["cell_b"]),
            Paragraph(str(k_n if k_n is not None else "—"), styles["cell"]),
            Paragraph("Có dữ liệu" if k_val is not None else "Chưa có / chỉ DEMO", styles["cell"]),
        ],
    ]
    story.append(_data_table(src_header, src_body, [62 * mm, 22 * mm, 24 * mm, 28 * mm, page_w - 136 * mm]))
    story.append(Paragraph(
        "Ghi chú: phiên probe DEMO/seed không tính vào điểm tổng. Chỉ quan sát đã xác nhận (HITL) mới vào nguồn GV.",
        styles["small"],
    ))

    # ========== III. RADAR ==========
    story.append(_section_title("III. Phân tích đa chiều (Giao tiếp · Hành vi · Chú ý)", styles))
    social = _safe_float(radar.get("social"), 1.0) or 1.0
    routine = _safe_float(radar.get("routine"), 1.0) or 1.0
    attention = _safe_float(radar.get("attention"), 1.0) or 1.0
    rsrc = radar.get("sources") or {}
    parent_ax = rsrc.get("parent") or {}
    probe_ax = rsrc.get("probe") or {}
    probe_cnt = rsrc.get("probe_counts") or {}

    rad_header = [
        Paragraph("<font color='white'><b>Miền</b></font>", styles["cell"]),
        Paragraph("<font color='white'><b>Điểm tổng hợp</b></font>", styles["cell"]),
        Paragraph("<font color='white'><b>Đánh giá</b></font>", styles["cell"]),
        Paragraph("<font color='white'><b>Probe (n)</b></font>", styles["cell"]),
        Paragraph("<font color='white'><b>PH</b></font>", styles["cell"]),
    ]
    rad_body = []
    for label, key, val in [
        ("Giao tiếp xã hội", "social", social),
        ("Hành vi / thói quen", "routine", routine),
        ("Tập trung / chú ý", "attention", attention),
    ]:
        rad_body.append([
            Paragraph(label, styles["cell_b"]),
            Paragraph(_fmt(val), styles["cell_b"]),
            Paragraph(get_radar_interpretation(val, key), styles["cell"]),
            Paragraph(
                f"{_fmt(probe_ax.get(key))} (n={probe_cnt.get(key, 0)})",
                styles["cell"],
            ),
            Paragraph(_fmt(parent_ax.get(key)), styles["cell"]),
        ])
    story.append(_data_table(rad_header, rad_body, [38 * mm, 28 * mm, 48 * mm, 32 * mm, page_w - 146 * mm]))
    story.append(Paragraph(
        _esc(rsrc.get("blend") or "Tổng hợp miền: ưu tiên probe khi có; kết hợp khảo sát PH."),
        styles["small"],
    ))

    # ========== IV. PREDICTIVE (list) ==========
    story.append(_section_title("IV. Xu hướng mô phỏng 6 tháng (minh họa)", styles))
    story.append(Paragraph(
        "Biểu đồ giả định có/không scaffolding ZPD — <b>không phải dự báo y khoa</b>, chỉ hỗ trợ trao đổi định hướng.",
        styles["body"],
    ))
    pred_rows = []
    if isinstance(pred, list) and pred:
        for row in pred:
            if not isinstance(row, dict):
                continue
            month = row.get("month") or "—"
            w0 = _safe_float(row.get("without_zpd"))
            w1 = _safe_float(row.get("with_zpd"))
            delta = None
            if w0 is not None and w1 is not None:
                delta = w1 - w0
            pred_rows.append([
                Paragraph(_esc(str(month)), styles["cell"]),
                Paragraph(_fmt(w0), styles["cell"]),
                Paragraph(_fmt(w1), styles["cell"]),
                Paragraph(_fmt(delta, 2) if delta is not None else "—", styles["cell"]),
            ])
    elif isinstance(pred, dict) and pred:
        # legacy shape
        for key, label in (("6_months", "6 tháng"), ("12_months", "12 tháng")):
            block = pred.get(key) or {}
            pred_rows.append([
                Paragraph(label, styles["cell"]),
                Paragraph(_esc(str(block.get("status", "—"))), styles["cell"]),
                Paragraph(_esc(str(block.get("description", "—"))), styles["cell"]),
                Paragraph("—", styles["cell"]),
            ])

    if pred_rows:
        ph = [
            Paragraph("<font color='white'><b>Thời điểm</b></font>", styles["cell"]),
            Paragraph("<font color='white'><b>Không can thiệp</b></font>", styles["cell"]),
            Paragraph("<font color='white'><b>Có scaffolding ZPD</b></font>", styles["cell"]),
            Paragraph("<font color='white'><b>Δ (ZPD − không)</b></font>", styles["cell"]),
        ]
        story.append(_data_table(ph, pred_rows, [36 * mm, 40 * mm, 48 * mm, page_w - 124 * mm]))
    else:
        story.append(Paragraph("<i>Chưa có dữ liệu mô phỏng.</i>", styles["small"]))

    # ========== V. ZPD ==========
    story.append(_section_title("V. Gợi ý can thiệp ZPD (scaffolding)", styles))
    story.append(Paragraph(
        "Gợi ý evidence-informed theo vùng phát triển gần (Vygotsky). "
        "Không tương đương phác đồ lâm sàng có license (TEACCH/ESDM… chỉ mang tính tham chiếu giáo dục).",
        styles["body"],
    ))

    def _render_zpd_block(title: str, block: Any, accent: colors.Color):
        elems = []
        title_style = ParagraphStyle(
            f"zpd_{title}", parent=styles["h2"], textColor=accent,
        )
        elems.append(Paragraph(_esc(title), title_style))
        if not block:
            elems.append(Paragraph("<i>Chưa có gợi ý cho nhóm này.</i>", styles["small"]))
            return elems
        if isinstance(block, str):
            elems.append(Paragraph(_esc(block), styles["body"]))
            return elems
        if not isinstance(block, dict):
            elems.append(Paragraph(_esc(str(block)), styles["body"]))
            return elems
        if block.get("phac_do_tham_chieu"):
            elems.append(Paragraph(
                f"<b>Khung tham chiếu:</b> {_esc(block.get('phac_do_tham_chieu'))}",
                styles["body"],
            ))
        if block.get("muc_tieu"):
            elems.append(Paragraph(
                f"<b>Mục tiêu ZPD:</b> {_esc(block.get('muc_tieu'))}",
                styles["body"],
            ))
        acts = block.get("hanh_dong") or []
        if isinstance(acts, list) and acts:
            elems.append(Paragraph("<b>Hành động gợi ý:</b>", styles["body_bold"]))
            for i, act in enumerate(acts, 1):
                elems.append(Paragraph(f"{i}. {_esc(act)}", styles["bullet"]))
        if block.get("luu_y"):
            elems.append(Paragraph(
                f"<b>Lưu ý an toàn sư phạm:</b> {_esc(block.get('luu_y'))}",
                styles["note"],
            ))
        return elems

    if isinstance(zpd, dict) and (zpd.get("cho_nha_truong") or zpd.get("cho_gia_dinh")):
        for el in _render_zpd_block("1. Dành cho nhà trường (giáo viên)", zpd.get("cho_nha_truong"), NAVY_MID):
            story.append(el)
        story.append(Spacer(1, 4))
        for el in _render_zpd_block("2. Dành cho gia đình (phụ huynh)", zpd.get("cho_gia_dinh"), GREEN):
            story.append(el)
    else:
        story.append(Paragraph(
            "<i>Chưa đủ quan sát đã xác nhận để sinh gợi ý ZPD chi tiết. "
            "Hãy hoàn tất nhật ký + xác nhận hồ sơ.</i>",
            styles["body"],
        ))

    # ========== VI. PROBES ==========
    story.append(_section_title("VI. Lịch sử kiểm chứng tại lớp (probes)", styles))
    real_probes = [p for p in probes if isinstance(p, dict)]
    if real_probes:
        story.append(Paragraph(
            f"Tổng phiên ghi nhận: <b>{len(real_probes)}</b> "
            f"(hiển thị tối đa 10 gần nhất). Rubric 1–4 do giáo viên chấm; DEMO không tính risk.",
            styles["small"],
        ))
        ph = [
            Paragraph("<font color='white'><b>Ngày</b></font>", styles["cell"]),
            Paragraph("<font color='white'><b>Mã</b></font>", styles["cell"]),
            Paragraph("<font color='white'><b>Module kiểm chứng</b></font>", styles["cell"]),
            Paragraph("<font color='white'><b>Trục</b></font>", styles["cell"]),
            Paragraph("<font color='white'><b>Rubric</b></font>", styles["cell"]),
            Paragraph("<font color='white'><b>Ghi chú / người chấm</b></font>", styles["cell"]),
        ]
        pb = []
        for p in real_probes[:10]:
            label, col = _probe_label(p)
            code = p.get("module_code") or (p.get("module_id") or "—")[:8]
            name_p = p.get("module_name") or p.get("category") or "—"
            axis = p.get("axis_label") or p.get("category") or "—"
            notes = (p.get("teacher_notes") or "")[:100]
            by = p.get("scored_by") or ""
            if p.get("is_demo"):
                notes = ("DEMO · " + notes).strip(" ·")
            elif by:
                notes = (notes + f" · {by}").strip(" ·")
            st_style = ParagraphStyle(
                f"pr_{id(p)}", parent=styles["cell_b"], textColor=col,
            )
            pb.append([
                Paragraph(_esc(str(p.get("date") or "—")), styles["cell"]),
                Paragraph(_esc(str(code)), styles["small_bold"]),
                Paragraph(_esc(str(name_p)), styles["cell"]),
                Paragraph(_esc(str(axis)), styles["cell"]),
                Paragraph(_esc(label), st_style),
                Paragraph(_esc(notes or "—"), styles["small"]),
            ])
        story.append(_data_table(
            ph, pb,
            [20 * mm, 18 * mm, 42 * mm, 28 * mm, 18 * mm, page_w - 126 * mm],
        ))
        # Tóm tắt phân bố rubric (không demo)
        real_scored = [
            p for p in real_probes
            if p.get("scored") and not p.get("is_demo")
            and (_safe_float(p.get("rubric_score")) is not None or _safe_float(p.get("cars_mapped")) is not None)
        ]
        if real_scored:
            vals = []
            for p in real_scored:
                v = _safe_float(p.get("rubric_score"))
                if v is None:
                    v = _safe_float(p.get("cars_mapped"))
                if v is not None:
                    vals.append(v)
            if vals:
                avg_r = sum(vals) / len(vals)
                high = sum(1 for v in vals if v >= 3)
                story.append(Paragraph(
                    f"Probe thật: n={len(vals)} · TB rubric={avg_r:.2f} · số phiên ≥3: {high}.",
                    styles["body"],
                ))
        demo_n = sum(1 for p in real_probes if p.get("is_demo"))
        if demo_n:
            story.append(Paragraph(
                f"Có {demo_n} phiên đánh dấu DEMO — không dùng làm bằng chứng đánh giá chính thức / không vào risk.",
                styles["note"],
            ))
    else:
        story.append(Paragraph("<i>Chưa có phiên kiểm chứng đã ghi nhận.</i>", styles["small"]))

    # ========== VII. OBSERVATION + XAI (chi tiết) ==========
    story.append(_section_title("VII. Nhật ký quan sát &amp; căn cứ XAI (đã xác nhận)", styles))
    conf_logs = []
    for log in logs:
        if not isinstance(log, dict):
            continue
        parsed = log.get("parsed_json")
        if isinstance(parsed, str):
            try:
                import json as _json
                parsed = _json.loads(parsed)
            except Exception:
                parsed = None
        if not _log_counts(parsed or {}):
            continue
        conf_logs.append((log, parsed or {}))

    if conf_logs:
        story.append(Paragraph(
            f"Số quan sát đã xác nhận hiển thị: <b>{min(len(conf_logs), 4)}</b> / {len(conf_logs)} "
            "(bản nháp AI và placeholder import không đưa vào báo cáo).",
            styles["small"],
        ))
        for idx, (log, parsed) in enumerate(conf_logs[:4], 1):
            sc = _safe_float(parsed.get("diem_nguy_co"))
            skill = parsed.get("nhom_ky_nang") or "—"
            conf = parsed.get("xai_confidence") or "—"
            ref = parsed.get("ma_chuan_y_khoa") or "—"
            why = parsed.get("diem_nguy_co_giai_thich") or ""
            raw = log.get("raw_text") or parsed.get("hanh_vi_goc") or ""
            story.append(Paragraph(
                f"<b>Quan sát #{idx}</b> · {_esc(str(log.get('date') or '—'))} · "
                f"Mức gợi ý AI: <b>{_fmt(sc, 1)}/4</b> · Nhóm: {_esc(str(skill))} · "
                f"Tin cậy AI: {_esc(str(conf))}",
                styles["body_bold"],
            ))
            story.append(Paragraph(f"<b>Nội dung quan sát:</b> {_esc(raw[:900])}", styles["body"]))
            if ref and str(ref) not in ("—",):
                story.append(Paragraph(
                    f"<b>Tham chiếu khung (giáo dục):</b> {_esc(str(ref)[:400])}",
                    styles["body"],
                ))
            if why:
                story.append(Paragraph(
                    f"<b>Diễn giải mức điểm:</b> {_esc(str(why)[:500])}",
                    styles["body"],
                ))
            xai = _extract_xai(parsed)
            if xai:
                story.append(Paragraph("<b>Căn cứ XAI (từ khóa trong ghi chú):</b>", styles["body_bold"]))
                xh = [
                    Paragraph("<font color='white'><b>Từ khóa</b></font>", styles["cell"]),
                    Paragraph("<font color='white'><b>Mức</b></font>", styles["cell"]),
                    Paragraph("<font color='white'><b>Lý do quan sát</b></font>", styles["cell"]),
                ]
                xb = []
                for h in xai:
                    xb.append([
                        Paragraph(f"“{_esc(h['keyword'])}”", styles["cell_b"]),
                        Paragraph(_esc(h["weight"]), styles["cell"]),
                        Paragraph(_esc(h["reason"]), styles["cell"]),
                    ])
                story.append(_data_table(xh, xb, [42 * mm, 28 * mm, page_w - 70 * mm]))
            story.append(Spacer(1, 6))
    else:
        story.append(Paragraph(
            "<i>Chưa có nhật ký quan sát đã xác nhận (HITL). Bản nháp AI không hiển thị tại đây.</i>",
            styles["small"],
        ))

    # ========== VIII. CHECKLIST VIỆC LÀM TIẾP ==========
    story.append(_section_title("VIII. Kế hoạch hành động đề xuất (checklist)", styles))
    has_probe_real = any(
        isinstance(p, dict) and p.get("scored") and not p.get("is_demo")
        for p in (probes or [])
    )
    has_ph = risk.get("avg_parent_score") is not None
    has_log = bool(conf_logs)
    next_acts = _checklist_next_actions(score, risk, has_probe_real, has_ph, has_log)
    story.append(Paragraph(
        "Danh mục việc làm <b>ưu tiên trong 2–4 tuần tới</b>, suy ra từ mức điểm và độ đầy đủ nguồn. "
        "Giáo viên điều chỉnh theo ngữ cảnh lớp.",
        styles["body"],
    ))
    for i, act in enumerate(next_acts, 1):
        story.append(Paragraph(f"☐ &nbsp; <b>{i}.</b> {_esc(act)}", styles["bullet"]))

    # Completeness matrix
    story.append(Spacer(1, 6))
    story.append(Paragraph("Ma trận đầy đủ dữ liệu hồ sơ", styles["h2"]))
    cm_h = [
        Paragraph("<font color='white'><b>Hạng mục</b></font>", styles["cell"]),
        Paragraph("<font color='white'><b>Trạng thái</b></font>", styles["cell"]),
        Paragraph("<font color='white'><b>Ghi chú</b></font>", styles["cell"]),
    ]
    cm_b = [
        [
            Paragraph("Nhật ký GV (đã xác nhận)", styles["cell"]),
            Paragraph("Đủ" if has_log else "Thiếu", styles["cell_b"]),
            Paragraph(f"n={risk.get('teacher_n') or 0}", styles["cell"]),
        ],
        [
            Paragraph("Khảo sát PH", styles["cell"]),
            Paragraph("Đủ" if has_ph else "Thiếu", styles["cell_b"]),
            Paragraph(f"n={risk.get('parent_n') or 0} · 30% tổng", styles["cell"]),
        ],
        [
            Paragraph("Probe đã chấm (không DEMO)", styles["cell"]),
            Paragraph("Đủ" if has_probe_real else "Thiếu / chỉ DEMO", styles["cell_b"]),
            Paragraph(f"n={risk.get('probe_n') or 0} · 40% tổng", styles["cell"]),
        ],
        [
            Paragraph("Gợi ý ZPD", styles["cell"]),
            Paragraph(
                "Có" if isinstance(zpd, dict) and (zpd.get("cho_nha_truong") or zpd.get("cho_gia_dinh")) else "Chưa có",
                styles["cell_b"],
            ),
            Paragraph("Sinh từ quan sát đã xác nhận / AI hỗ trợ", styles["cell"]),
        ],
    ]
    story.append(_data_table(cm_h, cm_b, [55 * mm, 35 * mm, page_w - 90 * mm]))

    # ========== IX. PHƯƠNG PHÁP ==========
    story.append(PageBreak())
    story.append(_section_title("IX. Phương pháp &amp; cơ sở khoa học (minh bạch)", styles))
    sci = (
        student_data.get("scientific_explanations")
        or risk.get("scientific_explanations")
        or {}
    )
    story.append(Paragraph("<b>1. Tam giác hóa nguồn</b>", styles["body_bold"]))
    story.append(Paragraph(
        _esc(sci.get("triangulation_method") or (
            "Chiếu chéo 3 nguồn độc lập: GV (nhật ký đã xác nhận) 30%, "
            "PH (khảo sát nhập bởi GV) 30%, Probe (rubric catalog 1–4) 40%. "
            "Thiếu nguồn thì tái phân bổ trọng số. Red-flag chỉ khi đủ điều kiện AND."
        )),
        styles["body"],
    ))
    story.append(Paragraph("<b>2. Thang điểm CARS-like nội bộ</b>", styles["body_bold"]))
    story.append(Paragraph(
        _esc(sci.get("cars_scale_meaning") or level_desc),
        styles["body"],
    ))
    story.append(Paragraph(
        "Lưu ý: thang 1–4 là <b>CARS-like nội bộ</b> phục vụ sàng lọc giáo dục — "
        "không phải điểm CARS-2 chuẩn hóa, không phải kết quả ADOS-2.",
        styles["body"],
    ))
    axes = sci.get("dsm5_radar_axes") or {}
    if isinstance(axes, dict) and axes:
        story.append(Paragraph("<b>3. Ba trục quan sát (ngôn ngữ tham chiếu giáo dục)</b>", styles["body_bold"]))
        for k, label in (("social", "Giao tiếp"), ("routine", "Hành vi/thói quen"), ("attention", "Tập trung")):
            if axes.get(k):
                story.append(Paragraph(f"• <b>{label}:</b> {_esc(str(axes.get(k)))}", styles["bullet"]))
    story.append(Paragraph("<b>4. Human-in-the-loop</b>", styles["body_bold"]))
    story.append(Paragraph(
        "AI (văn bản/media) chỉ tạo bản nháp. Giáo viên đọc/sửa và xác nhận trước khi tính điểm. "
        "Game kiểm chứng chỉ gợi ý mức rubric; điểm chính thức do GV chấm 1–4.",
        styles["body"],
    ))
    story.append(Paragraph("<b>5. Xu hướng 6 tháng</b>", styles["body_bold"]))
    story.append(Paragraph(
        "Đường mô phỏng có/không scaffolding ZPD mang tính minh họa định hướng, "
        "không phải dự báo nhân quả lâm sàng hay cam kết kết quả can thiệp.",
        styles["body"],
    ))
    if sci.get("disclaimer"):
        story.append(Paragraph(_esc(str(sci.get("disclaimer"))), styles["note"]))

    # ========== X. CHỮ KÝ ==========
    story.append(_section_title("X. Xác nhận chuyên môn", styles))
    story.append(Paragraph(
        "Tôi xác nhận đã rà soát các nguồn dữ liệu trong báo cáo (quan sát đã xác nhận, "
        "khảo sát PH nếu có, kiểm chứng rubric) và sử dụng kết quả ở mức <b>hỗ trợ quyết định sư phạm</b>, "
        "không thay thế đánh giá y khoa.",
        styles["body"],
    ))
    story.append(Spacer(1, 10))
    sig = Table(
        [[
            [
                Paragraph("<b>Giáo viên phụ trách</b>", styles["body_bold"]),
                Paragraph(_esc(exported_by or "………………………………"), styles["body"]),
                Spacer(1, 16),
                Paragraph("Ký và ghi rõ họ tên:", styles["small"]),
                Spacer(1, 22),
                Paragraph("…………………………………………", styles["small"]),
                Paragraph(f"Ngày: {now.strftime('%d/%m/%Y')}", styles["small"]),
            ],
            [
                Paragraph("<b>Tổ chuyên môn / BGH (nếu có)</b>", styles["body_bold"]),
                Paragraph("Họ tên: ………………………………", styles["body"]),
                Spacer(1, 16),
                Paragraph("Ký và đóng dấu (nếu áp dụng):", styles["small"]),
                Spacer(1, 22),
                Paragraph("…………………………………………", styles["small"]),
                Paragraph("Ngày: …………… / …………… / ……………", styles["small"]),
            ],
        ]],
        colWidths=[page_w / 2 - 3 * mm, page_w / 2 - 3 * mm],
    )
    sig.setStyle(TableStyle([
        ("BOX", (0, 0), (0, 0), 0.7, LINE),
        ("BOX", (1, 0), (1, 0), 0.7, LINE),
        ("BACKGROUND", (0, 0), (-1, -1), BG),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (0, 0), 8),
        ("LEFTPADDING", (1, 0), (1, 0), 8),
    ]))
    story.append(sig)

    # ========== DISCLAIMER ==========
    story.append(Spacer(1, 14))
    story.append(HRFlowable(width="100%", thickness=1.2, color=RUST, spaceBefore=4, spaceAfter=8))
    story.append(Paragraph("Cam kết &amp; giới hạn sử dụng", styles["h2"]))
    story.append(Paragraph(_esc(disclaimer), styles["body"]))
    story.append(Paragraph(
        "Tài liệu này hỗ trợ giáo viên theo dõi–can thiệp sư phạm trong nhà trường. "
        "Không phải bệnh án, không phải kết quả CARS-2/ADOS-2/M-CHAT-R chuẩn hóa, "
        "không thay thế đánh giá của bác sĩ hoặc chuyên gia tâm lý lâm sàng. "
        "Quyết định chuyên môn thuộc về con người (human-in-the-loop).",
        styles["disclaimer"],
    ))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        f"© ZPD Care · {doc_id} · Xuất lúc {exported_at} · Bản chi tiết chuyên môn",
        styles["footer"],
    ))

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)


# Alias rõ nghĩa
generate_screening_report = generate_medical_report
