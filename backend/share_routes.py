"""
CKD Share & Deep-Link Module
============================

Powers WhatsApp / Telegram / Twitter rich previews + the install-fallback
landing page for Android App Links.

Routes registered here (mounted at app root, NOT under /api):
  GET  /share/campaign/{cid}      — smart HTML preview (bot OG / mobile redirect / desktop landing)
  GET  /share/issue/{iid}         — same for issues
  GET  /.well-known/assetlinks.json — Android App Links auto-verification

Why a separate module:
  - Keeps server.py focused on JSON APIs
  - HTML rendering uses different patterns (no auth, OG meta, raw HTML)
  - Easier to evolve / cache / lazy-render OG images later

Smart-redirect strategy:
  - Crawler (WhatsApp/FB/Twitter/Telegram/LinkedIn/Discord): plain HTML with
    OpenGraph + Twitter Card meta tags — NO redirect (would break preview).
  - Mobile (Android/iOS): tiny HTML with deep-link launch + Play Store fallback.
  - Desktop / unknown: clean landing page with "Open in app" + "Get the app"
    buttons. Branded CKD chrome — political-movement aesthetic, not flashy.

Performance:
  - HTML is rendered server-side per request (no template engine — string
    formatting is fast enough at our scale)
  - Crawler responses can be cached at CDN (Cache-Control: public, max-age=600)
  - assetlinks.json is static (1-day cache)
"""
import html
import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse, RedirectResponse

log = logging.getLogger("ckd.share")

# Public deep-link host. Must match android intentFilters in app.json.
DEEP_LINK_HOST = os.getenv("CKD_DEEP_LINK_HOST", "app.ckdindia.com")
APP_SCHEME = "ckd"
PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=in.ckd.app"
APP_STORE_URL = "https://apps.apple.com/in/app/ckd-kranti-dal"
LOGO_URL = "https://customer-assets.emergentagent.com/job_grassroot-action/artifacts/szqa5p3q_adaptive-icon.jpeg"

# Brand
BRAND_PURPLE = "#3A1C71"
BRAND_GOLD = "#F4B400"
BRAND_RED = "#E63329"

# Android App Links — fingerprint of the EAS-built APK signing certificate.
# This MUST be obtained from your EAS build: `eas credentials` → Android keystore
# SHA256 fingerprint. The value below is a placeholder; replace once available.
# Multiple fingerprints supported (preview + production builds).
ASSETLINKS_FINGERPRINTS = [
    os.getenv("ANDROID_SHA256_PREVIEW", ""),
    os.getenv("ANDROID_SHA256_PRODUCTION", ""),
]
ANDROID_PACKAGE_NAME = os.getenv("ANDROID_PACKAGE_NAME", "in.ckd.app")


# ============================================================================
# DB injection (set by server.py at startup so we don't create a circular import)
# ============================================================================
_db = None
def attach_db(db_instance):
    global _db
    _db = db_instance


# ============================================================================
# UA classification
# ============================================================================

_CRAWLER_AGENTS = (
    "whatsapp", "facebookexternalhit", "facebot", "twitterbot", "telegrambot",
    "linkedinbot", "discordbot", "slackbot", "skypeuripreview", "googlebot",
    "embedly", "redditbot", "applebot",
)
_MOBILE_AGENTS = ("android", "iphone", "ipad", "ipod")


def classify_ua(ua: str) -> str:
    ua_lower = (ua or "").lower()
    if any(c in ua_lower for c in _CRAWLER_AGENTS):
        return "crawler"
    if "android" in ua_lower:
        return "android"
    if any(m in ua_lower for m in _MOBILE_AGENTS):
        return "ios"
    return "desktop"


# ============================================================================
# OG image resolution
# ============================================================================

def resolve_og_image(item: dict) -> str:
    """Pick best image for OG preview.
       Priority: media[is_cover] → media[0] → cover_url → LOGO_URL."""
    media = item.get("media") or []
    if media:
        cover = next((m for m in media if m.get("type") == "image" and m.get("is_cover")), None)
        if cover and cover.get("url"):
            return cover["url"]
        first_img = next((m for m in media if m.get("type") == "image"), None)
        if first_img and first_img.get("url"):
            return first_img["url"]
    if item.get("cover_url"):
        return item["cover_url"]
    return LOGO_URL


# ============================================================================
# HTML templates
# ============================================================================

