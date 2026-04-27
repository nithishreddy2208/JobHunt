# JobHunt – Online Job Portal

## 📌 Project Overview

JobHunt is a full-stack web application designed to connect job seekers with recruiters. The platform allows companies to post job openings and enables candidates to search and apply for jobs easily.

The goal of this project is to build a scalable job portal that simplifies the recruitment process while giving users an intuitive and efficient experience.

---

## 🚀 Tech Stack

### Frontend

* React.js
* Axios

### Backend

* Node.js
* Express.js

### Database

* MongoDB
* Mongoose

### Authentication

* JSON Web Token (JWT)
* bcrypt

### Caching & Optimization

* Redis (via Docker)
* Trie (for autocomplete search)
* MongoDB Indexing

### Other Tools

* dotenv
* Git & GitHub
* Postman

---

## 💡 Core Idea of the Platform

JobHunt focuses on creating a streamlined hiring ecosystem where job seekers can easily explore opportunities while recruiters can efficiently manage applications.

Instead of complex recruitment systems, the platform aims to keep the process straightforward, organized, and transparent for both sides.

The application is designed with scalability in mind so that additional features such as job recommendations, applicant tracking, and real-time notifications can be integrated in the future.

---

## ✨ Key Functionalities

### For Job Seekers

* Create and manage user profiles
* Browse and search job listings
* Apply for jobs online
* Track applied jobs

### For Recruiters

* Company registration
* Post new job openings
* Manage job listings
* View applicants for posted jobs

### General Features

* Secure authentication system
* Role-based access (Candidate / Recruiter)
* RESTful API architecture
* Responsive user interface

### AI Features

* Hybrid LLM support (**Ollama local** → **Gemini** → graceful fallback)
* Resume text extraction and storage for AI workflows
* Local semantic search embeddings (MiniLM via `@xenova/transformers`)
* AI endpoints for resume analysis, cover letter generation, interview preparation, and job recommendations

---

## ⚡ Performance & Optimization Enhancements

### 🔴 Redis (Caching Layer)

Redis is used to cache frequently accessed data such as job search results, reducing database load and improving response time.

#### 🛠️ Setup & Usage

##### Option 1: Redis via Docker (Local)

1️⃣ Install Docker

2️⃣ Run Redis container

```bash
docker run --name jobhunt-redis -p 6379:6379 -d redis:7-alpine
```

3️⃣ Verify Redis is running

```bash
docker exec -it jobhunt-redis redis-cli ping
```

Expected output:

```
PONG
```

4️⃣ Open Redis CLI

```bash
docker exec -it jobhunt-redis redis-cli
```

---

##### Option 2: Upstash Redis (Cloud)

1️⃣ Create an Upstash account

Go to:

```text
https://console.upstash.com/
```

2️⃣ Create a Redis database

In Upstash Console:

* Redis
* Create Database

3️⃣ Copy the Redis connection string

In your Upstash Redis database page, copy the Redis URL (TLS) that looks like:

```text
rediss://:PASSWORD@xxxxx.upstash.io:6379
```

4️⃣ Add it to backend environment variables

Add this to `backend/.env`:

```bash
REDIS_URL=rediss://:PASSWORD@xxxxx.upstash.io:6379
JOB_CACHE_TTL_SECONDS=300
```

5️⃣ Restart backend

```bash
npm run dev
```

---

#### 🔍 Useful Redis Commands (Testing)

```bash
SCAN 0 MATCH jobhunt:jobs:search:* COUNT 100
```

```bash
GET "jobhunt:jobs:search:keyword=dev:location=:jobType=:page=1:limit=10"
```

```bash
TTL "jobhunt:jobs:search:keyword=dev:location=:jobType=:page=1:limit=10"
```

---

#### 💡 How Redis is Used

* Caches job search results
* Reduces repeated database queries
* Improves API response time
* Uses Cache-Aside Pattern

---

### 🌳 Trie (Search Optimization)

Trie (Prefix Tree) is used for efficient prefix-based searching (autocomplete).

#### 🎯 Purpose

* Fast autocomplete suggestions
* Efficient prefix matching
* Better search experience

#### 🧠 How it Works

1. Job titles are loaded into a Trie

2. User types a query (e.g., "dev")

3. Trie returns matching prefixes:

   * developer
   * devops
   * device

4. Final job data is fetched from MongoDB

---

#### 🔄 Trie Refresh (Optional)

