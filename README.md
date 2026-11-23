# Zoya - AI Voice Assistant (Web & Android App)

Zoya is a full-stack React + Vite + Express AI Voice Assistant & Companion featuring Gemini Live real-time voice/video, **Owner Voice Lock** (acoustic voiceprint verification with 1st-strike Dhamki, 2nd-strike Phone Lockdown, and Owner Return Briefing), **Advance Settings All-Commands Directory**, Vedic & Western Astrology Studio, Study Mode, Coding Master IDE, Nano Ironman image studio, Website Builder, Anti-Theft protection, and 5 switchable full UI layouts.

All existing web features, UI themes, and Express backend APIs are preserved and packaged with a native **Android Gradle project (`/android`)** and an **automated GitHub Actions APK build & release pipeline (`.github/workflows/android-build.yml`)**.

---

## Project Structure

```text
.
├── .github/
│   └── workflows/
│       └── android-build.yml        # Automated CI build, artifact upload & GitHub Release workflow
├── android/                         # Complete Android Gradle project
│   ├── app/
│   │   ├── build.gradle.kts         # App config (SDK 35, configurable applicationId, signing)
│   │   ├── proguard-rules.pro       # Preserves WebView @JavascriptInterface bridges
│   │   └── src/main/
│   │       ├── AndroidManifest.xml  # Permissions, MainActivity, WakeWord foreground service
│   │       ├── java/com/devid/zoya/assistant/
│   │       │   ├── MainActivity.kt                  # SplashScreen, WebViewAssetLoader, mic/cam/file grants, native bridges
│   │       │   ├── ZoyaAudioRecordWakeWordService.kt # Foreground microphone wake-word service
│   │       │   └── BootReceiver.kt                  # Restores wake-word readiness after reboot
│   │       └── res/                 # Launcher icons (mipmap-*), vector adaptive icon, SplashScreen themes, network config
│   ├── build.gradle.kts             # AGP 8.7.3 + Kotlin 2.0.21
│   ├── gradle.properties            # Configurable package ID, app name, version code/name
│   ├── settings.gradle.kts
│   └── gradle/wrapper/gradle-wrapper.properties
├── public/                          # PWA icons, manifest assets
├── scripts/
│   └── sync-android-assets.mjs      # Copies Vite dist/ -> android/app/src/main/assets/www/ & syncs icons
├── src/
│   ├── utils/apiBase.ts             # Routes /api/* & /api/live cleanly between Web and Android APK WebView
│   ├── components/                  # All preserved Zoya UI layouts & studios
│   └── services/                    # LiveSession, Chat, Astrology, Study, DeviceControl, WakeWord services
├── server.ts                        # Express + WebSocket (/api/live) full-stack backend
├── package.json
└── README.md
```

---

## Android Configuration & Preserved Features

- **Unique & Configurable Package Name**: Default `com.devid.zoya.assistant` configured in `android/gradle.properties`:
  ```properties
  ZOYA_APPLICATION_ID=com.devid.zoya.assistant
  ZOYA_APP_NAME=Zoya AI
  ZOYA_VERSION_CODE=1
  ZOYA_VERSION_NAME=1.0.0
  ```
  Override locally or in CI with `-PZOYA_APPLICATION_ID=com.yourname.zoya`.
- **Launcher Icon & Splash Screen**: Uses adaptive vector + PNG launcher icons (`ic_launcher`, `ic_launcher_round`) and Android 12+ `androidx.core:core-splashscreen` (`Theme.Zoya.Splash` on `#090B10` dark backdrop).
- **Permissions**: `INTERNET`, `ACCESS_NETWORK_STATE`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `CAMERA`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MICROPHONE`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`, `VIBRATE`, `POST_NOTIFICATIONS`.
- **Native Bridges**: `MainActivity.kt` exposes `ZoyaDeviceControlBridge` (real `AudioManager` volume & `WindowManager` brightness), `ZoyaWakeWordBridge`, and `ZoyaNativeAppBridge`.
- **Backend Origin Routing**: Inside the Android APK (`https://appassets.androidplatform.net`), `src/utils/apiBase.ts` automatically routes `/api/*` and `/api/live` requests to your hosted backend URL (`VITE_API_BASE_URL` or the configured production server URL). Set a repository variable `VITE_API_BASE_URL` in GitHub (**Settings > Secrets and variables > Actions > Variables**) if you host the Express backend on your own domain.