def _meta(title: str, description: str, image: str, url: str) -> str:
    """Returns OG + Twitter Card meta tags."""
    title_e = html.escape(title)
    desc_e = html.escape(description)
    image_e = html.escape(image)
    url_e = html.escape(url)
    return f"""
  <meta property="og:title" content="{title_e}">
  <meta property="og:description" content="{desc_e}">
  <meta property="og:image" content="{image_e}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="{url_e}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="CKD — Cockroach Kranti Dal">
  <meta property="og:locale" content="hi_IN">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title_e}">
  <meta name="twitter:description" content="{desc_e}">
  <meta name="twitter:image" content="{image_e}">
""".strip()


def _crawler_html(title: str, description: str, image: str, url: str) -> str:
    """Minimal HTML with rich meta — for WhatsApp / FB / TG crawlers."""
    return f"""<!DOCTYPE html>
<html lang="hi" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8">
<title>{html.escape(title)} | CKD</title>
{_meta(title, description, image, url)}
</head>
<body>
<h1>{html.escape(title)}</h1>
<p>{html.escape(description)}</p>
</body>
</html>"""


def _android_redirect_html(deep_path: str, title: str, description: str, image: str, url: str) -> str:
    """
    Android landing page that auto-launches the app via intent:// URL, with
    Play Store fallback if the app is not installed. No flash of raw HTML
    because we render a branded splash while the intent resolves.

    `deep_path` is e.g. "campaign/123" — appended after the host.
    """
    # The intent:// URL syntax tells Chrome/WebView to open the app if installed,
    # otherwise fall back to a market:// link. S.browser_fallback_url is hit
    # if neither works.
    intent_url = (
        f"intent://{DEEP_LINK_HOST}/{deep_path}#Intent;"
        f"scheme=https;package={ANDROID_PACKAGE_NAME};"
        f"S.browser_fallback_url={PLAY_STORE_URL};end"
    )
    safe_title = html.escape(title)
    safe_desc = html.escape(description)
    safe_img = html.escape(image)
    safe_url = html.escape(url)
    return f"""<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>{safe_title} | CKD</title>
{_meta(title, description, image, url)}
<style>
  body{{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:{BRAND_PURPLE};color:#fff;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;text-align:center;}}
  img.logo{{width:72px;height:72px;border-radius:16px;margin-bottom:16px;}}
  img.cover{{width:100%;max-width:340px;aspect-ratio:16/9;object-fit:cover;border-radius:12px;margin-top:16px;background:rgba(255,255,255,0.08);}}
  h1{{font-size:22px;margin:8px 0 4px;line-height:1.3;}}
  p.sub{{font-size:14px;opacity:.8;margin:0 0 24px;}}
  .btn{{display:inline-block;padding:14px 28px;background:{BRAND_GOLD};color:{BRAND_PURPLE};border-radius:10px;font-weight:700;text-decoration:none;margin:8px 4px;font-size:15px;}}
  .btn.secondary{{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.3);}}
  .spinner{{width:24px;height:24px;border:3px solid rgba(255,255,255,.2);border-top-color:{BRAND_GOLD};border-radius:50%;animation:spin .9s linear infinite;margin:16px auto;}}
  @keyframes spin{{to{{transform:rotate(360deg);}}}}
  .status{{font-size:12px;opacity:.6;margin-top:16px;}}
</style>
</head>
<body>
  <img src="{LOGO_URL}" alt="CKD" class="logo">
  <h1>{safe_title}</h1>
  <p class="sub">{safe_desc}</p>
  <img src="{safe_img}" alt="" class="cover" onerror="this.style.display='none'">
  <div class="spinner" id="spin"></div>
  <p class="status" id="status">CKD ऐप खोल रहे हैं...</p>
  <div id="fallback" style="display:none;margin-top:16px;">
    <a href="{PLAY_STORE_URL}" class="btn">Play Store से डाउनलोड करें</a>
    <br>
    <a href="{safe_url}#stay" class="btn secondary">वेब पर ही देखें</a>
  </div>
<script>
(function() {{
  // Deep-link attempt strategy:
  // 1. Try app scheme via iframe (fastest, no nav flash)
  // 2. If still here after 1.6s, show install fallback
  var t0 = Date.now();
  var tryUrl = "{APP_SCHEME}://{deep_path}";
  var intentUrl = "{intent_url}";
  // Chrome / modern Android — intent:// is preferred (auto Play Store fallback)
  window.location.href = intentUrl;
  setTimeout(function() {{
    // If we're still here ~1.6s later, app probably not installed.
    if (Date.now() - t0 > 1400 && document.visibilityState !== 'hidden') {{
      document.getElementById('spin').style.display = 'none';
      document.getElementById('status').textContent = 'CKD ऐप आपके फ़ोन पर नहीं है';
      document.getElementById('fallback').style.display = 'block';
    }}
  }}, 1600);
}})();
</script>
</body>
</html>"""


