"""
Cockroach Kranti Dal (CKD) - Backend API
युवा जागे, देश बदले
"""
import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel, Field
import jwt
import cloudinary
import cloudinary.uploader

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
JWT_EXPIRES_DAYS = 30
MOCK_OTP = "123456"
ADMIN_MOBILE = "9999999999"
VIDEO_MAX_SIZE_MB = int(os.environ.get("VIDEO_MAX_SIZE_MB", 50))
IMAGE_MAX_SIZE_MB = int(os.environ.get("IMAGE_MAX_SIZE_MB", 10))

cloudinary.config(
    cloud_name=os.environ["CLOUDINARY_CLOUD_NAME"],
    api_key=os.environ["CLOUDINARY_API_KEY"],
    api_secret=os.environ["CLOUDINARY_API_SECRET"],
    secure=True,
)

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="CKD API")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
log = logging.getLogger("ckd")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- Models ----------
class UserPublic(BaseModel):
    id: str
    mobile: str
    name: Optional[str] = None
    email: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None
    age_group: Optional[str] = None
    photo_url: Optional[str] = None
    role: str = "member"
    kranti_points: int = 0
    is_banned: bool = False
    created_at: str
    profile_complete: bool = False


class OtpSendIn(BaseModel):
    mobile: str


class OtpVerifyIn(BaseModel):
    mobile: str
    otp: str


class ProfileSetupIn(BaseModel):
    name: str
    email: Optional[str] = None
    city: str
    area: str
    age_group: str
    photo_url: Optional[str] = None
    consent: bool = True


class TokenOut(BaseModel):
    token: str
    user: UserPublic
    is_new_user: bool = False


class CampaignIn(BaseModel):
    title: str
    description: str
    cover_url: Optional[str] = None
    location: str
    state: Optional[str] = None
    date: str
    goal: Optional[str] = None
    is_featured: bool = False


class CampaignUpdateIn(BaseModel):
    text: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None  # 'image' | 'video'


class CommentIn(BaseModel):
    text: str


class IssueIn(BaseModel):
    title: str
    description: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    state: str
    city: str
    area: str
    category: str  # safai/sadak/paani/bijli/madad/anya


class IssueStatusIn(BaseModel):
    status: Literal["open", "in_progress", "resolved"]
    note: Optional[str] = None


class ResolutionUpdateIn(BaseModel):
    text: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None


class AnnouncementIn(BaseModel):
    title: str
    body: str
    city: Optional[str] = None  # null = all


class FlagIn(BaseModel):
    content_type: str  # 'issue' | 'campaign' | 'update' | 'comment'
    content_id: str
    reason: str


# ---------- Auth helpers ----------
def make_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRES_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not creds:
        raise HTTPException(401, "Authentication required")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload["sub"]
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    if user.get("is_banned"):
        raise HTTPException(403, "Account banned")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return user


def to_public_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "mobile": u["mobile"],
        "name": u.get("name"),
        "email": u.get("email"),
        "city": u.get("city"),
        "area": u.get("area"),
        "age_group": u.get("age_group"),
        "photo_url": u.get("photo_url"),
        "role": u.get("role", "member"),
        "kranti_points": u.get("kranti_points", 0),
        "is_banned": u.get("is_banned", False),
        "created_at": u.get("created_at", now_iso()),
        "profile_complete": bool(u.get("name") and u.get("city")),
    }


async def add_points(user_id: str, points: int):
    await db.users.update_one({"id": user_id}, {"$inc": {"kranti_points": points}})


async def push_notification(user_id: Optional[str], type_: str, title: str, body: str, meta: dict = None):
    doc = {
        "id": new_id(),
        "user_id": user_id,  # None means broadcast (filter by city handled at insert time as separate docs)
        "type": type_,
        "title": title,
        "body": body,
        "read": False,
        "meta": meta or {},
        "created_at": now_iso(),
    }
    await db.notifications.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---------- Routes: Health ----------
@api.get("/")
async def root():
    return {"message": "CKD API", "tagline": "युवा जागे, देश बदले"}


