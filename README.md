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

---

## ⚡ Performance & Optimization Enhancements

### 🔴 Redis (Caching Layer)

Redis is used to cache frequently accessed data such as job search results, reducing database load and improving response time.

#### 🛠️ Setup & Usage

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

## 📂 Project Structure (Backend)

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

```bash
npm install
```

### 4️⃣ Create a `.env` file

```
PORT=8000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

### 5️⃣ Run the server

```bash
npm run dev
```

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
