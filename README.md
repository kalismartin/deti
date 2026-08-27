# Děti

Rodinná aplikace pro rozvrh a vyzvedávání dětí. Návrh viz [DESIGN.md](DESIGN.md).

- **Web/PWA**: Next.js (statický export) + Tailwind, česky
- **Backend**: Firebase — Auth (Google), Firestore, Cloud Functions (upozornění), FCM (push), Hosting
- **Doména**: `deti.martinkalis.com`

## Lokální vývoj (Firebase Emulator Suite)

```bash
npm install
npm run emulators          # spustí Auth + Firestore + Functions emulátory (potřebuje Javu)
# v druhém terminálu:
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed   # testovací data
NEXT_PUBLIC_USE_EMULATORS=1 npm run dev               # aplikace na http://localhost:3000
```

Testy bezpečnostních pravidel (proti běžícím emulátorům, po seedu):

```bash
node scripts/test-rules.mjs
```

Přihlášení v emulátoru: tlačítko „Přihlásit se přes Google“ otevře falešný
Google login emulátoru — zadej e-mail `kalis.martin@gmail.com`, aby fungovalo
tlačítko „Jsem vlastník rodiny – stát se správcem“ (viz `firestore.rules`).
Ostatní účty se připojují přes pozvánku; testovací odkaz:
`http://localhost:3000/pozvanka/?token=test-invite-token`

## Nastavení produkce (jednorázově)

1. **Založ Firebase projekt** na <https://console.firebase.google.com> a přepni na
   plán **Blaze** (nutné pro plánované Cloud Functions; při rodinném provozu ~0 Kč).
2. **Authentication → Sign-in method**: povol **Google**.
3. **Firestore Database**: vytvoř databázi (region `europe-west3` nebo podobný).
4. **Project settings → Your apps**: přidej **webovou aplikaci**, zkopíruj config do
   `.env.local` (viz `.env.example`).
5. **Project settings → Cloud Messaging → Web push certificates**: vygeneruj klíč
   a vlož do `NEXT_PUBLIC_FB_VAPID_KEY`.
6. V `.firebaserc` nastav skutečné project ID (místo `deti-app`).
7. V `firestore.rules` zkontroluj vlastníkův e-mail (funkce `isOwnerEmail`) —
   tento účet se může stát prvním správcem.
8. Deploy:

   ```bash
   npx firebase login
   npm run deploy          # build + hosting + rules + functions
   ```

9. **Hosting → Add custom domain**: `deti.martinkalis.com`, nastav DNS záznamy
   podle průvodce.
10. **Authentication → Settings → Authorized domains**: přidej `deti.martinkalis.com`.
11. Testovací data (volitelně): stáhni service account klíč
    (Project settings → Service accounts) jako `service-account.json` a spusť
    `GOOGLE_APPLICATION_CREDENTIALS=service-account.json NEXT_PUBLIC_FB_PROJECT_ID=<id> npm run seed`.
    Reálná data pak zadávej rovnou v aplikaci (Správa), zálohuj přes Export JSON.

## První přihlášení a rodina

1. Vlastník se přihlásí Googlem → „Jsem vlastník rodiny – stát se správcem“.
2. Ve **Správa → Členové a pozvánky** vytvoří pozvánky a pošle odkazy rodině.
3. Po připojení přiřadí role: **Dospělý** (vyzvedává), **Dítě** (jen prohlíží).
4. Každý dospělý si na svém telefonu zapne notifikace zvonečkem 🔔 v hlavičce
   (na iPhonu je potřeba aplikaci nejdřív přidat na plochu).
5. Děti si aplikaci přidají na plochu a na kartě „📍 Moje poloha“ zapnou sdílení
   polohy — aktualizuje se, jen když mají aplikaci otevřenou (webová aplikace
   neumí sledovat polohu na pozadí; to by vyžadovalo nativní aplikaci). Tlačítko
   „Jsem tady!“ pošle polohu okamžitě. Rodiče polohu vidí na hlavní stránce.

## Upozornění (Cloud Functions)

Plánovaná funkce `alertLadder` běží každých 5 minut (6:00–19:00, Europe/Prague):

1. v čase `unclaimedAt` (výchozí 11:00) — dnes nikdo nevyzvedává → všem dospělým,
2. `urgentBeforeMin` (90) minut před začátkem okna — stále nikdo → všem dospělým,
3. na konci okna — zamluveno, ale nepotvrzeno → všem dospělým,
4. `nudgeBeforeMin` (90) minut před vyzvednutím — tichá připomínka tomu, kdo vyzvedává.

Časy a zapnutí/vypnutí se nastavují v aplikaci: **Správa → Upozornění**.
Funkce `onDayChange` navíc okamžitě hlásí zrušení či převzetí vyzvednutí.

## Android „aplikace“ (volitelně, později)

Web je instalovatelná PWA. Pokud bude potřeba klasické APK pro prarodiče,
zabalí se nasazený web přes [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)
(TWA) — stejný kód, žádná druhá aplikace.