# ---------- Routes: Auth ----------
@api.post("/auth/send-otp")
async def send_otp(payload: OtpSendIn):
    mobile = payload.mobile.strip()
    if not mobile or len(mobile) < 10:
        raise HTTPException(400, "Invalid mobile")
    # Mock - always returns success. Use OTP `123456`.
    return {"sent": True, "mock_otp": MOCK_OTP, "message": "OTP भेज दिया गया (mock)"}


@api.post("/auth/verify-otp", response_model=TokenOut)
async def verify_otp(payload: OtpVerifyIn):
    mobile = payload.mobile.strip()
    if payload.otp != MOCK_OTP:
        raise HTTPException(401, "गलत OTP")
    user = await db.users.find_one({"mobile": mobile}, {"_id": 0})
    is_new = False
    if not user:
        user = {
            "id": new_id(),
            "mobile": mobile,
            "role": "admin" if mobile == ADMIN_MOBILE else "member",
            "kranti_points": 0,
            "is_banned": False,
            "created_at": now_iso(),
        }
        await db.users.insert_one(dict(user))
        user.pop("_id", None)
        is_new = True
    if user.get("is_banned"):
        raise HTTPException(403, "Account banned")
    token = make_token(user["id"])
    return {"token": token, "user": to_public_user(user), "is_new_user": is_new}


@api.post("/auth/profile-setup", response_model=UserPublic)
async def profile_setup(payload: ProfileSetupIn, user: dict = Depends(get_current_user)):
    if not payload.consent:
        raise HTTPException(400, "Privacy consent required")
    update = {
        "name": payload.name.strip(),
        "email": (payload.email or "").strip() or None,
        "city": payload.city.strip(),
        "area": payload.area.strip(),
        "age_group": payload.age_group,
        "photo_url": payload.photo_url,
    }
    await db.users.update_one({"id": user["id"]}, {"$set": update})
    u = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return to_public_user(u)


@api.get("/auth/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return to_public_user(user)


# ---------- Routes: Media upload ----------
@api.post("/media/upload")
async def upload_media(
    file: UploadFile = File(...),
    kind: str = Form("image"),
    user: dict = Depends(get_current_user),
):
    content_type = file.content_type or ""
    is_image = content_type.startswith("image/")
    is_video = content_type.startswith("video/")
    if kind == "image" and not is_image:
        raise HTTPException(400, "Image file required")
    if kind == "video" and not is_video:
        raise HTTPException(400, "Video file required")

    # size check
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    max_mb = IMAGE_MAX_SIZE_MB if is_image else VIDEO_MAX_SIZE_MB
    if size > max_mb * 1024 * 1024:
        raise HTTPException(413, f"File too large (max {max_mb} MB)")

    try:
        if is_video:
            result = cloudinary.uploader.upload_large(
                file.file,
                folder="ckd/videos",
                resource_type="video",
                use_filename=True,
                unique_filename=True,
            )
        else:
            result = cloudinary.uploader.upload(
                file.file,
                folder="ckd/images",
                resource_type="image",
                use_filename=True,
                unique_filename=True,
                quality="auto",
                fetch_format="auto",
            )
    except Exception as e:
        log.exception("cloudinary upload failed")
        raise HTTPException(502, f"Upload failed: {e}")

    return {
        "url": result.get("secure_url"),
        "public_id": result.get("public_id"),
        "resource_type": result.get("resource_type"),
        "width": result.get("width"),
        "height": result.get("height"),
        "format": result.get("format"),
        "bytes": result.get("bytes"),
    }


# ---------- Routes: Campaigns ----------
@api.get("/campaigns")
async def list_campaigns(city: Optional[str] = None, featured: bool = False, limit: int = 50):
    q = {"is_active": True}
    if city:
        q["location"] = city
    if featured:
        q["is_featured"] = True
    docs = await db.campaigns.find(q, {"_id": 0}).sort([("is_featured", -1), ("created_at", -1)]).to_list(limit)
    for d in docs:
        d["member_count"] = len(d.get("members", []))
    return docs


@api.post("/campaigns")
async def create_campaign(payload: CampaignIn, admin: dict = Depends(require_admin)):
    doc = {
        "id": new_id(),
        **payload.dict(),
        "created_by": admin["id"],
        "created_at": now_iso(),
        "members": [],
        "is_active": True,
    }
    await db.campaigns.insert_one(dict(doc))
    doc.pop("_id", None)
    # Broadcast announcement (admin: all members)
    await push_notification(None, "campaign_new", "नया अभियान!", payload.title, {"campaign_id": doc["id"]})
    return doc


@api.get("/campaigns/{cid}")
async def get_campaign(cid: str):
    doc = await db.campaigns.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Campaign not found")
    doc["member_count"] = len(doc.get("members", []))
    return doc


@api.put("/campaigns/{cid}")
async def update_campaign(cid: str, payload: CampaignIn, admin: dict = Depends(require_admin)):
    res = await db.campaigns.update_one({"id": cid}, {"$set": payload.dict()})
    if res.matched_count == 0:
        raise HTTPException(404, "Campaign not found")
    doc = await db.campaigns.find_one({"id": cid}, {"_id": 0})
    return doc


@api.delete("/campaigns/{cid}")
async def delete_campaign(cid: str, admin: dict = Depends(require_admin)):
    await db.campaigns.update_one({"id": cid}, {"$set": {"is_active": False}})
    return {"ok": True}


@api.post("/campaigns/{cid}/join")
async def join_campaign(cid: str, user: dict = Depends(get_current_user)):
    c = await db.campaigns.find_one({"id": cid})
    if not c:
        raise HTTPException(404, "Campaign not found")
    if user["id"] in c.get("members", []):
        return {"ok": True, "already": True}
    await db.campaigns.update_one({"id": cid}, {"$addToSet": {"members": user["id"]}})
    await add_points(user["id"], 10)
    await push_notification(user["id"], "campaign_join", "अभियान से जुड़े!", f"आपने '{c['title']}' में हिस्सा लिया। +10 क्रांति पॉइंट्स", {"campaign_id": cid})
    return {"ok": True}


@api.get("/campaigns/{cid}/updates")
async def list_campaign_updates(cid: str, limit: int = 50):
    docs = await db.campaign_updates.find({"campaign_id": cid}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    # enrich with user
    user_ids = list({d["user_id"] for d in docs})
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1, "photo_url": 1, "city": 1}).to_list(1000)
    umap = {u["id"]: u for u in users}
    for d in docs:
        d["user"] = umap.get(d["user_id"])
        d["like_count"] = len(d.get("likes", []))
        d["comment_count"] = len(d.get("comments", []))
    return docs


