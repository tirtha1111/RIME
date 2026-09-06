import os
from pathlib import Path

import cohere  # Import the cohere library to interact with the Cohere API.
from rich import print # Import the print function from the rich library for enhanced console output.
from dotenv import dotenv_values # Import the dotenv to load environment variables from a .env file.
from typing import Any, cast

# Load environment variables from the project .env file, regardless of the
# directory from which the script is launched.
env_vars = dotenv_values(Path(__file__).resolve().parents[1] / ".env")

# Retrieve the API key from the process environment or the project .env file.
CohereAPIKey = (
    os.getenv("COHERE_API_KEY")
    or env_vars.get("COHERE_API_KEY")
    or env_vars.get("CohereAPIKey")
)

if not CohereAPIKey:
    raise RuntimeError(
        "Cohere API key not found. Set COHERE_API_KEY in the environment "
        "or add COHERE_API_KEY to the project .env file."
    )

# Create a Cohere client using the provided API key.
co = cohere.Client(api_key=CohereAPIKey)

# Define a list of recognised function keywords for task categorisation.
funcs = [
    "exit", "general", "realtime", "open", "close", "play",
    "generate image", "system", "content", "google search", 
    "youtube search", "reminder"
]

# Initialize an empty list to store user messages.
messages: list[dict[str, str]] = []

# Define the preamble that guides the AI model on how to categorize queries.
preamble = """
You are a very accurate Decision-Making Model, which decides what kind of a query is given to you.
You will decide whether a query is a 'general' query, a 'realtime' query, or is asking to perform any task or automation like 'open facebook, instagram', 'can you write a application and open it in notepad'
*** Do not answer any query, just decide what kind of query is given to you. ***
-> Respond with 'general ( query )' if a query can be answered by a llm model (conversational ai chatbot) and doesn't require any up to date information like if the query is 'who was akbar?' respond with 'general who was akbar?', if the query is 'how can i study more effectively?' respond with 'general how can i study more effectively?', if the query is 'can you help me with this math problem?' respond with 'general can you help me with this math problem?', if the query is 'Thanks, i really liked it.' respond with 'general thanks, i really liked it.' , if the query is 'what is python programming language?' respond with 'general what is python programming language?', etc. Respond with 'general (query)' if a query doesn't have a proper noun or is incomplete like if the query is 'who is he?' respond with 'general who is he?', if the query is 'what's his networth?' respond with 'general what's his networth?', if the query is 'tell me more about him.' respond with 'general tell me more about him.', and so on even if it require up-to-date information to answer. Respond with 'general (query)' if the query is asking about time, day, date, month, year, etc like if the query is 'what's the time?' respond with 'general what's the time?'.
-> Respond with 'realtime ( query )' if a query can not be answered by a llm model (because they don't have realtime data) and requires up to date information like if the query is 'who is indian prime minister' respond with 'realtime who is indian prime minister', if the query is 'tell me about facebook's recent update.' respond with 'realtime tell me about facebook's recent update.', if the query is 'tell me news about coronavirus.' respond with 'realtime tell me news about coronavirus.', etc and if the query is asking about any individual or thing like if the query is 'who is akshay kumar' respond with 'realtime who is akshay kumar', if the query is 'what is today's news?' respond with 'realtime what is today's news?', if the query is 'what is today's headline?' respond with 'realtime what is today's headline?', etc.
-> Respond with 'open (application name or website name)' if a query is asking to open any application like 'open facebook', 'open telegram', etc. but if the query is asking to open multiple applications, respond with 'open 1st application name, open 2nd application name' and so on.
-> Respond with 'close (application name)' if a query is asking to close any application like 'close notepad', 'close facebook', etc. but if the query is asking to close multiple applications or websites, respond with 'close 1st application name, close 2nd application name' and so on.
-> Respond with 'play (song name)' if a query is asking to play any song like 'play afsanay by ys', 'play let her go', etc. but if the query is asking to play multiple songs, respond with 'play 1st song name, play 2nd song name' and so on.
-> Respond with 'generate image (image prompt)' if a query is requesting to generate a image with given prompt like 'generate image of a lion', 'generate image of a cat', etc. but if the query is asking to generate multiple images, respond with 'generate image 1st image prompt, generate image 2nd image prompt' and so on.
-> Respond with 'reminder (datetime with message)' if a query is requesting to set a reminder like 'set a reminder at 9:00pm on 25th june for my business meeting.' respond with 'reminder 9:00pm 25th june business meeting'.
-> Respond with 'system (task name)' if a query is asking to mute, unmute, volume up, volume down , etc. but if the query is asking to do multiple tasks, respond with 'system 1st task, system 2nd task', etc.
-> Respond with 'content (topic)' if a query is asking to write any type of content like application, codes, emails or anything else about a specific topic but if the query is asking to write multiple types of content, respond with 'content 1st topic, content 2nd topic' and so on.
-> Respond with 'google search (topic)' if a query is asking to search a specific topic on google but if the query is asking to search multiple topics on google, respond with 'google search 1st topic, google search 2nd topic' and so on.
-> Respond with 'youtube search (topic)' if a query is asking to search a specific topic on youtube but if the query is asking to search multiple topics on youtube, respond with 'youtube search 1st topic, youtube search 2nd topic' and so on.
*** If the query is asking to perform multiple tasks like 'open facebook, telegram and close whatsapp' respond with 'open facebook, open telegram, close whatsapp' ***
*** If the user is saying goodbye or wants to end the conversation like 'bye rime.' respond with 'exit'.***
*** Respond with 'general (query)' if you can't decide the kind of query or if a query is asking to perform a task which is not mentioned above. ***
"""

