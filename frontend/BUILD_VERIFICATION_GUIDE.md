# 🏗️ EAS Build Verification Guide — CKD Kranti Dal

> **समस्या:** APK बनाने के बाद नए fixes/icons नहीं दिख रहे थे।
> **हल:** हर APK में अब **Build Stamp** embed होता है जो commit hash + timestamp दिखाता है।
> इससे तुरंत verify कर सकते हैं कि APK में सही code है या stale है।

---

## 🎯 Build Identity क्या है?

हर APK में 3 जगह build identity दिखती है:

### 1. **Profile Screen पर (App में) — Visual Stamp**
Login करके `प्रोफ़ाइल` tab खोलें → सबसे नीचे scroll करें:

```
🌿 v1.0.0 (5) · 585456d3 · 2026-05-28 05:30 [PREVIEW]
```

- **Tap करें** → Full details expand (commit, branch, profile, EAS Build ID)
- **Long-press करें** → Clipboard में copy हो जाता है
- अगर `STAMPED_AT_BUILD` या `no-git` दिखे तो ⚠ stamp generate नहीं हुआ → re-install

### 2. **Console Logs (adb logcat) — Startup Banner**
USB से phone connect करके:
```bash
adb logcat *:S ReactNativeJS:V | grep CKD-BUILD
```
Output:
```
[CKD-BUILD] v1.0.0 (vc=5)
[CKD-BUILD] commit=585456d3 branch=main
[CKD-BUILD] profile=preview runner=eas-cloud
[CKD-BUILD] easBuildId=abc-123-...
[CKD-BUILD] builtAt=2026-05-28T05:30:00Z
```

### 3. **EAS Build Logs (Cloud)**
`https://expo.dev/accounts/.../builds/...` पर build के "Install dependencies" step में:
```
[stamp-build] STAMPED ➜ commit=... profile=preview runner=eas-cloud
```

---

## 🚦 Mandatory Build Workflow (कभी skip मत करें)

```bash
# 1. हमेशा latest pull करें
cd ~/path/to/cockroach-kranti-dal
git checkout main
git pull origin main

# 2. Build Doctor चलाएँ (ERROR तो build रोक देता है)
cd frontend
yarn build-doctor

# 3. अगर ⚠ या ✗ हो — पहले fix करें
#    - `git pull` अगर origin से behind हो
#    - `git stash` अगर uncommitted changes हों
#    - android/ या ios/ folder हो तो delete करें

# 4. Stamp को freshen करें (post-install पर automatic, manual run भी कर सकते हैं)
yarn stamp-build

# 5. EAS Build trigger करें
eas build --platform android --profile preview --clear-cache --non-interactive
```

⚠ `--clear-cache` हमेशा use करें ताकि कोई stale dependency न रहे।

---

## 🔍 हर APK Install के बाद Verification Checklist

Install करते ही — **app open करने से पहले** नहीं — Login करके Profile screen पर scroll करें:

| Field | क्या check करना है |
|---|---|
| `commit` | GitHub पर latest commit hash से मैच होना चाहिए (`git log -1 --format=%h --abbrev=8`) |
| `builtAt` | EAS Build के समय के आसपास होना चाहिए (UTC) |
| `profile` | जो profile use किया था (`preview` / `production`) |
| `runner` | `eas-cloud` होना चाहिए (cloud build के लिए) |
| `versionCode` | `app.json` में जितना है उतना ही |

अगर **commit hash GitHub से नहीं मिल रहा** → आपने stale code build किया है। Steps 1-5 दोबारा करें।

---

## 🛠️ Auto-Regeneration Pipeline

Build stamp इन 4 जगह automatically regenerate होता है:

| Trigger | कब चलता है |
|---|---|
| `yarn install` | हर local install पर (postinstall hook) |
| `yarn start` / `yarn android` / `yarn ios` / `yarn web` | Dev server start से पहले |
| `eas-build-pre-install` | EAS Cloud build पर npm install से **पहले** |
| `eas-build-post-install` | EAS Cloud build पर prebuild के **बाद** |

इसलिए **EAS cache** से stamp survive करता है — दोनों pre-install और post-install hooks में run होता है।

---

## 🚨 Common Pitfalls

### ❌ "Local APK में नए icons नहीं दिख रहे"
→ शायद आपके repo में पुराना `android/` folder committed है, जो `expo prebuild` को block कर रहा है।
→ Solution: `rm -rf android ios && git commit -am "remove native folders"` → फिर EAS build।

### ❌ "Build stamp 'STAMPED_AT_BUILD' दिखा रहा है"
→ EAS hooks नहीं चले। शायद आपने node_modules cache reuse किया।
→ Solution: `eas build --clear-cache` use करें।

### ❌ "Commit hash GitHub HEAD से नहीं मिलता"
→ आपने `git pull` से पहले build trigger किया।
→ Solution: हमेशा `yarn build-doctor` पहले चलाएँ।

### ❌ "+dirty suffix दिख रहा है"
→ आपके working tree में uncommitted changes हैं जो APK में चली गई हैं।
→ Solution: `git commit` या `git stash` करें, फिर rebuild।

---

## 🧪 Quick Local Test (बिना APK बनाए)

```bash
cd frontend
yarn stamp-build        # Stamp regenerate होगा
cat src/build-info.ts   # Verify नई values हैं
yarn build-doctor       # सब green है check करें
```

---

## 📋 Files जो Build Identity Pipeline बनाते हैं

| File | भूमिका |
|---|---|
| `frontend/scripts/stamp-build.js` | Build metadata generator |
| `frontend/scripts/build-doctor.js` | Pre-build sanity checker |
| `frontend/src/build-info.ts` | Auto-generated stamp (committed में रहेगा) |
| `frontend/app/_layout.tsx` | Startup पर console banner |
| `frontend/app/(tabs)/profile.tsx` | Profile screen पर visual stamp + expand/copy |
| `frontend/package.json` (scripts) | `postinstall`, `eas-build-pre-install`, `eas-build-post-install` |
| `frontend/eas.json` | Build profiles |

---

**Last Updated:** 2026-05-28
**Maintained by:** CKD Engineering
