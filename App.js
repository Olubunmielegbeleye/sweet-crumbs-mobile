import 'react-native-url-polyfill/auto';
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Image, ScrollView,
  ActivityIndicator, StyleSheet, Platform, StatusBar, AppState, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// ---- Paste your own two values between the quote marks (same ones as the website) ----
const SUPABASE_URL = 'https://rngdxpvdjulsfesiciqz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_TRtyVb6SIOihB7xufNW7JQ_q_cwxNgX';
// The website address, used to send the confirmation email
const SITE_URL = 'https://bunniesshop-app.netlify.app';

const supabase = SUPABASE_URL.startsWith('YOUR')
  ? null
  : createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

const money = (n) => '$' + Number(n).toFixed(2);
const newId = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });

// ================= App: decides which screen to show =================
function AppInner() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => {
      sub.subscription.unsubscribe();
      appSub.remove();
    };
  }, []);

  if (!supabase) {
    return (
      <View style={[s.screen, s.center]}>
        <Text style={s.title}>🧁 Sweet Crumbs</Text>
        <Text style={s.muted}>Open App.js and paste your SUPABASE_URL and SUPABASE_KEY at the top.</Text>
      </View>
    );
  }
  if (!ready) {
    return (
      <View style={[s.screen, s.center]}>
        <ActivityIndicator color={ACCENT} />
      </View>
    );
  }
  return session ? <Shop session={session} /> : <Login />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppInner />
    </SafeAreaProvider>
  );
}

// ================= Password box with a show/hide eye =================
function PasswordInput({ value, onChangeText }) {
  const [show, setShow] = useState(false);
  const tooShort = value.length > 0 && value.length < 6;
  return (
    <View style={{ width: '100%' }}>
      <View style={[s.passRow, tooShort && { borderColor: '#d33' }]}>
        <TextInput
          style={s.passInput}
          placeholder="Password"
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          value={value}
          onChangeText={onChangeText}
        />
        <TouchableOpacity style={s.eye} onPress={() => setShow(!show)}>
          <Ionicons name={show ? 'eye-outline' : 'eye-off-outline'} size={22} color="#9a8880" />
        </TouchableOpacity>
      </View>
      {tooShort && (
        <View style={s.bubble}>
          <Text style={s.bubbleText}>Password must be at least 6 characters</Text>
        </View>
      )}
    </View>
  );
}

