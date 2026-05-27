# 📱 CKD Android APK — Build Guide (हिंदी)

यह guide बताती है कि अपने फ़ोन पर install करने वाला Android APK कैसे बनाएँ।

## ज़रूरी चीज़ें
1. **Computer** (Windows / Mac / Linux) — कोई भी
2. **Node.js 20+** installed (https://nodejs.org पर जाकर LTS version डाउनलोड करें)
3. **एक मुफ़्त Expo account** — `https://expo.dev/signup` पर ईमेल से बनाएँ
4. **20–25 मिनट का समय** (cloud build के लिए)

---

## Step-by-Step

### Step 1 — Code अपने computer पर लाएँ
Emergent editor में ऊपर "**Save to GitHub**" button दबाएँ → एक GitHub repo बन जाएगा।
फिर अपने computer के Terminal में:

```bash
git clone <आपका GitHub repo URL>
cd <repo folder>/frontend
```

### Step 2 — Dependencies install करें
```bash
npm install -g eas-cli@latest
yarn install
```

### Step 3 — Expo में login करें
```bash
eas login
```
ईमेल + password भरें (वही जो आपने `expo.dev/signup` पर बनाया था)।

### Step 4 — Project को EAS से connect करें (पहली बार)
```bash
eas init
```
यह `app.json` में आपका Expo project ID auto-add करेगा।
पूछे तो "Yes" दबाएँ।

### Step 5 — APK build start करें
```bash
eas build --platform android --profile preview
```
- कुछ सवाल पूछे जा सकते हैं:
  - "Generate a new Android keystore?" → **Yes** दबाएँ (Expo अपनेआप keystore बना देगा — आपको कुछ नहीं करना)
- अब build cloud पर चलने लगेगा। आपको एक URL दिखेगा जैसे:
  `https://expo.dev/accounts/.../projects/ckd-kranti-dal/builds/abc123`
- वहाँ live status देख सकते हैं।

### Step 6 — APK download करें
- ~15–25 मिनट बाद build "**Finished**" हो जाएगा।
- आपको ईमेल आएगा "Your Android build is ready" जिसमें **Download** button होगा।
- या उसी URL पर जाकर **"Download"** button दबाएँ → `.apk` file download हो जाएगी (~50 MB)।

### Step 7 — फ़ोन पर install करें
1. APK file को अपने फ़ोन पर भेजें (WhatsApp / Drive / USB cable से)।
2. फ़ोन पर file tap करें।
3. Android पूछेगा "**Allow install from unknown sources?**" → Settings में जाकर allow करें → वापस आकर **Install** दबाएँ।
4. App खुलेगी → admin login: `ckdindia.work@gmail.com` / `INdr@#1234`।

### Step 8 — दोस्तों को बाँटें
उन्हें या तो वही APK file भेजें, या Expo dashboard वाला download link share करें।

---

## ज़रूरी notes
- **Backend URL**: APK में `EXPO_PUBLIC_BACKEND_URL=https://grassroot-action.preview.emergentagent.com` hard-bake हो जाएगा। यह URL जब तक Emergent पर project चल रहा है, तब तक काम करेगा।
- **हर नए build के लिए**: `app.json` में `versionCode` को 1 → 2 → 3 बढ़ाते जाएँ, फिर वही `eas build` command चलाएँ।
- **पैसा?** Expo की free tier में महीने में 30 builds मुफ़्त हैं — आपके लिए काफ़ी हैं।

---

## अगर कुछ अटक जाए
- `eas login` में problem → `eas logout` करके फिर login करें।
- Build fail हो जाए → expo.dev dashboard पर "Logs" tab में error देखें, मुझे screenshot भेजें, मैं ठीक करूँगा।
- Google sign-in काम न करे → वह web पर ठीक चलता है, native APK में Emergent auth flow Expo deep link पर depend करता है, यह fully test करने के लिए कुछ extra config लग सकती है — first build के बाद बताइए।
