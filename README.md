# 🚀 MERN Task Management System

A full-stack **Task Management System** built with the MERN stack, featuring secure authentication, task ownership and isolation, dashboard statistics, advanced search and filtering, file attachments, Excel export, password recovery, and administrative user management.

The application is deployed on **Windows Server using IIS as a reverse proxy**, with the React frontend hosted by IIS and the Node.js/Express backend running as a Windows service. MongoDB Atlas is used as the production database.

---

## 📌 Project Overview

This project demonstrates the development of a production-style task management application using modern full-stack development practices.

The system supports:

* User registration and authentication
* JWT-based authentication using HTTP-only cookies
* Secure password hashing
* Password recovery and reset
* Task creation, editing, viewing, and deletion
* Task ownership and user isolation
* Task search, filtering, and pagination
* Dashboard statistics
* Priority-based task overview
* Multiple file attachments
* Custom filenames for uploaded files
* File ownership protection
* Excel export
* Administrative user management
* User activation and suspension
* Role-based authorization
* Responsive user interface
* Production deployment through IIS
* Node.js backend running as a Windows service
* MongoDB Atlas database

---

# ✨ Features

## 🔐 Authentication & Security

* User registration
* Secure login
* JWT authentication
* HTTP-only authentication cookies
* Password hashing using bcrypt
* Logout functionality
* Expired-session handling
* Protected API routes
* Protected frontend routes
* Password change
* Forgot password functionality
* Secure password reset using time-limited tokens
* Password reset token invalidation
* Password validation
* Account status validation
* Role-based authorization

---

## 📋 Task Management

Users can manage their own tasks through a complete CRUD workflow.

### Task Operations

* Create tasks
* View tasks
* Edit tasks
* Delete tasks
* View task details
* Assign task priority
* Track task status
* Set task due dates
* Add task descriptions
* Attach supporting files

### Task Status

* To Do
* In Progress
* Completed

### Task Priority

* Low
* Medium
* High

---

## 👤 User Isolation

Task data is protected by user ownership.

Each authenticated user can only access and manage their own tasks.

```text
User A
├── Task 1
├── Task 2
└── Task 3

User B
├── Task 4
├── Task 5
└── Task 6
```

User A cannot view, modify, delete, or export User B's tasks.

This ownership model is enforced at the backend API level rather than relying only on frontend filtering.

---

## 📊 Dashboard

The dashboard provides an overview of the user's task activity.

Features include:

* Total tasks
* To Do tasks
* In Progress tasks
* Completed tasks
* Priority overview
* Task distribution
* Search
* Filtering
* Pagination
* Quick task management access

---

## 📥 Export Tasks to Excel

Users can export their accessible task data to an **Excel `.xlsx` file** for reporting, analysis, and offline use.

### Export Features

* 📥 Export task data directly from the application
* 📊 Excel `.xlsx` format
* 📋 Useful for reporting and offline analysis
* 🔎 Supports the application's task data and filtering workflow
* 👤 Users can only export tasks belonging to their own account
* 🔐 Export access is protected by authentication

This feature demonstrates integration between the application and a structured reporting/export workflow.

---

## 📎 File Attachments

The application provides flexible task attachment management with support for **multiple file uploads** and **custom filenames**.

### Multiple File Upload

Users can select and upload **multiple files in a single operation**, making it easy to attach several documents, images, reports, or other supporting files to a task.

### Custom File Names

Before uploading, users can **change the filename of each selected attachment**.

For example:

```text
Selected Files

📄 project-report.pdf
   → Project Report September.pdf

📊 statistics.xlsx
   → Task Statistics.xlsx

🖼️ dashboard.png
   → Dashboard Screenshot.png
```

This allows users to give uploaded files meaningful and descriptive names instead of keeping the original filenames.

### Attachment Features

* 📁 Multiple files can be selected at once
* ✏️ Filename can be customized before upload
* 📎 Multiple attachments can be associated with a single task
* 📦 Maximum file size: **10 MB per file**
* 🔐 File access is protected by authentication
* 👤 Users can only access attachments belonging to their own tasks
* 🗂️ File extensions are preserved
* 🚀 Multipart file upload
* 🛡️ Uploaded files are excluded from the Git repository

---

## 🔎 Search, Filtering & Pagination

The task management interface provides server-side search and filtering.

Users can search and filter tasks based on supported task properties.

Features include:

* Task search
* Status filtering
* Priority filtering
* Pagination
* Page navigation
* Server-side task retrieval
* User-specific results

---

## 👨‍💼 Administration

Administrators have access to user management functionality.

Admin features include:

* View registered users
* View user roles
* View account status
* Activate users
* Suspend users
* Manage user accounts
* Protected administrative routes

Administrative functionality is protected using role-based authorization.

---

# 🛠️ Technology Stack

## Frontend

* React
* Vite
* JavaScript
* HTML5
* CSS3
* React Hooks
* Fetch API

## Backend

* Node.js
* Express.js
* JavaScript
* JWT
* bcrypt
* Multer
* REST API

## Database

* MongoDB Atlas
* Mongoose

## Reporting

* ExcelJS
* Excel `.xlsx` export

