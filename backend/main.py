from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Request
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
import json
import os
import uuid
import time
import re

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from database import SessionLocal, Student, TeacherBehaviorLog, ProactiveProbe, ParentSurvey, User, init_db
from ai_analyzer import analyze_behavior_log, calculate_final_risk, generate_predictive_trajectory, chat_with_medical_ai, analyze_multimodal_log
from pdf_generator import generate_medical_report
from auth import (
    create_access_token,
    verify_password,
    get_current_user,
    require_roles,
    assert_student_access,
    AUTH_DISABLED,
)
from probe_catalog import catalog_payload, get_module, rubric_to_cars, DISCLAIMER as PROBE_DISCLAIMER
import datetime as dt

app = FastAPI(title="ZPD Care API", version="1.2.0")

@app.on_event("startup")
def on_startup():
    init_db()
    try:
        from bootstrap import bootstrap
        info = bootstrap()
        print(f"[ZPD] bootstrap ok students={info.get('students')} users={info.get('users')}")
    except Exception as e:
        print(f"[ZPD] bootstrap note: {e}")

# CORS: mặc định localhost Next; production set ALLOWED_ORIGINS=...
# Hỗ trợ: * | list | *.vercel.app (suffix match via allow_origin_regex)
_cors_raw = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001",
).strip()
ALLOW_ORIGINS = ["*"] if _cors_raw == "*" else [o.strip() for o in _cors_raw.split(",") if o.strip()]
if not ALLOW_ORIGINS:
    ALLOW_ORIGINS = ["http://localhost:3000"]

# Cho phép mọi preview/production Vercel + list tường minh
_cors_regex = os.environ.get(
    "ALLOWED_ORIGIN_REGEX",
    r"https://.*\.vercel\.app",
).strip() or None

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOW_ORIGINS if "*" not in ALLOW_ORIGINS else ["*"],
    allow_origin_regex=None if "*" in ALLOW_ORIGINS else _cors_regex,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_MB", "25")) * 1024 * 1024
ALLOWED_UPLOAD_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".mp4", ".webm", ".mov", ".avi", ".mkv"}

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class BehaviorLogRequest(BaseModel):
    student_id: int
    raw_text: str = Field(..., max_length=5000)

class ProbeStatusUpdate(BaseModel):
    result_status: str
    # Scientific scoring (optional; preferred over binary)
    rubric_score: Optional[int] = Field(None, ge=1, le=4)
    teacher_notes: Optional[str] = Field(None, max_length=2000)
    telemetry: Optional[Dict[str, Any]] = None  # reaction_ms, errors, practice_rounds, etc.
    scored: Optional[bool] = True

class AssignProbeRequest(BaseModel):
    student_id: int
    module_id: str = Field(..., min_length=2, max_length=64)

class SurveyRequest(BaseModel):
    student_id: int
    answers: Dict[str, int]
    questions: Optional[List[Dict[str, Any]]] = None

class ChatRequest(BaseModel):
    student_id: int
    message: str = Field(..., min_length=1, max_length=1500)
    history: Optional[List[Dict[str, str]]] = None  # [{role, text}] tối đa ~8 lượt

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1, max_length=128)

def _serialize_probe(p) -> Dict[str, Any]:
    telem = None
    if getattr(p, "telemetry_json", None):
        try:
            telem = json.loads(p.telemetry_json)
        except (json.JSONDecodeError, TypeError, ValueError):
            telem = None
    module = get_module(p.module_id) if getattr(p, "module_id", None) else None
    scored_by = getattr(p, "scored_by", None)
    is_demo = bool(scored_by and str(scored_by).lower() in ("seed", "demo", "system-seed"))
    return {
        "id": p.id,
        "date": p.date.strftime("%Y-%m-%d") if hasattr(p.date, "strftime") else p.date,
        "category": p.test_category,
        "scenario": p.generated_scenario,
        "status": p.result_status,
        "module_id": getattr(p, "module_id", None),
        "module_name": module["name"] if module else None,
        "module_code": module["code"] if module else None,
        "axis": module["axis"] if module else None,
        "axis_label": module["axis_label"] if module else p.test_category,
        "game_type": module["game_type"] if module else None,
        "has_game": bool(module and module.get("game_type") and module.get("game_type") != "none"),
        "rubric_score": getattr(p, "rubric_score", None),
        "cars_mapped": getattr(p, "cars_mapped", None),
        "scored": bool(getattr(p, "scored", 0)),
        "telemetry": telem,
        "teacher_notes": getattr(p, "teacher_notes", None),
        "scored_by": scored_by,
        "scored_at": p.scored_at.isoformat() + "Z" if getattr(p, "scored_at", None) else None,
        "is_demo": is_demo,
    }


@app.get("/api/probe-catalog")
def get_probe_catalog(age: Optional[int] = None, user: Dict[str, Any] = Depends(require_roles("expert", "admin"))):
    return catalog_payload(age)


def _module_scenario_json(mod: Dict[str, Any]) -> str:
    return json.dumps({
        "module_id": mod["id"],
        "code": mod["code"],
        "ten_bai_tap": mod["name"],
        "muc_dich": mod["purpose"],
        "chuan_bi": ", ".join(mod.get("materials") or []),
        "cac_buoc": mod.get("steps") or [],
        "tieu_chi_dat": mod.get("pass_hint"),
        "tieu_chi_khong_dat": mod.get("fail_hint"),
        "rubric": mod.get("rubric"),
        "scientific_basis": mod.get("scientific_basis"),
        "game_type": mod.get("game_type"),
        "axis": mod.get("axis"),
        "axis_label": mod.get("axis_label"),
        "disclaimer": PROBE_DISCLAIMER,
    }, ensure_ascii=False)


