import requests

BASE_URL = "http://localhost:8000/api"

def run_tests():
    print("--- BẮT ĐẦU KIỂM TRA HỆ THỐNG ---")
    
    # 1. Test /api/students
    try:
        res = requests.get(f"{BASE_URL}/students")
        print("1. GET /api/students:", res.status_code)
        students = res.json()
        student_id = students[0]['id'] if students else 1
    except Exception as e:
        print("1. FAIL:", e)

    # 2. Test /api/school-dashboard
    try:
        res = requests.get(f"{BASE_URL}/school-dashboard")
        print("2. GET /api/school-dashboard:", res.status_code)
    except Exception as e:
        print("2. FAIL:", e)

    # 3. Test /api/students/{id}/dashboard
    try:
        res = requests.get(f"{BASE_URL}/students/{student_id}/dashboard")
        print("3. GET /api/students/{id}/dashboard:", res.status_code)
    except Exception as e:
        print("3. FAIL:", e)

    # 4. Test /api/students/{id}/survey-questions
    try:
        res = requests.get(f"{BASE_URL}/students/{student_id}/survey-questions")
        print("4. GET /api/students/{id}/survey-questions:", res.status_code)
    except Exception as e:
        print("4. FAIL:", e)

    # 5. Test /api/surveys
    try:
        payload = {"student_id": student_id, "answers": {"q1": 1, "q2": 0}}
        res = requests.post(f"{BASE_URL}/surveys", json=payload)
        print("5. POST /api/surveys:", res.status_code)
    except Exception as e:
        print("5. FAIL:", e)

    # 6. Test /api/analyze (mock)
    print("6. POST /api/analyze: Bỏ qua để tránh tốn API Quota của người dùng")
    
    print("--- KẾT THÚC KIỂM TRA ---")

if __name__ == "__main__":
    run_tests()
