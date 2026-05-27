# Cockroach Kranti Dal (CKD) - PRD

## Vision
A Hindi-first civic-action community app for Indian youth. Tagline: **युवा जागे, देश बदले**.
Members join social-good campaigns, report local civic problems, and collaborate to solve them.
Admins manage members, campaigns, content and broadcasts.

## Brand
- Deep Royal Purple `#3A1C71` (header/nav)
- Golden Yellow `#F4B400` (primary CTA)
- Revolutionary Red `#E63329` (energy/urgent)
- Fonts: Hind + Mukta (Google Fonts, Devanagari-optimised)

## Roles
- **Member** — sign up via mobile + OTP, set profile, join campaigns, report/help issues.
- **Admin** — full control panel: dashboard, members, campaigns, moderation, announcements.

## Modules
1. **Onboarding + Auth**: splash → 3 intro slides → mobile + OTP (mock `123456`) → profile setup (name, photo, city, area, age, consent) → tabs.
2. **Home** (होम): featured campaign banner, announcements, ongoing campaigns, recent local issues.
3. **Campaigns** (अभियान): list, detail (cover/desc/date/goal/members), join, update feed with photo/video uploads, likes, comments.
4. **Report Issue** (समस्या): category (सफ़ाई/सड़क/पानी/बिजली/मदद/अन्य), media upload, city/area, status badges (खुली/काम चालू/हल हो गई), support, "मैं मदद करूँगा" volunteer, comments, timeline.
5. **Notifications** (सूचना): in-app centre with mark-as-read.
6. **Profile** (प्रोफ़ाइल): photo/name/city, क्रांति पॉइंट्स, activity tabs (my campaigns/issues/contributions), leaderboard, admin link.
7. **Admin Panel**: dashboard stats + city breakdown, member search/ban/remove, campaign CRUD with cover upload, flag review queue, announcements (all or city-scoped).
8. **Moderation**: `रिपोर्ट करें` flag on every issue/update/comment; admin queue with remove/dismiss.
9. **Static pages**: Community Guidelines, Privacy Policy.

## Gamification
- +5 issue report
- +10 campaign join
- +8 volunteer
- +5 campaign update / issue progress
- +15 reporter when issue resolved
- +20 helper when issue resolved
- City-wise leaderboard

## Tech Stack
- Backend: FastAPI + MongoDB (motor) + JWT auth + Cloudinary for media
- Frontend: Expo Router (React Native) + expo-google-fonts (Hind/Mukta) + expo-image-picker
- Mock OTP (any mobile, OTP=`123456`), pre-seeded admin (`9999999999`) and sample data

## Out of Scope (v1)
- Real-time chat
- Payments
- Live GPS tracking
- Real SMS OTP (Twilio) — swap mock for prod
- Push notifications — in-app only

## Test Credentials
See `/app/memory/test_credentials.md`.