def _archive_legacy_open_probes(db, student_id: int) -> int:
    """Đóng probe AI/legacy không thuộc catalog 7 module (gọi từ POST ensure, không từ GET)."""
    from probe_catalog import MODULES
    valid_ids = {m["id"] for m in MODULES}
    legacy_open = db.query(ProactiveProbe).filter(
        ProactiveProbe.student_id == student_id,
        ProactiveProbe.result_status == "Chờ kiểm tra",
    ).all()
    n = 0
    for row in legacy_open:
        mid = getattr(row, "module_id", None)
        if mid and mid in valid_ids:
            continue
        row.result_status = "Bỏ qua"
        row.scored = 0
        if not row.teacher_notes:
            row.teacher_notes = "Auto-archive: không thuộc catalog 7 module chuẩn."
        n += 1
    return n


def _ensure_student_catalog_probes(db, student_id: int) -> int:
    """
    Mỗi HS có đủ 7 module catalog ở trạng thái chờ (nếu chưa có phiên mở).
    Đồng bộ scenario từ catalog. CHỈ gọi từ POST — không side-effect trên GET.
    """
    from probe_catalog import MODULES
    archived = _archive_legacy_open_probes(db, student_id)
    created = 0
    synced = 0
    for mod in MODULES:
        open_row = db.query(ProactiveProbe).filter(
            ProactiveProbe.student_id == student_id,
            ProactiveProbe.module_id == mod["id"],
            ProactiveProbe.result_status == "Chờ kiểm tra",
        ).first()
        fresh = _module_scenario_json(mod)
        if open_row:
            if open_row.generated_scenario != fresh or open_row.test_category != mod["axis_label"]:
                open_row.generated_scenario = fresh
                open_row.test_category = mod["axis_label"]
                synced += 1
            continue
        db.add(ProactiveProbe(
            student_id=student_id,
            generated_scenario=fresh,
            test_category=mod["axis_label"],
            result_status="Chờ kiểm tra",
            module_id=mod["id"],
            scored=0,
        ))
        created += 1
    if created or synced or archived:
        db.commit()
    return created


@app.post("/api/probes/assign")
def assign_probe(req: AssignProbeRequest, user: Dict[str, Any] = Depends(require_roles("expert", "admin"))):
    """Gán thêm 1 module (tuỳ chọn). Mặc định dashboard đã tự mở đủ catalog."""
    assert_student_access(user, req.student_id)
    mod = get_module(req.module_id)
    if not mod:
        raise HTTPException(status_code=404, detail="Module không tồn tại trong catalog")
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == req.student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        dup = db.query(ProactiveProbe).filter(
            ProactiveProbe.student_id == req.student_id,
            ProactiveProbe.module_id == mod["id"],
            ProactiveProbe.result_status == "Chờ kiểm tra",
        ).first()
        if dup:
            return {"message": "Module đã sẵn sàng", "probe": _serialize_probe(dup), "already_open": True}
        probe = ProactiveProbe(
            student_id=req.student_id,
            generated_scenario=_module_scenario_json(mod),
            test_category=mod["axis_label"],
            result_status="Chờ kiểm tra",
            module_id=mod["id"],
            scored=0,
        )
        db.add(probe)
        db.commit()
        db.refresh(probe)
        return {"message": "Đã mở module", "probe": _serialize_probe(probe)}
    finally:
        db.close()


@app.post("/api/students/{student_id}/ensure-probes")
def ensure_probes(student_id: int, user: Dict[str, Any] = Depends(require_roles("expert", "admin"))):
    """Mở đủ 7 module catalog + archive legacy (idempotent). Gọi khi mở hồ sơ HS."""
    assert_student_access(user, student_id)
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        n = _ensure_student_catalog_probes(db, student_id)
        from probe_catalog import MODULES as _CAT
        valid = {m["id"] for m in _CAT}
        pending = db.query(ProactiveProbe).filter(
            ProactiveProbe.student_id == student_id,
            ProactiveProbe.result_status == "Chờ kiểm tra",
            ProactiveProbe.module_id.in_(list(valid)),
        ).all()
        return {
            "message": f"Sẵn sàng {len(pending)} module",
            "created": n,
            "pending_count": len(pending),
        }
    finally:
        db.close()


@app.get("/api/health")
def health_check():
        return {
            "status": "ok",
            "service": "ZPD Care API",
            "version": "2.0.0-scientific-probes",
            "auth_disabled": AUTH_DISABLED,
        "disclaimer": "Hệ thống hỗ trợ sàng lọc hành vi giáo dục, không thay thế chẩn đoán y khoa."
    }

# Rate-limit login đơn giản (in-memory): tối đa 8 lần / 5 phút / IP+username
_login_attempts: Dict[str, list] = {}
_LOGIN_WINDOW_SEC = 300
_LOGIN_MAX_ATTEMPTS = 8


def _login_rate_key(username: str, client_ip: str) -> str:
    return f"{client_ip}|{(username or '').strip().lower()}"


def _check_login_rate(username: str, client_ip: str) -> None:
    key = _login_rate_key(username, client_ip)
    now = time.time()
    bucket = [t for t in _login_attempts.get(key, []) if now - t < _LOGIN_WINDOW_SEC]
    _login_attempts[key] = bucket
    if len(bucket) >= _LOGIN_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Quá nhiều lần đăng nhập sai. Thử lại sau vài phút.",
        )


def _record_login_fail(username: str, client_ip: str) -> None:
    key = _login_rate_key(username, client_ip)
    bucket = _login_attempts.get(key, [])
    bucket.append(time.time())
    _login_attempts[key] = bucket


def _clear_login_fail(username: str, client_ip: str) -> None:
    key = _login_rate_key(username, client_ip)
    _login_attempts.pop(key, None)