@api.post("/campaigns/{cid}/updates")
async def post_campaign_update(cid: str, payload: CampaignUpdateIn, user: dict = Depends(get_current_user)):
    c = await db.campaigns.find_one({"id": cid})
    if not c:
        raise HTTPException(404, "Campaign not found")
    if user["id"] not in c.get("members", []):
        raise HTTPException(403, "अभियान से पहले जुड़ें")
    doc = {
        "id": new_id(),
        "campaign_id": cid,
        "user_id": user["id"],
        **payload.dict(),
        "likes": [],
        "comments": [],
        "created_at": now_iso(),
    }
    await db.campaign_updates.insert_one(dict(doc))
    doc.pop("_id", None)
    await add_points(user["id"], 5)
    return doc


@api.post("/updates/{uid}/like")
async def like_update(uid: str, user: dict = Depends(get_current_user)):
    u = await db.campaign_updates.find_one({"id": uid})
    if not u:
        raise HTTPException(404, "Update not found")
    if user["id"] in u.get("likes", []):
        await db.campaign_updates.update_one({"id": uid}, {"$pull": {"likes": user["id"]}})
        return {"liked": False}
    await db.campaign_updates.update_one({"id": uid}, {"$addToSet": {"likes": user["id"]}})
    if u["user_id"] != user["id"]:
        await push_notification(u["user_id"], "update_like", "नई लाइक", f"{user.get('name','किसी ने')} ने आपकी पोस्ट पसंद की", {"update_id": uid})
    return {"liked": True}