On server start, job titles are loaded into the Trie from MongoDB.

* If `JOB_TRIE_REFRESH_MS` is **not set**, the Trie is loaded **once** at startup.
* If `JOB_TRIE_REFRESH_MS` **is set** (in milliseconds), the Trie will periodically refresh from MongoDB.

Example (`backend/.env`):

```bash
JOB_TRIE_REFRESH_MS=600000
```

---

#### ⚡ Benefits

* O(n) prefix search
* Faster than regex-based search
* Scalable for large datasets

---

### 📊 MongoDB Indexing (Query Optimization)

Indexes are used to speed up database queries and avoid full collection scans.

#### 🧩 Example Indexes

```js
jobSchema.index({ title: 1, location: 1 });
userSchema.index({ email: 1 }, { unique: true });
applicationSchema.index({ jobId: 1 });
applicationSchema.index({ userId: 1 });
```

---

#### 🧠 How Indexing Helps

Without indexing:

* MongoDB scans entire collection

With indexing:

* Direct lookup using indexed fields

---

#### ⚡ Benefits

* Faster queries
* Reduced database load
* Better scalability

---

### 🔗 Combined Optimization Flow

```
User Search →
   Redis Cache (fast)
      ↓ (miss)
   MongoDB (optimized with indexes)
      ↓
   Store in Redis
```

* Trie improves search input experience
* Redis improves response time
* Indexing optimizes database queries

---

## �️ Secure Resume Upload (Multer + ClamAV + Cloudinary)

To keep uploads safe and production-ready, the backend uses:

* **Multer**: receives uploaded files (configured to use **memory storage**).
* **ClamAV**: scans the uploaded file for malware before it is stored.
* **Cloudinary**: stores the final (safe) file and returns a CDN URL.

### 🐳 ClamAV Setup (Docker Desktop)

1️⃣ Install Docker Desktop

2️⃣ Pull ClamAV image

```bash
docker pull clamav/clamav:latest
```

3️⃣ Run ClamAV container

```bash
docker run --name jobhunt-clamav -p 3310:3310 -d clamav/clamav:latest
```

4️⃣ Verify container is running

```bash
docker ps
```

You should see `jobhunt-clamav` running and port `3310` exposed.

### 🔄 Working Flow

```
Upload →
   Multer (memory) →
      Save temp file →
         ClamAV scan →
            Safe? →
               YES → Cloudinary →
                      Save URL + originalName
               NO → Reject
```

### ✅ Why this flow

* **Security**: prevents infected files from being stored or served.
* **Performance**: memory upload avoids unnecessary disk I/O until needed.
* **Scalability**: Cloudinary offloads file storage + delivery.

---

## �📂 Project Structure (Backend)

```
backend
│
├── config
│   └── db.js
│
├── controllers
│
├── models
│
├── routes
│
├── middleware
│
├── utils
│
├── .env
├── index.js
└── package.json
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/nithishreddy2208/jobhunt.git
```

### 2️⃣ Navigate to the project folder

```bash
cd jobhunt
```

### 3️⃣ Install dependencies

This project contains a backend Node.js app under `backend/`.

```bash
cd backend
npm install
```

### 4️⃣ Create a `.env` file

```
PORT=8000
MONGO_URI=your_mongodb_connection_string
SECRET_KEY=your_secret_key
REDIS_URL=redis://localhost:6379
JOB_CACHE_TTL_SECONDS=300
JOB_TRIE_REFRESH_MS=600000

# AI / LLM
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3
LLM_TIMEOUT_MS=60000
GEMINI_API_KEY=
GEMINI_MODEL=gemini-1.5-flash-latest
AI_CACHE_TTL_SECONDS=900
```

### 5️⃣ Run the server

```bash
cd backend
npm run dev
```

---

## 🤖 AI Endpoints (Backend)

All AI endpoints are mounted under `/api/ai`.

* `POST /api/ai/analyze-resume` (auth)
* `POST /api/ai/generate-cover-letter` (auth)
* `POST /api/ai/interview-prep` (auth)
* `POST /api/ai/recommend-jobs` (auth)
* `POST /api/ai/search`

---

## 🔮 Future Enhancements

* Resume upload feature (with security scanning)
* Job recommendation system
* Email notifications
* Real-time chat between recruiter and candidate
* Advanced job filtering

---

## 👨‍💻 Author

**Nithish Reddy**

---
