from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt
import bcrypt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

# Create the main app without a prefix
app = FastAPI(title="Athlete Arena API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Enums
class UserRole(str, Enum):
    PARTICIPANT = "participant"
    ORGANIZER = "organizer"

class TournamentStatus(str, Enum):
    UPCOMING = "upcoming"
    ONGOING = "ongoing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class RegistrationStatus(str, Enum):
    REGISTERED = "registered"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: UserRole
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: UserRole
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Tournament(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    sport: str
    description: str
    start_date: datetime
    end_date: datetime
    location: str
    max_participants: int
    organizer_id: str
    status: TournamentStatus = TournamentStatus.UPCOMING
    participants: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TournamentCreate(BaseModel):
    name: str
    sport: str
    description: str
    start_date: datetime
    end_date: datetime
    location: str
    max_participants: int

class Registration(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    tournament_id: str
    status: RegistrationStatus = RegistrationStatus.REGISTERED
    registered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TournamentWithDetails(BaseModel):
    id: str
    name: str
    sport: str
    description: str
    start_date: datetime
    end_date: datetime
    location: str
    max_participants: int
    organizer_name: str
    status: TournamentStatus
    participants_count: int
    is_registered: bool = False

# Helper functions
def prepare_for_mongo(data):
    """Convert datetime objects to ISO strings for MongoDB storage"""
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
    return data

def parse_from_mongo(item):
    """Parse datetime strings back from MongoDB"""
    if isinstance(item, dict):
        for key, value in item.items():
            if isinstance(value, str) and key.endswith(('_date', '_at')):
                try:
                    item[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except:
                    pass
    return item

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_data: dict) -> str:
    return jwt.encode(user_data, SECRET_KEY, algorithm=ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_jwt_token(token)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_data = await db.users.find_one({"id": user_id})
    if not user_data:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**parse_from_mongo(user_data))

# Authentication Routes
@api_router.post("/auth/register")
async def register_user(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    hashed_password = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=user_data.role,
        phone=user_data.phone
    )
    
    # Store user with hashed password
    user_dict = prepare_for_mongo(user.dict())
    user_dict['password'] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    # Create JWT token
    token = create_jwt_token({"user_id": user.id, "email": user.email, "role": user.role})
    
    return {"user": user, "token": token}

@api_router.post("/auth/login")
async def login_user(login_data: UserLogin):
    # Find user
    user_data = await db.users.find_one({"email": login_data.email})
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(login_data.password, user_data['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = User(**parse_from_mongo(user_data))
    token = create_jwt_token({"user_id": user.id, "email": user.email, "role": user.role})
    
    return {"user": user, "token": token}

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# Tournament Routes
@api_router.post("/tournaments", response_model=Tournament)
async def create_tournament(tournament_data: TournamentCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ORGANIZER:
        raise HTTPException(status_code=403, detail="Only organizers can create tournaments")
    
    tournament = Tournament(
        **tournament_data.dict(),
        organizer_id=current_user.id
    )
    
    tournament_dict = prepare_for_mongo(tournament.dict())
    await db.tournaments.insert_one(tournament_dict)
    
    return tournament

@api_router.get("/tournaments", response_model=List[TournamentWithDetails])
async def get_tournaments(current_user: User = Depends(get_current_user)):
    tournaments_data = await db.tournaments.find().to_list(1000)
    tournaments_with_details = []
    
    for tournament_data in tournaments_data:
        tournament_data = parse_from_mongo(tournament_data)
        
        # Get organizer name
        organizer = await db.users.find_one({"id": tournament_data['organizer_id']})
        organizer_name = organizer['name'] if organizer else "Unknown"
        
        # Check if current user is registered
        registration = await db.registrations.find_one({
            "user_id": current_user.id,
            "tournament_id": tournament_data['id']
        })
        is_registered = registration is not None
        
        tournament_with_details = TournamentWithDetails(
            **tournament_data,
            organizer_name=organizer_name,
            participants_count=len(tournament_data.get('participants', [])),
            is_registered=is_registered
        )
        tournaments_with_details.append(tournament_with_details)
    
    return tournaments_with_details

@api_router.get("/tournaments/{tournament_id}", response_model=TournamentWithDetails)
async def get_tournament(tournament_id: str, current_user: User = Depends(get_current_user)):
    tournament_data = await db.tournaments.find_one({"id": tournament_id})
    if not tournament_data:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    tournament_data = parse_from_mongo(tournament_data)
    
    # Get organizer name
    organizer = await db.users.find_one({"id": tournament_data['organizer_id']})
    organizer_name = organizer['name'] if organizer else "Unknown"
    
    # Check if current user is registered
    registration = await db.registrations.find_one({
        "user_id": current_user.id,
        "tournament_id": tournament_id
    })
    is_registered = registration is not None
    
    return TournamentWithDetails(
        **tournament_data,
        organizer_name=organizer_name,
        participants_count=len(tournament_data.get('participants', [])),
        is_registered=is_registered
    )

@api_router.post("/tournaments/{tournament_id}/register")
async def register_for_tournament(tournament_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.PARTICIPANT:
        raise HTTPException(status_code=403, detail="Only participants can register for tournaments")
    
    # Check if tournament exists
    tournament_data = await db.tournaments.find_one({"id": tournament_id})
    if not tournament_data:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Check if already registered
    existing_registration = await db.registrations.find_one({
        "user_id": current_user.id,
        "tournament_id": tournament_id
    })
    if existing_registration:
        raise HTTPException(status_code=400, detail="Already registered for this tournament")
    
    # Check if tournament is full
    participants = tournament_data.get('participants', [])
    if len(participants) >= tournament_data['max_participants']:
        raise HTTPException(status_code=400, detail="Tournament is full")
    
    # Create registration
    registration = Registration(
        user_id=current_user.id,
        tournament_id=tournament_id
    )
    
    registration_dict = prepare_for_mongo(registration.dict())
    await db.registrations.insert_one(registration_dict)
    
    # Update tournament participants
    await db.tournaments.update_one(
        {"id": tournament_id},
        {"$push": {"participants": current_user.id}}
    )
    
    return {"message": "Successfully registered for tournament"}

@api_router.get("/my-tournaments", response_model=List[TournamentWithDetails])
async def get_my_tournaments(current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.ORGANIZER:
        # Get tournaments organized by user
        tournaments_data = await db.tournaments.find({"organizer_id": current_user.id}).to_list(1000)
    else:
        # Get tournaments user is registered for
        registrations = await db.registrations.find({"user_id": current_user.id}).to_list(1000)
        tournament_ids = [reg['tournament_id'] for reg in registrations]
        tournaments_data = await db.tournaments.find({"id": {"$in": tournament_ids}}).to_list(1000)
    
    tournaments_with_details = []
    for tournament_data in tournaments_data:
        tournament_data = parse_from_mongo(tournament_data)
        
        # Get organizer name
        organizer = await db.users.find_one({"id": tournament_data['organizer_id']})
        organizer_name = organizer['name'] if organizer else "Unknown"
        
        tournament_with_details = TournamentWithDetails(
            **tournament_data,
            organizer_name=organizer_name,
            participants_count=len(tournament_data.get('participants', [])),
            is_registered=True
        )
        tournaments_with_details.append(tournament_with_details)
    
    return tournaments_with_details

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