// ================= Login screen =================
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function forgot() {
    setMsg('');
    setInfo('');
    if (!email.trim()) {
      setMsg('Type your email above first, then tap Forgot password.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: SITE_URL + '/',
    });
    if (error) setMsg(error.message);
    else
      setInfo('We have sent a reset link to your email. Open it, choose a new password on the website, then log in here.');
  }

  async function go(mode) {
    setInfo('');
    if (!email.trim() || !password) {
      setMsg('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Your password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    setMsg('');
    const creds = { email: email.trim(), password };
    const { data, error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword(creds)
        : await supabase.auth.signUp(creds);
    setBusy(false);
    if (error) setMsg(error.message);
    else if (mode === 'signup' && !data.session)
      setMsg('Account created. Check your email to confirm it, then log in.');
  }

  return (
    <ScrollView contentContainerStyle={[s.screen, s.center]} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>🧁 Sweet Crumbs</Text>
      <Text style={[s.muted, { marginBottom: 16 }]}>Log in with the same account you use on the website</Text>
      <TextInput
        style={s.input} placeholder="Email" autoCapitalize="none"
        keyboardType="email-address" value={email} onChangeText={setEmail}
      />
      <PasswordInput value={password} onChangeText={setPassword} />
      <TouchableOpacity style={s.btn} onPress={() => go('login')} disabled={busy}>
        <Text style={s.btnText}>{busy ? 'Please wait...' : 'Log in'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => go('signup')} disabled={busy} style={{ marginTop: 14 }}>
        <Text style={s.link}>Create a new account</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={forgot} style={{ marginTop: 14 }}>
        <Text style={s.link}>Forgot password?</Text>
      </TouchableOpacity>
      {!!info && <Text style={s.okText}>{info}</Text>}
      {!!msg && <Text style={s.error}>{msg}</Text>}
    </ScrollView>
  );
}

// ================= Shop (after login) =================
function Shop({ session }) {
  const user = session.user;
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('shop'); // shop | cart | checkout | done
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({});
  const [live, setLive] = useState(false);
  const [orderRef, setOrderRef] = useState('');
  const [emailMsg, setEmailMsg] = useState('');

  const pullCart = useCallback(async () => {
    const { data, error } = await supabase.from('cart_items').select('product_id, quantity');
    if (error) return;
    const c = {};
    data.forEach((r) => { c[r.product_id] = r.quantity; });
    setCart(c);
  }, []);

  useEffect(() => {
    supabase.from('products').select('*').order('id').then(({ data }) => setProducts(data || []));
    pullCart();
    let timer;
    // Live updates: whenever the cart changes anywhere (e.g. on the website), reload it here
    const channel = supabase
      .channel('cart-mobile-' + user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items' }, () => {
        clearTimeout(timer);
        timer = setTimeout(pullCart, 200);
      })
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [user.id, pullCart]);

  async function change(id, delta) {
    const qty = Math.max(0, (cart[id] || 0) + delta);
    setCart((prev) => {
      const n = { ...prev };
      if (qty > 0) n[id] = qty; else delete n[id];
      return n;
    });
    if (qty > 0) {
      await supabase.from('cart_items').upsert({ user_id: user.id, product_id: id, quantity: qty });
    } else {
      await supabase.from('cart_items').delete().eq('user_id', user.id).eq('product_id', id);
    }
  }

  const lines = products.filter((p) => cart[p.id]).map((p) => ({ ...p, qty: cart[p.id] }));
  const total = lines.reduce((sum, l) => sum + Number(l.price) * l.qty, 0);
  const count = lines.reduce((sum, l) => sum + l.qty, 0);

  async function placeOrder(name, email) {
    const id = newId();
    let r = await supabase.from('orders').insert({
      id, customer_name: name, customer_email: email, total, user_id: user.id,
    });
    if (r.error) throw r.error;
    r = await supabase.from('order_items').insert(
      lines.map((l) => ({
        order_id: id, product_id: l.id, product_name: l.name,
        unit_price: Number(l.price), quantity: l.qty,
      }))
    );
    if (r.error) throw r.error;
    await supabase.from('cart_items').delete().eq('user_id', user.id);
    setCart({});
    setOrderRef(id.slice(0, 8).toUpperCase());
    setEmailMsg('Sending your confirmation email...');
    setTab('done');
    try {
      const res = await fetch(SITE_URL + '/.netlify/functions/send-order-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id }),
      });
      setEmailMsg(res.ok ? '✅ A confirmation email is on its way to ' + email + '.'
                         : 'Your order is saved, but we could not send the confirmation email.');
    } catch (e) {
      setEmailMsg('Your order is saved, but we could not send the confirmation email.');
    }
  }

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.brand}>🧁 Sweet Crumbs</Text>
        <Text style={[s.dot, { color: live ? '#2e9e5b' : '#999' }]}>{live ? '● Live' : '○ Offline'}</Text>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={s.link}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'shop' && (
          <FlatList
            data={products}
            keyExtractor={(p) => String(p.id)}
            contentContainerStyle={{ padding: 12 }}
            renderItem={({ item: p }) => (
              <View style={s.card}>
                {p.image_url ? (
                  <Image source={{ uri: p.image_url }} style={s.photo} />
                ) : (
                  <Text style={s.emoji}>{p.emoji}</Text>
                )}
                <Text style={s.name}>{p.name}</Text>
                <Text style={s.muted}>{p.description}</Text>
                <View style={s.row}>
                  <Text style={s.price}>{money(p.price)}</Text>
                  <TouchableOpacity style={s.btnSmall} onPress={() => change(p.id, 1)}>
                    <Text style={s.btnText}>Add to cart{cart[p.id] ? ' (' + cart[p.id] + ')' : ''}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}

        {tab === 'cart' && (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={s.title}>Your cart</Text>
            {!lines.length && <Text style={s.muted}>Your cart is empty.</Text>}
            {lines.map((l) => (
              <View key={l.id} style={s.cartRow}>
                {l.image_url ? <Image source={{ uri: l.image_url }} style={s.thumb} /> : null}
                <Text style={{ flex: 1 }}>{l.name}</Text>
                <TouchableOpacity style={s.qtyBtn} onPress={() => change(l.id, -1)}><Text>−</Text></TouchableOpacity>
                <Text style={{ width: 24, textAlign: 'center' }}>{l.qty}</Text>
                <TouchableOpacity style={s.qtyBtn} onPress={() => change(l.id, 1)}><Text>+</Text></TouchableOpacity>
                <Text style={{ width: 64, textAlign: 'right' }}>{money(Number(l.price) * l.qty)}</Text>
              </View>
            ))}
            <View style={[s.row, { marginVertical: 14 }]}>
              <Text style={s.name}>Total</Text>
              <Text style={s.name}>{money(total)}</Text>
            </View>
            <TouchableOpacity
              style={[s.btn, !lines.length && { opacity: 0.5 }]}
              disabled={!lines.length}
              onPress={() => setTab('checkout')}
            >
              <Text style={s.btnText}>Go to checkout</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {tab === 'checkout' && (
          <Checkout user={user} total={total} onBack={() => setTab('cart')} onPlace={placeOrder} />
        )}

        {tab === 'done' && (
          <View style={[s.center, { flex: 1, padding: 24 }]}>
            <Text style={s.title}>🎉 Thank you!</Text>
            <Text style={{ marginVertical: 8 }}>Your order <Text style={{ fontWeight: '700' }}>{orderRef}</Text> has been received.</Text>
            <Text style={s.muted}>{emailMsg}</Text>
            <TouchableOpacity style={[s.btn, { marginTop: 20 }]} onPress={() => setTab('shop')}>
              <Text style={s.btnText}>Back to shop</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {tab === 'shop' && count > 0 && (
        <TouchableOpacity style={s.checkoutBar} onPress={() => setTab('checkout')}>
          <Text style={s.btnText}>Checkout ({count}) · {money(total)}</Text>
        </TouchableOpacity>
      )}

      <View style={[s.tabs, { paddingBottom: insets.bottom + 4 }]}>
        <TouchableOpacity style={s.tabBtn} onPress={() => setTab('shop')}>
          <Text style={[s.tabText, tab === 'shop' && s.tabOn]}>🛍️ Shop</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.tabBtn} onPress={() => setTab('cart')}>
          <Text style={[s.tabText, (tab === 'cart' || tab === 'checkout') && s.tabOn]}>🛒 Cart ({count})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ================= Checkout form =================
function Checkout({ user, total, onBack, onPlace }) {
  const [name, setName] = useState((user.user_metadata && user.user_metadata.full_name) || '');
  const [email, setEmail] = useState(user.email || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr('');
    if (!name.trim()) return setErr('Please enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Please enter a valid email.');
    setBusy(true);
    try {
      await onPlace(name.trim(), email.trim());
    } catch (e) {
      setErr('Sorry, we could not place your order. Please try again.');
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={onBack}><Text style={s.link}>← Back to cart</Text></TouchableOpacity>
      <Text style={[s.title, { marginTop: 10 }]}>Checkout</Text>
      <Text style={[s.name, { marginBottom: 12 }]}>Total: {money(total)}</Text>
      <TextInput style={s.input} placeholder="Your name" value={name} onChangeText={setName} />
      <TextInput
        style={s.input} placeholder="Your email" autoCapitalize="none"
        keyboardType="email-address" value={email} onChangeText={setEmail}
      />
      <TouchableOpacity style={s.btn} onPress={submit} disabled={busy}>
        <Text style={s.btnText}>{busy ? 'Placing order...' : 'Place order'}</Text>
      </TouchableOpacity>
      {!!err && <Text style={s.error}>{err}</Text>}
    </ScrollView>
  );
}

// ================= Styles =================
const ACCENT = '#d9546f';
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff8f3', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', gap: 12 },
  brand: { flex: 1, fontSize: 18, fontWeight: '700', color: ACCENT },
  dot: { fontSize: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#3b2a25', marginBottom: 8 },
  muted: { color: '#9a8880' },
  link: { color: ACCENT, fontWeight: '600' },
  error: { color: '#d33', marginTop: 12, textAlign: 'center' },
  input: { width: '100%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 16 },
  btn: { width: '100%', backgroundColor: ACCENT, padding: 14, borderRadius: 10, alignItems: 'center' },
  btnSmall: { backgroundColor: ACCENT, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 12 },
  photo: { width: '100%', height: 170, borderRadius: 10, marginBottom: 8 },
  emoji: { fontSize: 48, textAlign: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: '#3b2a25' },
  price: { fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  cartRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', padding: 10, borderRadius: 10, marginBottom: 8 },
  thumb: { width: 36, height: 36, borderRadius: 8 },
  qtyBtn: { backgroundColor: '#f3e7e1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  tabBtn: { flex: 1, padding: 14, alignItems: 'center' },
  tabText: { color: '#9a8880', fontWeight: '600' },
  tabOn: { color: ACCENT },
  passRow: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, marginBottom: 10 },
  passInput: { flex: 1, padding: 12, fontSize: 16 },
  eye: { paddingHorizontal: 14, paddingVertical: 10 },
  bubble: { backgroundColor: '#fff1f1', borderWidth: 1, borderColor: '#f1b4b4', borderRadius: 8, padding: 8, marginBottom: 10 },
  bubbleText: { color: '#b42318', fontSize: 13 },
  okText: { color: '#2e7d32', marginTop: 12, textAlign: 'center' },
  checkoutBar: { backgroundColor: ACCENT, marginHorizontal: 12, marginBottom: 8, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
