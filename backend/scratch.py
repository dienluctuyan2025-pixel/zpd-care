import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv(".env")
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))

model_name = "gemini-3.5-flash"
try:
    print(f"Testing model {model_name} with JSON output...")
    model = genai.GenerativeModel(
        model_name=model_name,
        generation_config={"response_mime_type": "application/json"}
    )
    response = model.generate_content("Give me a JSON with keys 'hello' and 'world'.")
    print(f"Success for {model_name}: {response.text}")
    print("Parsed JSON:", json.loads(response.text))
except Exception as e:
    print(f"Failed for {model_name}: {e}")
