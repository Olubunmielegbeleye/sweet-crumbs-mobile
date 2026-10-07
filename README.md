# Sweet Crumbs: Android app

The mobile version of the Sweet Crumbs cake shop (Lesson 2 website). It uses the **same Supabase
back end as the website**: the same login, the same products, the same orders and the same cart.

- Website: https://bunniesshop-app.netlify.app
- APK download: https://drive.google.com/file/d/1Ia3uCcHHofrnaisIf7sY00jtMmFZ_amD/view?usp=sharing
- Demo video: (add your video link here)

## What it does
- Log in or create an account with email and password (same accounts as the website)
- Show/hide password with an eye icon; warning if the password is under 6 characters
- Forgot password (sends a reset link; the new password is chosen on the website)
- Browse the cakes with photos loaded from Supabase
- Add to cart, change quantities, see the total
- **Live cart:** items added on the website appear in the app straight away, and items added in the
  app appear on the website (Supabase Realtime on the `cart_items` table)
- Checkout: saves the order in Supabase and triggers the Mailgun confirmation email

## Built with
Expo + React Native, `@supabase/supabase-js`, AsyncStorage (keeps the user logged in),
`react-native-url-polyfill`, `@expo/vector-icons`, `react-native-safe-area-context`.

## How the cart sync works
1. When you are logged in, your cart is stored in the `cart_items` table (one row per cake).
2. Every change (add, remove, change quantity) is written to that table.
3. Both the website and the app subscribe to changes on the table. When one device changes the cart,
   Supabase tells the other, which reloads the cart.
4. Row Level Security makes sure each user can only read and change their own cart.

## Run it
```
npm install
npx expo start
```
Scan the QR code with the Expo Go app, or build an APK:

```
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

## Files
- `App.js`: the whole app (login, shop, cart, checkout)
- `eas.json`: build settings (the `preview` profile makes an installable `.apk`)
- `app.json`, `package.json`: Expo project settings

Only the public Supabase URL and publishable key are used in this app. No secret keys are stored here.
