import google.generativeai as genai

# Try to mock the SDK call to see local type errors
model = genai.GenerativeModel("gemini-1.5-flash")
try:
    # Just need to see if the SDK throws a TypeError or ValueError locally before sending to network
    model.generate_content([{"mime_type": "audio/webm", "data": b"test"}])
    print("No local type error")
except Exception as e:
    print(f"Error: {repr(e)}")
