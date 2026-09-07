"""
P.H.I. Central Orchestrator
===========================
Directly routes queries to P.H.I.'s intelligent LLM brain with zero latency.
"""
import logging
from dotenv import load_dotenv

from chatbot import get_chatbot_response

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("PHI_Junction")

load_dotenv()

def route_query(query: str) -> str:
    """
    Main orchestrator function.
    Directly routes user queries to the central intelligence brain.
    """
    if not query.strip():
        return ""

    logger.info(f"Received query: {query}")
    try:
        final_response = get_chatbot_response(query)
        return final_response
    except Exception as e:
        logger.error(f"Error during query execution: {e}")
        return "I'm sorry, I encountered an internal error while processing that."

if __name__ == "__main__":
    print("========================================")
    print("P.H.I. Central Brain Interactive Test")
    print("Type 'exit' to quit.")
    print("========================================")
    
    while True:
        try:
            user_input = input("\nYou: ")
            if user_input.lower().strip() in ["exit", "quit", "stop"]:
                break
            response = route_query(user_input)
            print(f"\nP.H.I: {response}")
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            logger.error(f"Test loop error: {e}")