@app.post("/api/auth/login")
def login(req: LoginRequest, request: Request):
    client_ip = (request.client.host if request.client else "unknown") or "unknown"
    _check_login_rate(req.username, client_ip)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == req.username.strip()).first()
        if not user or not user.is_active or not verify_password(req.password, user.password_hash):
            _record_login_fail(req.username, client_ip)
            raise HTTPException(status_code=401, detail="Sai tên đăng nhập hoặc mật khẩu")
        _clear_login_fail(req.username, client_ip)
        token = create_access_token({
            "sub": user.username,
            "role": user.role,
            "full_name": user.full_name,
            "student_id": user.student_id,
            "uid": user.id,
        })
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "username": user.username,
                "full_name": user.full_name,
                "role": user.role,
                "student_id": user.student_id,
            }
        }
    finally:
        db.close()

@app.get("/api/auth/me")
def auth_me(user: Dict[str, Any] = Depends(get_current_user)):
    return {"user": user}

@app.get("/api/students")
def get_students(user: Dict[str, Any] = Depends(get_current_user)):
    db = SessionLocal()
    try:
        if user.get("role") == "parent" and not user.get("auth_disabled"):
            sid = user.get("student_id")
            if not sid:
                return []
            students = db.query(Student).filter(Student.id == sid).all()
        else:
            students = db.query(Student).all()
        return [{
            "id": s.id,
            "name": s.name,
            "class_name": s.class_name,
            "dob": s.dob,
            "gender": s.gender,
            "cached_risk_score": s.cached_risk_score,
            "cached_risk_status": s.cached_risk_status,
            "cached_risk_color": s.cached_risk_color,
        } for s in students]
    finally:
        db.close()

@app.get("/api/school-dashboard")
def get_school_dashboard(
    refresh: bool = False,
    user: Dict[str, Any] = Depends(require_roles("expert", "admin")),
):
    """
    Phân bố rủi ro toàn trường.
    ?refresh=1 → tính lại toàn bộ (sau đổi thuật toán / seed).
    Mặc định dùng cache; thiếu cache thì tính từng HS.
    """
    db = SessionLocal()
    try:
        students = db.query(Student).all()
        total_students = len(students)

        levels_count = {
            "Level 1 (An Toàn)": 0,
            "Level 2 (Theo dõi)": 0,
            "Level 3 (Đáng kể)": 0,
            "Level 4 (Báo động)": 0,
        }
        alerts = []
        recomputed = 0

        for s in students:
            score = s.cached_risk_score
            status = s.cached_risk_status
            if refresh or score is None:
                profile = calculate_final_risk(s.id)
                score = profile["risk_score"]
                status = profile.get("status")
                recomputed += 1
                # refresh object after commit inside calculate_final_risk
                db.refresh(s)
                score = s.cached_risk_score if s.cached_risk_score is not None else score
                status = s.cached_risk_status or status

            if score is None:
                score = 1.0
            if score < 2.0:
                levels_count["Level 1 (An Toàn)"] += 1
            elif 2.0 <= score <= 2.9:
                levels_count["Level 2 (Theo dõi)"] += 1
            elif 3.0 <= score <= 3.6:
                levels_count["Level 3 (Đáng kể)"] += 1
            else:
                levels_count["Level 4 (Báo động)"] += 1
                alerts.append({
                    "student_id": s.id,
                    "name": s.name,
                    "class_name": s.class_name,
                    "score": score,
                    "status": status,
                })

        return {
            "total_students": total_students,
            "levels_count": levels_count,
            "alerts": alerts,
            "from_cache": not refresh and recomputed == 0,
            "recomputed": recomputed,
        }
    finally:
        db.close()

