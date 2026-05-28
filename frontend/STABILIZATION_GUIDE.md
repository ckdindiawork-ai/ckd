# 🔧 APK Build Issue — Definitive Stabilization Guide

## समस्या का असली कारण (Root Cause)

**App Preview में सब सही दिखता है, लेकिन APK में पुराना दिखता है।** यह बताता है कि:

1. ✅ GitHub पर latest code सही है (verified)
2. ✅ Emergent App Preview latest code use कर रहा है
3. ❌ **आपके computer का local clone latest code पर नहीं है** — `git pull` या तो हो नहीं रहा, या merge conflict में फँसा है, या आपका local clone पुराने branch पर है, या उसमें uncommitted local changes हैं (firebase.ts आदि) जो overwrite कर रहे हैं

## Verification Method (अब हम 100% जान सकते हैं)

मैंने Profile screen के सबसे नीचे एक **build identifier** जोड़ दिया है:
```
v1.0.0 · 355a9b89 · 2026-05-28 05:14
```

- अगर APK install करने के बाद Profile screen में यह **latest commit hash** दिखे — सब सही है
- अगर **पुराना hash** या `STAMPED_AT_BUILD` दिखे — APK में पुराना code है

## ज़रूरी Clean Rebuild Procedure (पहली बार ध्यान से करें)

अपने computer पर VS Code terminal में:

### Step 1 — अपनी local state देखें
```bash
cd ckd
git status
```
**अगर "modified" या "untracked" files हैं — रुकिए, मुझे screenshot भेजिए। उनको हटाए बिना git pull नहीं चलेगा।**

### Step 2 — सब local changes हटाएँ (CAREFUL!)
```bash
git stash --include-untracked   # आपके सारे local changes safe जगह save हो जाएँगे
git fetch origin
git reset --hard origin/main    # local repo को GitHub की latest state पर सेट
```

### Step 3 — Verify
```bash
git log --oneline | head -5
```
यह दिखना चाहिए (top पर):
```
355a9b8 Replace placeholder icon with official CKD cockroach logo (high-quality 1024x1024)
976d5b9 Fix giant vertical pills bug + web-compatible delete confirmation
16ac82d env.example: document Resend keys + verified ckdindia.com sender
2200237 Password reset: 6-digit OTP via Resend email + polished Hindi reset screen
a5fe422 Admin panel UI polish: compact tab pills + visible edit/delete buttons
```

अगर **यह commits नहीं दिखें — आपका local repo अब भी पुराना है।** मुझे बताइए।

### Step 4 — node_modules पूरा सफ़ाई
```bash
cd frontend
rm -rf node_modules
rm -rf .expo
rm -rf android ios          # अगर पहले prebuild की थी तो ये भी हटाएँ
yarn install
```

### Step 5 — Build with CACHE CLEAR (ज़रूरी!)
```bash
eas build --platform android --profile preview --clear-cache
```

`--clear-cache` से EAS server पर भी पुरानी build cache **forcibly हट जाएगी** — यह सबसे important flag है।

### Step 6 — Build URL note कीजिए
EAS build start करते ही एक URL देगा जैसे:
```
✔ Build details: https://expo.dev/.../builds/abc123
```
उस URL पर जाकर **"Source code"** tab में देखें कि **commit hash क्या है** — अगर वहाँ `355a9b89` (या उसके बाद का कोई) hash है — सही है। अगर पुराना hash है — local repo अभी भी पुराना है।

### Step 7 — APK install करके verify
- फ़ोन पर पुरानी APK uninstall करें
- फ़ोन reboot करें (Android icon cache clear के लिए)
- नई APK install करें
- App खोलें → Profile tab में नीचे scroll करें → **build stamp देखें**
- अगर `355a9b89` (या नया) commit + आज का date दिखे — verification complete ✅

## अगर तब भी पुराना APK बने — diagnostics

अगले अपडेट के लिए यह info भेजिए:
1. `git log --oneline | head -5` का output
2. `git status` का output
3. EAS build URL और उसमें दिखाया "commit" hash
4. APK install के बाद Profile की build stamp का screenshot

मुझे यह 4 चीज़ें मिलते ही **exact problem** बता सकता हूँ।

## Bonus: Auto-stamp via EAS Hook

`package.json` में add किया है:
```json
"eas-build-pre-install": "node ./scripts/stamp-build.js"
```

यह automatically हर EAS build से पहले चलकर `src/build-info.ts` में current commit लिख देता है। **आपको कुछ नहीं करना** — बस normal `eas build` चलाएँ, यह background में होगा।
