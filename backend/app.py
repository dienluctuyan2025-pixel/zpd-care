import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import json
from datetime import date
from database import SessionLocal, Student, TeacherBehaviorLog, ProactiveProbe, ParentSurvey
from ai_analyzer import analyze_behavior_log, calculate_final_risk

# Cấu hình giao diện
st.set_page_config(page_title="ZPD Care", layout="wide", page_icon="👁️")

def get_db():
    db = SessionLocal()
    try:
        return db
    except:
        db.close()

# ==========================================
# SIDEBAR - QUẢN LÝ HỌC SINH & CẢNH BÁO
# ==========================================
st.sidebar.title("👁️ ZPD CARE")
st.sidebar.subheader("Hệ thống Cảnh báo Sớm (ZPD)")

db = SessionLocal()
students = db.query(Student).all()

if not students:
    st.warning("Chưa có dữ liệu học sinh. Vui lòng chạy lệnh `python seed_data.py` trước.")
    st.stop()

# Dropdown chọn học sinh
student_options = {f"{s.id} - {s.name} ({s.class_name})": s.id for s in students}
selected_student_label = st.sidebar.selectbox("Chọn Học Sinh", list(student_options.keys()))
student_id = student_options[selected_student_label]
student_info = db.query(Student).filter(Student.id == student_id).first()

st.sidebar.markdown("---")
st.sidebar.write(f"**🧑‍🎓 Họ tên:** {student_info.name}")
st.sidebar.write(f"**🏫 Lớp:** {student_info.class_name}")

# Lấy điểm số từ Scoring Engine
risk_profile = calculate_final_risk(student_id)
st.sidebar.metric(label="Điểm Nguy Cơ (Risk Final)", value=risk_profile["risk_score"])
color = risk_profile["color"]
status = risk_profile["status"]

# Hiển thị cảnh báo màu sắc
color_hex = {"green": "#28a745", "blue": "#007bff", "yellow": "#ffc107", "red": "#dc3545"}
st.sidebar.markdown(
    f"""
    <div style='background-color: {color_hex.get(color, "grey")}; padding: 10px; border-radius: 5px; text-align: center;'>
        <h3 style='color: white; margin:0;'>{status}</h3>
    </div>
    """, 
    unsafe_allow_html=True
)


# ==========================================
# MAIN LAYOUT - 3 TABS
# ==========================================
tab1, tab2, tab3 = st.tabs(["🧠 Lõi Pháp Y Hành Vi", "🧪 Kiểm Chứng Thực Nghiệm", "📊 Dashboard Radar"])

# --- TAB 1: DATA INPUT & NLP ---
with tab1:
    st.header("Nhật ký Quan sát Hành vi")
    raw_text = st.text_area("Nhập ghi chép thô của giáo viên trong ngày (Ví dụ: Bé hôm nay chơi một mình, không phản ứng khi gọi tên...):", height=150)
    
    if st.button("🧠 AI Phân Tích Dấu Hiệu"):
        if raw_text.strip() == "":
            st.error("Vui lòng nhập nhật ký.")
        else:
            with st.spinner("AI đang bóc tách hành vi theo chuẩn DSM-5 & M-CHAT-R..."):
                ai_result = analyze_behavior_log(raw_text)
                
                # Lưu vào DB
                new_log = TeacherBehaviorLog(
                    student_id=student_id,
                    raw_text=raw_text,
                    parsed_json=json.dumps(ai_result, ensure_ascii=False)
                )
                db.add(new_log)
                
                # Tự động tạo bài test probe mới từ kịch bản AI
                if "kich_ban_test_kiem_chung" in ai_result:
                    new_probe = ProactiveProbe(
                        student_id=student_id,
                        generated_scenario=ai_result["kich_ban_test_kiem_chung"],
                        test_category=ai_result.get("nhom_ky_nang", "Chưa xác định"),
                        result_status="Chờ kiểm tra"
                    )
                    db.add(new_probe)
                
                db.commit()
                st.success("Phân tích hoàn tất! Dữ liệu đã được tam giác đạc.")
                
                # Render UI kết quả (Cards)
                col1, col2 = st.columns(2)
                with col1:
                    st.info(f"**📝 Hành vi gốc:**\n{ai_result.get('hanh_vi_goc', '')}")
                    st.warning(f"**⚕️ Chuẩn Y Khoa:**\n{ai_result.get('ma_chuan_y_khoa', '')}")
                with col2:
                    st.error(f"**⚠️ Điểm nguy cơ (1-Thấp, 2-TB, 3-Cao):** {ai_result.get('diem_nguy_co', 1)}")
                    st.success(f"**🧩 Nhóm Kỹ Năng:** {ai_result.get('nhom_ky_nang', '')}")
                
                st.markdown("### 🎯 Kịch bản Test Kiểm chứng (Ngày mai):")
                st.write(f"> *{ai_result.get('kich_ban_test_kiem_chung', '')}*")

