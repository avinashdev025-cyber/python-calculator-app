# PyCalc 🌌

A premium, beautifully designed glassmorphic web calculator built with a Python (Flask) backend and SQLite database. 

PyCalc features clean HSL themes, full computation history logs, a custom AST-safe mathematical expression solver, full physical keyboard integration, keypress feedback glows, and debounced live calculations.

---

## Features

- **AST-Safe Evaluator**: Safe mathematical parsing using python's `ast` library to prevent code injections (instead of standard `eval()`).
- **Rich Aesthetics**: Vibrantly colored gradients, responsive glassmorphic cards, light/dark modes, and interactive key hover glows.
- **Advanced Mode**: Expandable scientific calculator panel supporting functions like `sqrt`, `sin`, `cos`, `tan`, `log`, `ln`, `abs`, and power exponents `^`.
- **Live Preview**: Evaluates mathematical results dynamically as you type (debounced by 300ms to optimize server load).
- **Persistent History**: Stores the 20 most recent calculation logs in a local SQLite database using SQLAlchemy ORM.
- **Dynamic Text Scaling**: Automatically wraps long formulas and shrinks display font size (down to `1.0rem`) to fit long calculations, accompanied by auto-scroll locks.

---

## How to Run Locally

### Prerequisites

Make sure you have Python 3.8+ installed on your computer.

### Step 1: Clone and Enter the Directory

```bash
git clone <your-github-repo-link>
cd python-calculator-app
```

### Step 2: Set up a Virtual Environment (Optional but Recommended)

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Run the Application

```bash
python app.py
```

Open your browser and navigate to **`http://127.0.0.1:5000`** to start calculating!

---

## Running Unit Tests

To verify AST evaluator functionality and mathematical correctness:

```bash
python run_tests.py
```

The detailed report will be saved inside `test_results.txt`.

---

## Deploying to Production (e.g. Render)

This application is ready to deploy on **[Render.com](https://render.com/)**:

1. Create a free account on Render.
2. Select **New Web Service** and connect your GitHub repository.
3. Configure the following settings:
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
4. Click **Deploy**. Render will generate a working public URL that you can share with anyone!