# Define a chat history with predefined user-chatbot interactions for context.
ChatHistory = [
    {"role": "user", "message": "how are you?"},
    {"role": "chatbot", "message": "I am doing well, thank you for asking! How can I assist you today?"},
    {"role": "user", "message": "Can you tell me a joke?"},
    {"role": "chatbot", "message": "Sure! Why don't scientists trust atoms? Because they make up everything!"},
    {"role": "user", "message": "That's funny! Can you give me a random fact?"},
    {"role": "chatbot", "message": "Absolutely! Did you know that honey never spoils? Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly edible."},
    {"role": "user", "message": "Wow, that's interesting! Can you recommend a good book to read?"},
    {"role": "chatbot", "message": "Certainly! If you're into science fiction, I recommend 'Dune' by Frank Herbert. It's a classic with a rich story and complex characters."},
    {"role": "user", "message": "Thanks for the recommendation! Can you help me with a math problem?"},
    {"role": "chatbot", "message": "Of course! Please tell me the math problem you'd like help with."},
    {"role": "user", "message": "I need to calculate the area of a circle with a radius of 5 units."},
    {"role": "chatbot", "message": "To calculate the area of a circle, you can use the formula A = πr², where A is the area and r is the radius. For a radius of 5 units, the area would be A = π * (5)² = 25π square units."},
]

# Define the ain function for decision-making on queries.
def FirstLayerDMM(prompt: str = "test") -> list[str]:
    # Add the user's query to the messages list.
    messages.append({"role": "user", "content": f"{prompt}"})

    # Create a streaming chat session with the Cohere model.
    stream = co.chat_stream(
        model='command-a-03-2025', # Specify the Cohere model to use.
        message=prompt, # Pass the user's query.
        temperature=0.7, # Set the creativity level of the model.
        chat_history=cast(Any, ChatHistory), # Provide the predefined chat history for context.
        prompt_truncation='OFF', # Ensure the prompt is not truncated.
        connectors=[], # No additional connectors are used.
        preamble=preamble # Pass the detailed instruction preamble.
    )

    # Initialize an empty string to store the generated response
    response: str = ""

    # Iterate over events in the stream and capture text generation events.
    for event in stream:
        if event.event_type == 'text-generation':
            response += event.text # Append generated text to the response.

    # Remove new line character and split responses into individual tasks.
    response = response.replace("\n", "")
    response_tasks = response.split("'")

    # Strip leading and trailing whitespaces from each task.
    response_tasks = [i.strip() for i in response_tasks]

    # Initialize an empty list to filter valid tasks.
    temp: list[str] = []

    # Filter the tasks based on recognised function keywords.
    for task in response_tasks:
        for func in funcs:
            if task.startswith(func):
                temp.append(task) # Add valid tasks to the filtered list.

    # Update the response with the filtered list of tasks.
    response_tasks = temp

    # If '(query)' is in the response, recursively call the function for further clarification.
    if "(query)" in response_tasks:
        newresponse = FirstLayerDMM(prompt=prompt)
        return newresponse # Return the clarified response.
    else: 
        return response_tasks # Return the filtered response.

# Entry point for the script.
if __name__ == "__main__":
    #continuously prompt the user for input and process it.
    while True:
        try:
            user_input = input(">>> ")
        except EOFError:
            break
        if user_input.strip().lower() == "exit":
            break
        result = FirstLayerDMM(user_input)
        print(result)  # Print the categorized response.
        if "exit" in result:
            break