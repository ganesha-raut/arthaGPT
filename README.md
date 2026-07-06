# Artha GPT – Premium AI SaaS Platform

Artha GPT is a premium, responsive, local-first artificial intelligence assistant and SaaS platform built using React, Vite, and Tailwind CSS. It integrates advanced conversation capabilities, coding preview sandboxes, intelligent live web searching, and image generation, all securely encapsulated inside local IndexedDB storage.

## Key Features

- 🤖 **Premium AI Chat:** Human-like dialog flows powered by Groq Llama-3.1 model APIs.
- 💻 **Preview Code Sandbox:** Full CSS, JavaScript, React, and HTML previewer. Edit code and execute preview sandboxes in a single click.
- 🔍 **Resilient Web Search:** Custom DuckDuckGo Lite & Yahoo Search parsers that bypass Netlify IP blocking to fetch real-time market news and live stock quotes.
- 🎨 **Image Studio:** Turn descriptions into high-fidelity image representations.
- 📂 **Data & File Analysis:** Analyze PDFs, CSVs, and documents locally.
- 🔐 **Privacy-First Database:** Dexie.js IndexedDB storage stores history safely in the browser database.
- ⚡ **Vercel & Apple-inspired Pure Black Theme:** Stunning visual theme with gold (`#F5B335`) and teal (`#17C7C9`) gradients.

## Tech Stack

* **Front-End:** React 18, Vite, Tailwind CSS, Framer Motion (animations), Lucide React (icons)
* **Back-End / Functions:** Netlify Serverless Functions (web search, title generator, LLM API routing)
* **Database:** Dexie.js (IndexedDB wrapper)
* **API Providers:** Groq Cloud Llama API, BuildPicoApps API

---

## Getting Started

### 1. Clone the Project
```bash
git clone https://github.com/ganesha-raut/arthaGPT.git
cd arthaGPT
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Dev Server
Launch Vite's hot-reloading development server:
```bash
npm run dev
```

### 4. Build Production Bundle
Prepare static code bundle optimized for high-performance deployments:
```bash
npm run build
```

---

## Project Structure

```
├── netlify/               # Serverless edge function routes (web-search, title-generation)
├── src/
│   ├── components/
│   │   ├── chat/          # ChatArea, ImageStudio, Sandbox, Settings panels
│   │   ├── landing/       # Premium Artha GPT Home Landing page
│   │   └── sidebar/       # Conversation lists and workspace navigation
│   ├── database/          # Dexie.js setup files
│   ├── store/             # Zustand state management
│   ├── main.tsx           # React entrypoint
│   └── App.tsx            # Main layout wrapper and client pathname router
├── index.html             # Main entry template with optimized SEO meta configurations
├── vite.config.ts         # Vite configuration and server emulation mockups
└── README.md              # Technical documentation
```

---

## Author & Creator

Designed and engineered with ❤️ by **Ganesh Santosh Raut**.
* **Role:** Founder & CEO
* **Location:** Maharashtra, India
* **Skills:** AI Engineering, React, Next.js, Python, LangChain, RAG
* **Portfolio:** [ganesharaut.in](https://ganesharaut.in)

---
© 2026 Artha GPT. All rights reserved.