def _build_student_dashboard(student_id: int):
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        risk_profile = calculate_final_risk(student_id)
        
        # Radar: ưu tiên trục từ probe đã chấm; fallback / blend khảo sát PH
        surveys = db.query(ParentSurvey).filter(ParentSurvey.student_id == student_id).order_by(ParentSurvey.id.desc()).first()
        parent_axes = {
            "social": float(surveys.social_score) if surveys and surveys.social_score is not None else None,
            "routine": float(surveys.routine_score) if surveys and surveys.routine_score is not None else None,
            "attention": float(surveys.attention_score) if surveys and surveys.attention_score is not None else None,
        }
        probe_axes = (risk_profile or {}).get("axis_scores") or {}
        axis_counts = (risk_profile or {}).get("axis_counts") or {}

        def _axis_val(key: str):
            pv = probe_axes.get(key)
            sv = parent_axes.get(key)
            if pv is not None and sv is not None:
                # Probe ưu tiên hơn khi đã có ≥1 lần chấm trục đó
                return round(0.65 * float(pv) + 0.35 * float(sv), 2)
            if pv is not None:
                return float(pv)
            if sv is not None:
                return float(sv)
            return 1.0

        radar_data = {
            "social": _axis_val("social"),
            "routine": _axis_val("routine"),
            "attention": _axis_val("attention"),
            "sources": {
                "parent": parent_axes,
                "probe": probe_axes,
                "probe_counts": axis_counts,
                "blend": "0.65·probe + 0.35·PH khi cả hai có; thiếu nguồn thì lấy nguồn còn lại; mặc định 1.0",
            },
        }

        # GET chỉ đọc — frontend gọi POST /ensure-probes khi mở hồ sơ
        from probe_catalog import MODULES as _CAT_MODS
        _valid_ids = {m["id"] for m in _CAT_MODS}

        pending_probes = db.query(ProactiveProbe).filter(
            ProactiveProbe.student_id == student_id,
            ProactiveProbe.result_status == "Chờ kiểm tra",
            ProactiveProbe.module_id.in_(list(_valid_ids)),
        ).order_by(ProactiveProbe.module_id.asc()).all()
        
        history_probes = db.query(ProactiveProbe).filter(
            ProactiveProbe.student_id == student_id,
            ProactiveProbe.result_status != "Chờ kiểm tra"
        ).order_by(ProactiveProbe.id.desc()).all()

        predictive_data = generate_predictive_trajectory(risk_profile["risk_score"])

        latest_log = db.query(TeacherBehaviorLog).filter(TeacherBehaviorLog.student_id == student_id).order_by(TeacherBehaviorLog.id.desc()).first()

        zpd_rec = None
        if latest_log and latest_log.parsed_json:
            try:
                parsed = json.loads(latest_log.parsed_json)
                if isinstance(parsed, dict):
                    zpd_rec = parsed.get("zpd_recommendation")
            except (json.JSONDecodeError, TypeError, ValueError):
                pass
                
        # Smart Clinical Fallback if AI didn't provide one (e.g. old data)
        if not isinstance(zpd_rec, dict) or not isinstance(zpd_rec.get("cho_nha_truong"), dict) or "phac_do_tham_chieu" not in zpd_rec.get("cho_nha_truong", {}):
            if risk_profile["risk_score"] < 2.0:
                zpd_rec = {
                    "cho_nha_truong": {
                        "phac_do_tham_chieu": "Mô hình Giáo dục Tích cực & Play-based Learning",
                        "muc_tieu": "Duy trì môi trường học tập tích cực, giúp bé phát triển tự nhiên.",
                        "hanh_dong": [
                            "Khuyến khích bé tham gia các trò chơi nhóm với bạn bè.", 
                            "Tạo cơ hội để bé tự đưa ra lựa chọn trong lớp."
                        ],
                        "luu_y": "Không cần can thiệp đặc biệt, chỉ cần quan sát và hỗ trợ khi cần."
                    },
                    "cho_gia_dinh": {
                        "phac_do_tham_chieu": "Mô hình Gia đình Tương tác (Interactive Parenting)",
                        "muc_tieu": "Gắn kết tình cảm và phát triển kỹ năng giao tiếp hàng ngày.",
                        "hanh_dong": [
                            "Dành 15-30 phút mỗi ngày để đọc sách hoặc chơi trò chơi tương tác cùng con.", 
                            "Lắng nghe và trò chuyện nhiều hơn về ngày học của bé."
                        ],
                        "luu_y": "Hạn chế cho bé xem TV/điện thoại một mình."
                    }
                }
            elif 2.0 <= risk_profile["risk_score"] <= 2.9:
                zpd_rec = {
                    "cho_nha_truong": {
                        "phac_do_tham_chieu": "ESDM (Early Start Denver Model) & ZPD Scaffolding",
                        "muc_tieu": "Giúp bé tập trung hơn và hoàn thành các nhiệm vụ cơ bản.",
                        "hanh_dong": [
                            "Chia nhỏ bài tập thành từng bước ngắn.", 
                            "Khen ngợi hoặc thưởng ngay lập tức khi bé làm xong một bước."
                        ],
                        "luu_y": "Tránh đưa ra quá nhiều yêu cầu cùng lúc khiến bé bị ngợp."
                    },
                    "cho_gia_dinh": {
                        "phac_do_tham_chieu": "Can thiệp Dựa trên Thói quen (RBI - Routine Based Intervention)",
                        "muc_tieu": "Tạo sự ổn định tâm lý và nề nếp sinh hoạt tại nhà.",
                        "hanh_dong": [
                            "Tạo thời gian biểu sinh hoạt cố định (giờ ăn, ngủ, chơi) và dán ở nơi bé dễ thấy.", 
                            "Thông báo trước 5 phút khi chuẩn bị chuyển sang hoạt động khác (VD: sắp đến giờ đi ngủ)."
                        ],
                        "luu_y": "Quan sát xem bé có hay bị mất tập trung không để nhắc nhở nhẹ nhàng."
                    }
                }
            else:
                zpd_rec = {
                    "cho_nha_truong": {
                        "phac_do_tham_chieu": "Mô hình TEACCH (Giáo dục có cấu trúc) & PECS",
                        "muc_tieu": "Kiểm soát các cơn hoảng loạn và giảm thiểu quá tải giác quan.",
                        "hanh_dong": [
                            "Thiết lập 'Góc An Toàn' yên tĩnh trong lớp để bé tĩnh tâm khi bị quá tải.", 
                            "Sử dụng thẻ hình ảnh để giao tiếp nếu bé chưa thể nói ngay."
                        ],
                        "luu_y": "Tuyệt đối không dùng hình phạt lớn tiếng hoặc ép buộc bé khi đang hoảng loạn."
                    },
                    "cho_gia_dinh": {
                        "phac_do_tham_chieu": "Phác đồ Quản lý Hành vi (Behavior Management) & DIRFloortime",
                        "muc_tieu": "Đảm bảo an toàn và hỗ trợ bé bình tĩnh lại.",
                        "hanh_dong": [
                            "Nhanh chóng đưa bé đến cơ sở y tế chuyên sâu để đánh giá.", 
                            "Loại bỏ các đồ vật có thể gây nguy hiểm khi bé nổi giận."
                        ],
                        "luu_y": "Gia đình cần giữ bình tĩnh, đồng hành cùng trẻ và tuyệt đối không la mắng."
                    }
                }

        history_logs_db = db.query(TeacherBehaviorLog).filter(TeacherBehaviorLog.student_id == student_id).order_by(TeacherBehaviorLog.id.desc()).all()
        history_logs = []
        for log in history_logs_db:
            parsed = None
            if log.parsed_json:
                try:
                    parsed = json.loads(log.parsed_json)
                except (json.JSONDecodeError, TypeError, ValueError):
                    pass
            history_logs.append({
                "id": log.id,
                "date": log.date.strftime("%Y-%m-%d") if log.date else None,
                "raw_text": log.raw_text,
                "parsed_json": parsed
            })

        return {
            "student_info": {
                "id": student.id,
                "name": student.name,
                "class_name": student.class_name,
                "dob": student.dob.isoformat() if getattr(student, "dob", None) else None,
                "gender": getattr(student, "gender", None),
            },
            "risk_profile": risk_profile,
            "radar_data": radar_data,
            "pending_probes": [_serialize_probe(p) for p in pending_probes],
            "history_probes": [_serialize_probe(p) for p in history_probes],
            "history_logs": history_logs,
            "predictive_data": predictive_data,
            "latest_log_id": latest_log.id if latest_log else None,
            "zpd_recommendation": zpd_rec,
            "probe_disclaimer": PROBE_DISCLAIMER,
            "scientific_explanations": (risk_profile or {}).get("scientific_explanations"),
        }
    finally:
        db.close()

