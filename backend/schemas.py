from pydantic import BaseModel, Field, computed_field, root_validator, validator, ConfigDict, EmailStr
from datetime import datetime, date
from typing import List, Optional, Literal
import json

V2_ORM_CONFIG = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)


class UserCreate(UserBase):
    email: EmailStr
    password: str = Field(..., min_length=8)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: str | None = None


class SyllabusBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    course_code: str | None = Field(None, max_length=20)
    raw_input_outline: str = Field(..., min_length=1)


class SyllabusCreate(SyllabusBase):
    duration: int = Field(..., ge=1, description="The duration of the course.")
    unit: Literal["weeks", "months"] = Field(
        ..., description="The unit for the duration."
    )


class SyllabusUpdate(SyllabusBase):
    title: str | None = Field(None, min_length=3, max_length=100)
    course_code: str | None = Field(None, max_length=20)
    raw_input_outline: str | None = Field(None, min_length=50)
    generated_content: str | None = None


class Syllabus(SyllabusBase):
    id: int
    generated_content: str
    owner_id: int
    created_at: datetime
    updated_at: datetime | None
    model_config = V2_ORM_CONFIG


class TextProcessInput(BaseModel):
    content: str = Field(..., min_length=50)


class SummaryOutput(BaseModel):
    summary: str


class KeyTermsOutput(BaseModel):
    key_terms: List[str]


class Flashcard(BaseModel):
    front: str
    back: str


class FlashcardsOutput(BaseModel):
    flashcards: List[Flashcard]


class KeyTerm(BaseModel):
    id: int
    term: str
    model_config = V2_ORM_CONFIG


class ProcessedNoteContent(BaseModel):
    original_content: str
    summary: Optional[str] = None
    key_terms: Optional[List[str]] = None
    flashcards: Optional[List[Flashcard]] = None


class NoteBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    original_content: str = Field(..., min_length=50)
    summary: Optional[str] = None


class NoteCreate(NoteBase):
    key_terms: Optional[List[str]] = None
    flashcards: Optional[List[Flashcard]] = None


class NoteUpdate(NoteBase):
    title: Optional[str] = Field(None, min_length=3, max_length=100)
    original_content: Optional[str] = Field(None, min_length=50)
    key_terms: Optional[List[str]] = None
    flashcards: Optional[List[Flashcard]] = None


class Note(NoteBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime | None
    key_terms_rel: List[KeyTerm] = []
    flashcards_rel: List[Flashcard] = []
    model_config = V2_ORM_CONFIG


class NoteReprocessInput(BaseModel):
    action: Literal["summary", "key-terms", "flashcards", "all"]


class QuizQuestion(BaseModel):
    question: str
    options: Optional[List[str]] = Field(None, min_items=2)
    correct_answer: str
    question_type: Literal["multiple_choice", "true_false", "short_answer"]


class QuizOutput(BaseModel):
    quiz: List[QuizQuestion]


class QuizGenerateInput(BaseModel):
    syllaby_ids: Optional[List[int]] = None
    note_ids: Optional[List[int]] = None
    num_questions: int = Field(5, ge=1, le=10)
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    question_type: Literal["multiple_choice", "true_false", "short_answer"] = (
        "multiple_choice"
    )

    @root_validator(pre=True)
    def check_at_least_one_source(cls, values):
        if not values.get("syllaby_ids") and not values.get("note_ids"):
            raise ValueError("At least one syllaby ID or note ID must be provided.")
        return values


class UserAnswer(BaseModel):
    question_index: int = Field(..., ge=0)
    user_answer: str


class QuizSubmissionInput(BaseModel):
    quiz_questions: List[QuizQuestion]
    user_answers: List[UserAnswer]
    fuzzy_match_threshold: int = Field(70, ge=0, le=100)


class QuestionResult(BaseModel):
    question_index: int
    is_correct: bool
    user_answer: str
    correct_answer: str


class QuizResultOutput(BaseModel):
    score: int = Field(..., ge=0, le=100)
    total_correct: int = Field(..., ge=0)
    total_questions: int = Field(..., ge=1)
    results_detail: List[QuestionResult]


class FreeFormQuestionGenerateInput(BaseModel):
    syllaby_ids: Optional[List[int]] = None
    note_ids: Optional[List[int]] = None
    difficulty: Literal["easy", "medium", "hard"] = "medium"

    @root_validator(pre=True)
    def check_at_least_one_source_freeform(cls, values):
        if not values.get("syllaby_ids") and not values.get("note_ids"):
            raise ValueError("At least one syllaby ID or note ID must be provided.")
        return values

class FreeFormQuestionOutput(BaseModel):
    question_id: str
    question: str


class FreeFormAnswerInput(BaseModel):
    question_id: str
    user_answer: str

class FreeFormAnswerOutput(BaseModel):
    is_correct: bool
    score_percentage: int = Field(..., ge=0, le=100)
    feedback: str


class ChatSessionStartInput(BaseModel):
    syllaby_ids: Optional[List[int]] = None
    note_ids: Optional[List[int]] = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatSessionOutput(BaseModel):
    session_id: str
    initial_message: str


class ChatRequestInput(BaseModel):
    user_message: str = Field(..., min_length=1)


class ChatResponseOutput(BaseModel):
    assistant_message: str


class KanbanTaskBase(BaseModel):
    title: str = Field("New Task")
    description: Optional[str] = None
    priority: Literal["Low", "Medium", "High"] = "Medium"
    due_date: Optional[datetime] = None
    completed: bool = False
    position: int = 0


class KanbanTaskCreate(BaseModel):
    title: str
    due_date: Optional[datetime] = None


class KanbanTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[Literal["Low", "Medium", "High"]] = None
    due_date: Optional[datetime] = None
    completed: Optional[bool] = None


class KanbanTask(KanbanTaskBase):
    id: int
    column_id: int
    model_config = V2_ORM_CONFIG


class KanbanTaskMove(BaseModel):
    task_id: int = Field(..., alias="taskId")
    source_column_id: int = Field(..., alias="sourceColumnId")
    destination_column_id: int = Field(..., alias="destinationColumnId")
    destination_index: int = Field(..., alias="destinationIndex")
    model_config = ConfigDict(populate_by_name=True)


class KanbanColumnBase(BaseModel):
    title: str


class KanbanColumnCreate(KanbanColumnBase):
    tasks: List[str] = []


class KanbanColumn(KanbanColumnBase):
    id: int
    tasks: List[KanbanTask] = []
    model_config = V2_ORM_CONFIG


class KanbanBoardBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)