---

## GitHub Repository Setup & Push Instructions

1. Create a new empty repository on GitHub (without README/gitignore so there are no merge conflicts).
2. In your local project folder, verify secrets are not committed (`.env` is already ignored by `.gitignore`), then run:

```bash
git init
git add .
git commit -m "Prepare Zoya AI full-stack app with Android Gradle & GitHub Actions APK pipeline"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
git push -u origin main
```

---

## How to Build the Android APK & Google Play App Bundle (.aab)

### Option A: Automated Build via GitHub Actions (Recommended)
Every push to `main` (or `master`), tag push (`v*`), or manual **Run workflow** automatically executes `.github/workflows/android-build.yml`:
1. Installs Node 20 dependencies (`npm ci`), runs `npm run lint`, builds `dist/` (`npm run build`), and syncs assets (`npm run android:sync`).
2. Sets up JDK 17 (`temurin`), Android SDK, and Gradle `8.11.1`.
3. Compiles Debug APK (`gradle :app:assembleDebug`) **and** Google Play App Bundle (`gradle :app:bundleRelease`) inside `android/`.
4. Uploads both **`zoya-ai-android-apk`** (`.apk`) and **`zoya-ai-google-play-aab`** (`.aab`) as GitHub Actions Artifacts, and attaches them to GitHub Releases.

### Option B: Local Build (Android Studio or CLI)
Prerequisites: **JDK 17**, **Android SDK (API 35)**, **Gradle 8.11+**, and **Node.js 20+**.

```bash
# 1. Build web app and sync assets into android/app/src/main/assets/www
npm install
npm run android:prepare

# 2. Build Debug APK (for direct mobile testing)
cd android
gradle :app:assembleDebug --stacktrace --no-daemon

# 3. Build Release AAB (mandatory for Google Play Console)
gradle :app:bundleRelease --stacktrace --no-daemon
```
Output locations:
- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Google Play AAB: `android/app/build/outputs/bundle/release/app-release.aab`

---

## How to Download the APK & AAB from GitHub Actions

1. Open your GitHub repository in a browser.
2. Click the **Actions** tab at the top.
3. Select the latest **Build Zoya Android APK** workflow run (green checkmark).
4. Scroll down to the **Artifacts** section.
5. Download **`zoya-ai-android-apk`** for direct mobile testing (`.apk`) or **`zoya-ai-google-play-aab`** for Google Play Console upload (`.aab`).
6. For mobile testing, extract the `.apk` on your Android phone, allow *Install unknown apps* if prompted, and install.

---

## How to Build & Download from GitHub Releases

GitHub Releases gives you direct `.apk` and `.aab` links:

### Method 1: Push a Version Tag
```bash
git tag v1.0.0
git push origin v1.0.0
```

### Method 2: Manual Workflow Dispatch
1. Go to **Actions** > **Build Zoya Android APK** > **Run workflow**.
2. Keep **Publish APK to GitHub Releases** checked (`true`) and optionally specify `release_tag` (e.g. `v1.0.1`) or custom `application_id`.
3. Click **Run workflow**.

### Downloading the Release Files
1. Open your GitHub repository and click **Releases** (right sidebar) or visit `https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>/releases`.
2. Under the latest release's **Assets**, download `zoya-ai-debug-build-<number>.apk` for phone testing or `zoya-ai-playstore-build-<number>.aab` for Google Play Console.

---

## Required for Google Play Console: Signed Production Release (.aab)
Google Play Console requires your `.aab` to be signed with your Play App Signing upload keystore (`release` config). Add these encrypted **GitHub Repository Secrets** before uploading to Google Play:
- `ANDROID_KEYSTORE_BASE64`: Base64-encoded `.jks`/`.keystore` file (`base64 -w 0 upload-keystore.jks`)
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