@api.post("/updates/{uid}/comments")
async def comment_update(uid: str, payload: CommentIn, user: dict = Depends(get_current_user)):
    comment = {
        "id": new_id(),
        "user_id": user["id"],
        "user_name": user.get("name", "सदस्य"),
        "user_photo": user.get("photo_url"),
        "text": payload.text,
        "created_at": now_iso(),
    }
    res = await db.campaign_updates.update_one({"id": uid}, {"$push": {"comments": comment}})
    if res.matched_count == 0:
        raise HTTPException(404, "Update not found")
    u = await db.campaign_updates.find_one({"id": uid}, {"_id": 0})
    if u and u["user_id"] != user["id"]:
        await push_notification(u["user_id"], "update_comment", "नई टिप्पणी", f"{user.get('name','किसी ने')} ने टिप्पणी की", {"update_id": uid})
    return comment


# ---------- Routes: Issues ----------
@api.get("/issues")
async def list_issues(state: Optional[str] = None, city: Optional[str] = None, category: Optional[str] = None, limit: int = 100):
    q = {}
    if state:
        q["state"] = state
    if city:
        q["city"] = city
    if category:
        q["category"] = category
    docs = await db.issues.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    user_ids = list({d["reported_by"] for d in docs})
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1, "photo_url": 1}).to_list(1000)
    umap = {u["id"]: u for u in users}
    for d in docs:
        d["reporter"] = umap.get(d["reported_by"])
        d["supporter_count"] = len(d.get("supporters", []))
        d["helper_count"] = len(d.get("helpers", []))
        d["comment_count"] = len(d.get("comments", []))
    return docs


@api.get("/issues/state-counts")
async def state_counts():
    pipe = [{"$group": {"_id": "$state", "count": {"$sum": 1}}}]
    rows = await db.issues.aggregate(pipe).to_list(200)
    return {(r["_id"] or "अन्य"): r["count"] for r in rows if r["_id"]}


@api.post("/issues")
async def create_issue(payload: IssueIn, user: dict = Depends(get_current_user)):
    doc = {
        "id": new_id(),
        **payload.dict(),
        "status": "open",
        "reported_by": user["id"],
        "supporters": [],
        "helpers": [],
        "comments": [],
        "timeline": [{
            "action": "reported",
            "user_id": user["id"],
            "user_name": user.get("name", "सदस्य"),
            "text": "समस्या दर्ज की गई",
            "created_at": now_iso(),
        }],
        "created_at": now_iso(),
    }
    await db.issues.insert_one(dict(doc))
    doc.pop("_id", None)
    await add_points(user["id"], 5)
    return doc


@api.get("/issues/{iid}")
async def get_issue(iid: str):
    doc = await db.issues.find_one({"id": iid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Issue not found")
    user_ids = list({doc["reported_by"], *doc.get("supporters", []), *doc.get("helpers", [])})
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1, "photo_url": 1, "city": 1}).to_list(1000)
    umap = {u["id"]: u for u in users}
    doc["reporter"] = umap.get(doc["reported_by"])
    doc["helpers_list"] = [umap.get(h) for h in doc.get("helpers", []) if umap.get(h)]
    return doc


@api.post("/issues/{iid}/support")
async def support_issue(iid: str, user: dict = Depends(get_current_user)):
    i = await db.issues.find_one({"id": iid})
    if not i:
        raise HTTPException(404, "Issue not found")
    if user["id"] in i.get("supporters", []):
        await db.issues.update_one({"id": iid}, {"$pull": {"supporters": user["id"]}})
        return {"supported": False}
    await db.issues.update_one({"id": iid}, {"$addToSet": {"supporters": user["id"]}})
    return {"supported": True}


@api.post("/issues/{iid}/volunteer")
async def volunteer_issue(iid: str, user: dict = Depends(get_current_user)):
    i = await db.issues.find_one({"id": iid})
    if not i:
        raise HTTPException(404, "Issue not found")
    if user["id"] in i.get("helpers", []):
        return {"ok": True, "already": True}
    await db.issues.update_one(
        {"id": iid},
        {
            "$addToSet": {"helpers": user["id"]},
            "$push": {"timeline": {
                "action": "volunteered",
                "user_id": user["id"],
                "user_name": user.get("name", "सदस्य"),
                "text": "मदद के लिए आगे आए",
                "created_at": now_iso(),
            }},
        },
    )
    await add_points(user["id"], 8)
    if i["reported_by"] != user["id"]:
        await push_notification(i["reported_by"], "issue_volunteer", "किसी ने मदद का हाथ बढ़ाया", f"{user.get('name','कोई')} आपकी समस्या में मदद करना चाहते हैं", {"issue_id": iid})
    return {"ok": True}