class KanbanBoardCreate(KanbanBoardBase):
    pass


class KanbanBoard(KanbanBoardBase):
    id: int
    owner_id: int
    columns: List[KanbanColumn] = []
    syllabus_id: Optional[int] = None
    model_config = V2_ORM_CONFIG


class UserStreakInfo(BaseModel):
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[date] = None
    model_config = V2_ORM_CONFIG


class QuizAttempt(BaseModel):
    id: int
    score: int
    quiz_topic: str
    timestamp: datetime
    model_config = V2_ORM_CONFIG


class ChallengeBase(BaseModel):
    title: str
    description: Optional[str] = None
    end_date: datetime

class ChallengeCreate(ChallengeBase):
    task_ids: List[int] = Field(..., min_items=1)

class Challenge(ChallengeBase):
    id: int
    start_date: datetime
    status: str
    
    total_tasks: int = 0
    completed_tasks: int = 0

    @computed_field
    @property
    def completion_percentage(self) -> float:
        if self.total_tasks == 0:
            return 0.0
        return round((self.completed_tasks / self.total_tasks) * 100, 2)
    model_config = ConfigDict(from_attributes=True)


class AIPoweredInsight(BaseModel):
    insight_text: str
    severity: Literal["low", "medium", "high"]


class ProgressDashboardData(BaseModel):
    streaks: UserStreakInfo
    total_tasks: int
    completed_tasks: int
    completion_percentage: float
    upcoming_tasks: List[KanbanTask]
    active_challenges: List[Challenge]
    recent_quiz_scores: List[QuizAttempt]
    ai_insight: Optional[AIPoweredInsight] = None

class User(UserBase):
    id: int
    email: str
    syllaby: list["Syllabus"] = []
    notes: list["Note"] = []
    kanban_boards: list["KanbanBoard"] = []
    current_streak: int
    longest_streak: int
    last_activity_date: Optional[date]
    model_config = V2_ORM_CONFIG


class SyllabusResource(BaseModel):
    type: str
    description: str
    source: Optional[str] = None

class SyllabusDailyTask(BaseModel):
    day: str
    tasks: List[str]


class SyllabusWeek(BaseModel):
    week_number: int
    title: str
    learning_objectives: List[str] = []
    daily_tasks: List[SyllabusDailyTask] = []
    quiz_topics: List[str] = []
    resources: List[SyllabusResource] = []


class SyllabusDetail(SyllabusBase):
    id: int
    owner_id: int
    generated_content: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    introduction: Optional[str] = None
    weeks: List[SyllabusWeek] = []
    current_week_number: Optional[int] = None
    kanban_board: Optional[KanbanBoard] = None
    model_config = V2_ORM_CONFIG


class CurrentWeekDetails(BaseModel):
    syllabus_id: int
    syllabus_title: str
    week_number: int
    week_title: str
    daily_tasks: List[SyllabusDailyTask] = []


class HomePageData(BaseModel):
    message: str
    data: str
    current_week: Optional[CurrentWeekDetails] = None
    
class ChallengeDetail(Challenge):
    tasks: List[KanbanTask] = []
    model_config = ConfigDict(from_attributes=True)

class ChallengeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3)
    description: Optional[str] = None