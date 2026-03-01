# Commands & Deployment

## Web App
- **Dev Server:** `npm run dev` - Start local development server
- **Build:** `npm run build` - TypeScript check + Vite build (run after major edits)
- **Lint:** `npm run lint` - Check for code quality issues
- **Preview:** `npm run preview` - Preview production build locally
- **Deploy:** `npx firebase deploy --only hosting` - Deploy to Firebase

## Mobile App
- **Start:** `cd mobile && npx expo start` - Start Expo dev server
- **Android:** `cd mobile && npx expo start --android` - Run on Android
- **iOS:** `cd mobile && npx expo start --ios` - Run on iOS simulator
- **Install:** `cd mobile && npm install` - Install mobile dependencies
- **Release Build:** `cd mobile/android && ./gradlew bundleRelease` - Build release AAB (app bundle) with Gradle (NOT Expo EAS)
- **Debug APK:** `cd mobile/android && ./gradlew assembleDebug` - Build debug APK with Gradle

## Android Build Checklist
When building a new Android release, **always**:
1. Increment `versionCode` in `mobile/android/app/build.gradle` (integer, e.g. 4 → 5)
2. Update `versionName` in `mobile/android/app/build.gradle` to match (e.g. "1.0.0-beta.5")
3. Update `version` in `mobile/app.json` to match the versionName
4. Build an **AAB** (app bundle) with `./gradlew bundleRelease`, NOT an APK
5. Output location: `mobile/android/app/build/outputs/bundle/release/app-release.aab`

## iOS Build & Deployment

### Prerequisites (one-time setup)
1. **Apple Developer account** — enroll at developer.apple.com ($99/year)
2. **App Store Connect** — create an app record with bundle ID `com.teamhub.mobile`
3. **APNs key** — generate in Apple Developer portal (Certificates > Keys > + > Apple Push Notifications service), then upload to Expo: `cd mobile && eas credentials --platform ios`
4. **Generate native project** — `cd mobile && npx expo prebuild --platform ios` (creates `ios/` directory)

### Build Commands
- **Simulator build:** `cd mobile && eas build --platform ios --profile development`
- **Internal test build:** `cd mobile && eas build --platform ios --profile preview`
- **Production build:** `cd mobile && eas build --platform ios --profile production`
- **Submit to App Store:** `cd mobile && eas submit --platform ios`

### iOS Release Checklist
When building a new iOS release, **always**:
1. Increment `buildNumber` in `mobile/app.json` under `expo.ios` (e.g. "1" → "2")
2. Update `version` in `mobile/app.json` to match the release version
3. Build with `eas build --platform ios --profile production`
4. Submit with `eas submit --platform ios`

## App Store Test Account

Shared test account for Apple and Google review teams:

- **Email:** appstorecredentials@apptest.com
- **Password:** Testaccount2526
