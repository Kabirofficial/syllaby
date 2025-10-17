import os
import random
from typing import Any, Dict, List, Optional, Tuple
import uuid
from pydantic import ValidationError
import requests
import json
import re
from dotenv import load_dotenv
from fuzzywuzzy import fuzz
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI, Depends, HTTPException, status, Path, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import models, schemas, crud, auth, database

load_dotenv()

chat_sessions = {}
freeform_question_cache = {}

app = FastAPI(
    title="Syllaby Backend API",
    description="API for managing user accounts and AI-generated syllabi/study plans for Syllaby application.",
    version="0.1.0",
)

OLLAMA_API_BASE_URL = os.getenv("OLLAMA_API_BASE_URL")
OLLAMA_MODEL_NAME = os.getenv("OLLAMA_MODEL_NAME")
REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", 300))

if not OLLAMA_API_BASE_URL or not OLLAMA_MODEL_NAME:
    raise ValueError(
        "OLLAMA_API_BASE_URL and OLLAMA_MODEL_NAME must be set in .env file."
    )

models.Base.metadata.create_all(bind=database.engine)

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def call_ollama(
    prompt: Optional[str] = None,
    model_name: str = OLLAMA_MODEL_NAME,
    num_predict: int = 4096,
    messages: Optional[List[schemas.ChatMessage]] = None,
) -> str:
    api_endpoint = "/api/chat" if messages else "/api/generate"

    ollama_payload = {
        "model": model_name,
        "stream": False,
        "options": {"num_predict": num_predict},
    }

    if messages:
        ollama_payload["messages"] = [msg.dict() for msg in messages]
    elif prompt:
        ollama_payload["prompt"] = prompt
    else:
        raise ValueError(
            "Either a 'prompt' or 'messages' must be provided to call Ollama."
        )

    try:
        ollama_response = requests.post(
            f"{OLLAMA_API_BASE_URL}{api_endpoint}",
            json=ollama_payload,
            timeout=REQUEST_TIMEOUT,
        )
        ollama_response.raise_for_status()
        response_data = ollama_response.json()

        if "message" in response_data and "content" in response_data["message"]:
            generated_content = response_data["message"]["content"].strip()
        elif "response" in response_data:
            generated_content = response_data["response"].strip()
        else:
            raise ValueError("Ollama model returned an unexpected response format.")

        if not generated_content:
            raise ValueError("Ollama model returned empty content.")
        return generated_content
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to connect to Ollama service: {e}. Please ensure Ollama is running.",
        )
    except (KeyError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


def _extract_and_parse_json(raw_text: str, expected_type: type = dict) -> Any:
    json_match = re.search(r"```json\s*([\s\S]*?)\s*```", raw_text)
    if json_match:
        json_str = json_match.group(1)
    else:
        start_char = "[" if expected_type == list else "{"
        end_char = "]" if expected_type == list else "}"
        start_index = raw_text.find(start_char)
        end_index = raw_text.rfind(end_char)
        if start_index == -1 or end_index == -1 or end_index < start_index:
            raise ValueError(
                f"Could not find a valid JSON {expected_type.__name__} in the response."
            )
        json_str = raw_text[start_index : end_index + 1]

    try:
        return json.loads(json_str)
    except json.JSONDecodeError:
        repaired_str = re.sub(r",\s*([}\]])", r"\1", json_str)
        try:
            return json.loads(repaired_str)
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Could not parse JSON even after attempting repairs. Error: {e}"
            )


@app.get("/")
async def read_root():
    return {
        "message": "Welcome to Syllaby Backend! Access /docs for API documentation."
    }


