# ⚡ Luminos Executor

![React](https://img.shields.io/badge/React-18-blue)
![Electron](https://img.shields.io/badge/Electron-Vite-purple)
![Status](https://img.shields.io/badge/Status-Beta-orange)

**Luminos** is a modern, lightweight, and aesthetic script execution environment built for Windows using Electron and React. It features a fully custom UI with Glassmorphism (Acrylic) effects, a robust script hub powered by ScriptBlox, and a professional code editor.

> **Note:** This project is a UI/Frontend implementation of an executor. The actual DLL injection logic is simulated for development purposes.

---

## ✨ Features

* **Modern UI:** Custom title bar, floating action buttons, and smooth transitions.
* **Theming Engine:** Built-in support for multiple themes (Dracula, Monokai, Solarized) and a custom "Acrylic" mode.
* **File System:** Save, Open, and Rename scripts directly to a local workspace treeview.
* **Live Terminal:** Draggable, real-time logging terminal.
* **Script Hub:** Integrated browser for cloud scripts.

---

## 📸 Interface & How It Works

### 1. The Code Editor
Powered by **Ace Editor**, the industry-standard web code editor.
* **Tech:** `react-ace`
* **Features:** Lua syntax highlighting, autocomplete, line numbers, and gutter support.
* **Functionality:** Supports opening `.lua` and `.txt` files from your PC and saving them to the sidebar workspace.

![Luminos Editor Screenshot](https://i.e-z.host/8suv2eff.png)


### 2. The Script Hub
A cloud-based library to find scripts without leaving the app.
* **Tech:** Fetches data via **ScriptBlox API**.
* **Features:** Search functionality, pagination, and "View Script" modal.
* **Notes:** Uses a custom Node.js fetch handler in the main process to bypass CORS restrictions and simulate a browser User-Agent.

![Luminos ScriptHub Screenshot](https://i.e-z.host/9dg75gdo.png)


### 3. Settings & Customization
Fully dynamic settings that apply instantly without reloading.
* **Tech:** React State & Local Storage.
* **Features:** Change font size, toggle word wrap, enable auto-save, and switch themes.
* **Acrylic Mode:** Simulates the Windows 11 Mica/Acrylic effect using semi-transparent CSS layers.

![Luminos Settings Screenshot](https://i.e-z.host/fyytjpy4.png)


---

## 🛠️ Tech Stack

This project was built with the following technologies:

* **[Electron](https://www.electronjs.org/):** For the desktop app runtime.
* **[React](https://reactjs.org/):** For the user interface components.
* **[Vite](https://vitejs.dev/):** For lightning-fast hot reloading and building.
* **[Ace Editor](https://ace.c9.io/):** The core text editing engine.
* **[Lucide React](https://lucide.dev/):** Beautiful, open-source icons.
* **[Tailwind CSS](https://tailwindcss.com/):** For utility-first styling.

---

## ⚠️ Known Issues & Limitations

Since this is an open-source beta, there are a few known limitations:

1.  **DLL Injection:** The "Attach" and "Execute" buttons currently output logs to the internal terminal. They **do not** actually inject into the Roblox process (requires a C++ DLL bridge).
2.  **ScriptHub Images:** Due to API rate limits or blocking from the source, script thumbnails currently default to a placeholder image to keep the UI clean.
3.  **Window Resizing:** To maintain the custom "Acrylic" look, native window transparency was adjusted. Resizing works, but the window background is simulated CSS rather than native Windows blur to ensure stability.

---

## 🚀 Getting Started

To build and run this project locally:

### Prerequisites
* Node.js (v16 or higher)
* npm or yarn

### Installation

1.  Clone the repository:
    ```bash
    git clone [https://github.com/zukxi/Electron-UI.git](https://github.com/zukxi/Electron-UI.git)
    ```
2.  Navigate to the folder:
    ```bash
    cd luminos-executor
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Start the app in development mode:
    ```bash
    npm run dev
    ```

---

## 👥 Credits

* **Creator & Lead Developer:** [Zuki]
* **Co-Pilot / Help:** [Gemini (AI) / Stack Overflow / Github]
* **API Provider:** [ScriptBlox](https://scriptblox.com)

---

## 📄 License

This project is under no license. Enjoy the project!
