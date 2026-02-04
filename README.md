# Syllaby – Smart AI-Powered Study Planner

![Syllaby Logo](frontend/public/syllaby-logo-standalone.png)

## 📚 Project Overview

**Syllaby** is an intelligent, AI-powered study planner designed to help students efficiently manage their academic journey. The application leverages artificial intelligence to transform syllabus content into structured study plans, generate smart notes, create quizzes, and track learning progress through an intuitive dashboard.

## 🎯 Problem Statement

Students often struggle with:
- **Unorganized study materials**: Managing multiple subjects and syllabus content
- **Poor time management**: Difficulty in planning study schedules effectively
- **Lack of active learning tools**: No easy way to generate quizzes or flashcards
- **Progress tracking**: Unable to visualize their learning journey

**Syllaby** addresses these challenges by providing an all-in-one AI-powered solution.

## ✨ Key Features

### 1. 📖 AI-Powered Syllabus Management
- Create and manage course syllabi
- AI-generated study plans based on course duration
- Automatic breakdown of topics into manageable weekly tasks

### 2. 📝 Smart Notes System
- Create and organize notes for any topic
- AI-powered summarization of content
- Automatic key terms extraction
- Flashcard generation for quick revision

### 3. 🧠 Quiz Generator
- Generate multiple-choice, true/false, and short-answer quizzes
- Customizable difficulty levels (Easy, Medium, Hard)
- AI-powered freeform question answering
- Score tracking and performance analysis

### 4. 📋 Kanban Board
- Visual task management with drag-and-drop functionality
- Create custom boards for different subjects
- Track task progress (To Do, In Progress, Done)
- Priority and due date assignment

### 5. 📅 Calendar Integration
- View all tasks and deadlines in calendar format
- Visual representation of upcoming work

### 6. 💬 AI Chatbot
- Interactive AI assistant for study-related queries
- Context-aware responses based on your content

### 7. 📊 Progress Dashboard
- Visual analytics of study progress
- Quiz performance tracking
- Activity streaks and challenges

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 19** | UI Library |
| **Vite 7** | Build Tool & Dev Server |
| **React Router DOM 7** | Client-side Routing |
| **Tailwind CSS 4** | Utility-first CSS Framework |
| **Framer Motion** | Animations & Transitions |
| **Chart.js + React-ChartJS-2** | Data Visualization |
| **@hello-pangea/dnd** | Drag-and-Drop Functionality |
| **React Big Calendar** | Calendar Component |
| **Axios** | HTTP Client |
| **Lucide React & React Icons** | Icon Libraries |

### Backend
| Technology | Purpose |
|------------|---------|
| **FastAPI** | Python Web Framework |
| **SQLAlchemy** | ORM for Database Operations |
| **PostgreSQL** | Relational Database |
| **Pydantic** | Data Validation |
| **Python-Jose** | JWT Authentication |
| **Passlib** | Password Hashing |
| **Ollama** | Local LLM Integration |

## 📁 Project Structure

```
syllaby/
├── backend/                    # FastAPI Backend
│   ├── main.py                 # Main application entry & API routes
│   ├── models.py               # Database models (User, Syllabus, Note, etc.)
│   ├── schemas.py              # Pydantic schemas for validation
│   ├── crud.py                 # Database CRUD operations
│   ├── auth.py                 # Authentication utilities
│   ├── database.py             # Database connection configuration
│   └── requirements.txt        # Python dependencies
│
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── App.jsx             # Main application with routing
│   │   ├── api/                # API client configuration
│   │   ├── components/         # Reusable UI components
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── ...modals
│   │   ├── contexts/           # React Context providers
│   │   └── pages/              # Application pages
│   │       ├── HomePage.jsx
│   │       ├── LandingPage.jsx
│   │       ├── LoginPage.jsx
│   │       ├── CreateSyllabyPage.jsx
│   │       ├── SyllabyDetailPage.jsx
│   │       ├── QuizGeneratorPage.jsx
│   │       ├── KanbanBoardPage.jsx
│   │       └── ...more pages
│   ├── index.html              # HTML entry point
│   ├── package.json            # NPM dependencies
│   └── vite.config.js          # Vite configuration
│
├── project report/             # College project documentation
└── weekly report/              # Weekly progress reports
```

## 🗄️ Database Schema

The application uses the following data models:

| Model | Description |
|-------|-------------|
| **User** | User accounts with authentication and streak tracking |
| **Syllabus** | Course syllabus with AI-generated study plans |
| **Note** | User notes with summary and key terms |
| **KeyTerm** | Extracted key terms from notes |
| **Flashcard** | Question-answer pairs for revision |
| **KanbanBoard** | Task boards for organization |
| **KanbanColumn** | Board columns (To Do, In Progress, Done) |
| **KanbanTask** | Individual tasks with priority and due dates |
| **QuizAttempt** | Quiz score tracking |
| **Challenge** | Learning challenges and goals |

## 🚀 Installation & Setup

### Prerequisites
- Node.js v18+ and npm
- Python 3.11+
- PostgreSQL database
- Ollama (for local LLM)

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
# Create .env file with:
# DATABASE_URL=postgresql://user:password@localhost/syllaby
# SECRET_KEY=your-secret-key
# OLLAMA_MODEL_NAME=your-model

# Run the server
uvicorn main:app --reload
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env file
# VITE_API_URL=http://localhost:8000

# Run development server
npm run dev
```

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | User registration |
| POST | `/token` | User login |
| GET | `/users/me` | Get current user |

### Syllabus
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/syllaby` | Create new syllabus |
| GET | `/syllaby` | List all syllabi |
| GET | `/syllaby/{id}` | Get syllabus details |
| PUT | `/syllaby/{id}` | Update syllabus |
| DELETE | `/syllaby/{id}` | Delete syllabus |
| POST | `/syllaby/{id}/regenerate` | Regenerate AI content |

### Notes
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/notes` | Create new note |
| GET | `/notes` | List all notes |
| GET | `/notes/{id}` | Get note details |
| PUT | `/notes/{id}` | Update note |
| DELETE | `/notes/{id}` | Delete note |

### AI Features
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/summarize` | Summarize content |
| POST | `/ai/key-terms` | Extract key terms |
| POST | `/ai/flashcards` | Generate flashcards |
| POST | `/quiz/generate` | Generate quiz |
| POST | `/quiz/submit` | Submit quiz answers |
| POST | `/ai/chat` | AI chatbot interaction |

## 👥 Team Members

| Name | Role |
|------|------|
| Kabir Thayani | Full Stack Developer |

## 📜 License

This project is developed for educational purposes as part of Noble University curriculum.

## 🙏 Acknowledgments

- FastAPI documentation and community
- React and Vite teams
- Ollama for local LLM capabilities
- All open-source library contributors

---

**Developed with ❤️ by Jingg**