@api.post("/issues/{iid}/comments")
async def comment_issue(iid: str, payload: CommentIn, user: dict = Depends(get_current_user)):
    comment = {
        "id": new_id(),
        "user_id": user["id"],
        "user_name": user.get("name", "सदस्य"),
        "user_photo": user.get("photo_url"),
        "text": payload.text,
        "created_at": now_iso(),
    }
    res = await db.issues.update_one({"id": iid}, {"$push": {"comments": comment}})
    if res.matched_count == 0:
        raise HTTPException(404, "Issue not found")
    i = await db.issues.find_one({"id": iid}, {"_id": 0})
    if i and i["reported_by"] != user["id"]:
        await push_notification(i["reported_by"], "issue_comment", "नई टिप्पणी", f"{user.get('name','किसी ने')} ने टिप्पणी की", {"issue_id": iid})
    return comment


@api.post("/issues/{iid}/resolution")
async def add_resolution(iid: str, payload: ResolutionUpdateIn, user: dict = Depends(get_current_user)):
    i = await db.issues.find_one({"id": iid})
    if not i:
        raise HTTPException(404, "Issue not found")
    if user["id"] not in [*i.get("helpers", []), i["reported_by"]]:
        raise HTTPException(403, "केवल वॉलंटियर/रिपोर्टर")
    entry = {
        "action": "progress",
        "user_id": user["id"],
        "user_name": user.get("name", "सदस्य"),
        "text": payload.text,
        "media_url": payload.media_url,
        "media_type": payload.media_type,
        "created_at": now_iso(),
    }
    await db.issues.update_one({"id": iid}, {"$push": {"timeline": entry}, "$set": {"status": "in_progress"}})
    await add_points(user["id"], 5)
    return entry


@api.put("/issues/{iid}/status")
async def set_issue_status(iid: str, payload: IssueStatusIn, user: dict = Depends(get_current_user)):
    i = await db.issues.find_one({"id": iid})
    if not i:
        raise HTTPException(404, "Issue not found")
    is_admin = user.get("role") == "admin"
    is_reporter = i["reported_by"] == user["id"]
    if not (is_admin or is_reporter):
        raise HTTPException(403, "Only reporter or admin")
    entry = {
        "action": f"status_{payload.status}",
        "user_id": user["id"],
        "user_name": user.get("name", "सदस्य"),
        "text": payload.note or f"स्थिति बदली: {payload.status}",
        "created_at": now_iso(),
    }
    await db.issues.update_one({"id": iid}, {"$set": {"status": payload.status}, "$push": {"timeline": entry}})
    if payload.status == "resolved":
        # award points to reporter + helpers
        await add_points(i["reported_by"], 15)
        for h in i.get("helpers", []):
            await add_points(h, 20)
        await push_notification(i["reported_by"], "issue_resolved", "समस्या हल हुई!", f"'{i['title']}' हल हो गई। +15 क्रांति पॉइंट्स", {"issue_id": iid})
    return {"ok": True}


