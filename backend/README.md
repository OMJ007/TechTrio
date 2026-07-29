# Xpense AI - Backend Setup

## Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Core
APP_NAME=xpense-ai
DEBUG=true

# Database
POSTGRES_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/xpense_ai
CHROMADB_URL=http://localhost:8000

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Bcrypt
BCRYPT_ROUNDS=12

# Storage
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=./uploads

# External APIs (optional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_VISION_API_KEY=
```

## Running the Backend

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload
```

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc