from __future__ import annotations

import datetime
from json import JSONDecodeError, dump, load
from pathlib import Path

from dotenv import dotenv_values
from groq import Groq
from groq.types.chat import ChatCompletionMessageParam

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = PROJECT_ROOT / ".env"
DATA_DIR = PROJECT_ROOT / "Data"
CHAT_LOG_PATH = DATA_DIR / "ChatLog.json"

# Load environment variables from the project root .env file.
env_vars = dotenv_values(ENV_PATH)

# Retrieve specific environment variables for username, assistant name, and API key.
Username = env_vars.get("Username", "User")
Assistantname = env_vars.get("Assistantname", "Rime")
GroqAPIKey = env_vars.get("GroqAPIKey")

if not GroqAPIKey:
    raise RuntimeError("Groq API key not found. Add GroqAPIKey to the project .env file.")

# Initialize the Groq client using the provided API key.
client = Groq(api_key=GroqAPIKey)

# Initialize an empty list to store chat messages.
messages: list[ChatCompletionMessageParam] = []

# Ensure the Data folder and chat log file exist regardless of the current working directory.
DATA_DIR.mkdir(parents=True, exist_ok=True)
if CHAT_LOG_PATH.exists():
    try:
        with CHAT_LOG_PATH.open("r", encoding="utf-8") as f:
            messages = load(f)
    except (FileNotFoundError, JSONDecodeError):
        messages = []
        with CHAT_LOG_PATH.open("w", encoding="utf-8") as f:
            dump([], f, indent=4)
else:
    with CHAT_LOG_PATH.open("w", encoding="utf-8") as f:
        dump([], f, indent=4)

# Define a system message that provides context to the AI chatbot about its role and behavior.
System = f"""Hello, I am {Username}. You are a very accurate and advanced AI chatbot named {Assistantname},and I am your master and with real-time up-to-date internet information.
*** Do not tell time until I ask, do not talk too much, just answer the question.***
*** Reply in only English, even if the question is in Hindi, reply in English.***
*** Do not provide notes in the output, just answer the question and never mention your training data. ***
"""

# A list of system instructions for the chatbot.
SysteChatBot: list[ChatCompletionMessageParam] = [
    {"role": "system", "content": System}
]


# Function to get real-time date and time.
def RealtimeInformation() -> str:
    current_date_time = datetime.datetime.now()
    day = current_date_time.strftime("%A")
    date = current_date_time.strftime("%d")
    month = current_date_time.strftime("%B")
    year = current_date_time.strftime("%Y")
    hour = current_date_time.strftime("%H")
    minute = current_date_time.strftime("%M")
    second = current_date_time.strftime("%S")

    return (
        "Please use this real-time information if needed,\n"
        f"Day: {day}\nDate: {date}\nMonth: {month}\nYear: {year}\n"
        f"Time: {hour} hours : {minute} minutes : {second} seconds.\n"
    )


# Function to modify the chatbot's response for better formatting.
def AnswerModifier(Answer: str) -> str:
    lines = Answer.split("\n")
    non_empty_lines = [line for line in lines if line.strip()]
    return "\n".join(non_empty_lines)


# Main chatbot function to handle user queries.
def ChatBot(Query: str) -> str:
    """Send the user query to the chatbot and return the AI response."""
    global messages

    try:
        if CHAT_LOG_PATH.exists():
            with CHAT_LOG_PATH.open("r", encoding="utf-8") as f:
                messages = load(f)
        else:
            messages = []

        messages.append({"role": "user", "content": Query})

        completion = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=(
                SysteChatBot
                + [{"role": "user", "content": RealtimeInformation()}]
                + messages
            ),
            max_tokens=1024,
            temperature=0.7,
            top_p=1,
            stream=True,
            stop=None,
        )

        Answer = ""
        for chunk in completion:
            choices = chunk.choices
            for choice in choices:
                delta = getattr(choice, "delta", None)
                if delta is None:
                    continue
                content = getattr(delta, "content", None)
                if isinstance(content, str) and content:
                    Answer += content

        Answer = Answer.replace("</s>", "")
        messages.append({"role": "assistant", "content": Answer})

        with CHAT_LOG_PATH.open("w", encoding="utf-8") as f:
            dump(messages, f, indent=4)

        return AnswerModifier(Answer)

    except Exception as e:
        print(f"Error: {e}")
        try:
            with CHAT_LOG_PATH.open("w", encoding="utf-8") as f:
                dump([], f, indent=4)
        except Exception:
            pass
        return "Sorry, I could not process that request."


# Main program entry point.
if __name__ == "__main__":
    while True:
        try:
            user_input = input("Enter Your Questions: ")
        except EOFError:
            break

        if not user_input.strip():
            continue

        print(ChatBot(user_input))
