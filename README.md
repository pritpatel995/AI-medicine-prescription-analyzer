# 💊 AI Medicine Prescription Analyzer

### AI-Powered Prescription Analysis and Medicine Reminder Application

AI Medicine Prescription Analyzer is a smart healthcare application designed to simplify prescription management using Artificial Intelligence.

The application allows users to scan medical prescriptions, extract medicine-related information, manage medications and receive timely reminders to take their medicines.

## 🚀 Features

* **AI Prescription Scanning:** Scan prescriptions using a mobile camera or upload prescription images.
* **Medicine Information Extraction:** Extract medicine names and related information from prescriptions.
* **AI-Powered Analysis:** Use AI to process and understand prescription information.
* **Medicine Reminders:** Set reminders for scheduled medications.
* **Medication Management:** Add, review and manage medicines.
* **Prescription History:** Keep track of previously scanned prescriptions.
* **User Authentication:** Secure user registration and login.
* **Dashboard:** View medicine schedules and medication adherence.
* **Voice Assistant:** Interact with the application through voice-based assistance.

## 🛠️ Technology Stack

### Frontend

* React Native
* Expo
* JavaScript
* Axios
* Expo SecureStore
* Expo Notifications

### Backend

* Python
* FastAPI
* REST API

### Database

* MongoDB

### Artificial Intelligence

* Ollama
* Llama 3.2

### Development Tools

* Visual Studio Code
* Git
* GitHub
* Android Emulator

## 📁 Project Structure

```text
AI-medicine-prescription-analyzer/
│
├── backend/
│   ├── app/
│   │   ├── routers/
│   │   ├── main.py
│   │   ├── auth.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── llm_parser.py
│   │
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── assets/
│   ├── components/
│   ├── context/
│   ├── navigation/
│   ├── screens/
│   ├── services/
│   ├── theme/
│   ├── App.js
│   └── package.json
│
└── README.md
```

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/pritpatel995/AI-medicine-prescription-analyzer.git
```

```bash
cd AI-medicine-prescription-analyzer
```

### 2. Backend Setup

Open the backend directory:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure your environment variables using `.env.example`.

Start the FastAPI server:

```bash
uvicorn app.main:app --reload
```

Backend API documentation:

```text
http://127.0.0.1:8000/docs
```

### 3. Database Setup

Install and configure MongoDB.

Create or configure the database according to your backend environment settings.

### 4. AI Model Setup

Install Ollama and download the Llama 3.2 model:

```bash
ollama pull llama3.2
```

Start Ollama:

```bash
ollama serve
```

### 5. Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start Expo:

```bash
npx expo start
```

Run the application using an Android emulator or a compatible Expo development environment.

## 🎯 Project Objective

The main objective of this project is to make prescription management easier and more accessible through Artificial Intelligence.

It aims to reduce manual effort in managing prescriptions and help users follow their medication schedules through automated reminders.

## 👨‍💻 Developers

**Project Team:**

* Prit Patel
* Aditya Modi
* Simran Vaswani

**Project Guide:** Dr. Vidhi Thakkar

**University:** GLS University

## 📌 Future Scope

* Improved prescription recognition accuracy.
* More detailed medicine information.
* Enhanced AI-powered healthcare assistance.
* Additional medication tracking features.
* Improved user experience and accessibility.

---

⭐ If you find this project interesting, consider giving the repository a star!