@app.get("/api/students/{student_id}/dashboard")
def get_student_dashboard(student_id: int, user: Dict[str, Any] = Depends(get_current_user)):
    assert_student_access(user, student_id)
    return _build_student_dashboard(student_id)

@app.get("/api/students/{student_id}/latest-log")
def get_latest_log(student_id: int, user: Dict[str, Any] = Depends(require_roles("expert", "admin"))):
    assert_student_access(user, student_id)
    db = SessionLocal()
    try:
        log = db.query(TeacherBehaviorLog).filter(TeacherBehaviorLog.student_id == student_id).order_by(TeacherBehaviorLog.id.desc()).first()
        if not log:
            return None
            
        parsed = None
        if log.parsed_json:
            try:
                parsed = json.loads(log.parsed_json)
            except (json.JSONDecodeError, TypeError, ValueError):
                pass
                
        return {
            "id": log.id,
            "raw_text": log.raw_text,
            "parsed_json": parsed,
        }
    finally:
        db.close()

@app.post("/api/analyze")
def analyze_log(req: BehaviorLogRequest, user: Dict[str, Any] = Depends(require_roles("expert", "admin"))):
    assert_student_access(user, req.student_id)
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == req.student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        ai_result = analyze_behavior_log(req.raw_text)
        failed = bool(ai_result.get("analysis_failed"))
        # HITL: text cũng là NHÁP — chỉ tính risk sau /observations/confirm
        ai_result["source"] = "text"
        ai_result["teacher_confirmed"] = False
        ai_result["counts_toward_risk"] = False
        ai_result["is_screening_only"] = True
        ai_result["pending_confirmation"] = not failed
        ai_result["operational_note"] = (
            "Bản nháp AI từ văn bản. Giáo viên đọc/sửa mô tả rồi bấm Xác nhận ghi hồ sơ "
            "trước khi tính điểm rủi ro."
        )
        
        new_log = TeacherBehaviorLog(
            student_id=req.student_id,
            raw_text=req.raw_text,
            parsed_json=json.dumps(ai_result, ensure_ascii=False)
        )
        db.add(new_log)
        db.flush()
        # Không tạo probe AI lạ; không tính risk ở bước nháp
        db.commit()
        return {
            "message": "Analysis incomplete" if failed else "Draft ready — awaiting teacher confirmation",
            "ai_result": ai_result,
            "analysis_failed": failed,
            "log_id": new_log.id,
            "pending_confirmation": not failed,
        }
    finally:
        db.close()

class ConfirmObservationRequest(BaseModel):
    student_id: int
    log_id: int
    raw_text: str = Field(..., min_length=1, max_length=8000)

@app.post("/api/observations/confirm")
def confirm_observation(
    req: ConfirmObservationRequest,
    user: Dict[str, Any] = Depends(require_roles("expert", "admin")),
):
    """
    GV xác nhận bản nháp multimodal (hoặc bản chờ duyệt):
    - Sửa mô tả quan sát (raw_text)
    - Đánh dấu teacher_confirmed + counts_toward_risk
    - Tạo probe nếu có kịch bản
    - Tính lại risk
    """
    assert_student_access(user, req.student_id)
    db = SessionLocal()
    try:
        log = db.query(TeacherBehaviorLog).filter(
            TeacherBehaviorLog.id == req.log_id,
            TeacherBehaviorLog.student_id == req.student_id,
        ).first()
        if not log:
            raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi quan sát")

        parsed = {}
        if log.parsed_json:
            try:
                parsed = json.loads(log.parsed_json)
                if not isinstance(parsed, dict):
                    parsed = {}
            except (json.JSONDecodeError, TypeError, ValueError):
                parsed = {}

        if parsed.get("analysis_failed") is True:
            raise HTTPException(
                status_code=400,
                detail="Bản ghi AI lỗi — không thể xác nhận. Hãy phân tích lại."
            )

        edited = req.raw_text.strip()
        if not edited:
            raise HTTPException(status_code=400, detail="Mô tả quan sát không được để trống")

        parsed["hanh_vi_goc"] = edited
        parsed["teacher_confirmed"] = True
        parsed["counts_toward_risk"] = True
        parsed["is_screening_only"] = True
        parsed["confirmed_by"] = user.get("sub") or user.get("username") or "expert"
        parsed["source"] = parsed.get("source") or "confirmed"

        log.raw_text = edited
        log.parsed_json = json.dumps(parsed, ensure_ascii=False)

        # Tạo probe một lần khi xác nhận (tránh trùng nếu đã có)
        scenario_data = parsed.get("kich_ban_test_kiem_chung")
        if scenario_data:
            scenario_str = json.dumps(scenario_data, ensure_ascii=False) if isinstance(scenario_data, dict) else str(scenario_data)
            existing = (
                db.query(ProactiveProbe)
                .filter(
                    ProactiveProbe.student_id == req.student_id,
                    ProactiveProbe.generated_scenario == scenario_str,
                    ProactiveProbe.result_status == "Chờ kiểm tra",
                )
                .first()
            )
            if not existing:
                db.add(ProactiveProbe(
                    student_id=req.student_id,
                    generated_scenario=scenario_str,
                    test_category=parsed.get("nhom_ky_nang", "Chưa xác định"),
                    result_status="Chờ kiểm tra",
                ))

        db.commit()
        risk = calculate_final_risk(req.student_id)
        return {
            "message": "Đã xác nhận và ghi vào hồ sơ",
            "log_id": log.id,
            "ai_result": parsed,
            "risk_profile": risk,
        }
    finally:
        db.close()

