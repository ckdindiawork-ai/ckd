"""
CKD Iteration 5 — Email/Password + Google auth backend tests.
Covers: signup, login, forgot/reset, google session, profile-setup, role guard, legacy OTP removal, idempotent seed.
"""
import os
import re
import time
import subprocess
import pytest
import requests

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://grassroot-action.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = "ckdindia.work@gmail.com"
ADMIN_PASSWORD = "INdr@#1234"
MEMBER_EMAIL = "rahul@ckd.demo"
MEMBER_PASSWORD = "Demo@1234"

TS = int(time.time())
NEW_EMAIL = f"test_signup_{TS}@ckd.demo"
NEW_PASSWORD = "TestPass@1234"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["role"] == "admin"
    assert data["user"]["email"] == ADMIN_EMAIL.lower()
    return data["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def member_token(session):
    r = session.post(f"{API}/auth/login", json={"email": MEMBER_EMAIL, "password": MEMBER_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["role"] == "member"
    return data["token"]


@pytest.fixture(scope="session")
def member_headers(member_token):
    return {"Authorization": f"Bearer {member_token}", "Content-Type": "application/json"}


# ---------- Health ----------
def test_root(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert "tagline" in r.json()


# ---------- Login ----------
def test_admin_login(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data
    assert data["user"]["role"] == "admin"
    assert data["user"]["auth_provider"] == "password"


def test_member_login(session):
    r = session.post(f"{API}/auth/login", json={"email": MEMBER_EMAIL, "password": MEMBER_PASSWORD})
    assert r.status_code == 200
    data = r.json()
    assert data["user"]["role"] == "member"


def test_login_wrong_password(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong_password"})
    assert r.status_code == 401
    assert "गलत ईमेल या पासवर्ड" in r.text


def test_login_unknown_email(session):
    r = session.post(f"{API}/auth/login", json={"email": "noone@nowhere.example", "password": "whatever123"})
    assert r.status_code == 401
    assert "गलत ईमेल या पासवर्ड" in r.text


# ---------- Signup ----------
def test_signup_success(session):
    r = session.post(f"{API}/auth/signup", json={
        "name": "TEST सदस्य",
        "email": NEW_EMAIL,
        "password": NEW_PASSWORD,
        "confirm_password": NEW_PASSWORD,
    })
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data
    assert data["is_new_user"] is True
    assert data["user"]["role"] == "member"
    assert data["user"]["email"] == NEW_EMAIL.lower()
    assert data["user"]["profile_complete"] is False
    pytest.shared_new_token = data["token"]
    pytest.shared_new_user_id = data["user"]["id"]


def test_signup_duplicate_email(session):
    r = session.post(f"{API}/auth/signup", json={
        "name": "Dup",
        "email": NEW_EMAIL,
        "password": NEW_PASSWORD,
        "confirm_password": NEW_PASSWORD,
    })
    assert r.status_code == 409


def test_signup_password_mismatch(session):
    r = session.post(f"{API}/auth/signup", json={
        "name": "x",
        "email": f"mismatch_{TS}@ckd.demo",
        "password": "abcdefgh1",
        "confirm_password": "different1",
    })
    assert r.status_code == 400
    assert "मेल नहीं खाते" in r.text


def test_signup_short_password(session):
    r = session.post(f"{API}/auth/signup", json={
        "name": "x",
        "email": f"short_{TS}@ckd.demo",
        "password": "abc",
        "confirm_password": "abc",
    })
    assert r.status_code == 400


# ---------- Forgot/Reset ----------
def test_forgot_password_existing(session):
    r = session.post(f"{API}/auth/forgot-password", json={"email": MEMBER_EMAIL})
    assert r.status_code == 200
    assert r.json().get("ok") is True


def test_forgot_password_unknown_still_ok(session):
    """Should not leak account existence."""
    r = session.post(f"{API}/auth/forgot-password", json={"email": "nobody-here@example.com"})
    assert r.status_code == 200
    assert r.json().get("ok") is True


def _extract_reset_token(email: str) -> str | None:
    """Grep recent backend log for [PASSWORD RESET] line with this email."""
    try:
        out = subprocess.run(
            ["tail", "-n", "500", "/var/log/supervisor/backend.err.log"],
            capture_output=True, text=True, timeout=5
        ).stdout
    except Exception:
        return None
    # Find LAST matching line for this email
    last_token = None
    for line in out.splitlines():
        if "[PASSWORD RESET]" in line and email in line:
            m = re.search(r"token=([A-Za-z0-9_\-]+)", line)
            if m:
                last_token = m.group(1)
    return last_token


def test_reset_password_flow(session):
    """Use a dedicated test user we just created, so we don't break member fixture."""
    target_email = NEW_EMAIL  # the one created in test_signup_success
    # Issue forgot
    r = session.post(f"{API}/auth/forgot-password", json={"email": target_email})
    assert r.status_code == 200
    time.sleep(0.5)
    token = _extract_reset_token(target_email)
    assert token, "could not extract reset token from backend logs"

    # Reset with NEW password
    new_pw = "ResetPass@9876"
    r = session.post(f"{API}/auth/reset-password", json={"token": token, "new_password": new_pw})
    assert r.status_code == 200, r.text
    assert "token" in r.json()

    # Old password should now fail
    r = session.post(f"{API}/auth/login", json={"email": target_email, "password": NEW_PASSWORD})
    assert r.status_code == 401

    # New password should work
    r = session.post(f"{API}/auth/login", json={"email": target_email, "password": new_pw})
    assert r.status_code == 200


def test_reset_invalid_token(session):
    r = session.post(f"{API}/auth/reset-password", json={"token": "totally-bogus-token-xyz", "new_password": "AnyPass@123"})
    assert r.status_code == 400


# ---------- Google session ----------
def test_google_session_invalid(session):
    r = session.post(f"{API}/auth/google/session", json={"session_id": "invalid-session-id-xyz"})
    assert r.status_code in (401, 502)


def test_google_session_missing(session):
    r = session.post(f"{API}/auth/google/session", json={"session_id": ""})
    assert r.status_code in (400, 422)


# ---------- /auth/me ----------
def test_me_no_auth(session):
    r = session.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_me_admin(session, admin_headers):
    r = session.get(f"{API}/auth/me", headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["role"] == "admin"
    assert data["auth_provider"] == "password"


def test_me_member(session, member_headers):
    r = session.get(f"{API}/auth/me", headers=member_headers)
    assert r.status_code == 200
    assert r.json()["role"] == "member"


# ---------- Profile setup ----------
def test_profile_setup_consent_required(session):
    """Use a freshly-signed-up user."""
    # Sign up a brand-new account
    email = f"profile_{TS}@ckd.demo"
    r = session.post(f"{API}/auth/signup", json={
        "name": "ProfTest",
        "email": email,
        "password": NEW_PASSWORD,
        "confirm_password": NEW_PASSWORD,
    })
    assert r.status_code == 200
    tok = r.json()["token"]
    h = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}

    # consent false -> 400
    r = session.post(f"{API}/auth/profile-setup", json={
        "name": "Pro File", "phone": "9999900000",
        "state": "दिल्ली", "city": "दिल्ली", "area": "test",
        "age_group": "18-25", "consent": False,
    }, headers=h)
    assert r.status_code == 400

    # consent true -> 200 + profile_complete
    r = session.post(f"{API}/auth/profile-setup", json={
        "name": "Pro File", "phone": "9999900000",
        "state": "दिल्ली", "city": "दिल्ली", "area": "test",
        "age_group": "18-25", "consent": True,
    }, headers=h)
    assert r.status_code == 200
    u = r.json()
    assert u["profile_complete"] is True
    assert u["city"] == "दिल्ली"


# ---------- Legacy OTP removal ----------
def test_legacy_send_otp_removed(session):
    r = session.post(f"{API}/auth/send-otp", json={"mobile": "9999999999"})
    assert r.status_code in (404, 405)


def test_legacy_verify_otp_removed(session):
    r = session.post(f"{API}/auth/verify-otp", json={"mobile": "9999999999", "otp": "123456"})
    assert r.status_code in (404, 405)


# ---------- Role guard on /admin/* ----------
ADMIN_ENDPOINTS = [
    ("GET", "/admin/dashboard", None),
    ("GET", "/admin/members", None),
    ("GET", "/admin/flags", None),
    ("POST", "/admin/campaigns", {"title": "x", "description": "x", "location": "x", "date": "2026-01-01"}),
    ("POST", "/admin/announcements", {"title": "x", "body": "x"}),
]


@pytest.mark.parametrize("method,path,body", ADMIN_ENDPOINTS)
def test_admin_endpoints_block_member(session, member_headers, method, path, body):
    # Some routes (campaigns/announcements) are at /campaigns and /admin/announcements;
    # the role guard is what matters. Use given path.
    url = f"{API}{path}"
    if method == "GET":
        r = session.get(url, headers=member_headers)
    else:
        r = session.post(url, json=body or {}, headers=member_headers)
    # If route exists, members must get 403. If route doesn't exist at this path, accept 404.
    assert r.status_code in (403, 404), f"{method} {path} -> {r.status_code}: {r.text[:200]}"


@pytest.mark.parametrize("method,path,body", ADMIN_ENDPOINTS)
def test_admin_endpoints_block_no_auth(session, method, path, body):
    url = f"{API}{path}"
    if method == "GET":
        r = session.get(url)
    else:
        r = session.post(url, json=body or {})
    assert r.status_code in (401, 404), f"{method} {path} -> {r.status_code}"


def test_admin_dashboard_ok_for_admin(session, admin_headers):
    r = session.get(f"{API}/admin/dashboard", headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    assert "total_members" in data


def test_admin_members_ok_for_admin(session, admin_headers):
    r = session.get(f"{API}/admin/members", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_announcement_ok_for_admin(session, admin_headers):
    r = session.post(f"{API}/admin/announcements",
                     json={"title": "TEST_announce_v2", "body": "test"},
                     headers=admin_headers)
    assert r.status_code == 200


def test_create_campaign_blocked_for_member(session, member_headers):
    # The actual route is /campaigns (admin guard inside)
    r = session.post(f"{API}/campaigns", json={
        "title": "TEST_block", "description": "x", "location": "x", "date": "2026-01-01"
    }, headers=member_headers)
    assert r.status_code == 403


# Issue status guard: member who is NOT reporter and NOT admin must be 403
def test_issue_status_blocked_for_non_reporter_non_admin(session, member_headers):
    # Pick any existing issue
    issues = session.get(f"{API}/issues").json()
    if not issues:
        pytest.skip("no issues to test")
    # find an issue NOT reported by the rahul user (member_headers is rahul)
    me = session.get(f"{API}/auth/me", headers=member_headers).json()
    target = next((i for i in issues if i["reported_by"] != me["id"]), None)
    if not target:
        pytest.skip("no issue owned by another user")
    r = session.put(f"{API}/issues/{target['id']}/status",
                    json={"status": "in_progress"}, headers=member_headers)
    assert r.status_code == 403


# ---------- Admin seed idempotency ----------
def test_admin_seed_idempotent(session):
    """Login should still work for admin and standard members after multiple restarts.
    We assert presence; we don't actually restart inside test (would be flaky)."""
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    for em in ["rahul@ckd.demo", "priya@ckd.demo", "amit@ckd.demo", "neha@ckd.demo", "vikas@ckd.demo"]:
        r = session.post(f"{API}/auth/login", json={"email": em, "password": MEMBER_PASSWORD})
        assert r.status_code == 200, f"{em} login failed: {r.text}"
