# E-Barangay PWA

E-Barangay is an installable Progressive Web App (PWA) designed to streamline local government transactions, resident requests, and administrative operations. Built with Next.js 14, Supabase, and TypeScript, the system provides a modern, fast, and user-friendly portal for both residents and barangay administrators.

---

## Features

### Resident Portal
* **Document Requests**: Apply online for barangay documents including Barangay Clearance, Permits, digital Barangay IDs, and Certificates of Indigency.
* **Request Tracking**: Monitor the live status of submitted requests from the dashboard.
* **Digital ID & QR Code**: Access an automatically generated digital resident ID with a verification QR code.
* **Community Board**: View recent announcements and news posted by the barangay administration.

### Admin Dashboard
* **Document & Request Management**: Review, approve, print, or reject resident requests.
* **QR Verification Scanner**: Instantly scan and retrieve a document request's status directly from the search bar using a QR scanner.
* **Announcement Publisher**: Draft and post notices to the resident community board.
* **Resident Database & Analytics**: View resident counts, age demographics, and sector-based insights.

### Intelligent Chatbot Assistant
* Powered by Gemini AI with a robust local bilingual (English/Tagalog) fallback system.
* Provides quick answers to questions about document requirements, processing fees, operating hours, and location.
* Offers dynamic quick-reply recommendations for standard inquiries.

---

## Tech Stack

* **Frontend**: Next.js 14 (App Router), TypeScript, Vanilla CSS Modules
* **Database & Auth**: Supabase (PostgreSQL) with Row-Level Security (RLS) policies
* **Styling**: Modern dark theme with CSS Variables and responsive layouts
* **Icons**: Lucide React
* **Key Libraries**: `@yudiel/react-qr-scanner` for scanning, `qrcode.react`, `jspdf`, and `html2canvas` for document exports

---

## Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.x or later recommended)
* A Supabase project (or local instance)
* A Gemini API key (optional for the chatbot's advanced NLP features)

### Installation

1. Clone or navigate to the repository directory:
   ```bash
   cd Capstone-E-Barangay
   ```

2. Install the project dependencies:
   ```bash
   npm install
   ```

3. Configure your local environment variables. Create a `.env.local` file in the root directory and add the following keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

### Running the Application

* **Development Mode**: Run the local development server:
  ```bash
  npm run dev
  ```
  Open [http://localhost:3000](http://localhost:3000) in your browser.

* **Production Mode**: Build the application and start the production server:
  ```bash
  npm run build
  npm run start
  ```

---

## PWA Installation Guide

Because this application is built with PWA capabilities, you can install it on your devices for an app-like experience with offline fallback capabilities:

### Desktop (Chrome or Edge)
1. Open the application in Chrome or Edge.
2. Click the install icon located on the right side of the address bar.
3. Click **Install**.

### Mobile (iOS Safari / Android Chrome)
* **Android**: Open the site in Chrome, tap the menu button (three dots), and select **Add to Home screen**.
* **iOS**: Open the site in Safari, tap the share icon, scroll down, and select **Add to Home Screen**.

---

## Project Structure

```text
Capstone-E-Barangay/
├── app/                  # Next.js App Router directory
│   ├── actions/          # Server Actions
│   ├── admin/            # Admin dashboard routes and views
│   ├── api/              # API endpoints (including chatbot API)
│   ├── auth/             # Login and signup authentication routes
│   ├── resident/         # Resident portal routes
│   ├── globals.css       # Global styles and CSS variables
│   └── layout.tsx        # Application root layout
├── components/           # Shared React components (Chatbot, dialogs, etc.)
├── lib/                  # Type definitions, Supabase clients, and utilities
├── public/               # Static assets, logos, and PWA manifest config
└── supabase/             # Database schemas, migrations, and local config
```

---

## Future Enhancements
* Set up a production CI/CD deployment pipeline (e.g., Vercel).
* Expand real-time resident notifications for request updates.
* Integrate payment gateway APIs for online permit/clearance fees.
* Complete an audit and hardening of all Row-Level Security (RLS) policies in Supabase.
