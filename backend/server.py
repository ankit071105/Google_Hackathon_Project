import os, json, sqlite3, difflib, requests, time
from collections import defaultdict
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel, cosine_similarity
from sklearn.preprocessing import MinMaxScaler

BASE_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(BASE_DIR, "ecom.db")
DATA_PATH = os.path.join(BASE_DIR, "products.json")
RECOMM_LIMIT = 24

# Gemini config via env - Using the free API correctly
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyBqVkjEglx-1PezelrSWalL_QJ9f5J9Nf0").strip()
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-1.5-flash").strip()

app = FastAPI(title="ECom Crafts API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# Rate limiter to prevent 429 errors
class RateLimiter:
    def __init__(self, max_calls=10, period=60):
        self.max_calls = max_calls
        self.period = period
        self.calls = defaultdict(list)
    
    def check_limit(self, key):
        now = time.time()
        self.calls[key] = [t for t in self.calls[key] if now - t < self.period]
        if len(self.calls[key]) >= self.max_calls:
            return False
        self.calls[key].append(now)
        return True

rate_limiter = RateLimiter(max_calls=10, period=60)

# load products
try:
    with open(DATA_PATH, encoding='utf-8') as f:
        PRODUCTS = json.load(f)
except FileNotFoundError:
    PRODUCTS = []

# build indexes
CITY_INDEX = {}
STATE_INDEX = {}
for p in PRODUCTS:
    city = p.get('city','').strip().lower()
    state = p.get('state','').strip().lower()
    CITY_INDEX.setdefault(city, []).append(p)
    STATE_INDEX.setdefault(state, []).append(p)

# TF-IDF for content based recs
corpus = []
for p in PRODUCTS:
    text = " ".join(p.get('tags',[])) + " " + p.get('name','') + " " + p.get('description','')
    corpus.append(text)
vectorizer = TfidfVectorizer(stop_words='english', max_features=1500)
tfidf_matrix = vectorizer.fit_transform(corpus) if corpus else None

# Create product similarity matrix for better recommendations
product_features = []
for p in PRODUCTS:
    features = []
    # Add popularity score
    features.append(p.get('popularity', 0) / 100.0)
    
    # Add price normalized (0-1)
    max_price = max([prod.get('price', 0) for prod in PRODUCTS]) if PRODUCTS else 1
    features.append(p.get('price', 0) / max_price if max_price > 0 else 0)
    
    # Add tags as one-hot encoded (simplified)
    all_tags = list(set([tag for prod in PRODUCTS for tag in prod.get('tags', [])]))
    for tag in all_tags:
        features.append(1 if tag in p.get('tags', []) else 0)
    
    product_features.append(features)

# Normalize features
if product_features:
    scaler = MinMaxScaler()
    product_features_normalized = scaler.fit_transform(product_features)
    product_similarity = cosine_similarity(product_features_normalized)
else:
    product_similarity = None

# DB init
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS user_clicks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            product_id INTEGER NOT NULL,
            ts DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    c.execute('CREATE TABLE IF NOT EXISTS users (user_id TEXT PRIMARY KEY, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)')
    c.execute('''
        CREATE TABLE IF NOT EXISTS user_preferences (
            user_id TEXT PRIMARY KEY,
            preferred_city TEXT,
            preferred_state TEXT,
            preferred_tags TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
init_db()

class ClickEvent(BaseModel):
    user_id: str
    product_id: int

class RecommendQuery(BaseModel):
    user_id: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    q: Optional[str] = None
    similar_to: Optional[int] = None

class UserPreference(BaseModel):
    user_id: str
    city: Optional[str] = None
    state: Optional[str] = None
    tags: Optional[list] = None

def normalize(s):
    return (s or "").strip().lower()

def find_best_match(key, index):
    if not key:
        return None
    k = normalize(key)
    if k in index:
        return k
    choices = list(index.keys())
    matches = difflib.get_close_matches(k, choices, n=1, cutoff=0.6)
    return matches[0] if matches else None

def get_candidates(city=None, state=None):
    city_key = find_best_match(city, CITY_INDEX)
    state_key = find_best_match(state, STATE_INDEX)
    if city_key:
        return CITY_INDEX[city_key], city_key, state_key
    if state_key:
        return STATE_INDEX[state_key], city_key, state_key
    return PRODUCTS, city_key, state_key

def record_click(user_id, product_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('INSERT INTO user_clicks (user_id, product_id) VALUES (?,?)', (user_id, product_id))
    c.execute('INSERT OR IGNORE INTO users (user_id) VALUES (?)', (user_id,))
    conn.commit()
    conn.close()

def get_user_clicks(user_id, limit=50):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT product_id FROM user_clicks WHERE user_id=? ORDER BY ts DESC LIMIT ?', (user_id, limit))
    rows = c.fetchall()
    conn.close()
    return [r[0] for r in rows]

def get_user_preferences(user_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT preferred_city, preferred_state, preferred_tags FROM user_preferences WHERE user_id=?', (user_id,))
    row = c.fetchone()
    conn.close()
    
    if row:
        city, state, tags_json = row
        tags = json.loads(tags_json) if tags_json else []
        return {"city": city, "state": state, "tags": tags}
    return None

def save_user_preferences(user_id, city=None, state=None, tags=None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    tags_json = json.dumps(tags) if tags else None
    
    c.execute('''
        INSERT OR REPLACE INTO user_preferences (user_id, preferred_city, preferred_state, preferred_tags)
        VALUES (?, ?, ?, ?)
    ''', (user_id, city, state, tags_json))
    conn.commit()
    conn.close()

def recommend_personal(user_id, topk=RECOMM_LIMIT):
    clicked = get_user_clicks(user_id)
    if not clicked or tfidf_matrix is None:
        return []
    
    idx_map = {p['id']:i for i,p in enumerate(PRODUCTS)}
    indices = [idx_map[i] for i in clicked if i in idx_map]
    
    if not indices:
        return []
    
    # Get user preferences
    preferences = get_user_preferences(user_id)
    
    # Get clicked product categories/tags
    clicked_categories = set()
    for pid in clicked:
        if pid in idx_map:
            product = PRODUCTS[idx_map[pid]]
            clicked_categories.update(product.get('tags', []))
    
    # Add preferred tags if available
    if preferences and preferences.get('tags'):
        clicked_categories.update(preferences.get('tags', []))
    
    vecs = tfidf_matrix[indices]
    mean_vec = vecs.mean(axis=0)
    sims = linear_kernel(mean_vec, tfidf_matrix).flatten()
    
    scored = []
    for i, s in enumerate(sims):
        pid = PRODUCTS[i]['id']
        if pid in clicked: 
            continue
        
        # Calculate category similarity
        product_categories = set(PRODUCTS[i].get('tags', []))
        category_similarity = len(clicked_categories.intersection(product_categories)) / len(clicked_categories.union(product_categories)) if clicked_categories else 0
        
        # Calculate product similarity using our enhanced features
        product_sim_score = 0
        if product_similarity is not None and indices:
            # Average similarity to all clicked products
            for idx in indices:
                product_sim_score += product_similarity[idx][i]
            product_sim_score /= len(indices)
        
        # Combine scores with weights
        pop = PRODUCTS[i].get('popularity',0)/100.0
        final_score = float(s) + 0.25*pop + 0.15*category_similarity + 0.2*product_sim_score
        
        # Location preference bonus
        if preferences:
            if preferences.get('city') and normalize(PRODUCTS[i].get('city')) == normalize(preferences.get('city')):
                final_score += 0.3
            elif preferences.get('state') and normalize(PRODUCTS[i].get('state')) == normalize(preferences.get('state')):
                final_score += 0.15
        
        scored.append((final_score, PRODUCTS[i]))
    
    scored.sort(key=lambda x: x[0], reverse=True)
    return [p for sc,p in scored[:topk]]

def recommend_similar(product_id, topk=6):
    if product_similarity is None:
        return []
    
    idx_map = {p['id']:i for i,p in enumerate(PRODUCTS)}
    if product_id not in idx_map:
        return []
    
    idx = idx_map[product_id]
    sim_scores = list(enumerate(product_similarity[idx]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
    
    # Get top similar products (excluding the product itself)
    similar_products = []
    for i, score in sim_scores[1:topk+1]:
        similar_products.append(PRODUCTS[i])
    
    return similar_products

def rank_by_location(candidates, city_key, state_key, q=None, topk=RECOMM_LIMIT):
    filtered = candidates
    if q:
        ql = q.lower()
        filtered = [p for p in candidates if ql in p['name'].lower() or ql in p.get('description','').lower() or any(ql in t for t in p.get('tags',[]))]
    scored = []
    for p in filtered:
        score = 0.0
        if city_key and normalize(p.get('city'))==city_key:
            score += 0.6
        elif state_key and normalize(p.get('state'))==state_key:
            score += 0.35
        if q and tfidf_matrix is not None:
            idx = PRODUCTS.index(p)
            qvec = vectorizer.transform([q])
            sim = linear_kernel(qvec, tfidf_matrix[idx]).flatten()[0]
            score += 0.3 * float(sim)
        score += 0.1 * (p.get('popularity',0)/100.0)
        scored.append((score,p))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [p for s,p in scored[:topk]]

def call_gemini(prompt, model=None, api_key_override=None):
    """
    Uses Google Generative Language API (v1).
    Docs: https://generativelanguage.googleapis.com
    """
    # Check rate limit first
    if not rate_limiter.check_limit("gemini_api"):
        return {"model":"rate_limited","response":"Please wait a moment before sending another message. Our AI assistant is processing previous requests."}
    
    model = (model or GEMINI_MODEL).strip()
    api_key = (api_key_override or GEMINI_API_KEY).strip()

    if not api_key:
        return {"model":"mock","response":
                "Welcome to ArtCrafts! I'm your virtual assistant. I can help you explore our collection of authentic Indian handicrafts. Please set up a Gemini API key for full functionality."}

    # Correct v1 endpoint + key as query param
    url = f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.7,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 1024,
        },
        "safetySettings": [
            {
                "category": "HARM_CATEGORY_HARASSMENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_HATE_SPEECH",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
                "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                "threshold": "BLOCK_MEDIUM_AND_ABOVE"
            }
        ]
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, params={"key": api_key}, timeout=30)
        if resp.status_code == 200:
            j = resp.json()
            # Extract response text safely
            if "candidates" in j and len(j["candidates"]) > 0:
                candidate = j["candidates"][0]
                if "content" in candidate and "parts" in candidate["content"]:
                    parts = candidate["content"]["parts"]
                    if len(parts) > 0 and "text" in parts[0]:
                        return {"model": model, "response": parts[0]["text"]}
            
            return {"model": model, "response": "I'm not sure how to respond to that. Could you try asking something else about our handicrafts?"}
        elif resp.status_code == 429:
            return {"model":"rate_limited","response":"Our AI assistant is currently busy. Please try again in a moment."}
        else:
            return {"model":"gemini-error","response":f"AI service error {resp.status_code}: {resp.text}"}
    except Exception as e:
        return {"model":"error","response":f"AI request failed: {str(e)}"}

@app.get("/products")
def list_products(q: Optional[str] = None, limit: int = 50):
    items = PRODUCTS
    if q:
        ql = q.lower()
        items = [p for p in PRODUCTS if ql in p['name'].lower() or ql in p.get('description','').lower() or any(ql in t for t in p.get('tags',[]))]
    return items[:limit]

@app.post("/recommend")
def recommend(body: RecommendQuery = Body(...)):
    try:
        user_id = body.user_id
        q = body.q
        similar_to = body.similar_to
        
        # Similar products recommendation
        if similar_to:
            similar_products = recommend_similar(similar_to)
            if similar_products:
                return {"source":"similar","products":similar_products}
        
        # personalized first
        if user_id:
            personal = recommend_personal(user_id)
            if personal:
                return {"source":"personalized","products":personal}
        # location based
        candidates, city_key, state_key = get_candidates(body.city, body.state)
        if city_key or state_key:
            ranked = rank_by_location(candidates, city_key, state_key, q=q)
            return {"source":"location","matched_city":city_key,"matched_state":state_key,"products":ranked}
        # query fallback
        if q:
            ranked = rank_by_location(PRODUCTS, None, None, q=q)
            return {"source":"global_search","products":ranked}
        # global fallback
        ranked = sorted(PRODUCTS, key=lambda x: x.get('popularity',0), reverse=True)[:RECOMM_LIMIT]
        return {"source":"global","products":ranked}
    except Exception as e:
        ranked = sorted(PRODUCTS, key=lambda x: x.get('popularity',0), reverse=True)[:RECOMM_LIMIT]
        return {"source":"fallback","products":ranked, "error": str(e)}

@app.post("/click")
def click(event: ClickEvent):
    record_click(event.user_id, event.product_id)
    return {"status":"ok"}

@app.post("/preferences")
def save_preferences(prefs: UserPreference):
    save_user_preferences(prefs.user_id, prefs.city, prefs.state, prefs.tags)
    return {"status":"preferences_saved"}

@app.get("/preferences/{user_id}")
def get_preferences(user_id: str):
    preferences = get_user_preferences(user_id)
    return preferences or {"status": "no_preferences"}

@app.post("/chat")
def chat(body: dict = Body(...)):
    """
    Body:
    {
      "prompt": "...",
      "api_key": "optional override string",     # for quick local testing only
      "model": "optional model override"
    }
    """
    prompt = body.get("prompt","") or ""
    api_key_override = body.get("api_key")
    model_override = body.get("model")
    if not prompt.strip():
        return {"model":"error","response":"Please provide a question about our products."}
    
    # Enhance prompt with context about products
    enhanced_prompt = f"""
    You are a helpful assistant for an Indian handicrafts e-commerce store called ArtCrafts.
    We specialize in authentic handmade products from various regions of India.
    
    Please help the customer with their question: {prompt}
    
    If they're asking about specific products, techniques, or cultural significance, provide detailed and accurate information.
    If you don't know something, it's better to say you don't know rather than make up information.
    
    Be friendly, knowledgeable, and encourage exploration of our crafts.
    """
    
    return call_gemini(enhanced_prompt.strip(), model=model_override, api_key_override=api_key_override)

@app.get("/health")
def health():
    return {
        "status":"ok",
        "products_count": len(PRODUCTS),
        "gemini_configured": bool(GEMINI_API_KEY),
        "model": GEMINI_MODEL or None
    }