"""
CKD Backend API tests
Covers: auth, profile, campaigns, issues, notifications, leaderboard, flags, admin, media-auth.
"""
import os
import io
import time
import pytest
import requests

BASE = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/") if os.environ.get("EXPO_PUBLIC_BACKEND_URL") else "https://grassroot-action.preview.emergentagent.com"
API = f"{BASE}/api"

ADMIN_MOBILE = "9999999999"
OTP = "123456"

# Use a fresh test member each run
NEW_MOBILE = f"95{int(time.time()) % 100000000:08d}"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/verify-otp", json={"mobile": ADMIN_MOBILE, "otp": OTP})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def member_creds(session):
    # send-otp + verify-otp for new mobile -> profile setup
    r = session.post(f"{API}/auth/send-otp", json={"mobile": NEW_MOBILE})
    assert r.status_code == 200, r.text
    r = session.post(f"{API}/auth/verify-otp", json={"mobile": NEW_MOBILE, "otp": OTP})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["is_new_user"] is True
    token = data["token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    # setup profile
    r = session.post(f"{API}/auth/profile-setup", json={
        "name": "TEST सदस्य",
        "email": "test@ckd.in",
        "city": "दिल्ली",
        "area": "करोल बाग",
        "age_group": "18-25",
        "consent": True,
    }, headers=headers)
    assert r.status_code == 200, r.text
    user = r.json()
    assert user["profile_complete"] is True
    return {"token": token, "headers": headers, "user": user}


# ---------- Health ----------
def test_root(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    data = r.json()
    assert "tagline" in data


# ---------- Auth ----------
def test_send_otp(session):
    r = session.post(f"{API}/auth/send-otp", json={"mobile": "9000000000"})
    assert r.status_code == 200
    body = r.json()
    assert body["sent"] is True


def test_send_otp_invalid(session):
    r = session.post(f"{API}/auth/send-otp", json={"mobile": "123"})
    assert r.status_code == 400


def test_verify_otp_wrong(session):
    r = session.post(f"{API}/auth/verify-otp", json={"mobile": ADMIN_MOBILE, "otp": "000000"})
    assert r.status_code == 401


def test_admin_auth_me(session, admin_headers):
    r = session.get(f"{API}/auth/me", headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["role"] == "admin"
    assert data["mobile"] == ADMIN_MOBILE


def test_me_requires_auth(session):
    r = session.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_new_user_profile_setup(member_creds):
    u = member_creds["user"]
    assert u["name"] == "TEST सदस्य"
    assert u["city"] == "दिल्ली"


# ---------- Campaigns ----------
def test_list_campaigns_seeded(session):
    r = session.get(f"{API}/campaigns")
    assert r.status_code == 200
    docs = r.json()
    assert isinstance(docs, list)
    assert len(docs) >= 3
    for d in docs:
        assert "id" in d and "title" in d and "member_count" in d


def test_campaign_detail(session):
    docs = session.get(f"{API}/campaigns").json()
    cid = docs[0]["id"]
    r = session.get(f"{API}/campaigns/{cid}")
    assert r.status_code == 200
    assert r.json()["id"] == cid


def test_create_campaign_admin_only(session, admin_headers, member_creds):
    payload = {
        "title": "TEST_अभियान",
        "description": "टेस्ट",
        "location": "दिल्ली",
        "date": "2026-04-01",
        "goal": "टेस्ट लक्ष्य",
    }
    r = session.post(f"{API}/campaigns", json=payload, headers=member_creds["headers"])
    assert r.status_code == 403
    r = session.post(f"{API}/campaigns", json=payload, headers=admin_headers)
    assert r.status_code == 200
    cid = r.json()["id"]
    pytest.shared_campaign_id = cid

    g = session.get(f"{API}/campaigns/{cid}")
    assert g.status_code == 200
    assert g.json()["title"] == "TEST_अभियान"


def test_join_campaign_and_points(session, member_creds):
    cid = pytest.shared_campaign_id
    before = session.get(f"{API}/auth/me", headers=member_creds["headers"]).json()["kranti_points"]
    r = session.post(f"{API}/campaigns/{cid}/join", headers=member_creds["headers"])
    assert r.status_code == 200
    after = session.get(f"{API}/auth/me", headers=member_creds["headers"]).json()["kranti_points"]
    assert after - before == 10


def test_post_update_requires_membership(session, admin_headers, member_creds):
    # admin not member -> 403
    cid = pytest.shared_campaign_id
    payload = {"text": "TEST_अपडेट by member"}
    r = session.post(f"{API}/campaigns/{cid}/updates", json=payload, headers=member_creds["headers"])
    assert r.status_code == 200
    uid = r.json()["id"]
    pytest.shared_update_id = uid

    # admin is not in members -> 403
    r2 = session.post(f"{API}/campaigns/{cid}/updates", json={"text": "no"}, headers=admin_headers)
    assert r2.status_code == 403


def test_list_updates_enriched(session):
    cid = pytest.shared_campaign_id
    r = session.get(f"{API}/campaigns/{cid}/updates")
    assert r.status_code == 200
    docs = r.json()
    assert len(docs) >= 1
    d = docs[0]
    assert "user" in d
    assert "like_count" in d
    assert "comment_count" in d


def test_update_like_toggle(session, admin_headers):
    uid = pytest.shared_update_id
    r1 = session.post(f"{API}/updates/{uid}/like", headers=admin_headers)
    assert r1.status_code == 200 and r1.json()["liked"] is True
    r2 = session.post(f"{API}/updates/{uid}/like", headers=admin_headers)
    assert r2.json()["liked"] is False


def test_update_comment(session, admin_headers):
    uid = pytest.shared_update_id
    r = session.post(f"{API}/updates/{uid}/comments", json={"text": "TEST_टिप्पणी"}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["text"] == "TEST_टिप्पणी"


# ---------- Issues ----------
def test_list_issues_seeded(session):
    r = session.get(f"{API}/issues")
    assert r.status_code == 200
    docs = r.json()
    assert len(docs) >= 3
    for d in docs:
        assert "reporter" in d
        assert "supporter_count" in d


def test_list_issues_filter(session):
    r = session.get(f"{API}/issues", params={"city": "दिल्ली"})
    assert r.status_code == 200
    for d in r.json():
        assert d["city"] == "दिल्ली"


# ---------- Iteration 3: state field, state-counts, featured campaigns ----------
def test_issues_state_filter(session):
    r = session.get(f"{API}/issues", params={"state": "दिल्ली"})
    assert r.status_code == 200
    docs = r.json()
    for d in docs:
        assert d.get("state") == "दिल्ली"


def test_issues_state_counts(session, member_creds):
    # Create a state-tagged issue first to guarantee state-counts is non-empty
    payload = {
        "title": "TEST_state_count_seed",
        "description": "seed",
        "state": "दिल्ली",
        "city": "दिल्ली",
        "area": "Test",
        "category": "anya",
    }
    session.post(f"{API}/issues", json=payload, headers=member_creds["headers"])
    r = session.get(f"{API}/issues/state-counts")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict)
    # After creating a दिल्ली issue, state-counts MUST contain दिल्ली
    assert "दिल्ली" in data
    for k, v in data.items():
        assert isinstance(v, int) and v > 0


def test_campaigns_featured_filter(session):
    r = session.get(f"{API}/campaigns", params={"featured": "true"})
    assert r.status_code == 200
    docs = r.json()
    assert len(docs) >= 1
    for d in docs:
        assert d.get("is_featured") is True


def test_create_issue_requires_state(session, member_creds):
    # IssueIn now requires state - 422 if missing
    payload = {
        "title": "TEST_no_state",
        "description": "test",
        "city": "दिल्ली",
        "area": "करोल बाग",
        "category": "safai",
    }
    r = session.post(f"{API}/issues", json=payload, headers=member_creds["headers"])
    assert r.status_code == 422


def test_create_campaign_with_featured_flag(session, admin_headers):
    payload = {
        "title": "TEST_featured_अभियान",
        "description": "टेस्ट featured",
        "location": "दिल्ली",
        "state": "दिल्ली",
        "date": "2026-05-01",
        "is_featured": True,
    }
    r = session.post(f"{API}/campaigns", json=payload, headers=admin_headers)
    assert r.status_code == 200
    cid = r.json()["id"]
    # Should appear in featured list
    feat = session.get(f"{API}/campaigns", params={"featured": "true"}).json()
    assert any(c["id"] == cid for c in feat)
    # cleanup
    session.delete(f"{API}/campaigns/{cid}", headers=admin_headers)


def test_create_issue_appears_in_state_view(session, member_creds):
    """BUG-1 verification: a newly created issue must be queryable by state filter."""
    payload = {
        "title": "TEST_state_visibility",
        "description": "test",
        "state": "गुजरात",
        "city": "अहमदाबाद",
        "area": "Test Area",
        "category": "anya",
    }
    r = session.post(f"{API}/issues", json=payload, headers=member_creds["headers"])
    assert r.status_code == 200
    iid = r.json()["id"]
    # Now filter by गुजरात
    rs = session.get(f"{API}/issues", params={"state": "गुजरात"})
    assert rs.status_code == 200
    assert any(d["id"] == iid for d in rs.json())
    # State-counts must now include गुजरात
    counts = session.get(f"{API}/issues/state-counts").json()
    assert counts.get("गुजरात", 0) >= 1


def test_create_issue_points(session, member_creds):
    before = session.get(f"{API}/auth/me", headers=member_creds["headers"]).json()["kranti_points"]
    payload = {
        "title": "TEST_समस्या",
        "description": "टेस्ट विवरण",
        "state": "दिल्ली",
        "city": "दिल्ली",
        "area": "करोल बाग",
        "category": "safai",
    }
    r = session.post(f"{API}/issues", json=payload, headers=member_creds["headers"])
    assert r.status_code == 200
    issue = r.json()
    pytest.shared_issue_id = issue["id"]
    after = session.get(f"{API}/auth/me", headers=member_creds["headers"]).json()["kranti_points"]
    assert after - before == 5

    g = session.get(f"{API}/issues/{issue['id']}")
    assert g.status_code == 200
    assert g.json()["title"] == "TEST_समस्या"


def test_support_toggle(session, admin_headers):
    iid = pytest.shared_issue_id
    r1 = session.post(f"{API}/issues/{iid}/support", headers=admin_headers)
    assert r1.json()["supported"] is True
    r2 = session.post(f"{API}/issues/{iid}/support", headers=admin_headers)
    assert r2.json()["supported"] is False


def test_volunteer_and_points(session, admin_headers):
    iid = pytest.shared_issue_id
    before = session.get(f"{API}/auth/me", headers=admin_headers).json()["kranti_points"]
    r = session.post(f"{API}/issues/{iid}/volunteer", headers=admin_headers)
    assert r.status_code == 200
    after = session.get(f"{API}/auth/me", headers=admin_headers).json()["kranti_points"]
    assert after - before == 8


def test_issue_comment(session, admin_headers):
    iid = pytest.shared_issue_id
    r = session.post(f"{API}/issues/{iid}/comments", json={"text": "TEST_टिप्पणी"}, headers=admin_headers)
    assert r.status_code == 200


def test_issue_status_change_perm(session, admin_headers, member_creds):
    iid = pytest.shared_issue_id
    # reporter can change
    r = session.put(f"{API}/issues/{iid}/status", json={"status": "in_progress"}, headers=member_creds["headers"])
    assert r.status_code == 200
    # admin can resolve
    r = session.put(f"{API}/issues/{iid}/status", json={"status": "resolved", "note": "हल"}, headers=admin_headers)
    assert r.status_code == 200
    g = session.get(f"{API}/issues/{iid}").json()
    assert g["status"] == "resolved"


# ---------- Notifications ----------
def test_notifications_list(session, member_creds):
    r = session.get(f"{API}/notifications", headers=member_creds["headers"])
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    assert len(items) >= 1
    pytest.shared_notif_id = items[0]["id"]


def test_notification_mark_read(session, member_creds):
    nid = pytest.shared_notif_id
    r = session.post(f"{API}/notifications/{nid}/read", headers=member_creds["headers"])
    assert r.status_code == 200


# ---------- Leaderboard, activity ----------
def test_leaderboard(session):
    r = session.get(f"{API}/leaderboard")
    assert r.status_code == 200
    docs = r.json()
    assert len(docs) >= 5
    pts = [d["kranti_points"] for d in docs]
    assert pts == sorted(pts, reverse=True)


def test_my_activity(session, member_creds):
    r = session.get(f"{API}/me/activity", headers=member_creds["headers"])
    assert r.status_code == 200
    data = r.json()
    assert "campaigns" in data and "issues" in data and "contributions" in data
    assert len(data["issues"]) >= 1


# ---------- Flags ----------
def test_create_flag(session, member_creds):
    iid = pytest.shared_issue_id
    r = session.post(f"{API}/flags", json={"content_type": "issue", "content_id": iid, "reason": "TEST_फ्लैग"}, headers=member_creds["headers"])
    assert r.status_code == 200
    pytest.shared_flag_id = r.json()["id"]


# ---------- Admin ----------
def test_admin_dashboard(session, admin_headers, member_creds):
    r = session.get(f"{API}/admin/dashboard", headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    assert "total_members" in data
    assert "issues" in data and "open" in data["issues"]
    # member 403
    r2 = session.get(f"{API}/admin/dashboard", headers=member_creds["headers"])
    assert r2.status_code == 403


def test_admin_members_search(session, admin_headers):
    r = session.get(f"{API}/admin/members", params={"q": "राहुल"}, headers=admin_headers)
    assert r.status_code == 200
    found = r.json()
    assert any("राहुल" in (d.get("name") or "") for d in found)


def test_admin_ban_unban(session, admin_headers):
    # find a member
    members = session.get(f"{API}/admin/members", params={"q": "विकास"}, headers=admin_headers).json()
    assert len(members) >= 1
    uid = members[0]["id"]
    r = session.post(f"{API}/admin/members/{uid}/ban", headers=admin_headers)
    assert r.status_code == 200
    u = session.get(f"{API}/users/{uid}").json()
    assert u["is_banned"] is True
    r = session.post(f"{API}/admin/members/{uid}/unban", headers=admin_headers)
    assert r.status_code == 200
    u = session.get(f"{API}/users/{uid}").json()
    assert u["is_banned"] is False


def test_admin_flags_list_and_resolve(session, admin_headers):
    r = session.get(f"{API}/admin/flags", headers=admin_headers)
    assert r.status_code == 200
    flags = r.json()
    assert any(f["id"] == pytest.shared_flag_id for f in flags)
    r = session.post(f"{API}/admin/flags/{pytest.shared_flag_id}/resolve", headers=admin_headers)
    assert r.status_code == 200


def test_admin_announcement(session, admin_headers, member_creds):
    r = session.post(f"{API}/admin/announcements", json={"title": "TEST_घोषणा", "body": "टेस्ट"}, headers=admin_headers)
    assert r.status_code == 200
    # Member sees it in notifications
    items = session.get(f"{API}/notifications", headers=member_creds["headers"]).json()
    assert any(n["title"] == "TEST_घोषणा" for n in items)


# ---------- Media upload (auth check only) ----------
def test_media_upload_requires_auth(session):
    r = requests.post(f"{API}/media/upload", files={"file": ("a.txt", b"x", "text/plain")})
    assert r.status_code == 401


def test_media_upload_rejects_non_image(session, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    r = requests.post(
        f"{API}/media/upload",
        headers=headers,
        files={"file": ("a.txt", b"hello", "text/plain")},
        data={"kind": "image"},
    )
    assert r.status_code == 400