@app.post("/api/analyze-multimodal")
def analyze_multimodal(
    student_id: int,
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(require_roles("expert", "admin")),
):
    """
    Media → bản nháp AI. KHÔNG tính vào risk, KHÔNG tạo probe
    cho đến khi GV gọi /api/observations/confirm.
    """
    assert_student_access(user, student_id)
    db = SessionLocal()
    file_path = None
    try:
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        original_name = file.filename or "upload.bin"
        _, ext = os.path.splitext(original_name)
        ext = ext.lower()
        if ext not in ALLOWED_UPLOAD_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Định dạng không hỗ trợ ({ext or 'unknown'}). Cho phép: {', '.join(sorted(ALLOWED_UPLOAD_EXTENSIONS))}"
            )

        temp_dir = "temp_uploads"
        os.makedirs(temp_dir, exist_ok=True)
        safe_name = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(temp_dir, safe_name)

        total = 0
        with open(file_path, "wb") as buffer:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    buffer.close()
                    if os.path.exists(file_path):
                        os.remove(file_path)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File vượt quá giới hạn {MAX_UPLOAD_BYTES // (1024 * 1024)}MB"
                    )
                buffer.write(chunk)

        ai_result = analyze_multimodal_log(file_path)
        failed = bool(ai_result.get("analysis_failed"))

        # Bản nháp vận hành: audit được nhưng KHÔNG vào điểm rủi ro
        ai_result["source"] = "multimodal"
        ai_result["teacher_confirmed"] = False
        ai_result["counts_toward_risk"] = False
        ai_result["is_screening_only"] = True
        ai_result["pending_confirmation"] = not failed
        ai_result["operational_note"] = (
            "Bản nháp AI từ audio/video. Giáo viên phải sửa mô tả (nếu cần) "
            "và bấm Xác nhận ghi hồ sơ trước khi tính điểm rủi ro."
        )

        new_log = TeacherBehaviorLog(
            student_id=student_id,
            raw_text=ai_result.get("hanh_vi_goc", "[Audio/Video File]"),
            parsed_json=json.dumps(ai_result, ensure_ascii=False)
        )
        db.add(new_log)
        db.flush()
        # Không tạo probe, không calculate_final_risk ở bước này
        db.commit()

        return {
            "message": "Analysis incomplete" if failed else "Draft ready — awaiting teacher confirmation",
            "ai_result": ai_result,
            "analysis_failed": failed,
            "log_id": new_log.id,
            "pending_confirmation": not failed,
        }
    finally:
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
        db.close()

@app.put("/api/probes/{probe_id}")
def update_probe_status(
    probe_id: int,
    req: ProbeStatusUpdate,
    user: Dict[str, Any] = Depends(require_roles("expert", "admin")),
):
    """
    Chấm probe:
    - Ưu tiên rubric_score 1–4 (chuẩn catalog)
    - Fallback legacy: Đạt / Không Đạt → 1.0 / 4.0
    - Lưu telemetry game (nếu có)
    """
    db = SessionLocal()
    try:
        probe = db.query(ProactiveProbe).filter(ProactiveProbe.id == probe_id).first()
        if not probe:
            raise HTTPException(status_code=404, detail="Probe not found")
        assert_student_access(user, probe.student_id)

        rubric = req.rubric_score
        status = (req.result_status or "").strip()

        if rubric is not None:
            cars = rubric_to_cars(rubric)
            probe.rubric_score = int(rubric)
            probe.cars_mapped = cars
            probe.result_status = "Hoàn thành"
            probe.scored = 1 if (req.scored is None or req.scored) else 0
        else:
            if status not in ["Đạt", "Không Đạt", "Hoàn thành", "Bỏ qua"]:
                raise HTTPException(
                    status_code=400,
                    detail="Cần rubric_score (1–4) hoặc result_status Đạt/Không Đạt"
                )
            if status == "Bỏ qua":
                probe.result_status = "Bỏ qua"
                probe.scored = 0
            elif status == "Đạt":
                probe.result_status = "Đạt"
                probe.rubric_score = 1
                probe.cars_mapped = 1.0
                probe.scored = 1
            elif status == "Không Đạt":
                probe.result_status = "Không Đạt"
                probe.rubric_score = 4
                probe.cars_mapped = 4.0
                probe.scored = 1
            else:
                probe.result_status = status

        if req.teacher_notes is not None:
            probe.teacher_notes = req.teacher_notes.strip() or None
        if req.telemetry is not None:
            probe.telemetry_json = json.dumps(req.telemetry, ensure_ascii=False)
        probe.scored_by = user.get("sub") or user.get("username") or "expert"
        probe.scored_at = dt.datetime.utcnow()

        db.commit()
        risk = calculate_final_risk(probe.student_id)
        return {
            "message": "Updated",
            "probe": _serialize_probe(probe),
            "risk_profile": risk,
        }
    finally:
        db.close()

