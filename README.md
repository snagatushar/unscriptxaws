# 🚀 UNSCRIPTX 2026

**UNSCRIPTX 2026** is a high-energy, production-ready platform designed for the modern college cultural fest experience. Built with a focus on raw performance, sophisticated animations, and rock-solid security, it handles everything from student registrations and event management to multi-round video submissions and administrative judging workflows.

![UNSCRIPTX Banner](https://unscriptx-t.vercel.app/logo.png)

## ✨ Core Features

### 🎨 Premium UI/UX
- **Immersive Visuals**: High-performance mesh gradients and particle systems optimized for GPU acceleration.
- **Cinematic Transitions**: Seamless cross-fades and slide-preloading for a flicker-free landing page experience.
- **Micro-interactions**: Powered by `motion` (Framer Motion) for that premium "app-like" feel.

### 🛡️ Secure & Scalable Architecture
- **Role-Based Access Control (RBAC)**: Dedicated dashboards for **Admins**, **Payment Reviewers**, **Content Judges**, and **Participants**.
- **Hardened Security**: Pre-configured security headers (CSP, HSTS, XSS protection) via `vercel.json`.
- **Row-Level Security (RLS)**: Fine-grained database permissions managed directly on Supabase.

### ⚡ Performance-First
- **Smart Code Splitting**: Manual chunking of vendor libraries (React, Motion, Supabase, ExcelJS) for better caching.
- **Lazy Loading**: Route-level lazy loading significantly reduces the main JS bundle size.
- **Global Data Caching**: In-memory caching for static fest data (rules, committee, events) eliminates redundant network traffic.
- **Optimized Assets**: Image pre-loading and data-URI noise textures for instant render times.

### 📁 Advanced Event Workflows
- **Dynamic Registrations**: Support for external links (Google Forms) or internal native forms.
- **Video Submission System**: Seamless 500MB+ video uploads directly to Supabase storage with validation.
- **Excel Export**: Generate on-demand participant reports with `exceljs`.

---

## 🛠️ Technology Stack

- **Frontend**: [React 19](https://react.dev/) + [Vite 6](https://vitejs.dev/)
- **Logic**: [TypeScript](https://www.typescriptlang.org/)
- **Backend/Auth/DB**: [Supabase](https://supabase.com/)
- **Styling**: Vanilla CSS (Modern Design System)
- **Animations**: [Motion](https://motion.dev/)
- **Reports**: [ExcelJS](https://github.com/exceljs/exceljs)

---

## 🚀 Getting Started

### 1. Prerequisite
Ensure you have [Node.js](https://nodejs.org/) installed on your system.

### 2. Clone the repository
```bash
git clone https://github.com/your-username/unscriptx-2026.git
cd unscripted/unscripted
```

### 3. Install dependencies
```bash
npm install
```

### 4. Set up Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Start the development server
```bash
npm run dev
```
The site will be available at `http://localhost:5173`.

---

## 🚢 Deployment (Vercel)

1. Connect your GitHub repository to [Vercel](https://vercel.com/).
2. Add your environment variables in the Vercel Dashboard.
3. **Crucial**: Update your **Supabase Authentication Settings**:
   - **Site URL**: `https://unscriptx-t.vercel.app`
   - **Redirect URLs**: `https://unscriptx-t.vercel.app/**`

---

## 🔥 Performance Score Card
- **First Contentful Paint**: < 1s
- **Time to Interactive**: < 2s
- **Initial Bundle Size**: < 200KB (Gzipped)
- **Vulnerabilities**: 0 (Audit cleared)

---

Made with ❤️ by S.Naga Tushar for **UNSCRIPTX 2026**.
