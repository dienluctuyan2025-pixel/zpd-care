import os
import sys

# Đảm bảo đường dẫn import đúng
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from pdf_generator import generate_medical_report

student_data = {
    "student_info": {
        "id": 123,
        "name": "Nguyễn Văn Test",
        "class_name": "Lá 1"
    },
    "risk_profile": {
        "risk_score": 3.2
    },
    "radar_data": {
        "social": 2.5,
        "routine": 3.0,
        "attention": 2.8
    },
    "predictive_data": {
        "6_months": {
            "status": "Tăng nguy cơ bùng phát",
            "description": "Nếu không can thiệp, tần suất ăn vạ (meltdown) có thể tăng gấp đôi."
        },
        "12_months": {
            "status": "Khó hòa nhập nhóm",
            "description": "Nguy cơ bị cô lập xã hội cao, khó tham gia các hoạt động tập thể."
        }
    },
    "zpd_recommendation": {
        "cho_nha_truong": {
            "phac_do_tham_chieu": "Mô hình TEACCH & PECS",
            "muc_tieu": "Kiểm soát cảm xúc, giảm thiểu hành vi quá tải giác quan.",
            "hanh_dong": [
                "Thiết lập 'Góc An Toàn' yên tĩnh trong lớp.",
                "Sử dụng thẻ hình ảnh để giao tiếp nếu bé chưa thể nói ngay."
            ],
            "luu_y": "Tuyệt đối không dùng hình phạt ép buộc khi bé đang hoảng loạn."
        },
        "cho_gia_dinh": {
            "phac_do_tham_chieu": "Can thiệp Dựa trên Thói quen (RBI)",
            "muc_tieu": "Đảm bảo an toàn và hỗ trợ bé bình tĩnh lại.",
            "hanh_dong": [
                "Nhanh chóng đưa bé đến cơ sở y tế chuyên sâu để đánh giá.",
                "Tạo thời gian biểu cố định tại nhà."
            ],
            "luu_y": "Gia đình cần giữ bình tĩnh, đồng hành cùng trẻ."
        }
    },
    "history_probes": [
        {
            "date": "2023-10-01",
            "category": "Giao tiếp xã hội",
            "status": "Không Đạt"
        },
        {
            "date": "2023-09-15",
            "category": "Chú ý",
            "status": "Đạt"
        }
    ]
}

try:
    generate_medical_report(student_data, "test_report.pdf")
    print("PDF generated successfully at test_report.pdf")
except Exception as e:
    print(f"Error generating PDF: {e}")