def _landing_html(deep_path: str, title: str, description: str, image: str, url: str, kind: str) -> str:
    """Desktop / iOS landing page with both store badges + branded preview card."""
    safe_title = html.escape(title)
    safe_desc = html.escape(description)
    safe_img = html.escape(image)
    safe_url = html.escape(url)
    return f"""<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{safe_title} | CKD</title>
{_meta(title, description, image, url)}
<style>
  *{{box-sizing:border-box}}
  body{{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Hind',sans-serif;background:linear-gradient(160deg,{BRAND_PURPLE} 0%,#1f0d4a 100%);color:#fff;min-height:100vh;}}
  .wrap{{max-width:520px;margin:0 auto;padding:40px 24px;}}
  .top{{display:flex;align-items:center;gap:12px;margin-bottom:32px;}}
  .top img{{width:48px;height:48px;border-radius:10px;}}
  .top h2{{margin:0;font-size:18px;}}
  .top .tag{{font-size:11px;opacity:.7;margin-top:2px;}}
  .card{{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:20px;backdrop-filter:blur(8px);}}
  .cover{{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;margin-bottom:16px;background:rgba(0,0,0,.2);}}
  .kind-pill{{display:inline-block;padding:4px 10px;border-radius:999px;background:{BRAND_GOLD};color:{BRAND_PURPLE};font-size:11px;font-weight:700;margin-bottom:12px;}}
  h1{{font-size:22px;margin:0 0 8px;line-height:1.3;}}
  p.desc{{font-size:14px;line-height:1.55;opacity:.88;margin:0 0 20px;}}
  .cta{{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;}}
  .btn{{flex:1;min-width:140px;text-align:center;padding:14px;background:{BRAND_GOLD};color:{BRAND_PURPLE};border-radius:10px;font-weight:700;text-decoration:none;font-size:14px;}}
  .btn.alt{{background:transparent;color:#fff;border:1px solid rgba(255,255,255,.25);}}
  .footer{{text-align:center;font-size:11px;opacity:.5;margin-top:32px;}}
</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <img src="{LOGO_URL}" alt="CKD">
    <div>
      <h2>CKD — Cockroach Kranti Dal</h2>
      <div class="tag">युवा जागे, देश बदले</div>
    </div>
  </div>
  <div class="card">
    <img src="{safe_img}" alt="" class="cover" onerror="this.style.display='none'">
    <div class="kind-pill">{'अभियान' if kind == 'campaign' else 'समस्या'}</div>
    <h1>{safe_title}</h1>
    <p class="desc">{safe_desc}</p>
    <div class="cta">
      <a href="{PLAY_STORE_URL}" class="btn">Android ऐप डाउनलोड करें</a>
      <a href="{APP_SCHEME}://{deep_path}" class="btn alt">पहले से इंस्टॉल है — खोलें</a>
    </div>
  </div>
  <div class="footer">© CKD India · #युवा_क्रांति</div>
</div>
</body>
</html>"""


# ============================================================================
# Build share router
# ============================================================================

