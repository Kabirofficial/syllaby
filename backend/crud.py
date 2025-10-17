from sqlalchemy import desc, func, or_
from sqlalchemy.orm import Session
import models, schemas
from auth import get_password_hash
from typing import List
from datetime import date, timedelta, datetime


def get_user_by_username(db: Session, username: str) -> models.User | None:
    return db.query(models.User).filter(models.User.username == username).first()


def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_username_or_email(db: Session, identifier: str) -> models.User | None:
    return (
        db.query(models.User)
        .filter(
            or_(models.User.username == identifier, models.User.email == identifier)
        )
        .first()
    )


def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        username=user.username, email=user.email, hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_user_syllaby(
    db: Session, syllaby: schemas.SyllabusCreate, user_id: int, generated_content: str
) -> models.Syllabus:
    db_syllaby = models.Syllabus(
        title=syllaby.title,
        course_code=syllaby.course_code,
        raw_input_outline=syllaby.raw_input_outline,
        owner_id=user_id,
        generated_content=generated_content,
        duration=syllaby.duration,
        unit=syllaby.unit,
    )
    db.add(db_syllaby)
    db.commit()
    db.refresh(db_syllaby)
    return db_syllaby


def get_syllaby_by_user(
    db: Session, user_id: int, skip: int = 0, limit: int = 100
) -> list[models.Syllabus]:
    return (
        db.query(models.Syllabus)
        .filter(models.Syllabus.owner_id == user_id)
        .order_by(desc(models.Syllabus.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_syllaby(db: Session, syllaby_id: int) -> models.Syllabus | None:
    return db.query(models.Syllabus).filter(models.Syllabus.id == syllaby_id).first()


def get_syllaby_by_ids(
    db: Session, syllaby_ids: List[int], user_id: int
) -> List[models.Syllabus]:
    return (
        db.query(models.Syllabus)
        .filter(
            models.Syllabus.id.in_(syllaby_ids), models.Syllabus.owner_id == user_id
        )
        .all()
    )


def update_syllaby(
    db: Session, db_syllaby: models.Syllabus, syllaby_update: schemas.SyllabusUpdate
) -> models.Syllabus:
    update_data = syllaby_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_syllaby, key, value)
    db.add(db_syllaby)
    db.commit()
    db.refresh(db_syllaby)
    return db_syllaby


def delete_syllaby(db: Session, syllaby_id: int) -> bool:
    db_syllaby = (
        db.query(models.Syllabus).filter(models.Syllabus.id == syllaby_id).first()
    )
    if db_syllaby:
        db.delete(db_syllaby)
        db.commit()
        return True
    return False


def get_most_recent_syllabus_by_user(
    db: Session, user_id: int
) -> models.Syllabus | None:
    return (
        db.query(models.Syllabus)
        .filter(models.Syllabus.owner_id == user_id)
        .order_by(desc(models.Syllabus.created_at))
        .first()
    )


def create_user_note(
    db: Session,
    note: schemas.NoteCreate,
    user_id: int,
    summary: str | None = None,
    key_terms: List[str] | None = None,
    flashcards: List[schemas.Flashcard] | None = None,
) -> models.Note:
    db_note = models.Note(
        title=note.title,
        original_content=note.original_content,
        summary=summary,
        owner_id=user_id,
    )
    db.add(db_note)
    db.flush()

    if key_terms:
        for term_text in key_terms:
            db_key_term = models.KeyTerm(term=term_text, note_id=db_note.id)
            db.add(db_key_term)

    if flashcards:
        for fc in flashcards:
            db_flashcard = models.Flashcard(
                front=fc.front, back=fc.back, note_id=db_note.id
            )
            db.add(db_flashcard)

    db.commit()
    db.refresh(db_note)
    return db_note


def get_notes_by_user(
    db: Session, user_id: int, skip: int = 0, limit: int = 100
) -> list[models.Note]:
    return (
        db.query(models.Note)
        .filter(models.Note.owner_id == user_id)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_note(db: Session, note_id: int) -> models.Note | None:
    return db.query(models.Note).filter(models.Note.id == note_id).first()


def get_notes_by_ids(
    db: Session, note_ids: List[int], user_id: int
) -> List[models.Note]:
    return (
        db.query(models.Note)
        .filter(models.Note.id.in_(note_ids), models.Note.owner_id == user_id)
        .all()
    )


def update_note(
    db: Session, db_note: models.Note, note_update: schemas.NoteUpdate
) -> models.Note:
    update_data = note_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        if key not in ["key_terms", "flashcards"]:
            setattr(db_note, key, value)

    fields_set = getattr(note_update, 'model_fields_set', getattr(note_update, '__fields_set__', set()))

    if "key_terms" in fields_set:
        db.query(models.KeyTerm).filter(models.KeyTerm.note_id == db_note.id).delete(
            synchronize_session=False
        )
        if note_update.key_terms is not None:
            for term_text in note_update.key_terms:
                db_key_term = models.KeyTerm(term=term_text, note_id=db_note.id)
                db.add(db_key_term)

    if "flashcards" in fields_set:
        db.query(models.Flashcard).filter(
            models.Flashcard.note_id == db_note.id
        ).delete(synchronize_session=False)
        if note_update.flashcards is not None:
            for fc in note_update.flashcards: 
                db_flashcard = models.Flashcard(
                    front=fc.front, back=fc.back, note_id=db_note.id
                )
                db.add(db_flashcard)

    db.commit()
    db.refresh(db_note)
    return db_note

def delete_note(db: Session, note_id: int) -> bool:
    db_note = db.query(models.Note).filter(models.Note.id == note_id).first()
    if db_note:
        db.delete(db_note)
        db.commit()
        return True
    return False


def create_user_kanban_board(
    db: Session, board: schemas.KanbanBoardCreate, user_id: int
) -> models.KanbanBoard:
    db_board = models.KanbanBoard(title=board.title, owner_id=user_id)
    db.add(db_board)
    db.flush()
    default_columns = ["To Do", "In Progress", "Done"]
    for col_title in default_columns:
        db_column = models.KanbanColumn(title=col_title, board_id=db_board.id)
        db.add(db_column)
    db.commit()
    db.refresh(db_board)
    return db_board


def get_kanban_boards_by_user(db: Session, user_id: int) -> List[models.KanbanBoard]:
    return (
        db.query(models.KanbanBoard)
        .filter(models.KanbanBoard.owner_id == user_id)
        .all()
    )


def get_kanban_board(
    db: Session, board_id: int, user_id: int
) -> models.KanbanBoard | None:
    return (
        db.query(models.KanbanBoard)
        .filter(
            models.KanbanBoard.id == board_id, models.KanbanBoard.owner_id == user_id
        )
        .first()
    )


def create_kanban_board_from_ai(
    db: Session, syllabus_id: int, ai_kanban_data: List[schemas.KanbanColumnCreate]
) -> models.KanbanBoard | None:
    db_syllabus = (
        db.query(models.Syllabus).filter(models.Syllabus.id == syllabus_id).first()
    )
    if not db_syllabus:
        return None

    board_title = f"{db_syllabus.title} Board"
    db_board = models.KanbanBoard(
        title=board_title, owner_id=db_syllabus.owner_id, syllabus_id=db_syllabus.id
    )
    db.add(db_board)
    db.flush()

    for column_data in ai_kanban_data:
        db_column = models.KanbanColumn(title=column_data.title, board_id=db_board.id)
        db.add(db_column)
        db.flush()

        for index, task_title in enumerate(column_data.tasks):
            db_task = models.KanbanTask(
                title=task_title, column_id=db_column.id, position=index
            )
            db.add(db_task)

    db.commit()
    db.refresh(db_board)
    return db_board


def get_kanban_board_by_syllabus_id(
    db: Session, syllabus_id: int
) -> models.KanbanBoard | None:
    return (
        db.query(models.KanbanBoard)
        .filter(models.KanbanBoard.syllabus_id == syllabus_id)
        .first()
    )


def delete_kanban_board(db: Session, board_id: int, user_id: int) -> bool:
    db_board = (
        db.query(models.KanbanBoard)
        .filter(
            models.KanbanBoard.id == board_id, models.KanbanBoard.owner_id == user_id
        )
        .first()
    )
    if db_board:
        db.delete(db_board)
        db.commit()
        return True
    return False


def create_kanban_task(
    db: Session, task: schemas.KanbanTaskCreate, column_id: int, user_id: int
) -> models.KanbanTask | None:
    column = (
        db.query(models.KanbanColumn)
        .join(models.KanbanBoard)
        .filter(
            models.KanbanColumn.id == column_id, models.KanbanBoard.owner_id == user_id
        )
        .first()
    )
    if not column:
        return None
    max_position = (
        db.query(func.max(models.KanbanTask.position))
        .filter(models.KanbanTask.column_id == column_id)
        .scalar()
    )
    new_position = (max_position + 1) if max_position is not None else 0
    db_task = models.KanbanTask(
        title=task.title,
        column_id=column_id,
        position=new_position,
        due_date=task.due_date,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def get_task_by_id(db: Session, task_id: int, user_id: int) -> models.KanbanTask | None:
    return (
        db.query(models.KanbanTask)
        .join(models.KanbanColumn)
        .join(models.KanbanBoard)
        .filter(models.KanbanTask.id == task_id, models.KanbanBoard.owner_id == user_id)
        .first()
    )


def update_kanban_task(
    db: Session, db_task: models.KanbanTask, task_update: schemas.KanbanTaskUpdate
) -> models.KanbanTask:
    update_data = task_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def delete_kanban_task(db: Session, task_id: int, user_id: int) -> bool:
    db_task = get_task_by_id(db, task_id, user_id)
    if db_task:
        (
            db.query(models.KanbanTask)
            .filter(
                models.KanbanTask.column_id == db_task.column_id,
                models.KanbanTask.position > db_task.position,
            )
            .update(
                {models.KanbanTask.position: models.KanbanTask.position - 1},
                synchronize_session=False,
            )
        )
        db.delete(db_task)
        db.commit()
        return True
    return False


def get_all_tasks_by_user(db: Session, user_id: int) -> List[models.KanbanTask]:
    return (
        db.query(models.KanbanTask)
        .join(models.KanbanColumn)
        .join(models.KanbanBoard)
        .filter(models.KanbanBoard.owner_id == user_id)
        .all()
    )

def move_kanban_task(
    db: Session, move_data: schemas.KanbanTaskMove, user_id: int
) -> models.KanbanTask | None:
    task_to_move = get_task_by_id(db, move_data.task_id, user_id)
    if not task_to_move:
        return None
    source_column_id = task_to_move.column_id
    source_position = task_to_move.position

    (
        db.query(models.KanbanTask)
        .filter(
            models.KanbanTask.column_id == source_column_id,
            models.KanbanTask.position > source_position,
        )
        .update(
            {models.KanbanTask.position: models.KanbanTask.position - 1},
            synchronize_session=False,
        )
    )

    (
        db.query(models.KanbanTask)
        .filter(
            models.KanbanTask.column_id == move_data.destination_column_id,
            models.KanbanTask.position >= move_data.destination_index,
        )
        .update(
            {models.KanbanTask.position: models.KanbanTask.position + 1},
            synchronize_session=False,
        )
    )

    task_to_move.column_id = move_data.destination_column_id
    task_to_move.position = move_data.destination_index
    
    db.commit()
    db.refresh(task_to_move)
    return task_to_move


def update_user_streak(db: Session, user: models.User) -> models.User:
    today = date.today()
    yesterday = today - timedelta(days=1)

    if user.last_activity_date == today:
        return user

    if user.last_activity_date == yesterday:
        user.current_streak += 1
    else:
        user.current_streak = 1

    user.last_activity_date = today

    if user.current_streak > user.longest_streak:
        user.longest_streak = user.current_streak

    db.commit()
    db.refresh(user)
    return user


def create_quiz_attempt(
    db: Session, user_id: int, score: int, topic: str
) -> models.QuizAttempt:
    db_attempt = models.QuizAttempt(user_id=user_id, score=score, quiz_topic=topic)
    db.add(db_attempt)
    db.commit()
    db.refresh(db_attempt)
    return db_attempt


def get_recent_quiz_attempts(
    db: Session, user_id: int, limit: int = 5
) -> List[models.QuizAttempt]:
    return (
        db.query(models.QuizAttempt)
        .filter(models.QuizAttempt.user_id == user_id)
        .order_by(desc(models.QuizAttempt.timestamp))
        .limit(limit)
        .all()
    )


def create_challenge(
    db: Session, user_id: int, challenge_data: schemas.ChallengeCreate
) -> models.Challenge | None:
    tasks = (
        db.query(models.KanbanTask)
        .join(models.KanbanColumn)
        .join(models.KanbanBoard)
        .filter(
            models.KanbanTask.id.in_(challenge_data.task_ids),
            models.KanbanBoard.owner_id == user_id,
        )
        .all()
    )

    if len(tasks) != len(challenge_data.task_ids):
        return None

    db_challenge = models.Challenge(
        title=challenge_data.title,
        description=challenge_data.description,
        end_date=challenge_data.end_date,
        user_id=user_id,
    )
    db_challenge.tasks.extend(tasks)
    db.add(db_challenge)
    db.commit()
    db.refresh(db_challenge)
    return db_challenge


def get_active_challenges_by_user(db: Session, user_id: int) -> List[models.Challenge]:
    return (
        db.query(models.Challenge)
        .filter(
            models.Challenge.user_id == user_id, models.Challenge.status == "active"
        )
        .all()
    )


def get_upcoming_tasks(
    db: Session, user_id: int, days_ahead: int = 7
) -> List[models.KanbanTask]:
    end_date = datetime.now() + timedelta(days=days_ahead)
    return (
        db.query(models.KanbanTask)
        .join(models.KanbanColumn)
        .join(models.KanbanBoard)
        .filter(
            models.KanbanBoard.owner_id == user_id,
            models.KanbanTask.due_date != None,
            models.KanbanTask.due_date <= end_date,
            models.KanbanTask.completed == False,
        )
        .order_by(models.KanbanTask.due_date)
        .all()
    )
    
def get_task_counts_by_user(db: Session, user_id: int) -> dict:
    """Gets total and completed task counts efficiently using the database."""
    total_tasks = (
        db.query(func.count(models.KanbanTask.id))
        .join(models.KanbanColumn)
        .join(models.KanbanBoard)
        .filter(models.KanbanBoard.owner_id == user_id)
        .scalar()
    )
    
    completed_tasks = (
        db.query(func.count(models.KanbanTask.id))
        .join(models.KanbanColumn)
        .join(models.KanbanBoard)
        .filter(
            models.KanbanBoard.owner_id == user_id,
            models.KanbanTask.completed == True,
        )
        .scalar()
    )
    
    return {"total": total_tasks or 0, "completed": completed_tasks or 0}

def get_challenge_by_id(db: Session, challenge_id: int, user_id: int) -> models.Challenge | None:
    return (
        db.query(models.Challenge)
        .filter(models.Challenge.id == challenge_id, models.Challenge.user_id == user_id)
        .first()
    )

def update_challenge(db: Session, db_challenge: models.Challenge, challenge_update: schemas.ChallengeUpdate) -> models.Challenge:
    update_data = challenge_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_challenge, key, value)
    db.add(db_challenge)
    db.commit()
    db.refresh(db_challenge)
    return db_challenge

def delete_challenge(db: Session, challenge_id: int, user_id: int) -> bool:
    db_challenge = db.query(models.Challenge).filter(
        models.Challenge.id == challenge_id, models.Challenge.user_id == user_id
    ).first()
    if db_challenge:
        db.delete(db_challenge)
        db.commit()
        return True
    return False