## Deployment

* Windows Server
* IIS
* IIS URL Rewrite
* IIS Application Request Routing (ARR)
* NSSM
* Node.js Windows Service

## Development Tools

* Git
* GitHub
* GitHub Desktop
* Postman
* Visual Studio Code

---

# 🏗️ Application Architecture

```text
                         ┌─────────────────────┐
                         │      Browser        │
                         │   React Frontend    │
                         └──────────┬──────────┘
                                    │
                                    │ HTTP
                                    ▼
                         ┌─────────────────────┐
                         │        IIS          │
                         │  React Static Files │
                         │    URL Rewrite      │
                         │        ARR          │
                         └──────────┬──────────┘
                                    │
                              /api requests
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │     Node.js         │
                         │     Express API     │
                         │      Port 5000      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    MongoDB Atlas    │
                         │      Database       │
                         └─────────────────────┘
```

---

# 📁 Project Structure

```text
mern-task-management/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   └── auth/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── middleware/
│   │   ├── adminMiddleware.js
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── Task.js
│   │   ├── UploadedFile.js
│   │   └── user.js
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   ├── fileRoutes.js
│   │   └── taskRoutes.js
│   ├── uploads/
│   ├── server.js
│   └── package.json
│
├── screenshots/
│   ├── dashboard.png
│   ├── task_management.png
│   ├── task_list.png
│   ├── task_list_function.png
│   ├── task_detail.png
│   ├── search_filters.png
│   ├── create_task.png
│   ├── admin_user_management.png
│   ├── login.png
│   ├── register.png
│   └── forgot_password.png
│
├── .gitignore
└── README.md
```

---

# 🔒 Security

Security was considered throughout the application rather than only at the UI level.

## Authentication

Authentication is implemented using:

* JWT
* HTTP-only cookies
* Password hashing
* Protected routes
* Session validation

## Authorization

Backend middleware verifies:

* Authentication status
* User identity
* Account status
* Administrative privileges
* Resource ownership

## User Isolation

Task queries are restricted to the authenticated user's ID.

This prevents users from accessing another user's tasks by modifying request parameters or URLs.

## Task Ownership

Create, update, and delete operations verify task ownership before allowing changes.

## File Ownership

Attachment access is also associated with the task owner.

Users cannot access files belonging to another user's tasks.

## Password Security

Passwords are:

* Hashed using bcrypt
* Never stored in plaintext
* Validated during password changes and resets
* Protected by reset-token expiration
* Protected against reuse of the current password

---

# 🔑 Password Recovery

The application includes a complete password recovery workflow.

```text
User
 │
 ▼
Forgot Password
 │
 ▼
Email Reset Link
 │
 ▼
Secure Reset Token
 │
 ▼
Reset Password
 │
 ▼
Validate Password
 │
 ▼
Invalidate Reset Token
 │
 ▼
Password Updated
```

Reset tokens are time-limited and invalidated after successful password reset.

---

# 📎 Attachment Workflow

```text
Select Multiple Files
        │
        ▼
Review Selected Files
        │
        ▼
Customize Filenames
        │
        ▼
Validate File Size
        │
        ▼
Multipart Upload
        │
        ▼
Store Attachment Metadata
        │
        ▼
Associate Files with Task
        │
        ▼
Authenticated File Access
```

Maximum file size:

**10 MB per file**

---

# 📊 Excel Export Workflow

```text
Authenticated User
        │
        ▼
Task Management
        │
        ▼
Request Excel Export
        │
        ▼
Verify User Ownership
        │
        ▼
Retrieve User's Tasks
        │
        ▼
Generate .xlsx File
        │
        ▼
Download Excel Report
```

The backend ensures that exported task data belongs to the authenticated user.

---

# 🔎 Search, Filtering & Pagination

The application uses server-side task retrieval to support:

* Search
* Status filtering
* Priority filtering
* Pagination
* User-specific task queries

This prevents the frontend from relying solely on locally loaded task data.

---

# 📈 Dashboard Statistics

Dashboard statistics are calculated from the authenticated user's tasks.

Statistics include:

* Total tasks
* To Do
* In Progress
* Completed
* Priority distribution

Statistics are also protected by user ownership rules.

---

# 👨‍💼 Administration

The administrator interface provides user account management.

Administrators can:

* View users
* View user roles
* View account status
* Activate accounts
* Suspend accounts

Administrative routes are protected by authentication and admin authorization middleware.

---

# 🚀 Production Deployment

The application was deployed using the following architecture:

```text
Mac / Browser
      │
      ▼
Windows Server
10.211.55.3
      │
      ▼
IIS
      │
      ├── React Frontend
      │
      └── /TaskManagement/api
                │
                ▼
        IIS Reverse Proxy
                │
                ▼
       Node.js / Express
          127.0.0.1:5000
                │
                ▼
          MongoDB Atlas
```

---

# 🌐 IIS Configuration

IIS serves the React production build and forwards API requests to Node.js.

```text
/TaskManagement/
        │
        ├── React application
        │
        └── /TaskManagement/api
                    │
                    ▼
              Node.js :5000
```

IIS components used:

