from sqlalchemy import (
    Boolean,
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Table,
    Date,
)
from sqlalchemy.orm import relationship, column_property
from sqlalchemy.sql import func, select
from database import Base

challenge_tasks_association = Table(
    "challenge_tasks",
    Base.metadata,
    Column("challenge_id", Integer, ForeignKey("challenges.id")),
    Column("task_id", Integer, ForeignKey("kanban_tasks.id")),
)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_activity_date = Column(Date, nullable=True)

    syllaby = relationship(
        "Syllabus", back_populates="owner", cascade="all, delete-orphan"
    )
    notes = relationship("Note", back_populates="owner", cascade="all, delete-orphan")
    kanban_boards = relationship(
        "KanbanBoard", back_populates="owner", cascade="all, delete-orphan"
    )

    quiz_attempts = relationship(
        "QuizAttempt", back_populates="user", cascade="all, delete-orphan"
    )
    challenges = relationship(
        "Challenge", back_populates="user", cascade="all, delete-orphan"
    )


class Syllabus(Base):
    __tablename__ = "syllaby"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    course_code = Column(String, nullable=True)
    raw_input_outline = Column(Text)
    duration = Column(Integer, nullable=False, default=1)
    unit = Column(String, nullable=False, default="weeks")
    generated_content = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="syllaby")
    kanban_board = relationship(
        "KanbanBoard",
        back_populates="syllabus",
        uselist=False,
        cascade="all, delete-orphan",
    )


class KeyTerm(Base):
    __tablename__ = "key_terms"
    id = Column(Integer, primary_key=True)
    term = Column(String, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"))
    note = relationship("Note", back_populates="key_terms_rel")


class Flashcard(Base):
    __tablename__ = "flashcards"
    id = Column(Integer, primary_key=True)
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    note_id = Column(Integer, ForeignKey("notes.id"))
    note = relationship("Note", back_populates="flashcards_rel")


class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    original_content = Column(Text)
    summary = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="notes")

    key_terms_rel = relationship(
        "KeyTerm", back_populates="note", cascade="all, delete-orphan"
    )
    flashcards_rel = relationship(
        "Flashcard", back_populates="note", cascade="all, delete-orphan"
    )


class KanbanBoard(Base):
    __tablename__ = "kanban_boards"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    syllabus_id = Column(Integer, ForeignKey("syllaby.id"), nullable=True, unique=True)
    owner = relationship("User", back_populates="kanban_boards")
    columns = relationship(
        "KanbanColumn", back_populates="board", cascade="all, delete-orphan"
    )
    syllabus = relationship("Syllabus", back_populates="kanban_board")


class KanbanColumn(Base):
    __tablename__ = "kanban_columns"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    board_id = Column(Integer, ForeignKey("kanban_boards.id"))
    board = relationship("KanbanBoard", back_populates="columns")
    tasks = relationship(
        "KanbanTask",
        back_populates="column",
        cascade="all, delete-orphan",
        order_by="KanbanTask.position",
    )


class KanbanTask(Base):
    __tablename__ = "kanban_tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, default="New Task")
    description = Column(Text, nullable=True)
    priority = Column(String, default="Medium")
    due_date = Column(DateTime, nullable=True)
    completed = Column(Boolean, default=False)
    position = Column(Integer, default=0, nullable=False)
    column_id = Column(Integer, ForeignKey("kanban_columns.id"))
    column = relationship("KanbanColumn", back_populates="tasks")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    score = Column(Integer, nullable=False)
    quiz_topic = Column(String, nullable=False)
    timestamp = Column(DateTime, server_default=func.now())
    user = relationship("User", back_populates="quiz_attempts")


class Challenge(Base):
    __tablename__ = "challenges"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    start_date = Column(DateTime, server_default=func.now())
    end_date = Column(DateTime, nullable=False)
    status = Column(String, default="active")
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="challenges")
    tasks = relationship("KanbanTask", secondary=challenge_tasks_association)

    total_tasks = column_property(
        select(func.count(challenge_tasks_association.c.task_id))
        .where(challenge_tasks_association.c.challenge_id == id)
        .correlate_except(challenge_tasks_association)
        .scalar_subquery()
    )

    completed_tasks = column_property(
        select(func.count(KanbanTask.id))
        .where(
            KanbanTask.id == challenge_tasks_association.c.task_id,
            challenge_tasks_association.c.challenge_id == id,
            KanbanTask.completed == True
        )
        .correlate_except(KanbanTask)
        .scalar_subquery()
    )