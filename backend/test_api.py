import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv(".env")
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))

try:
    model = genai.GenerativeModel("gemini-1.5-flash-latest")
    response = model.generate_content("Hello")
    print("Success:", response.text)
except Exception as e:
    print("Error:", repr(e))