* URL Rewrite
* Application Request Routing (ARR)
* Reverse Proxy

---

# ⚙️ Node.js Windows Service

The backend runs as a Windows service using NSSM.

```text
Windows
   │
   ▼
TaskManagementAPI
   │
   ▼
Node.js
   │
   ▼
server.js
   │
   ▼
Express API
```

This allows the backend to:

* Start automatically with Windows
* Continue running without an open terminal
* Restart after server reboot
* Run as a background service

---

# 🔧 Environment Variables

Environment variables are used for configuration and are intentionally excluded from Git.

Example:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://your-server-address
```

Actual `.env` files are **never committed to GitHub**.

---

# 🧪 Testing & Validation

The application was tested across multiple areas.

## Authentication Testing

* Registration
* Login
* Logout
* Expired authentication
* Password change
* Forgot password
* Password reset

## Authorization Testing

* User isolation
* Task ownership
* File ownership
* Admin authorization
* Account suspension

## Task Testing

* Create
* Read
* Update
* Delete
* Search
* Filtering
* Pagination
* Statistics
* Excel export

## File Testing

* Multiple uploads
* Custom filenames
* File size validation
* Attachment retrieval
* User ownership protection

## Deployment Testing

* IIS frontend
* IIS API reverse proxy
* Node.js service
* MongoDB Atlas connection
* Windows reboot recovery

---

# 📸 Screenshots

The following screenshots demonstrate the main features and user interfaces of the application.

## 📊 Dashboard

![Dashboard](screenshots/dashboard.png)

---

## 📋 Task Management

![Task Management](screenshots/task_management.png)

---

## 📝 Task List

![Task List](screenshots/task_list.png)

### Task List Functions

![Task List Functions](screenshots/task_list_function.png)

---

## 🔎 Search & Filters

![Search and Filters](screenshots/search_filters.png)

---

## ➕ Create Task

![Create Task](screenshots/create_task.png)

---

## 📄 Task Detail & Attachments

![Task Detail](screenshots/task_detail.png)

---

## 👨‍💼 Admin User Management

![Admin User Management](screenshots/admin_user_management.png)

---

## 🔐 Login

![Login](screenshots/login.png)

---

## 📝 Register

![Register](screenshots/register.png)

---

## 🔑 Forgot Password

![Forgot Password](screenshots/forgot_password.png)

---

# 💻 Local Development

## Clone the Repository

```bash
git clone https://github.com/hnlxyz/mern-task-management.git
cd mern-task-management
```

## Install Client Dependencies

```bash
cd client
npm install
```

## Start Frontend

```bash
npm run dev
```

---

## Install Server Dependencies

Open another terminal:

```bash
cd server
npm install
```

## Start Backend

```bash
node server.js
```

The backend runs on:

```text
http://localhost:5000
```

---

# 🏗️ Production Build

Build the React frontend:

```bash
cd client
npm run build
```

The production files are generated in:

```text
client/dist/
```

These files can then be deployed to IIS.

---

# 📦 Git & Repository

The repository contains the application source code and documentation.

Sensitive and generated files are excluded using `.gitignore`.

```text
.env
.env.*
node_modules/
uploads/
dist/
*.log
```

Uploaded user files stored in `server/uploads/` are intentionally excluded from the Git repository.

---

# 🌟 Project Highlights

This project demonstrates practical full-stack development experience across:

* React frontend development
* REST API development
* Node.js and Express
* MongoDB and Mongoose
* JWT authentication
* Secure cookie-based sessions
* Role-based authorization
* User/resource ownership
* File upload management
* Multiple file uploads
* Custom filename handling
* Excel report generation
* Search and filtering
* Pagination
* Dashboard statistics
* Password recovery
* Administrative user management
* IIS deployment
* Reverse proxy configuration
* Windows service deployment
* Production troubleshooting
* Git/GitHub workflow
* Security testing
* Disaster recovery planning

---

# 📚 Key Learning Areas

Through this project, the following areas were practiced and implemented:

### Frontend

* React component architecture
* React Hooks
* State management
* Form handling
* API integration
* Responsive UI
* Authentication flows
* File upload interfaces

### Backend

* Express routing
* Middleware
* REST API design
* Authentication
* Authorization
* Error handling
* File processing
* Excel generation

### Database

* MongoDB
* Mongoose schemas
* ObjectId relationships
* Data migration
* User ownership queries

### Security

* JWT
* HTTP-only cookies
* bcrypt password hashing
* Authorization middleware
* User isolation
* Resource ownership
* Password reset security

### Deployment

* IIS
* URL Rewrite
* ARR
* Reverse proxy
* Node.js Windows services
* MongoDB Atlas
* Production troubleshooting

---

# 👨‍💻 Author

**Htun Naing Lynn**

Senior System Analyst / Software Engineer

13+ years of professional IT experience in Singapore, with experience across healthcare, engineering, and government-related systems.

### GitHub

https://github.com/hnlxyz

### LinkedIn

https://www.linkedin.com/in/htun-naing-lynn-67871a14/

---

# 📄 License

This project is created for **portfolio, learning, demonstration, and professional development purposes**.