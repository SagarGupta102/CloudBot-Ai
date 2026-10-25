import re
from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai


load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

app = Flask(__name__)

CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://127.0.0.1:8000",
            "http://localhost:8000"
        ]
    }
})

# Find faq.json in the same folder as this Python file
FAQ_FILE = Path(__file__).parent / "faq.json"


def load_faqs():
    with open(FAQ_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "success",
        "message": "CloudBot AI backend is running!"
    })


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "").strip().lower()

    if not user_message:
        return jsonify({
            "status": "error",
            "message": "Please enter a question."
        }), 400

    faqs = load_faqs()

    # Send comparison questions directly to Gemini
    comparison_words = ["difference", "compare", "comparison", "versus", "vs"]

    if any(word in user_message for word in comparison_words):
       faqs = []

    for faq in faqs:
        keywords = faq.get("keywords", [])
        question = faq.get("question", "").lower()

        if any(
            re.search(
                r"\b" + re.escape(keyword.lower()) + r"\b",
                user_message
            )
            for keyword in keywords
        ) or question in user_message:
            return jsonify({
                "status": "success",
                "answer": faq["answer"],
                "source": "faq"
            })


    
    if client is None:
        return jsonify({
            "status": "error",
            "message": "Gemini API key is not configured. Please check your .env file."
        }), 500

    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=(
                "You are CloudBot AI, a friendly cloud computing learning assistant. "
                "Answer in simple, beginner-friendly language.\n\n"
                f"User question: {user_message}"
            )
        )

        answer = response.text or "Sorry, I couldn't generate an answer. Please try again."

        return jsonify({
            "status": "success",
            "answer": answer,
            "source": "gemini"
        })

    except Exception:
        app.logger.exception("Gemini API request failed")
        return jsonify({
            "status": "error",
            "message": "I'm unable to generate an AI answer right now. Please try again later."
        }), 502


if __name__ == "__main__":
    app.run(debug=True)