# ---------- Routes: Notifications ----------
@api.get("/notifications")
async def my_notifications(user: dict = Depends(get_current_user), limit: int = 50):
    # personal + broadcast (user_id None) filtered by city when meta has city
    docs = await db.notifications.find(
        {"$or": [{"user_id": user["id"]}, {"user_id": None}]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(limit)
    # filter broadcast by city if specified
    out = []
    for d in docs:
        if d.get("user_id") is None and d.get("meta", {}).get("city"):
            if d["meta"]["city"] != user.get("city"):
                continue
        out.append(d)
    return out


@api.post("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/notifications/read-all")
async def read_all(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"$or": [{"user_id": user["id"]}, {"user_id": None}]},
        {"$set": {"read": True}},
    )
    return {"ok": True}


# ---------- Routes: Profile / Leaderboard ----------
@api.get("/users/{uid}")
async def get_user_public(uid: str):
    u = await db.users.find_one({"id": uid}, {"_id": 0})
    if not u:
        raise HTTPException(404, "User not found")
    return to_public_user(u)


@api.get("/me/activity")
async def my_activity(user: dict = Depends(get_current_user)):
    campaigns = await db.campaigns.find({"members": user["id"], "is_active": True}, {"_id": 0}).to_list(100)
    for c in campaigns:
        c["member_count"] = len(c.get("members", []))
    issues = await db.issues.find({"reported_by": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    contributions = await db.issues.find({"helpers": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"campaigns": campaigns, "issues": issues, "contributions": contributions}


@api.get("/leaderboard")
async def leaderboard(city: Optional[str] = None, limit: int = 20):
    q = {"is_banned": {"$ne": True}}
    if city:
        q["city"] = city
    docs = await db.users.find(q, {"_id": 0}).sort("kranti_points", -1).limit(limit).to_list(limit)
    return [to_public_user(u) for u in docs]


# ---------- Routes: Flags ----------
@api.post("/flags")
async def create_flag(payload: FlagIn, user: dict = Depends(get_current_user)):
    doc = {
        "id": new_id(),
        **payload.dict(),
        "reporter_id": user["id"],
        "status": "pending",
        "created_at": now_iso(),
    }
    await db.flags.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


# ---------- Routes: Admin ----------
@api.get("/admin/dashboard")
async def admin_dashboard(admin: dict = Depends(require_admin)):
    total_members = await db.users.count_documents({"role": "member"})
    total_admins = await db.users.count_documents({"role": "admin"})
    active_campaigns = await db.campaigns.count_documents({"is_active": True})
    open_issues = await db.issues.count_documents({"status": "open"})
    in_progress_issues = await db.issues.count_documents({"status": "in_progress"})
    resolved_issues = await db.issues.count_documents({"status": "resolved"})
    pending_flags = await db.flags.count_documents({"status": "pending"})

    # members by city
    pipe = [{"$match": {"role": "member"}}, {"$group": {"_id": "$city", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    by_city = await db.users.aggregate(pipe).to_list(50)
    return {
        "total_members": total_members,
        "total_admins": total_admins,
        "active_campaigns": active_campaigns,
        "issues": {
            "open": open_issues,
            "in_progress": in_progress_issues,
            "resolved": resolved_issues,
        },
        "pending_flags": pending_flags,
        "members_by_city": [{"city": x["_id"] or "अज्ञात", "count": x["count"]} for x in by_city],
    }


@api.get("/admin/members")
async def admin_list_members(q: Optional[str] = None, admin: dict = Depends(require_admin)):
    query = {}
    if q:
        query = {"$or": [{"name": {"$regex": q, "$options": "i"}}, {"mobile": {"$regex": q}}, {"city": {"$regex": q, "$options": "i"}}]}
    docs = await db.users.find(query, {"_id": 0}).sort("created_at", -1).limit(200).to_list(200)
    return [to_public_user(d) for d in docs]


@api.post("/admin/members/{uid}/ban")
async def admin_ban(uid: str, admin: dict = Depends(require_admin)):
    await db.users.update_one({"id": uid}, {"$set": {"is_banned": True}})
    return {"ok": True}


@api.post("/admin/members/{uid}/unban")
async def admin_unban(uid: str, admin: dict = Depends(require_admin)):
    await db.users.update_one({"id": uid}, {"$set": {"is_banned": False}})
    return {"ok": True}


@api.delete("/admin/members/{uid}")
async def admin_remove(uid: str, admin: dict = Depends(require_admin)):
    await db.users.delete_one({"id": uid, "role": {"$ne": "admin"}})
    return {"ok": True}


@api.get("/admin/flags")
async def admin_flags(admin: dict = Depends(require_admin)):
    docs = await db.flags.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    # enrich with the content snippet
    for d in docs:
        if d["content_type"] == "issue":
            c = await db.issues.find_one({"id": d["content_id"]}, {"_id": 0, "title": 1, "description": 1, "reported_by": 1})
            d["content"] = c
        elif d["content_type"] == "campaign":
            c = await db.campaigns.find_one({"id": d["content_id"]}, {"_id": 0, "title": 1, "description": 1})
            d["content"] = c
        elif d["content_type"] == "update":
            c = await db.campaign_updates.find_one({"id": d["content_id"]}, {"_id": 0, "text": 1, "user_id": 1})
            d["content"] = c
        else:
            d["content"] = None
    return docs


@api.post("/admin/flags/{fid}/resolve")
async def resolve_flag(fid: str, remove_content: bool = False, admin: dict = Depends(require_admin)):
    f = await db.flags.find_one({"id": fid})
    if not f:
        raise HTTPException(404, "Flag not found")
    if remove_content:
        if f["content_type"] == "issue":
            await db.issues.delete_one({"id": f["content_id"]})
        elif f["content_type"] == "campaign":
            await db.campaigns.update_one({"id": f["content_id"]}, {"$set": {"is_active": False}})
        elif f["content_type"] == "update":
            await db.campaign_updates.delete_one({"id": f["content_id"]})
    await db.flags.update_one({"id": fid}, {"$set": {"status": "resolved", "resolved_at": now_iso(), "removed": remove_content}})
    return {"ok": True}


@api.post("/admin/announcements")
async def admin_announce(payload: AnnouncementIn, admin: dict = Depends(require_admin)):
    meta = {"announcement": True}
    if payload.city:
        meta["city"] = payload.city
    doc = await push_notification(None, "announcement", payload.title, payload.body, meta)
    return doc


# ---------- Seeding ----------
async def seed_data():
    # Admin
    admin = await db.users.find_one({"mobile": ADMIN_MOBILE})
    if not admin:
        admin = {
            "id": new_id(),
            "mobile": ADMIN_MOBILE,
            "name": "CKD एडमिन",
            "city": "दिल्ली",
            "area": "केंद्रीय कार्यालय",
            "age_group": "25-35",
            "role": "admin",
            "kranti_points": 0,
            "is_banned": False,
            "created_at": now_iso(),
            "email": "admin@ckd.in",
        }
        await db.users.insert_one(dict(admin))
        log.info("Seeded admin user")

    # Seed sample members
    sample_members = [
        {"mobile": "9000000001", "name": "राहुल वर्मा", "city": "दिल्ली", "area": "करोल बाग", "age_group": "18-25", "kranti_points": 145},
        {"mobile": "9000000002", "name": "प्रिया शर्मा", "city": "मुंबई", "area": "अंधेरी", "age_group": "18-25", "kranti_points": 120},
        {"mobile": "9000000003", "name": "अमित कुमार", "city": "दिल्ली", "area": "द्वारका", "age_group": "25-35", "kranti_points": 95},
        {"mobile": "9000000004", "name": "नेहा सिंह", "city": "लखनऊ", "area": "गोमती नगर", "age_group": "18-25", "kranti_points": 75},
        {"mobile": "9000000005", "name": "विकास यादव", "city": "जयपुर", "area": "मालवीय नगर", "age_group": "16-18", "kranti_points": 60},
    ]
    for m in sample_members:
        if not await db.users.find_one({"mobile": m["mobile"]}):
            doc = {
                "id": new_id(),
                "mobile": m["mobile"],
                "name": m["name"],
                "city": m["city"],
                "area": m["area"],
                "age_group": m["age_group"],
                "role": "member",
                "kranti_points": m["kranti_points"],
                "is_banned": False,
                "created_at": now_iso(),
            }
            await db.users.insert_one(doc)

    # Seed sample campaigns
    if await db.campaigns.count_documents({}) == 0:
        admin_id = (await db.users.find_one({"mobile": ADMIN_MOBILE}))["id"]
        member_ids = [u["id"] async for u in db.users.find({"role": "member"}, {"id": 1})]
        campaigns = [
            {
                "title": "यमुना सफ़ाई अभियान",
                "description": "दिल्ली की यमुना नदी को साफ़ करने का बड़ा अभियान। साथ आएं, बदलाव लाएं। हमारी नदी, हमारी ज़िम्मेदारी।",
                "cover_url": "https://images.pexels.com/photos/36713460/pexels-photo-36713460.jpeg",
                "location": "दिल्ली",
                "state": "दिल्ली",
                "date": "2026-03-15",
                "goal": "10 km घाट सफ़ाई",
                "is_featured": True,
            },
            {
                "title": "मोहल्ला सफ़ाई - करोल बाग",
                "description": "हर रविवार सुबह 7 बजे करोल बाग में मोहल्ला सफ़ाई। झाड़ू, दस्ताने और जोश साथ लाएं।",
                "cover_url": "https://images.pexels.com/photos/8543585/pexels-photo-8543585.jpeg",
                "location": "दिल्ली",
                "state": "दिल्ली",
                "date": "2026-02-28",
                "goal": "हर रविवार 50+ स्वयंसेवक",
                "is_featured": True,
            },
            {
                "title": "पौधारोपण - मुंबई हरित",
                "description": "मुंबई को हरा-भरा बनाने का अभियान। 10,000 पौधे लगाने का लक्ष्य।",
                "cover_url": "https://images.unsplash.com/photo-1560220604-1985ebfe28b1",
                "location": "मुंबई",
                "state": "महाराष्ट्र",
                "date": "2026-03-01",
                "goal": "10,000 पौधे",
                "is_featured": True,
            },
        ]
        for c in campaigns:
            doc = {
                "id": new_id(),
                **c,
                "created_by": admin_id,
                "created_at": now_iso(),
                "members": member_ids[:3] if member_ids else [],
                "is_active": True,
            }
            await db.campaigns.insert_one(doc)
        log.info("Seeded campaigns")
    else:
        # Backfill is_featured for older campaigns
        await db.campaigns.update_many({"is_featured": {"$exists": False}}, {"$set": {"is_featured": False}})

    # Seed sample issues
    if await db.issues.count_documents({}) == 0:
        m = await db.users.find_one({"mobile": "9000000001"})
        m2 = await db.users.find_one({"mobile": "9000000003"})
        m3 = await db.users.find_one({"mobile": "9000000002"})
        if m:
            issues = [
                {
                    "title": "करोल बाग में बड़ा गड्ढा",
                    "description": "मेन रोड पर खतरनाक गड्ढा, कई दुर्घटनाएँ हो चुकी हैं। तुरंत मरम्मत की ज़रूरत।",
                    "media_url": "https://images.pexels.com/photos/5688465/pexels-photo-5688465.jpeg",
                    "media_type": "image",
                    "state": "दिल्ली",
                    "city": "दिल्ली",
                    "area": "करोल बाग",
                    "category": "sadak",
                    "status": "open",
                    "reported_by": m["id"],
                },
                {
                    "title": "द्वारका में पानी की समस्या",
                    "description": "पिछले 3 दिन से पानी नहीं आ रहा। कई परिवार परेशान हैं।",
                    "state": "दिल्ली",
                    "city": "दिल्ली",
                    "area": "द्वारका",
                    "category": "paani",
                    "status": "in_progress",
                    "reported_by": m2["id"] if m2 else m["id"],
                },
                {
                    "title": "अंधेरी में कचरा जमा",
                    "description": "गली में हफ़्तों से कचरा नहीं उठा। बदबू और मच्छर बढ़ रहे हैं।",
                    "media_url": "https://images.pexels.com/photos/36713460/pexels-photo-36713460.jpeg",
                    "media_type": "image",
                    "state": "महाराष्ट्र",
                    "city": "मुंबई",
                    "area": "अंधेरी",
                    "category": "safai",
                    "status": "resolved",
                    "reported_by": m3["id"] if m3 else m["id"],
                },
            ]
            for it in issues:
                doc = {
                    "id": new_id(),
                    **it,
                    "supporters": [],
                    "helpers": [],
                    "comments": [],
                    "timeline": [{
                        "action": "reported",
                        "user_id": it["reported_by"],
                        "user_name": "सदस्य",
                        "text": "समस्या दर्ज की गई",
                        "created_at": now_iso(),
                    }],
                    "created_at": now_iso(),
                }
                await db.issues.insert_one(doc)
            log.info("Seeded issues")

    # Seed announcements
    if await db.notifications.count_documents({"type": "announcement"}) == 0:
        await push_notification(None, "announcement", "स्वागत है CKD में!", "क्रांति अब आपके हाथ में। पहला अभियान देखें और जुड़ें।", {"announcement": True})


@app.on_event("startup")
async def on_start():
    await seed_data()
    log.info("CKD API ready")


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