@app.post("/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
async def register_user(
    user: schemas.UserCreate, db: Session = Depends(database.get_db)
):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    db_user_email = crud.get_user_by_email(db, email=user.email)
    if db_user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    return crud.create_user(db=db, user=user)


@app.post("/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db),
):
    user = crud.get_user_by_username_or_email(db, identifier=form_data.username)
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username, email, or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me", response_model=schemas.User)
async def read_users_me(current_user: schemas.User = Depends(auth.get_current_user)):
    return current_user


@app.get("/homepage-data", response_model=schemas.HomePageData)
async def get_homepage_data(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    original_data = {
        "message": f"Welcome to your Syllaby homepage, {current_user.username}!",
        "data": "Some protected content here.",
    }
    current_week_details = None
    latest_syllabus = crud.get_most_recent_syllabus_by_user(db, user_id=current_user.id)
    if latest_syllabus:
        try:
            structured_data = json.loads(latest_syllabus.generated_content)
            current_week_number = None
            if latest_syllabus.created_at:
                delta = datetime.now(timezone.utc) - latest_syllabus.created_at.replace(
                    tzinfo=timezone.utc
                )
                calculated_week = (delta.days // 7) + 1
                current_week_number = max(1, calculated_week)
            if current_week_number is not None:
                current_week_data = next(
                    (
                        w
                        for w in structured_data.get("weeks", [])
                        if w.get("week_number") == current_week_number
                    ),
                    None,
                )
                if current_week_data:
                    current_week_details = schemas.CurrentWeekDetails(
                        syllabus_id=latest_syllabus.id,
                        syllabus_title=latest_syllabus.title,
                        week_number=current_week_data.get("week_number"),
                        week_title=current_week_data.get("title"),
                        daily_tasks=current_week_data.get("daily_tasks", []),
                    )
        except (json.JSONDecodeError, AttributeError):
            current_week_details = None
    return schemas.HomePageData(**original_data, current_week=current_week_details)


@app.post(
    "/syllaby", response_model=schemas.Syllabus, status_code=status.HTTP_201_CREATED
)
async def create_syllaby_endpoint(
    syllaby: schemas.SyllabusCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    prompt = f"""
    You are Syllaby AI, an expert at creating structured, day-by-day study plans.
    Your task is to transform a user's raw course outline into a detailed, structured JSON object.
    
    **CRITICAL: Your ENTIRE output MUST be a single, raw, valid JSON object. Do NOT include any text, explanations, or markdown fences like ```json before or after the JSON object.**
    
    The root of the JSON object must contain an "introduction" (string) and "weeks" (array of objects).
    Each object inside the "weeks" array MUST have the following keys: "week_number", "title", "learning_objectives", "daily_tasks", "quiz_topics", "resources".

    **EXAMPLE OF A PERFECT WEEK OBJECT:**
    {{
      "week_number": 1,
      "title": "Introduction to Core Concepts",
      "learning_objectives": [
        "Understand the definition of X.",
        "Identify the key components of Y."
      ],
      "daily_tasks": [
        {{ "day": "Monday", "tasks": ["Read Chapter 1", "Watch intro video"] }},
        {{ "day": "Wednesday", "tasks": ["Complete Exercise 1.1", "Review notes"] }},
        {{ "day": "Friday", "tasks": ["Start small project", "Take practice quiz"] }}
      ],
      "quiz_topics": ["Core Definitions", "Key Components"],
      "resources": [
        {{ "type": "Video", "description": "Introduction to X", "source": "YouTube" }},
        {{ "type": "Article", "description": "The History of Y", "source": "Tech Journal" }}
      ]
    }}
    
    Adhere strictly to this example structure for every week.
    Before finishing, double-check that all brackets and braces are correctly closed and there are no trailing commas.
    
    --- USER INPUT ---
    Course Title: {syllaby.title}
    Course Code: {syllaby.course_code or 'N/A'}
    Raw Course Outline: {syllaby.raw_input_outline}
    Total Duration: {syllaby.duration} {syllaby.unit}
    --- END USER INPUT ---
    Your entire response is the JSON object:
    """

    max_retries = 3
    last_error = None

    for attempt in range(max_retries):
        try:
            raw_ai_response = call_ollama(prompt, num_predict=16384)
            parsed_json = _extract_and_parse_json(raw_ai_response)
            cleaned_json_string = json.dumps(parsed_json)
            break
        except (ValueError, json.JSONDecodeError) as e:
            last_error = e
            print(
                f"Syllabus generation attempt {attempt + 1}/{max_retries} failed: {e}"
            )
            cleaned_json_string = None
            continue

    if not cleaned_json_string:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"The AI failed to generate a valid syllabus structure after {max_retries} attempts. Please try again. Error: {last_error}",
        )

    db_syllaby = crud.create_user_syllaby(
        db=db,
        syllaby=syllaby,
        user_id=current_user.id,
        generated_content=cleaned_json_string,
    )

    try:
        kanban_prompt = f"""
        You are an AI expert at creating actionable project plans.
        You will be given a JSON object representing a study plan.
        YOUR TASK:
        Analyze the `daily_tasks` for all weeks.
        From this analysis, generate a single, consolidated list of the most important, actionable "to-do" items.
        STRICT OUTPUT RULES:
        - The output MUST be a JSON array of strings.
        - Output ONLY the JSON array. Do not add explanations or markdown.
        --- FULL STUDY PLAN JSON ---
        {cleaned_json_string}
        --- END STUDY PLAN JSON ---
        CONSOLIDATED TASKS (JSON array of strings ONLY):
        """
        raw_kanban_response = call_ollama(kanban_prompt, num_predict=4096)
        task_titles = _extract_and_parse_json(raw_kanban_response, expected_type=list)

        if not isinstance(task_titles, list) or not all(
            isinstance(t, str) for t in task_titles
        ):
            raise ValueError(
                "AI response for Kanban tasks was not a simple list of strings."
            )

        kanban_data = [
            schemas.KanbanColumnCreate(title="To Do", tasks=task_titles),
            schemas.KanbanColumnCreate(title="In Progress", tasks=[]),
            schemas.KanbanColumnCreate(title="Done", tasks=[]),
        ]
        crud.create_kanban_board_from_ai(
            db=db, syllabus_id=db_syllaby.id, ai_kanban_data=kanban_data
        )
    except (json.JSONDecodeError, ValueError, KeyError) as e:
        print(
            f"WARNING: Failed to auto-generate Kanban board for syllabus {db_syllaby.id}: {e}"
        )

    db.refresh(db_syllaby)
    return db_syllaby


@app.get("/syllaby", response_model=list[schemas.Syllabus])
async def read_syllaby_list(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
    skip: int = 0,
    limit: int = 100,
):
    return crud.get_syllaby_by_user(db, user_id=current_user.id, skip=skip, limit=limit)


@app.get("/syllaby/{syllaby_id}", response_model=schemas.SyllabusDetail)
async def read_syllaby(
    syllaby_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    db_syllaby = crud.get_syllaby(db, syllaby_id=syllaby_id)
    if db_syllaby is None or db_syllaby.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Syllaby not found")

    try:
        structured_data = json.loads(db_syllaby.generated_content)

        current_week = None
        if db_syllaby.created_at:
            delta = datetime.now(timezone.utc) - db_syllaby.created_at.replace(
                tzinfo=timezone.utc
            )
            current_week = max(1, (delta.days // 7) + 1)

        response_data = schemas.SyllabusDetail(
            id=db_syllaby.id,
            title=db_syllaby.title,
            course_code=db_syllaby.course_code,
            raw_input_outline=db_syllaby.raw_input_outline,
            generated_content=db_syllaby.generated_content,
            owner_id=db_syllaby.owner_id,
            created_at=db_syllaby.created_at,
            updated_at=db_syllaby.updated_at,
            introduction=structured_data.get("introduction"),
            weeks=structured_data.get("weeks", []),
            current_week_number=current_week,
        )
        return response_data

    except (json.JSONDecodeError, ValidationError) as e:
        print(
            f"WARNING: Syllabus {syllaby_id} has corrupted content. Sending fallback response. Error: {e}"
        )

        return schemas.SyllabusDetail(
            id=db_syllaby.id,
            title=db_syllaby.title,
            course_code=db_syllaby.course_code,
            raw_input_outline=db_syllaby.raw_input_outline,
            generated_content=db_syllaby.generated_content,
            owner_id=db_syllaby.owner_id,
            created_at=db_syllaby.created_at,
            updated_at=db_syllaby.updated_at,
            introduction="[Error: The detailed content for this syllabus is corrupted and cannot be displayed. You may need to delete and regenerate it.]",
            weeks=[],
            current_week_number=None,
        )


@app.post("/syllaby/{syllaby_id}/regenerate", response_model=schemas.SyllabusDetail)
async def regenerate_syllaby_content(
    syllaby_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    db_syllaby = crud.get_syllaby(db, syllaby_id=syllaby_id)
    if db_syllaby is None or db_syllaby.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Syllaby not found")

    prompt = f"""
    You are Syllaby AI, an expert at creating structured, day-by-day study plans.
    Your task is to transform a user's raw course outline into a detailed, structured JSON object.
    
    **CRITICAL: Your ENTIRE output MUST be a single, raw, valid JSON object. Do NOT include any text, explanations, or markdown fences like ```json before or after the JSON object.**
    
    The root of the JSON object must contain an "introduction" (string) and "weeks" (array of objects).
    Each object inside the "weeks" array MUST have the following keys: "week_number", "title", "learning_objectives", "daily_tasks", "quiz_topics", "resources".

    **EXAMPLE OF A PERFECT WEEK OBJECT:**
    {{
      "week_number": 1,
      "title": "Introduction to Core Concepts",
      "learning_objectives": [ "Understand the definition of X.", "Identify the key components of Y." ],
      "daily_tasks": [
        {{ "day": "Monday", "tasks": ["Read Chapter 1", "Watch intro video"] }},
        {{ "day": "Wednesday", "tasks": ["Complete Exercise 1.1", "Review notes"] }}
      ],
      "quiz_topics": ["Core Definitions", "Key Components"],
      "resources": [ {{ "type": "Video", "description": "Introduction to X", "source": "YouTube" }} ]
    }}
    
    Adhere strictly to this example structure for every week.
    
    --- USER INPUT ---
    Course Title: {db_syllaby.title}
    Course Code: {db_syllaby.course_code or 'N/A'}
    Raw Course Outline: {db_syllaby.raw_input_outline}
    Total Duration: {db_syllaby.duration} {db_syllaby.unit}
    --- END USER INPUT ---
    Your entire response is the JSON object:
    """

    try:
        raw_ai_response = call_ollama(prompt, num_predict=16384)
        new_content_obj = _extract_and_parse_json(raw_ai_response)
        new_content = json.dumps(new_content_obj)
    except (ValueError, json.JSONDecodeError) as e:
        raise HTTPException(
            status_code=500, detail=f"AI regeneration failed to produce valid JSON: {e}"
        )

    update_data = schemas.SyllabusUpdate(generated_content=new_content)
    updated_syllaby = crud.update_syllaby(db, db_syllaby, update_data)

    return await read_syllaby(updated_syllaby.id, current_user, db)


@app.put("/syllaby/{syllaby_id}", response_model=schemas.Syllabus)
async def update_syllaby_endpoint(
    syllaby_id: int,
    syllaby_update: schemas.SyllabusUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    db_syllaby = crud.get_syllaby(db, syllaby_id=syllaby_id)
    if db_syllaby is None:
        raise HTTPException(status_code=404, detail="Syllaby not found")
    if db_syllaby.owner_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to update this syllaby"
        )
    return crud.update_syllaby(
        db=db, db_syllaby=db_syllaby, syllaby_update=syllaby_update
    )


@app.delete("/syllaby/{syllaby_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_syllaby_endpoint(
    syllaby_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    db_syllaby = crud.get_syllaby(db, syllaby_id=syllaby_id)
    if db_syllaby is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    if db_syllaby.owner_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized to delete this syllaby"
        )
    if not crud.delete_syllaby(db, syllaby_id):
        raise HTTPException(status_code=500, detail="Failed to delete syllaby")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/syllaby/{syllaby_id}/kanban", response_model=schemas.KanbanBoard)
async def get_kanban_board_endpoint(
    syllaby_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    db_syllaby = crud.get_syllaby(db, syllaby_id=syllaby_id)
    if db_syllaby is None or db_syllaby.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Syllaby not found")
    board = crud.get_kanban_board_by_syllabus_id(db, syllabus_id=syllaby_id)
    if not board:
        raise HTTPException(
            status_code=404,
            detail="Kanban board not found for this syllaby. It might need to be generated.",
        )
    return board


@app.post("/ai/summarize", response_model=schemas.SummaryOutput)
async def summarize_content(
    input: schemas.TextProcessInput,
    current_user: models.User = Depends(auth.get_current_user),
):
    prompt = f"""Summarize the following text concisely and clearly. TEXT: {input.content} SUMMARY:"""
    return {"summary": call_ollama(prompt)}


@app.post("/ai/key-terms", response_model=schemas.KeyTermsOutput)
async def extract_key_terms(
    input: schemas.TextProcessInput,
    current_user: models.User = Depends(auth.get_current_user),
):
    prompt = f"""Extract key terms from the following text as a comma-separated list. TEXT: {input.content} KEY TERMS:"""
    raw_terms = call_ollama(prompt)
    return {
        "key_terms": [term.strip() for term in raw_terms.split(",") if term.strip()]
    }


@app.post("/ai/flashcards", response_model=schemas.FlashcardsOutput)
async def generate_flashcards(
    input: schemas.TextProcessInput,
    current_user: models.User = Depends(auth.get_current_user),
):
    prompt = f"""Generate flashcards from the text as a JSON array of objects with "front" and "back" keys. TEXT: {input.content} FLASHCARDS (JSON array):"""
    raw_response = call_ollama(prompt)
    try:
        flashcards_data = _extract_and_parse_json(raw_response, expected_type=list)
        if not isinstance(flashcards_data, list) or not all(
            isinstance(f, dict) and "front" in f and "back" in f
            for f in flashcards_data
        ):
            raise ValueError("JSON structure does not match flashcard format.")
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI model generated invalid flashcard JSON: {e}. Raw: {raw_response[:500]}...",
        )
    return {"flashcards": flashcards_data}


@app.post("/notes", response_model=schemas.Note, status_code=status.HTTP_201_CREATED)
async def create_note_endpoint(
    note: schemas.NoteCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    return crud.create_user_note(
        db=db,
        note=note,
        user_id=current_user.id,
        summary=note.summary,
        key_terms=note.key_terms,
        flashcards=note.flashcards,
    )


@app.get("/notes", response_model=list[schemas.Note])
async def read_notes_list(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
    skip: int = 0,
    limit: int = 100,
):
    return crud.get_notes_by_user(db, user_id=current_user.id, skip=skip, limit=limit)


@app.get("/notes/{note_id}", response_model=schemas.Note)
async def read_note(
    note_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    db_note = crud.get_note(db, note_id=note_id)
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    if db_note.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return db_note


@app.put("/notes/{note_id}", response_model=schemas.Note)
async def update_note_endpoint(
    note_id: int,
    note_update: schemas.NoteUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    db_note = crud.get_note(db, note_id=note_id)
    if db_note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    if db_note.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.update_note(db=db, db_note=db_note, note_update=note_update)


@app.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note_endpoint(
    note_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    db_note = crud.get_note(db, note_id=note_id)
    if db_note is None:
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    if db_note.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not crud.delete_note(db, note_id):
        raise HTTPException(status_code=500, detail="Failed to delete note")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/ai/generate-quiz", response_model=schemas.QuizOutput)
async def generate_quiz_endpoint(
    quiz_input: schemas.QuizGenerateInput,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    combined_content = []
    if quiz_input.syllaby_ids:
        syllaby_list = crud.get_syllaby_by_ids(
            db, quiz_input.syllaby_ids, current_user.id
        )
        if len(syllaby_list) != len(quiz_input.syllaby_ids):
            raise HTTPException(status_code=404, detail="Syllabus not found.")
        for syllaby in syllaby_list:
            combined_content.append(
                f"Syllabus: {syllaby.title}\nContent:\n{syllaby.generated_content}\n"
            )
    if quiz_input.note_ids:
        notes_list = crud.get_notes_by_ids(db, quiz_input.note_ids, current_user.id)
        if len(notes_list) != len(quiz_input.note_ids):
            raise HTTPException(status_code=404, detail="Note not found.")
        for note in notes_list:
            combined_content.append(
                f"Note: {note.title}\nContent:\n{note.original_content}\n{note.summary or ''}\n"
            )
    if not combined_content:
        raise HTTPException(status_code=400, detail="No content sources provided.")

    full_content_for_ai = "\n---\n".join(combined_content)
    final_quiz_data = []

    if quiz_input.question_type == "multiple_choice":
        qa_prompt = f"""Generate {quiz_input.num_questions} questions and correct answers from the content. JSON OUTPUT ONLY: array of objects with "question" and "correct_answer". CONTENT: {full_content_for_ai}"""
        try:
            raw_qa_response = call_ollama(qa_prompt, num_predict=4096)
            qa_pairs = _extract_and_parse_json(raw_qa_response, expected_type=list)
            if not isinstance(qa_pairs, list):
                raise ValueError("Expected a list.")
            qa_pairs = qa_pairs[: quiz_input.num_questions]
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"AI failed to generate Q/A pairs: {e}"
            )

        for qa in qa_pairs:
            try:
                question_text, correct_answer_text = (
                    qa["question"],
                    qa["correct_answer"],
                )
                distractor_prompt = f"""Generate 3 incorrect answers for this question. Question: "{question_text}" Correct Answer: "{correct_answer_text}" JSON OUTPUT ONLY: array of 3 strings."""
                raw_distractors_response = call_ollama(
                    distractor_prompt, num_predict=1024
                )
                distractors = _extract_and_parse_json(
                    raw_distractors_response, expected_type=list
                )

                if not isinstance(distractors, list) or len(distractors) != 3:
                    continue
                options = [correct_answer_text] + distractors
                random.shuffle(options)
                final_quiz_data.append(
                    {
                        "question": question_text,
                        "options": options,
                        "correct_answer": correct_answer_text,
                        "question_type": "multiple_choice",
                    }
                )
            except Exception as e:
                print(f"WARNING: Failed to process MC question: {e}. Skipping.")
                continue
    elif quiz_input.question_type == "true_false":
        prompt = f"""Generate {quiz_input.num_questions} factual statements. JSON OUTPUT ONLY: array of objects with "statement" (string) and "is_true" (boolean). CONTENT: {full_content_for_ai}"""
        try:
            raw_statements_response = call_ollama(prompt, num_predict=4096)
            statements = _extract_and_parse_json(
                raw_statements_response, expected_type=list
            )
            if not isinstance(statements, list):
                raise ValueError("Expected array.")
            statements = statements[: quiz_input.num_questions]
            for item in statements:
                if (
                    "statement" in item
                    and "is_true" in item
                    and isinstance(item["is_true"], bool)
                ):
                    final_quiz_data.append(
                        {
                            "question": item["statement"],
                            "correct_answer": "True" if item["is_true"] else "False",
                            "question_type": "true_false",
                        }
                    )
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"AI failed to generate T/F statements: {e}"
            )
    else:
        prompt = f"""Generate a quiz with {quiz_input.num_questions} {quiz_input.question_type} questions. JSON OUTPUT ONLY: array of objects with "question" and "correct_answer". CONTENT: {full_content_for_ai}"""
        try:
            raw_quiz_response = call_ollama(prompt, num_predict=4096)
            quiz_data = _extract_and_parse_json(raw_quiz_response, expected_type=list)
            if not isinstance(quiz_data, list):
                raise ValueError("Expected array.")
            quiz_data = quiz_data[: quiz_input.num_questions]
            for q in quiz_data:
                q["question_type"] = quiz_input.question_type
                final_quiz_data.append(q)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"AI failed to generate {quiz_input.question_type} quiz: {e}",
            )

    if not final_quiz_data:
        raise HTTPException(
            status_code=500, detail="AI failed to generate any valid questions."
        )
    return {"quiz": final_quiz_data}


@app.post("/ai/submit-quiz", response_model=schemas.QuizResultOutput)
async def submit_quiz_endpoint(
    submission_input: schemas.QuizSubmissionInput,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    total_questions = len(submission_input.quiz_questions)
    correct_count = 0
    results_detail = []
    user_answers_map = {
        ua.question_index: ua.user_answer for ua in submission_input.user_answers
    }

    for i, question in enumerate(submission_input.quiz_questions):
        user_answer = user_answers_map.get(i, "").strip()
        correct_answer = question.correct_answer.strip()
        is_correct = (
            (
                fuzz.ratio(user_answer.lower(), correct_answer.lower())
                >= submission_input.fuzzy_match_threshold
            )
            if question.question_type == "short_answer"
            else (user_answer.lower() == correct_answer.lower())
        )
        if is_correct:
            correct_count += 1
        results_detail.append(
            schemas.QuestionResult(
                question_index=i,
                is_correct=is_correct,
                user_answer=user_answer,
                correct_answer=correct_answer,
            )
        )

    score = int((correct_count / total_questions) * 100) if total_questions > 0 else 0
    try:
        topic_name = (
            f"Quiz on '{submission_input.quiz_questions[0].question[:30]}...'"
            if submission_input.quiz_questions
            else "General Quiz"
        )
        crud.create_quiz_attempt(
            db, user_id=current_user.id, score=score, topic=topic_name
        )
    except Exception as e:
        print(
            f"WARNING: Could not save quiz attempt for user {current_user.id}. Error: {e}"
        )
    return schemas.QuizResultOutput(
        score=score,
        total_correct=correct_count,
        total_questions=total_questions,
        results_detail=results_detail,
    )


def _get_combined_content(
    syllaby_ids: Optional[List[int]],
    note_ids: Optional[List[int]],
    user_id: int,
    db: Session,
) -> str:
    combined_content_parts = []
    if syllaby_ids:
        syllaby_list = crud.get_syllaby_by_ids(db, syllaby_ids, user_id)
        if len(syllaby_list) != len(syllaby_ids):
            raise HTTPException(
                status_code=404, detail="One or more syllabi not found."
            )
        for syllaby in syllaby_list:
            content = syllaby.generated_content or syllaby.raw_input_outline
            if content and content.strip():
                combined_content_parts.append(
                    f"Syllaby: {syllaby.title}\nContent:\n{content.strip()}\n"
                )
    if note_ids:
        notes_list = crud.get_notes_by_ids(db, note_ids, user_id)
        if len(notes_list) != len(note_ids):
            raise HTTPException(status_code=404, detail="One or more notes not found.")
        for note in notes_list:
            content = note.original_content or (note.summary if note.summary else "")
            if content and content.strip():
                combined_content_parts.append(
                    f"Note: {note.title}\nContent:\n{content.strip()}\n"
                )
    if not combined_content_parts:
        raise HTTPException(
            status_code=400, detail="No extractable content found in sources."
        )
    return "\n---\n".join(combined_content_parts)


@app.post(
    "/ai/generate-freeform-question", response_model=schemas.FreeFormQuestionOutput
)
async def generate_freeform_question_endpoint(
    question_input: schemas.FreeFormQuestionGenerateInput,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    combined_content = _get_combined_content(
        question_input.syllaby_ids, question_input.note_ids, current_user.id, db
    )

    prompt = f"""
    Based on the following content, generate ONE SINGLE open-ended question of {question_input.difficulty} difficulty.

    **CRITICAL**: Your output MUST be a single, valid JSON object with one key: "question".
    Example: {{"question": "What is the primary theme of the provided text?"}}

    Do not include any other text, explanations, or markdown fences.

    --- CONTENT ---
    {combined_content}
    --- END CONTENT ---

    JSON OUTPUT:
    """

    try:
        raw_output = call_ollama(prompt, num_predict=1024)
        parsed_json = _extract_and_parse_json(raw_output)

        question_text = parsed_json.get("question")
        if (
            not question_text
            or not isinstance(question_text, str)
            or not question_text.strip()
        ):
            raise ValueError(
                "AI returned a malformed or empty question in the JSON object."
            )

        question_id = str(uuid.uuid4())

        freeform_question_cache[question_id] = {
            "question": question_text,
            "source_content_context": combined_content,
        }

        return schemas.FreeFormQuestionOutput(
            question_id=question_id, question=question_text
        )
    except (ValueError, KeyError) as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI failed to generate a valid question structure: {e}",
        )


@app.post("/ai/score-freeform-answer", response_model=schemas.FreeFormAnswerOutput)
async def score_freeform_answer_endpoint(
    answer_input: schemas.FreeFormAnswerInput,
    current_user: models.User = Depends(auth.get_current_user),
):
    try:
        cached_data = freeform_question_cache[answer_input.question_id]
        question = cached_data["question"]
        context = cached_data["source_content_context"]
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found or session expired. Please generate a new question.",
        )

    prompt = f"""
    You are a strict AI evaluator. Your primary task is to compare the USER'S ANSWER directly against the provided CONTEXT and score it.

    **CRITICAL RULES:**
    1.  You MUST evaluate ONLY the text provided in the "USER'S ANSWER" section. Do NOT invent a good answer and evaluate that.
    2.  If the USER'S ANSWER is nonsensical, gibberish, completely irrelevant to the question, or says "I don't know", you MUST give a `score_percentage` of 0.
    3.  Your feedback must directly address the provided USER'S ANSWER, explaining why it is correct or incorrect.

    **JSON OUTPUT FORMAT (MANDATORY):**
    Your output MUST be a single, valid JSON object with three keys:
    1. "is_correct" (boolean): Is the answer fundamentally correct?
    2. "score_percentage" (integer): A score from 0 to 100.
    3. "feedback" (string): Constructive feedback explaining the score.

    --- CONTEXT TO EVALUATE AGAINST ---
    {context}
    --- END CONTEXT ---

    --- QUESTION ---
    {question}
    --- END QUESTION ---

    --- USER'S ANSWER ---
    {answer_input.user_answer}
    --- END USER'S ANSWER ---

    JSON EVALUATION:
    """
    raw_response = call_ollama(prompt, num_predict=1024)

    try:
        del freeform_question_cache[answer_input.question_id]

        parsed_data = _extract_and_parse_json(raw_response)

        return schemas.FreeFormAnswerOutput(**parsed_data)

    except (json.JSONDecodeError, ValueError, ValidationError, KeyError) as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI model generated an invalid evaluation. Please try again. Error: {e}. Raw response: {raw_response[:500]}...",
        )


@app.post("/ai/chat/start", response_model=schemas.ChatSessionOutput)
async def start_chat_session(
    session_input: schemas.ChatSessionStartInput,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    session_id = str(uuid.uuid4())
    combined_content = ""
    if session_input.syllaby_ids or session_input.note_ids:
        combined_content = _get_combined_content(
            session_input.syllaby_ids, session_input.note_ids, current_user.id, db
        )

    system_prompt = (
        f"You are Syllaby AI, an educational chatbot. Your knowledge base is the following study content. Base your answers strictly on it. If the answer is not in the content, say so. STUDY CONTENT: {combined_content}"
        if combined_content
        else "You are Syllaby AI, a helpful and friendly AI assistant."
    )

    greeting_elicit_prompt = (
        "Briefly acknowledge that you have loaded the study content and are ready to answer questions."
        if combined_content
        else "Start with a friendly greeting and ask how you can help."
    )

    initial_messages = [
        schemas.ChatMessage(role="system", content=system_prompt),
        schemas.ChatMessage(role="user", content=greeting_elicit_prompt),
    ]

    initial_ai_message_content = call_ollama(messages=initial_messages, num_predict=256)

    final_initial_history = [
        schemas.ChatMessage(role="system", content=system_prompt),
        schemas.ChatMessage(role="assistant", content=initial_ai_message_content),
    ]

    chat_sessions[session_id] = {
        "user_id": current_user.id,
        "messages": final_initial_history,
    }

    return schemas.ChatSessionOutput(
        session_id=session_id, initial_message=initial_ai_message_content
    )


@app.post("/ai/chat/{session_id}/message", response_model=schemas.ChatResponseOutput)
async def send_chat_message(
    chat_message_input: schemas.ChatRequestInput,
    session_id: str = Path(..., description="The ID of the chat session."),
    current_user: models.User = Depends(auth.get_current_user),
):
    if session_id not in chat_sessions:
        raise HTTPException(
            status_code=404, detail="Chat session not found or has expired."
        )
    session_data = chat_sessions[session_id]
    if session_data["user_id"] != current_user.id:
        raise HTTPException(
            status_code=403, detail="Not authorized for this chat session."
        )

    messages_history = session_data["messages"]
    messages_history.append(
        schemas.ChatMessage(role="user", content=chat_message_input.user_message)
    )

    try:
        ai_response = call_ollama(messages=messages_history, num_predict=1024)
        messages_history.append(
            schemas.ChatMessage(role="assistant", content=ai_response)
        )
        chat_sessions[session_id]["messages"] = messages_history
        return schemas.ChatResponseOutput(assistant_message=ai_response)
    except HTTPException as e:
        raise e


@app.post(
    "/kanban", response_model=schemas.KanbanBoard, status_code=status.HTTP_201_CREATED
)
async def create_kanban_board_endpoint(
    board: schemas.KanbanBoardCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    return crud.create_user_kanban_board(db=db, board=board, user_id=current_user.id)


@app.get("/kanban", response_model=List[schemas.KanbanBoard])
async def get_kanban_boards_endpoint(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    return crud.get_kanban_boards_by_user(db=db, user_id=current_user.id)


@app.get("/kanban/{board_id}", response_model=schemas.KanbanBoard)
async def get_kanban_board_details_endpoint(
    board_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    board = crud.get_kanban_board(db, board_id=board_id, user_id=current_user.id)
    if not board:
        raise HTTPException(status_code=404, detail="Kanban board not found")
    return board


@app.post(
    "/kanban/columns/{column_id}/tasks",
    response_model=schemas.KanbanTask,
    status_code=201,
)
async def create_kanban_task_endpoint(
    column_id: int,
    task: schemas.KanbanTaskCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    db_task = crud.create_kanban_task(
        db, task=task, column_id=column_id, user_id=current_user.id
    )
    if not db_task:
        raise HTTPException(
            status_code=404, detail="Column not found or permission denied."
        )
    return db_task


@app.put("/kanban/{board_id}/move-task", response_model=schemas.KanbanTask)
async def move_task_on_board(
    board_id: int,
    move_data: schemas.KanbanTaskMove,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    updated_task = crud.move_kanban_task(
        db=db, move_data=move_data, user_id=current_user.id
    )
    if not updated_task:
        raise HTTPException(
            status_code=404, detail="Task or column not found, or permission denied."
        )
    return updated_task


@app.get("/kanban/tasks/all", response_model=List[schemas.KanbanTask])
async def get_all_user_tasks_endpoint(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    return crud.get_all_tasks_by_user(db=db, user_id=current_user.id)


@app.get("/kanban/tasks/{task_id}", response_model=schemas.KanbanTask)
async def get_task_details_endpoint(
    task_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    task = crud.get_task_by_id(db, task_id=task_id, user_id=current_user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.put("/kanban/tasks/{task_id}", response_model=schemas.KanbanTask)
async def update_task_details_endpoint(
    task_id: int,
    task_update: schemas.KanbanTaskUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    db_task = crud.get_task_by_id(db, task_id=task_id, user_id=current_user.id)
    if not db_task:
        raise HTTPException(
            status_code=404, detail="Task not found or permission denied"
        )

    is_being_completed = task_update.completed is True and not db_task.completed
    updated_task = crud.update_kanban_task(
        db=db, db_task=db_task, task_update=task_update
    )
    if is_being_completed:
        crud.update_user_streak(db, user=current_user)
    return updated_task


@app.delete("/kanban/tasks/{task_id}", status_code=204)
async def delete_task_endpoint(
    task_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    if not crud.delete_kanban_task(db, task_id=task_id, user_id=current_user.id):
        raise HTTPException(
            status_code=404, detail="Task not found or permission denied"
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/ai/process-content", response_model=schemas.ProcessedNoteContent)
async def process_content_for_note(
    input: schemas.TextProcessInput,
    current_user: models.User = Depends(auth.get_current_user),
):
    summary = ""
    key_terms = []
    flashcards = []

    try:
        summary_prompt = f"Summarize the following text concisely and clearly. TEXT: {input.content} SUMMARY:"
        summary = call_ollama(summary_prompt)
    except Exception as e:
        print(f"Warning: Failed to generate summary. Error: {e}")

    try:
        terms_prompt = f"""Extract key terms from the text. Respond with ONLY a single, valid JSON array of strings. Example: ["Term 1", "Term 2"]. TEXT: {input.content}"""
        raw_terms_response = call_ollama(terms_prompt, num_predict=1024)
        key_terms = _extract_and_parse_json(raw_terms_response, expected_type=list)
        if not isinstance(key_terms, list):
            key_terms = []
    except Exception as e:
        print(f"Warning: Failed to generate key terms. Error: {e}")

    try:
        flashcards_prompt = f"""Generate flashcards from the text as a JSON array of objects with "front" and "back" keys. TEXT: {input.content} FLASHCARDS (JSON array):"""
        raw_flashcards_response = call_ollama(flashcards_prompt)
        flashcards_data = _extract_and_parse_json(
            raw_flashcards_response, expected_type=list
        )
        if isinstance(flashcards_data, list):
            flashcards = [
                schemas.Flashcard(**fc)
                for fc in flashcards_data
                if "front" in fc and "back" in fc
            ]
    except Exception as e:
        print(f"Warning: Failed to generate flashcards. Error: {e}")

    return schemas.ProcessedNoteContent(
        original_content=input.content,
        summary=summary,
        key_terms=key_terms,
        flashcards=flashcards,
    )


@app.post("/ai/process-note/{note_id}", response_model=schemas.Note)
async def reprocess_note_content(
    note_id: int,
    reprocess_input: schemas.NoteReprocessInput,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    db_note = crud.get_note(db, note_id=note_id)
    if db_note is None or db_note.owner_id != current_user.id:
        raise HTTPException(
            status_code=404, detail="Note not found or permission denied."
        )

    content = db_note.original_content
    update_data = schemas.NoteUpdate()

    if reprocess_input.action in ["summary", "all"]:
        prompt = f"Summarize concisely: {content}"
        update_data.summary = call_ollama(prompt)
    if reprocess_input.action in ["key-terms", "all"]:
        prompt = f"""Extract key terms from the text. Respond with ONLY a single, valid JSON array of strings. Example: ["Term 1", "Term 2"]. TEXT: {content}"""
        raw_terms = call_ollama(prompt, num_predict=1024)
        try:
            update_data.key_terms = _extract_and_parse_json(
                raw_terms, expected_type=list
            )
        except (ValueError, json.JSONDecodeError):
            update_data.key_terms = []
    if reprocess_input.action in ["flashcards", "all"]:
        prompt = f"""Generate flashcards as a JSON array of objects with "front" and "back" keys: {content}"""
        raw_flashcards = call_ollama(prompt)
        try:
            flashcards = _extract_and_parse_json(raw_flashcards, expected_type=list)
            update_data.flashcards = [schemas.Flashcard(**fc) for fc in flashcards]
        except (json.JSONDecodeError, ValueError, ValidationError) as e:
            print(f"Warning: Could not parse flashcards from AI: {e}")
            update_data.flashcards = []

    return crud.update_note(db=db, db_note=db_note, note_update=update_data)


@app.delete("/kanban/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kanban_board_endpoint(
    board_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    if not crud.delete_kanban_board(db=db, board_id=board_id, user_id=current_user.id):
        raise HTTPException(
            status_code=404, detail="Kanban board not found or permission denied"
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post(
    "/syllaby/{syllabus_id}/create-kanban",
    response_model=schemas.KanbanBoard,
    status_code=201,
)
async def create_kanban_from_existing_syllabus(
    syllabus_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    db_syllabus = crud.get_syllaby(db, syllaby_id=syllabus_id)
    if db_syllabus is None or db_syllabus.owner_id != current_user.id:
        raise HTTPException(
            status_code=404, detail="Syllabus not found or permission denied."
        )
    if crud.get_kanban_board_by_syllabus_id(db, syllabus_id=syllabus_id):
        raise HTTPException(
            status_code=409, detail="A Kanban board already exists for this syllabus."
        )
    try:
        structured_data = json.loads(db_syllabus.generated_content)
        all_tasks = [
            task
            for week in structured_data.get("weeks", [])
            for day_schedule in week.get("daily_tasks", [])
            for task in day_schedule.get("tasks", [])
        ]
        kanban_data = [
            schemas.KanbanColumnCreate(title="To Do", tasks=all_tasks),
            schemas.KanbanColumnCreate(title="In Progress", tasks=[]),
            schemas.KanbanColumnCreate(title="Done", tasks=[]),
        ]
        new_board = crud.create_kanban_board_from_ai(
            db=db, syllabus_id=db_syllabus.id, ai_kanban_data=kanban_data
        )
        if not new_board:
            raise HTTPException(
                status_code=500, detail="Failed to save the Kanban board."
            )
        return new_board
    except (json.JSONDecodeError, KeyError) as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create Kanban board. Syllabus content may be malformed. Error: {e}",
        )


@app.get("/progress/dashboard", response_model=schemas.ProgressDashboardData)
async def get_progress_dashboard(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    task_counts = crud.get_task_counts_by_user(db, user_id=current_user.id)
    total_tasks = task_counts["total"]
    completed_tasks = task_counts["completed"]

    upcoming_tasks = crud.get_upcoming_tasks(db, user_id=current_user.id, days_ahead=7)
    recent_quizzes = crud.get_recent_quiz_attempts(db, user_id=current_user.id, limit=5)
    
    ai_insight = None
    if upcoming_tasks or recent_quizzes:
        tasks_summary = [f"- '{t.title}' due on {t.due_date.strftime('%Y-%m-%d')}" for t in upcoming_tasks if t.due_date]
        quizzes_summary = [f"- Scored {q.score}% on '{q.quiz_topic}'" for q in recent_quizzes]
        prompt = f"""Analyze student progress and provide one actionable insight. JSON OUTPUT ONLY with "insight_text" (string) and "severity" ("low", "medium", "high"). DATA: Upcoming Tasks: {chr(10).join(tasks_summary) or "None"}, Recent Quizzes: {chr(10).join(quizzes_summary) or "None"}"""
        
        try:
            raw_response = call_ollama(prompt, num_predict=512)
            parsed_data = _extract_and_parse_json(raw_response)
            ai_insight = schemas.AIPoweredInsight(**parsed_data)
        except Exception as e:
            print(f"Warning: Failed to generate AI insight for dashboard. Error: {e}")
            ai_insight = schemas.AIPoweredInsight(insight_text="Could not generate AI insight at this time.", severity="low")
    else:
        ai_insight = schemas.AIPoweredInsight(insight_text="Not enough data yet for insights. Complete some tasks or quizzes!", severity="low")

    return schemas.ProgressDashboardData(
        streaks=schemas.UserStreakInfo.from_orm(current_user),
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        completion_percentage=round((completed_tasks / total_tasks) * 100 if total_tasks > 0 else 0, 2),
        upcoming_tasks=upcoming_tasks,
        active_challenges=crud.get_active_challenges_by_user(db, user_id=current_user.id),
        recent_quiz_scores=recent_quizzes,
        ai_insight=ai_insight,
    )


@app.get("/progress/ai-insights", response_model=schemas.AIPoweredInsight)
async def get_ai_powered_insights(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    upcoming_tasks = crud.get_upcoming_tasks(db, user_id=current_user.id, days_ahead=7)
    recent_quizzes = crud.get_recent_quiz_attempts(db, user_id=current_user.id, limit=5)

    if not upcoming_tasks and not recent_quizzes:
        return schemas.AIPoweredInsight(
            insight_text="Not enough data yet for insights.", severity="low"
        )

    tasks_summary = [
        f"- '{t.title}' due on {t.due_date.strftime('%Y-%m-%d')}"
        for t in upcoming_tasks
        if t.due_date
    ]
    quizzes_summary = [
        f"- Scored {q.score}% on '{q.quiz_topic}'" for q in recent_quizzes
    ]

    prompt = f"""Analyze student progress and provide one actionable insight. JSON OUTPUT ONLY with "insight_text" (string) and "severity" ("low", "medium", "high"). DATA: Upcoming Tasks: {chr(10).join(tasks_summary) or "None"}, Recent Quizzes: {chr(10).join(quizzes_summary) or "None"}"""

    try:
        raw_response = call_ollama(prompt, num_predict=512)
        parsed_data = _extract_and_parse_json(raw_response)
        return schemas.AIPoweredInsight(**parsed_data)
    except (json.JSONDecodeError, ValueError, KeyError, ValidationError) as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get insight from AI. Error: {e}"
        )


@app.post("/challenges", response_model=schemas.Challenge, status_code=201)
async def create_new_challenge(
    challenge_data: schemas.ChallengeCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    challenge = crud.create_challenge(
        db, user_id=current_user.id, challenge_data=challenge_data
    )
    if not challenge:
        raise HTTPException(
            status_code=400,
            detail="Could not create challenge. Ensure task IDs are valid.",
        )
    return challenge


@app.get("/challenges", response_model=List[schemas.Challenge])
async def get_user_challenges(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    return crud.get_active_challenges_by_user(db, user_id=current_user.id)

@app.get("/challenges/{challenge_id}", response_model=schemas.ChallengeDetail)
async def get_challenge_details(
    challenge_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    challenge = crud.get_challenge_by_id(db, challenge_id=challenge_id, user_id=current_user.id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return challenge

@app.put("/challenges/{challenge_id}", response_model=schemas.Challenge)
async def update_challenge_endpoint(
    challenge_id: int,
    challenge_update: schemas.ChallengeUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    db_challenge = crud.get_challenge_by_id(db, challenge_id=challenge_id, user_id=current_user.id)
    if not db_challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")
    return crud.update_challenge(db, db_challenge, challenge_update)

@app.delete("/challenges/{challenge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_challenge_endpoint(
    challenge_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db),
):
    if not crud.delete_challenge(db, challenge_id=challenge_id, user_id=current_user.id):
        raise HTTPException(status_code=404, detail="Challenge not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