def build_router() -> APIRouter:
    # All share routes are prefixed with /api/share to satisfy the K8s
    # ingress rule that routes /api/* → backend. The public-facing deep-link
    # host (app.ckdindia.com) will reverse-proxy /campaign/{id} → /api/share/campaign/{id}
    # once DNS + ingress are configured. Until then, share links use this prefix
    # directly via the preview URL.
    router = APIRouter(prefix="/api/share", tags=["share"])

    @router.get("/campaign/{cid}", response_class=HTMLResponse)
    async def share_campaign(cid: str, request: Request):
        if _db is None:
            return HTMLResponse("DB not ready", status_code=503)
        c = await _db.campaigns.find_one({"id": cid, "is_active": True}, {"_id": 0})
        if not c:
            return HTMLResponse(_not_found_html("अभियान नहीं मिला"), status_code=404)

        title = c.get("title", "CKD अभियान")
        # Member count for richer description
        member_count = len(c.get("members") or [])
        location = c.get("location") or ""
        desc_parts = [c.get("description", "")[:120]]
        if location:
            desc_parts.append(f"📍 {location}")
        if member_count:
            desc_parts.append(f"👥 {member_count} सदस्य")
        description = " · ".join(p for p in desc_parts if p)
        image = resolve_og_image(c)
        url = f"https://{DEEP_LINK_HOST}/campaigns/{cid}"
        deep_path = f"campaigns/{cid}"

        return _render(request, deep_path, title, description, image, url, kind="campaign")

    @router.get("/issue/{iid}", response_class=HTMLResponse)
    async def share_issue(iid: str, request: Request):
        if _db is None:
            return HTMLResponse("DB not ready", status_code=503)
        i = await _db.issues.find_one({"id": iid}, {"_id": 0})
        if not i:
            return HTMLResponse(_not_found_html("समस्या नहीं मिली"), status_code=404)

        title = i.get("title", "स्थानीय समस्या")
        location = ", ".join(filter(None, [i.get("area"), i.get("city"), i.get("state")]))
        description = (i.get("description", "")[:120]) + (f" · 📍 {location}" if location else "")
        image = i.get("media_url") if i.get("media_type") == "image" else LOGO_URL
        url = f"https://{DEEP_LINK_HOST}/issues/{iid}"
        deep_path = f"issues/{iid}"

        return _render(request, deep_path, title, description, image, url, kind="issue")

    @router.get("/well-known/assetlinks.json")
    async def assetlinks():
        """Android App Links auto-verification.

        Returns ONLY non-empty fingerprints — placeholder strings filter out so
        the file is valid until production fingerprints are configured.
        """
        fingerprints = [fp for fp in ASSETLINKS_FINGERPRINTS if fp and len(fp) > 20]
        if not fingerprints:
            # Return a minimal valid empty array — Android verification will fail
            # gracefully and the app will still be invokable via user choice.
            return JSONResponse([], headers={"Cache-Control": "public, max-age=300"})
        statement = [{
            "relation": ["delegate_permission/common.handle_all_urls"],
            "target": {
                "namespace": "android_app",
                "package_name": ANDROID_PACKAGE_NAME,
                "sha256_cert_fingerprints": fingerprints,
            },
        }]
        return JSONResponse(statement, headers={"Cache-Control": "public, max-age=86400"})

    @router.get("/health")
    async def share_health():
        return {
            "ok": True,
            "deep_link_host": DEEP_LINK_HOST,
            "scheme": APP_SCHEME,
            "fingerprints_configured": sum(1 for fp in ASSETLINKS_FINGERPRINTS if fp and len(fp) > 20),
        }

    return router


def _render(request: Request, deep_path: str, title: str, description: str,
            image: str, url: str, kind: str) -> HTMLResponse:
    """Smart UA-based response selection."""
    ua = request.headers.get("user-agent", "")
    classification = classify_ua(ua)

    if classification == "crawler":
        # Crawlers care only about meta tags — no redirect (would break preview)
        html_body = _crawler_html(title, description, image, url)
        return HTMLResponse(html_body, headers={"Cache-Control": "public, max-age=600"})

    if classification == "android":
        return HTMLResponse(_android_redirect_html(deep_path, title, description, image, url))

    # iOS / desktop / unknown — clean landing page (no auto-redirect)
    return HTMLResponse(_landing_html(deep_path, title, description, image, url, kind))


def _not_found_html(message: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="hi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>CKD</title>
<style>body{{margin:0;background:{BRAND_PURPLE};color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px;}}
.box{{max-width:380px}} h1{{font-size:22px;margin:8px 0 16px}} p{{font-size:14px;opacity:.8}}
a{{display:inline-block;margin-top:24px;padding:14px 28px;background:{BRAND_GOLD};color:{BRAND_PURPLE};border-radius:10px;font-weight:700;text-decoration:none}}</style>
</head><body><div class="box"><h1>{html.escape(message)}</h1><p>शायद यह हटा दिया गया है या लिंक गलत है।</p>
<a href="{PLAY_STORE_URL}">CKD ऐप डाउनलोड करें</a></div></body></html>"""