@app.delete("/api/probes/{probe_id}")
def delete_probe(probe_id: int, user: Dict[str, Any] = Depends(require_roles("expert", "admin"))):
    db = SessionLocal()
    try:
        probe = db.query(ProactiveProbe).filter(ProactiveProbe.id == probe_id).first()
        if not probe:
            raise HTTPException(status_code=404, detail="Probe not found")
        assert_student_access(user, probe.student_id)
        sid = probe.student_id
        db.delete(probe)
        db.commit()
        risk = calculate_final_risk(sid)
        return {"message": "Deleted", "risk_profile": risk}
    finally:
        db.close()

@app.get("/api/students/{student_id}/survey-questions")
def get_survey_questions(student_id: int, user: Dict[str, Any] = Depends(get_current_user)):
    assert_student_access(user, student_id)
    db = SessionLocal()
    try:
        latest_log = db.query(TeacherBehaviorLog).filter(TeacherBehaviorLog.student_id == student_id).order_by(TeacherBehaviorLog.id.desc()).first()
        
        default_questions = [
            { "id": "q1", "text": "Khi ở nhà, bé có thường xuyên bị hoảng sợ quá mức bởi các âm thanh lớn không?", "type": "routine", "reason": "Giúp đánh giá độ nhạy cảm giác quan." },
            { "id": "q2", "text": "Bé có thường xuyên vỗ tay liên tục hoặc lắc lư người một cách vô thức không?", "type": "routine", "reason": "Nhằm xác định các hành vi lặp lại." },
            { "id": "q3", "text": "Khi bé đang buồn bực, bé có cực kỳ khó bình tĩnh lại ngay cả khi được vỗ về không?", "type": "social", "reason": "Đánh giá khả năng điều chỉnh cảm xúc." },
            { "id": "q4", "text": "Bé có hay tránh né giao tiếp bằng mắt khi anh/chị gọi tên bé không?", "type": "social", "reason": "Giao tiếp bằng mắt là cột mốc quan trọng để đánh giá kết nối xã hội." },
            { "id": "q5", "text": "Bé có thường bỏ dở trò chơi chỉ sau 1-2 phút và không thể tập trung không?", "type": "attention", "reason": "Giúp sàng lọc vấn đề duy trì sự chú ý." }
        ]

        if latest_log and latest_log.parsed_json:
            try:
                data = json.loads(latest_log.parsed_json)
                if isinstance(data, dict) and "khao_sat_phu_huynh" in data and isinstance(data["khao_sat_phu_huynh"], list):
                    # Nếu mảng rỗng (AI báo hành vi bình thường), trả về rỗng luôn không dùng default
                    return {"questions": data["khao_sat_phu_huynh"]}
            except Exception as e:
                pass
                
        return {"questions": default_questions}
    finally:
        db.close()

@app.post("/api/surveys")
def submit_parent_survey(req: SurveyRequest, user: Dict[str, Any] = Depends(get_current_user)):
    assert_student_access(user, req.student_id)
    # Parent or expert may submit; parent only for linked child (assert above)
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == req.student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        ans = req.answers
        
        social_flags, social_max = 0, 0
        routine_flags, routine_max = 0, 0
        attention_flags, attention_max = 0, 0
        
        # Nếu client gửi kèm cấu trúc câu hỏi động
        if req.questions:
            for q in req.questions:
                q_id = q.get("id")
                q_type = q.get("type", "social")
                ans_val = ans.get(q_id, 0)
                
                if q_type == "social":
                    social_max += 1
                    social_flags += ans_val
                elif q_type == "routine":
                    routine_max += 1
                    routine_flags += ans_val
                elif q_type == "attention":
                    attention_max += 1
                    attention_flags += ans_val
        else:
            # Dự phòng nếu dùng form tĩnh cũ
            # Khớp default questions: q1–q2 = routine, q3–q4 = social, q5 = attention
            routine_flags = int(ans.get("q1", 0) or 0) + int(ans.get("q2", 0) or 0)
            routine_max = 2
            social_flags = int(ans.get("q3", 0) or 0) + int(ans.get("q4", 0) or 0)
            social_max = 2
            attention_flags = int(ans.get("q5", 0) or 0)
            attention_max = 1
            
        social_max = max(1, social_max)
        routine_max = max(1, routine_max)
        attention_max = max(1, attention_max)
        
        def calc_score(flags, max_flags):
            if flags == 0: return 1.0
            return min(4.0, 1.0 + (flags / max_flags) * 3.0)
            
        social_score = calc_score(social_flags, social_max)
        routine_score = calc_score(routine_flags, routine_max)
        attention_score = calc_score(attention_flags, attention_max)
        total = (social_score + routine_score + attention_score) / 3.0
        
        survey = ParentSurvey(
            student_id=req.student_id,
            social_score=social_score,
            routine_score=routine_score,
            attention_score=attention_score,
            total_score=total
        )
        db.add(survey)
        db.commit()
        calculate_final_risk(req.student_id)
        return {"message": "Survey submitted successfully"}
    finally:
        db.close()

