Frontend: Next.js demo. Run `npm install` then `npm run dev`. Ensure NEXT_PUBLIC_API_BASE is set to backend URL if needed.


# backend run 
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install fastapi uvicorn scikit-learn numpy requests python-dotenv
uvicorn server:app --reload --port 8000

# front end run 
cd frontend
npm install
npm run dev

