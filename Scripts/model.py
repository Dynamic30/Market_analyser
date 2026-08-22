# llm model selection

# model.py — LLM calling layer. Only place that knows *how* to reach a model.
# Swap provider/model here; pipeline scripts just import call().

import os
from ollama import Client   # native Ollama client, points at Ollama Cloud
from dotenv import load_dotenv

load_dotenv()

MODEL = "gpt-oss:20b"                       # swap string to change model
_client = Client(
    host="https://ollama.com",
    headers={"Authorization": f"Bearer {os.getenv('OLLAMA_API_KEY')}"},
)

def call(prompt: str, temperature: float = 0.2) -> str:
    resp = _client.chat(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        options={"temperature": temperature},
    )
    return resp.message.content