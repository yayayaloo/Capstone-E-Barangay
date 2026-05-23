# E-Barangay System Context

## System Architecture
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS Modules (CSS-in-JS avoided, CSS Variables for theming)
- **Database**: Supabase (PostgreSQL) with Row-Level Security (RLS)
- **Icons**: Lucide React
- **Authentication**: Supabase Auth

## Current System State
The system is currently functional with complete user flows for:
1. Resident Registration & Dashboard
2. Admin Dashboard (Verification, Request Management, Statistics, Document Printing)
3. Document Request system with QR code validation

## Recent Changes & Fixes (Latest Session)
1. **Authentication Flow**: Optimized login and logout flow, replaced loading delays with smooth toast notifications and loading states.
2. **Icon Standardization**: Replaced all placeholder emojis across the system with clean, consistent Lucide React icons.
3. **Admin UI Layout Fixes**:
   - Removed the redundant Desktop Top Header and moved the "Sign Out" button and user profile to a clean footer inside the Sidebar.
   - Refactored `.dashboardLayout` to use `100vh` and pinned the sidebar so the user profile no longer vanishes on long pages.
   - Added `SectoralChart` to the main dashboard Overview for richer analytics alongside the Weekly Performance chart.
4. **Search via QR Code**: Added a direct QR scanner button inside the Document Requests search bar. Admins can now instantly scan a document's QR code, which automatically populates the search bar and filters the exact record in the table.

## Known Issues
- `AgeDemographicChart` warning about defaultProps might appear if `recharts` is outdated (minor console warning).
- Some charts may delay rendering on the Admin dashboard due to data fetching (needs optimization if user base grows).

## Pending Tasks & Next Development Steps
- Connect actual backend APIs for Service Requests (Clearance, Permits, etc.).
- Implement actual AI/NLP integration for the floating chatbot (OpenAI/Gemini).
- Setup real-time notifications for resident applications.
- Evaluate and optimize Supabase RLS policies for maximum security.
- Setup a production deployment pipeline (Vercel).