def _build_chat_dossier(db, student_id: int, risk_profile: Dict[str, Any]) -> tuple:
    """Gói ngữ cảnh ngắn cho trợ lý (logs, probes, PH, ZPD)."""
    lines = []
    rp = risk_profile or {}
    lines.append(
        f"Nguồn: GV={rp.get('avg_teacher_score')} (n={rp.get('teacher_n')}) · "
        f"PH={rp.get('avg_parent_score')} (n={rp.get('parent_n')}) · "
        f"Probe={rp.get('avg_probe_score')} (n={rp.get('probe_n')}) · "
        f"Đầy đủ nguồn ~{rp.get('sources_completeness', 0)}%"
    )
    axes = rp.get("axis_scores") or {}
    if any(v is not None for v in axes.values()):
        lines.append(
            f"Trục: social={axes.get('social')} · routine={axes.get('routine')} · attention={axes.get('attention')}"
        )
    lines.append(f"Mức: {rp.get('status') or '—'} · red_flag={rp.get('red_flag')}")

    # 3 log gần nhất (đã parse)
    logs = (
        db.query(TeacherBehaviorLog)
        .filter(TeacherBehaviorLog.student_id == student_id)
        .order_by(TeacherBehaviorLog.id.desc())
        .limit(4)
        .all()
    )
    zpd_context_str = "Chưa có gợi ý ZPD từ quan sát đã xác nhận."
    log_bits = []
    for log in logs:
        parsed = None
        if log.parsed_json:
            try:
                parsed = json.loads(log.parsed_json)
            except (json.JSONDecodeError, TypeError, ValueError):
                parsed = None
        if not isinstance(parsed, dict):
            continue
        if parsed.get("is_placeholder") or parsed.get("source") == "import_placeholder":
            continue
        conf = parsed.get("teacher_confirmed")
        pending = parsed.get("pending_confirmation") and conf is False
        score = parsed.get("diem_nguy_co")
        raw = (log.raw_text or parsed.get("hanh_vi_goc") or "")[:180]
        flag = "nháp" if pending else ("đã xác nhận" if conf is not False else "—")
        log_bits.append(f"- [{log.date}] ({flag}) mức={score}: {raw}")
        if conf is not False and parsed.get("zpd_recommendation") and zpd_context_str.startswith("Chưa"):
            try:
                zpd_context_str = json.dumps(parsed["zpd_recommendation"], ensure_ascii=False)[:2000]
            except (TypeError, ValueError):
                pass
    if log_bits:
        lines.append("Quan sát gần đây:\n" + "\n".join(log_bits[:3]))
    else:
        lines.append("Quan sát gần đây: chưa có nhật ký đã xác nhận.")

    # Probe gần đây
    probes = (
        db.query(ProactiveProbe)
        .filter(ProactiveProbe.student_id == student_id)
        .order_by(ProactiveProbe.id.desc())
        .limit(8)
        .all()
    )
    p_bits = []
    for p in probes:
        if getattr(p, "scored_by", None) and str(p.scored_by).lower() in ("seed", "demo"):
            tag = "DEMO"
        else:
            tag = p.result_status or "—"
        code = p.module_id or p.test_category or "probe"
        rub = p.rubric_score if p.rubric_score is not None else p.cars_mapped
        p_bits.append(f"- {code}: {tag}" + (f" · rubric={rub}" if rub is not None else ""))
    if p_bits:
        lines.append("Kiểm chứng (probe):\n" + "\n".join(p_bits[:6]))
    else:
        lines.append("Kiểm chứng: chưa có phiên probe.")

    survey = (
        db.query(ParentSurvey)
        .filter(ParentSurvey.student_id == student_id)
        .order_by(ParentSurvey.id.desc())
        .first()
    )
    if survey:
        lines.append(
            f"Khảo sát PH mới nhất ({survey.date}): total={survey.total_score} · "
            f"social={survey.social_score} · routine={survey.routine_score} · attention={survey.attention_score}"
        )
    else:
        lines.append("Khảo sát PH: chưa có.")

    return "\n".join(lines), zpd_context_str


@app.post("/api/chat")
def chat_endpoint(req: ChatRequest, user: Dict[str, Any] = Depends(get_current_user)):
    assert_student_access(user, req.student_id)
    msg = (req.message or "").strip()
    if not msg:
        raise HTTPException(status_code=400, detail="Tin nhắn trống")
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.id == req.student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        risk_profile = calculate_final_risk(req.student_id)
        dossier, zpd_context_str = _build_chat_dossier(db, req.student_id, risk_profile)

        history = []
        if isinstance(req.history, list):
            for h in req.history[-8:]:
                if isinstance(h, dict) and h.get("text"):
                    history.append({
                        "role": str(h.get("role") or "user")[:20],
                        "text": str(h.get("text"))[:1200],
                    })

        reply = chat_with_medical_ai(
            student_name=student.name,
            current_risk=float(risk_profile.get("risk_score") or 1.0),
            zpd_context=zpd_context_str,
            message=msg,
            dossier=dossier,
            history=history,
        )
        return {
            "reply": reply,
            "student_name": student.name,
            "risk_score": risk_profile.get("risk_score"),
            "risk_status": risk_profile.get("status"),
        }
    finally:
        db.close()

@app.get("/api/students/{student_id}/export-pdf")
def export_student_pdf(student_id: int, user: Dict[str, Any] = Depends(require_roles("expert", "admin"))):
    """Xuất PDF hồ sơ sàng lọc giáo dục (ReportLab)."""
    assert_student_access(user, student_id)
    dashboard_data = _build_student_dashboard(student_id)

    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_pdfs")
    os.makedirs(out_dir, exist_ok=True)

    info = dashboard_data.get("student_info") or {}
    student_name = info.get("name") or "HocSinh"
    # Giữ chữ cái/số Unicode (tiếng Việt) trong tên file an toàn hơn
    safe_name = re.sub(r"[^\w\-]+", "_", str(student_name), flags=re.UNICODE).strip("_")
    if not safe_name:
        safe_name = "HocSinh"
    ts = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    sid = str(info.get("id") or student_id).zfill(3)
    output_filename = f"ZPD_HS{sid}_{safe_name}_{ts}.pdf"
    output_path = os.path.join(out_dir, output_filename)

    exported_by = user.get("full_name") or user.get("username") or "Giáo viên"
    generate_medical_report(dashboard_data, output_path, exported_by=exported_by)

    return FileResponse(
        path=output_path,
        filename=output_filename,
        media_type="application/pdf",
        headers={
            "Cache-Control": "no-store",
            "X-ZPD-Doc": f"HS{sid}",
        },
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