# --- TAB 2: PROACTIVE PROBES ---
with tab2:
    st.header("Nhiệm vụ Kiểm Chứng (Proactive Probes)")
    pending_probes = db.query(ProactiveProbe).filter(
        ProactiveProbe.student_id == student_id,
        ProactiveProbe.result_status == "Chờ kiểm tra"
    ).all()
    
    if not pending_probes:
        st.success("✅ Không có bài test nào đang chờ kiểm tra. Kỹ năng của bé đang ổn định.")
    else:
        st.warning(f"Có {len(pending_probes)} kịch bản đang chờ cô giáo thực nghiệm!")
        for probe in pending_probes:
            with st.expander(f"Kịch bản từ ngày {probe.date} - Kỹ năng: {probe.test_category}", expanded=True):
                st.write(f"**Nhiệm vụ của cô:** {probe.generated_scenario}")
                col1, col2 = st.columns(2)
                with col1:
                    if st.button("✅ Trẻ Đạt (Bình thường)", key=f"pass_{probe.id}"):
                        probe.result_status = "Đạt"
                        db.commit()
                        st.rerun()
                with col2:
                    if st.button("❌ Trẻ Không Đạt (Bất thường)", key=f"fail_{probe.id}"):
                        probe.result_status = "Không Đạt"
                        db.commit()
                        st.rerun()
                        
    st.markdown("---")
    st.subheader("Lịch sử Kiểm chứng")
    history_probes = db.query(ProactiveProbe).filter(
        ProactiveProbe.student_id == student_id,
        ProactiveProbe.result_status != "Chờ kiểm tra"
    ).order_by(ProactiveProbe.date.desc()).all()
    
    if history_probes:
        for p in history_probes:
            status_icon = "🟢" if p.result_status == "Đạt" else "🔴"
            st.write(f"- **{p.date}** | {p.test_category}: {status_icon} {p.result_status}")
    else:
        st.write("Chưa có lịch sử kiểm chứng.")

# --- TAB 3: DASHBOARD RADAR ---
with tab3:
    st.header("Dashboard Định Vị ZPD & Radar Nguy Cơ")
    
    # Trích xuất 3 trục: Giao tiếp Xã hội, Rập khuôn, Tập trung từ dữ liệu phụ huynh làm nền tảng radar 
    # (Trong thực tế ta có thể merge điểm AI + Phụ huynh)
    surveys = db.query(ParentSurvey).filter(ParentSurvey.student_id == student_id).order_by(ParentSurvey.date.desc()).first()
    
    social_val = surveys.social_score if surveys else 1.0
    routine_val = surveys.routine_score if surveys else 1.0
    attention_val = surveys.attention_score if surveys else 1.0
    
    # Biểu đồ Radar bằng Plotly
    categories = ['Tương tác Xã hội', 'Hành vi Rập khuôn', 'Mức độ Tập trung']
    fig = go.Figure()

    fig.add_trace(go.Scatterpolar(
        r=[social_val, routine_val, attention_val],
        theta=categories,
        fill='toself',
        name='Chỉ số Nguy cơ',
        line=dict(color=color_hex.get(color, "grey")),
        fillcolor=color_hex.get(color, "grey"),
        opacity=0.6
    ))

    fig.update_layout(
        polar=dict(
            radialaxis=dict(
                visible=True,
                range=[0, 3],
                tickvals=[1, 2, 3],
                ticktext=["1 (An Toàn)", "2 (Trung Bình)", "3 (Nguy Cơ)"]
            )),
        showlegend=False,
        title=f"Mô hình Hành vi 3 chiều của bé {student_info.name}"
    )
    
    col_chart, col_stats = st.columns([2, 1])
    with col_chart:
        st.plotly_chart(fig, use_container_width=True)
        
    with col_stats:
        st.markdown("### 📊 Trọng số thành phần")
        st.write(f"- Điểm từ Giáo viên: **{risk_profile['avg_teacher_score']}** (30%)")
        st.write(f"- Điểm từ Phụ huynh: **{risk_profile['avg_parent_score']}** (30%)")
        st.write(f"- Điểm Bài Test (Probes): **{risk_profile['avg_probe_score']}** (40%)")
        st.markdown("---")
        st.info("💡 **Quy tắc Tam giác đạc (Data Triangulation):** Hệ thống không kết luận bệnh mà chỉ cảnh báo dữ liệu khi có sự đồng thuận từ 3 nguồn quan sát độc lập.")

db.close()
