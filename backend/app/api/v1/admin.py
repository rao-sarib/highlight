"""
Admin panel API (/api/v1/admin) — separate from the user app.

Auth: POST /admin/login with the admin username/password -> admin-scoped JWT.
All other routes require that token (get_current_admin).

Controls:
  • Landing CMS   — GET/PUT /admin/cms
  • SMTP          — GET/PUT /admin/smtp, POST /admin/smtp/test
  • RBAC          — GET/PUT /admin/rbac
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, func
from sqlmodel import Session, select

from app.api.dependencies import get_current_admin
from app.core.default_content import DEFAULT_LANDING
from app.core.plans import PLANS
from app.core.roles import ALL_FEATURES, ROLE_DESCRIPTIONS, ROLE_LABELS
from app.core.security import create_admin_token, hash_password, verify_password
from app.db.session import get_db
from app.models.admin import Admin
from app.models.app_setting import AppSetting  # noqa: F401  (registered via main)
from app.models.contact_message import ContactMessage
from app.models.content import Content
from app.models.embedding import Embedding
from app.models.feature_cache import FeatureCache
from app.models.page_audit import PageAudit
from app.models.project import Project
from app.models.role_permission import RolePermission
from app.models.site_content import SINGLETON_ID as CONTENT_ID, SiteContent
from app.models.smtp_settings import SINGLETON_ID as SMTP_ID, SmtpSettings
from app.models.user import User, UserRole
from app.models.visibility_scan import VisibilityScan
from app.services import email_service, runtime_config

router = APIRouter(prefix="/admin", tags=["Admin"])

FEATURE_LABELS: dict[str, str] = {
    "audit": "Whole-site SEO audit",
    "fixes": "On-page fixes",
    "prompts": "Prompt optimization",
    "lsi": "Semantic (LSI) keywords",
    "analytics": "Analytics",
    "visibility": "AI visibility scans",
    "content": "AI content generation",
    "competitors": "Competitor benchmarking",
    "backlinks": "Backlink outreach",
    "refresh": "Scheduled content refresh",
    "action_plan": "Full Analysis + action plan",
}


# ── Schemas ──────────────────────────────────────────────
class AdminLogin(BaseModel):
    username: str
    password: str


class AdminToken(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


class CmsUpdate(BaseModel):
    content: dict


class SmtpModel(BaseModel):
    host: str = ""
    port: int = 587
    username: str = ""
    password: str = ""
    from_email: str = ""
    from_name: str = "Highlight"
    use_tls: bool = True
    enabled: bool = False


class SmtpTest(BaseModel):
    to_email: str


class RbacUpdate(BaseModel):
    role: str
    features: list[str]


# ── Auth ─────────────────────────────────────────────────
@router.post("/login", response_model=AdminToken, summary="Admin login")
def admin_login(body: AdminLogin, db: Session = Depends(get_db)) -> AdminToken:
    admin = db.exec(select(Admin).where(Admin.username == body.username.strip())).first()
    if admin is None or not verify_password(body.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin credentials"
        )
    return AdminToken(access_token=create_admin_token(str(admin.id)), username=admin.username)


@router.get("/me", summary="Current admin")
def admin_me(admin: Admin = Depends(get_current_admin)) -> dict:
    return {"id": str(admin.id), "username": admin.username}


# ── Landing CMS ──────────────────────────────────────────
@router.get("/cms", summary="Get landing content for editing")
def get_cms(db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)) -> dict:
    row = db.get(SiteContent, CONTENT_ID)
    return row.content if (row and row.content) else DEFAULT_LANDING


@router.put("/cms", summary="Save landing content")
def put_cms(
    body: CmsUpdate, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> dict:
    row = db.get(SiteContent, CONTENT_ID)
    if row is None:
        row = SiteContent(id=CONTENT_ID, content=body.content)
    else:
        row.content = body.content
    db.add(row)
    db.commit()
    return {"status": "saved"}


@router.post("/cms/reset", summary="Reset landing content to defaults")
def reset_cms(db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)) -> dict:
    row = db.get(SiteContent, CONTENT_ID)
    if row is None:
        row = SiteContent(id=CONTENT_ID, content=dict(DEFAULT_LANDING))
    else:
        row.content = dict(DEFAULT_LANDING)
    db.add(row)
    db.commit()
    return DEFAULT_LANDING


# ── SMTP ─────────────────────────────────────────────────
def _smtp_row(db: Session) -> SmtpSettings:
    row = db.get(SmtpSettings, SMTP_ID)
    if row is None:
        row = SmtpSettings(id=SMTP_ID)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("/smtp", response_model=SmtpModel, summary="Get SMTP settings")
def get_smtp(db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)) -> SmtpModel:
    row = _smtp_row(db)
    return SmtpModel(**row.model_dump(exclude={"id", "updated_at"}))


@router.put("/smtp", response_model=SmtpModel, summary="Save SMTP settings")
def put_smtp(
    body: SmtpModel, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> SmtpModel:
    row = _smtp_row(db)
    for field, value in body.model_dump().items():
        setattr(row, field, value)
    db.add(row)
    db.commit()
    db.refresh(row)
    return SmtpModel(**row.model_dump(exclude={"id", "updated_at"}))


@router.post("/smtp/test", summary="Send a test email")
def test_smtp(
    body: SmtpTest, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> dict:
    try:
        email_service.send_email(
            db,
            to_email=body.to_email.strip(),
            subject="Highlight — SMTP test email",
            body="This is a test email from your Highlight admin panel. SMTP is working.",
        )
    except email_service.EmailError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"status": "sent", "to": body.to_email}


# ── RBAC ─────────────────────────────────────────────────
@router.get("/rbac", summary="Get role -> feature permissions")
def get_rbac(db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)) -> dict:
    rows = db.exec(select(RolePermission)).all()
    roles = [
        {
            "role": r.role,
            "label": ROLE_LABELS.get(r.role, r.role),
            "description": ROLE_DESCRIPTIONS.get(r.role, ""),
            "features": list(r.features or []),
        }
        for r in rows
    ]
    # Stable order: signup roles first, then legacy.
    order = {"seo_expert": 0, "content_writer": 1, "analytics_manager": 2}
    roles.sort(key=lambda x: order.get(x["role"], 99))
    return {
        "roles": roles,
        "all_features": [{"key": k, "label": FEATURE_LABELS.get(k, k)} for k in ALL_FEATURES],
    }


@router.put("/rbac", summary="Update a role's features")
def put_rbac(
    body: RbacUpdate, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> dict:
    valid = set(ALL_FEATURES)
    features = [f for f in body.features if f in valid]
    row = db.get(RolePermission, body.role)
    if row is None:
        row = RolePermission(role=body.role, features=features)
    else:
        row.features = features
    db.add(row)
    db.commit()
    return {"role": body.role, "features": features}


# ── Users management ─────────────────────────────────────
class UserAdminUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    plan: str | None = None


@router.get("/users", summary="List all users with details")
def list_users(db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)) -> list[dict]:
    users = db.exec(select(User)).all()
    counts = dict(
        db.exec(select(Project.owner_id, func.count(Project.id)).group_by(Project.owner_id)).all()
    )
    return [
        {
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "role": getattr(u.role, "value", str(u.role)),
            "plan": u.plan,
            "scans_used": u.scans_used,
            "scans_period": u.scans_period,
            "projects": counts.get(u.id, 0),
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.patch("/users/{user_id}", summary="Edit a user (role / plan / name)")
def edit_user(
    user_id: uuid.UUID,
    body: UserAdminUpdate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> dict:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if body.full_name is not None and body.full_name.strip():
        user.full_name = body.full_name.strip()
    if body.role is not None:
        try:
            user.role = UserRole(body.role)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid role.") from exc
    if body.plan is not None:
        if body.plan not in PLANS:
            raise HTTPException(status_code=400, detail="Invalid plan.")
        user.plan = body.plan
    db.add(user)
    db.commit()
    return {"status": "updated", "id": str(user_id)}


def _delete_project_rows(db: Session, project_id) -> None:
    for model in (Content, Embedding, FeatureCache, PageAudit, VisibilityScan):
        db.execute(delete(model).where(model.project_id == project_id))


@router.delete("/users/{user_id}", summary="Delete a user (cascades projects)")
def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> dict:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    project_ids = db.exec(select(Project.id).where(Project.owner_id == user_id)).all()
    for pid in project_ids:
        _delete_project_rows(db, pid)
    db.execute(delete(Project).where(Project.owner_id == user_id))
    db.delete(user)
    db.commit()
    return {"status": "deleted", "id": str(user_id)}


# ── Projects management ──────────────────────────────────
@router.get("/projects", summary="List all projects with owner + details")
def list_projects(db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)) -> list[dict]:
    projects = db.exec(select(Project)).all()
    owners = {u.id: u.email for u in db.exec(select(User)).all()}
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "url": p.url,
            "owner_email": owners.get(p.owner_id, "—"),
            "niche": p.niche or p.detected_niche or "",
            "pages_crawled": p.pages_crawled,
            "seo_health_score": p.seo_health_score,
            "ai_visibility_score": p.ai_visibility_score,
            "created_at": p.created_at,
        }
        for p in projects
    ]


@router.delete("/projects/{project_id}", summary="Delete a project (cascades data)")
def delete_project(
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> dict:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    _delete_project_rows(db, project_id)
    db.execute(delete(Project).where(Project.id == project_id))
    db.commit()
    return {"status": "deleted", "id": str(project_id)}


# ── Admin accounts ───────────────────────────────────────
class AdminCreate(BaseModel):
    username: str
    password: str


@router.get("/admins", summary="List admin accounts")
def list_admins(db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)) -> list[dict]:
    return [
        {"id": str(a.id), "username": a.username, "created_at": a.created_at}
        for a in db.exec(select(Admin)).all()
    ]


@router.post("/admins", summary="Register a new admin")
def create_admin(
    body: AdminCreate,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> dict:
    username = body.username.strip()
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters.")
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if db.exec(select(Admin).where(Admin.username == username)).first() is not None:
        raise HTTPException(status_code=409, detail="That admin username already exists.")
    admin = Admin(username=username, hashed_password=hash_password(body.password))
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return {"id": str(admin.id), "username": admin.username}


@router.delete("/admins/{admin_id}", summary="Delete an admin account")
def delete_admin(
    admin_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> dict:
    if admin_id == current_admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account.")
    total = len(db.exec(select(Admin.id)).all())
    if total <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last admin.")
    admin = db.get(Admin, admin_id)
    if admin is None:
        raise HTTPException(status_code=404, detail="Admin not found")
    db.delete(admin)
    db.commit()
    return {"status": "deleted", "id": str(admin_id)}


# ── API keys ─────────────────────────────────────────────
class KeyUpdate(BaseModel):
    key: str
    value: str


@router.get("/keys", summary="API key statuses (masked)")
def get_keys(db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)) -> list[dict]:
    return runtime_config.key_status(db)


@router.put("/keys", summary="Set/update an API key (applied at runtime)")
def set_key(
    body: KeyUpdate, db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> dict:
    try:
        runtime_config.set_key(db, body.key.strip(), body.value.strip())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "saved", "key": body.key}


# ── Database overview ────────────────────────────────────
@router.get("/overview", summary="Row counts across core tables")
def overview(db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)) -> dict:
    def n(model) -> int:
        return len(db.exec(select(model.id)).all())

    return {
        "users": n(User),
        "projects": n(Project),
        "contents": n(Content),
        "embeddings": n(Embedding),
        "page_audits": n(PageAudit),
        "visibility_scans": n(VisibilityScan),
        "admins": n(Admin),
    }


# ── Contact form messages ────────────────────────────────
@router.get("/contact-messages", summary="List contact-form submissions")
def list_contact_messages(
    db: Session = Depends(get_db), _admin: Admin = Depends(get_current_admin)
) -> dict:
    rows = db.exec(select(ContactMessage).order_by(ContactMessage.created_at.desc())).all()
    unread = sum(1 for r in rows if not r.is_read)
    return {
        "unread": unread,
        "messages": [
            {
                "id": str(r.id),
                "name": r.name,
                "email": r.email,
                "message": r.message,
                "is_read": r.is_read,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
    }


@router.post("/contact-messages/{message_id}/read", summary="Mark a message read/unread")
def mark_contact_message(
    message_id: uuid.UUID,
    is_read: bool = True,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> dict:
    row = db.get(ContactMessage, message_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    row.is_read = is_read
    db.add(row)
    db.commit()
    return {"ok": True, "id": str(message_id), "is_read": is_read}


@router.delete("/contact-messages/{message_id}", summary="Delete a contact message")
def delete_contact_message(
    message_id: uuid.UUID,
    db: Session = Depends(get_db),
    _admin: Admin = Depends(get_current_admin),
) -> dict:
    row = db.get(ContactMessage, message_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    db.delete(row)
    db.commit()
    return {"ok": True}
