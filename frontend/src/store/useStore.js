import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Auth ──────────────────────────────────────────────────────────────
      user:         null,
      token:        null,
      refreshToken: null,

      // Primary auth setter — writes tokens to localStorage AND updates in-memory state.
      // Login.jsx must call setAuth (not setUser) after a successful login.
      setAuth: (user, token, refreshToken, sessionId) => {
        localStorage.setItem('vv_token',   token);
        localStorage.setItem('vv_refresh', refreshToken || '');
        localStorage.setItem('vv_user',    JSON.stringify(user));
        if (sessionId) localStorage.setItem('vv_session', sessionId);
        set({ user, token, refreshToken });
      },

      // Alias kept for backward-compatibility with any component that calls setUser.
      // Internally delegates to setAuth with the tokens already in localStorage.
      setUser: (user) => {
        const token        = localStorage.getItem('vv_token')   || null;
        const refreshToken = localStorage.getItem('vv_refresh') || null;
        const sessionId    = localStorage.getItem('vv_session') || null;
        get().setAuth(user, token, refreshToken, sessionId);
      },

      logout: () => {
        localStorage.removeItem('vv_token');
        localStorage.removeItem('vv_refresh');
        localStorage.removeItem('vv_user');
        localStorage.removeItem('vv_session');
        set({ user: null, token: null, refreshToken: null });
      },

      // ── UI ────────────────────────────────────────────────────────────────
      darkMode:    false,
      toggleDark:  () => {
        const next = !get().darkMode;
        document.documentElement.classList.toggle('dark', next);
        set({ darkMode: next });
      },
      sidebarOpen:    true,
      toggleSidebar:  () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      // ── Settings cache ────────────────────────────────────────────────────
      settings:    {},
      setSettings: (s) => set({ settings: s }),

      // ── Cart (POS) ────────────────────────────────────────────────────────
      cart:         [],
      cartCustomer: null,
      cartDiscount: { code: null, amount: 0, type: 'fixed' },

      setCartCustomer: (c) => set({ cartCustomer: c }),

      addToCart: (product, qty = 1) => {
        const cart     = get().cart;
        const existing = cart.find((i) => i.productId === product.id);
        if (existing) {
          set({
            cart: cart.map((i) =>
              i.productId === product.id
                ? { ...i, quantity: Math.min(i.quantity + qty, product.stock) }
                : i
            ),
          });
        } else {
          set({
            cart: [
              ...cart,
              {
                productId: product.id,
                name:      product.name,
                price:     product.price,
                costPrice: product.costPrice || 0,
                quantity:  qty,
                stock:     product.stock,
                image:     product.images ? JSON.parse(product.images)[0] : null,
              },
            ],
          });
        }
      },

      removeFromCart: (productId) =>
        set({ cart: get().cart.filter((i) => i.productId !== productId) }),

      updateCartQty: (productId, qty) => {
        if (qty <= 0) { get().removeFromCart(productId); return; }
        set({
          cart: get().cart.map((i) =>
            i.productId === productId ? { ...i, quantity: Math.min(qty, i.stock) } : i
          ),
        });
      },

      clearCart: () =>
        set({ cart: [], cartCustomer: null, cartDiscount: { code: null, amount: 0, type: 'fixed' } }),

      setCartDiscount: (d) => set({ cartDiscount: d }),

      getCartTotal: () => {
        const { cart, cartDiscount } = get();
        const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
        const discount = cartDiscount.amount || 0;
        return { subtotal, discount, total: Math.max(0, subtotal - discount) };
      },

      // ── Real-time alerts ──────────────────────────────────────────────────
      alerts:     [],
      addAlert:   (a) =>
        set((s) => ({ alerts: [{ id: Date.now(), ...a }, ...s.alerts].slice(0, 10) })),
      clearAlerts: () => set({ alerts: [] }),
    }),
    {
      name:       'vv-store',
      partialize: (state) => ({
        user:         state.user,
        token:        state.token,
        refreshToken: state.refreshToken,
        darkMode:     state.darkMode,
        settings:     state.settings,
      }),
    }
  )
);
