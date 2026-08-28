# MarkanM Chat — Update 1: Foundation

**Target Domain**: `chat.markanm.com`  
**Tech Stack**: React + Vite + Tailwind CSS (Frontend) | PHP 8+ PDO REST API + MySQL (Backend)

---

## 🌟 Overview & Features

MarkanM Chat is the foundational release (Update 1) of a modern, production-ready social conversation platform designed for Hostinger shared hosting environments.

### Key Features Implemented in Update 1:
1. **Authentication**: Registration, Login, Logout, Session Token Auth, Password Hashing (`password_hash`), Email & Password Reset Architecture, OTP readiness.
2. **User Profiles**: Custom avatar upload, display name, unique username (`/@username`), bio, join date, public profile view (`chat.markanm.com/@username`), profile settings editor.
3. **User Discovery & Connections**: User search by username/display name, friend requests (pending incoming/outgoing, accept, reject, connected status), message permissions for connected users.
4. **Direct Messaging (1-to-1)**: Text messages, timestamps, read receipts, reply-to quote blocks, emoji reactions, message editing, soft-deletion, real-time typing indicators, online/offline presence tracking.
5. **Group Chats**: Group creation with member selector, roles (`owner`, `admin`, `member`), member management (add/remove), leave group, group avatar/description updates.
6. **Shareable Group Invites (`chat.markanm.com/join/:code`)**: Secure group invite generator with custom max usage limits, expiration dates, disable capabilities, public group preview, and authentication redirect loop.
7. **In-App Notification Center**: Unread badge counter, notifications for requests, accepted connections, group additions, mark as read, mark all read.
8. **Smart Active-Conversation Polling**: Tab-visibility aware polling service (`useConversationPolling`) that polls only the active open chat every 3.5s (reduces to 15s when inactive tab), preventing full reloads or API spam while abstracting the synchronization layer for future WebSocket integration.
9. **Desktop & Mobile Responsive Design**: Futuristic dark glassmorphism layout, sidebar navigation, responsive conversation panels.
10. **Coming Next Roadmap Preview**: Visual previews for Updates 2–5 (Live Conversations, Interactive Experiences, Developer SDK).

---

## 📁 Repository Structure

```
markanmchat/
├── backend/
│   ├── config/
│   │   ├── config.php          # Base API helper, session & upload settings
│   │   └── database.php        # PDO MySQL Singleton Manager
│   ├── controllers/
│   │   ├── AuthController.php
│   │   ├── UserController.php
│   │   ├── ConnectionController.php
│   │   ├── ConversationController.php
│   │   ├── MessageController.php
│   │   ├── NotificationController.php
│   │   └── InviteController.php
│   ├── middleware/
│   │   ├── AuthMiddleware.php  # Session token authorization
│   │   └── CORSMiddleware.php  # Pre-flight & CORS headers
│   ├── uploads/                # User profile avatars & attachments
│   ├── .htaccess               # Apache REST API rewrite rules
│   ├── index.php               # REST API main router entry point
│   └── schema.sql              # Normalized MySQL Database Schema
├── public/
│   └── .htaccess               # React Router SPA fallback rules
├── src/
│   ├── components/             # Reusable UI components (Avatar, MessageBubble, ChatArea, Modals)
│   ├── context/                # AuthContext, ChatContext, ToastContext
│   ├── hooks/                  # useConversationPolling, useDebounce
│   ├── pages/                  # Dashboard, Chat, Connections, Notifications, Profile, JoinInvite, Auth
│   ├── services/               # API service layer (auth, user, connection, chat, invite, notification)
│   ├── index.css               # Design system tokens & Tailwind v4
│   ├── App.jsx                 # Routes & protected layout
│   └── main.jsx                # Entry point with BrowserRouter
├── vite.config.js              # Vite bundler configuration
├── package.json                # Dependencies & scripts
└── README.md                   # Deployment documentation
```

---

## 🚀 Hostinger Shared Hosting Deployment Guide

Follow these step-by-step instructions to deploy MarkanM Chat to Hostinger shared hosting under `chat.markanm.com`.

### Step 1: Create MySQL Database in Hostinger hPanel
1. Log in to your **Hostinger hPanel**.
2. Navigate to **Databases** → **Management**.
3. Create a new MySQL database:
   - **Database Name**: `u123456789_markanmchat` (example)
   - **Database Username**: `u123456789_chatuser`
   - **Password**: Create a strong password and copy it down.
4. Click **Create**.

---

### Step 2: Import the Database Schema (`schema.sql`)
1. In hPanel, click **Enter phpMyAdmin** next to your newly created database.
2. Select your database from the left sidebar.
3. Click the **Import** tab at the top.
4. Choose the `backend/schema.sql` file from this project repository.
5. Click **Go** to execute and populate all 11 normalized tables (`users`, `conversations`, `messages`, `sessions`, etc.).

---

### Step 3: Configure PHP Backend Credentials
1. Open `backend/config/config.php` and `backend/config/database.php`.
2. Update `database.php` or set environment variables in Hostinger:
   ```php
   $host = getenv('DB_HOST') ?: '127.0.0.1'; // Hostinger is usually localhost or 127.0.0.1
   $dbname = getenv('DB_NAME') ?: 'u123456789_markanmchat';
   $user = getenv('DB_USER') ?: 'u123456789_chatuser';
   $pass = getenv('DB_PASS') ?: 'YourHostingerPasswordHere';
   ```
3. Set your production app domain in `backend/config/config.php`:
   ```php
   define('APP_URL', 'https://chat.markanm.com');
   ```

---

### Step 4: Build the Vite Frontend Production Bundle
On your local computer or CI/CD environment, compile the React production dist build:
```bash
npm run build
```
This generates the optimized `dist/` directory containing `index.html`, `assets/`, and `public/.htaccess`.

---

### Step 5: Upload Files to Hostinger File Manager

1. Open **Hostinger File Manager** for `chat.markanm.com` (`public_html` directory).
2. Upload the **PHP Backend**:
   - Upload the contents of the `backend/` folder to `public_html/backend/`.
   - Ensure `public_html/backend/uploads/` directory exists.
   - Set directory permissions on `public_html/backend/uploads/` to `755` (or `777` if write access is restricted).
3. Upload the **React Frontend**:
   - Upload all files from inside `dist/` directly into `public_html/`.
   - Make sure `public_html/.htaccess` is present (copied from `public/.htaccess` or `dist/.htaccess`).

---

### Step 6: Verify SPA Routing (`.htaccess`)
Ensure `public_html/.htaccess` contains SPA fallback rules so React Router handles URL refreshes (like `chat.markanm.com/@username` and `chat.markanm.com/join/code`):

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 🔒 Security Summary

- **PDO Prepared Statements**: All database operations prevent SQL Injection vulnerabilities.
- **Session Token Middleware**: Authorization headers verify session validity on every endpoint call.
- **IDOR Protection**: Messages and conversation membership are checked against authenticated session IDs before returning data.
- **Input & Upload Sanitation**: Filenames are randomized, MIME types and file sizes are strictly checked before saving avatar images.
