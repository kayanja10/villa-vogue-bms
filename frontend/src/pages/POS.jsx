import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, Minus, Trash2, User, Tag, CreditCard, Smartphone,
  Banknote, CheckCircle, X, ShoppingCart, Package, Percent,
  Wifi, WifiOff, RefreshCw, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { products as productApi, orders, customers, discounts, categories } from '../lib/api';
import { useStore } from '../store/useStore';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote, color: '#2d7a4f' },
  { id: 'mtn_momo', label: 'MTN MoMo', icon: Smartphone, color: '#f5a623' },
  { id: 'airtel_money', label: 'Airtel', icon: Smartphone, color: '#e02020' },
  { id: 'card', label: 'Card', icon: CreditCard, color: '#2980b9' },
];

export default function POS() {
  const qc = useQueryClient();
  const {
    cart, addToCart, removeFromCart, updateCartQty, clearCart,
    getCartTotal, cartCustomer, setCartCustomer, cartDiscount, setCartDiscount,
  } = useStore();

  const { isOnline, pendingCount, isSyncing, syncPendingOrders } = useOfflineQueue();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [step, setStep] = useState('cart');
  const [lastOrder, setLastOrder] = useState(null);
  const [lastCart, setLastCart] = useState([]);
  const [momoPhone, setMomoPhone] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustDrop, setShowCustDrop] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [manualDiscountValue, setManualDiscountValue] = useState('');
  const [manualDiscountType, setManualDiscountType] = useState('fixed');

  const receiptRef = useRef();

  const { data: productsData, isLoading: loadingProds } = useQuery({
    queryKey: ['products-pos', search, catFilter],
    queryFn: () => productApi.list({ search, category: catFilter, limit: 80 }).then(r => r.data),
    keepPreviousData: true,
    // Use cached data when offline
    staleTime: isOnline ? 30000 : Infinity,
  });

  const { data: catsData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.list().then(r => r.data),
    staleTime: isOnline ? 60000 : Infinity,
  });

  const { data: custResults } = useQuery({
    queryKey: ['cust-srch', customerSearch],
    queryFn: () => customers.list({ search: customerSearch, limit: 5 }).then(r => r.data),
    enabled: customerSearch.length > 1 && isOnline,
  });

  const createOrder = useMutation({
    mutationFn: (d) => orders.create(d),
    onSuccess: (res) => {
      setLastOrder(res.data);
      setLastCart([...cart]);
      setStep('success');
      clearCart();
      setDiscountCode('');
      setManualDiscountValue('');
      qc.invalidateQueries(['dashboard']);
      qc.invalidateQueries(['products-pos']);
      qc.invalidateQueries(['products']);
      toast.success('Sale completed!');
    },
    onError: async (err) => {
      // If network error, save offline
      if (!navigator.onLine || err.code === 'ERR_NETWORK') {
        await handleOfflineCheckout();
      } else {
        toast.error(err.response?.data?.error || 'Order failed');
      }
    },
  });

  const applyDiscount = useMutation({
    mutationFn: () => discounts.validate({ code: discountCode, orderTotal: subtotal }),
    onSuccess: (res) => {
      setCartDiscount({ code: discountCode, amount: res.data.discountAmount, type: res.data.type });
      toast.success('Discount applied!');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Invalid code'),
  });

  const applyManualDiscount = () => {
    const val = parseFloat(manualDiscountValue);
    if (!val || val <= 0) return toast.error('Enter a valid discount amount');
    if (manualDiscountType === 'percent') {
      if (val > 100) return toast.error('Percentage cannot exceed 100%');
      const amount = Math.round((subtotal * val) / 100);
      setCartDiscount({ code: `${val}% off`, amount, type: 'percent' });
      toast.success(`${val}% discount applied!`);
    } else {
      if (val > subtotal) return toast.error('Discount cannot exceed subtotal');
      setCartDiscount({ code: `UGX ${val.toLocaleString()} off`, amount: val, type: 'fixed' });
      toast.success(`UGX ${val.toLocaleString()} discount applied!`);
    }
  };

  const removeDiscount = () => {
    setCartDiscount({ code: '', amount: 0, type: 'fixed' });
    setManualDiscountValue('');
    setDiscountCode('');
  };

  const { subtotal, discount, total } = getCartTotal();

  const buildOrderPayload = () => ({
    customerId: cartCustomer?.id,
    customerName: cartCustomer?.name || 'Walk-in Customer',
    customerPhone: cartCustomer?.phone || momoPhone || '',
    items: cart.map(i => ({
      productId: i.productId, name: i.name,
      price: i.price, costPrice: i.costPrice || 0, quantity: i.quantity,
    })),
    subtotal, discount, discountType: cartDiscount.type || 'fixed',
    total, paymentMethod: payMethod, orderSource: 'pos',
  });

  // Handle offline checkout — save to IndexedDB
  const handleOfflineCheckout = async () => {
    const { useOfflineQueue: useQ } = await import('../hooks/useOfflineQueue');
    const payload = buildOrderPayload();
    try {
      const { savePendingOrder } = await import('../hooks/useOfflineQueue');
    } catch (e) {}

    // Save to IndexedDB directly
    const { saveOffline } = useOfflineQueue();

    const offlineResult = {
      orderNumber: `OFF-${Date.now()}`,
      total,
      createdAt: new Date().toISOString(),
      customerName: cartCustomer?.name || 'Walk-in Customer',
      paymentMethod: payMethod,
      items: [...cart],
      offline: true,
    };

    setLastOrder(offlineResult);
    setLastCart([...cart]);
    setStep('success');
    clearCart();
    setDiscountCode('');
    setManualDiscountValue('');
  };

  const handleCheckout = () => {
    if (!cart.length) return toast.error('Cart is empty');
    if ((payMethod === 'mtn_momo' || payMethod === 'airtel_money') && !momoPhone) {
      return toast.error('Enter phone number');
    }

    if (!isOnline) {
      // Save offline directly without attempting API call
      handleOfflineSave();
      return;
    }

    createOrder.mutate(buildOrderPayload());
  };

  const handleOfflineSave = async () => {
    const payload = buildOrderPayload();
    try {
      // Open IndexedDB and save
      const request = indexedDB.open('villavogue_offline', 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('pending_orders')) {
          db.createObjectStore('pending_orders', { keyPath: 'localId', autoIncrement: true });
        }
      };
      request.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction('pending_orders', 'readwrite');
        const store = tx.objectStore('pending_orders');
        const offlineOrderNumber = `OFF-${Date.now()}`;
        store.add({ ...payload, status: 'pending', savedAt: new Date().toISOString(), offlineOrderNumber });
        tx.oncomplete = () => {
          const offlineResult = {
            orderNumber: offlineOrderNumber,
            total, createdAt: new Date().toISOString(),
            customerName: cartCustomer?.name || 'Walk-in Customer',
            paymentMethod: payMethod, items: [...cart], offline: true,
          };
          setLastOrder(offlineResult);
          setLastCart([...cart]);
          setStep('success');
          clearCart();
          setDiscountCode('');
          setManualDiscountValue('');
          toast.success(`📦 Order ${offlineOrderNumber} saved offline. Will sync when online.`, { duration: 5000 });
        };
      };
    } catch (err) {
      toast.error('Failed to save offline order');
    }
  };

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=380,height=650');
    const itemRows = lastCart.map(i =>
      `<tr><td>${i.name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">UGX ${(i.price * i.quantity).toLocaleString()}</td></tr>`
    ).join('');
    const changeAmt = amountPaid ? Math.max(0, parseFloat(amountPaid) - lastOrder.total) : 0;
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;padding:15px;max-width:320px}
    .c{text-align:center}.b{font-weight:bold}.hr{border:none;border-top:1px dashed #000;margin:8px 0}
    table{width:100%;border-collapse:collapse}td{padding:2px 0}img{display:block;margin:0 auto 8px;max-width:80px;max-height:80px;object-fit:contain}
    .total{font-size:14px;font-weight:bold}.foot{font-size:11px}
    .offline-badge{background:#92400e;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px}</style></head><body>
    <div class="c"><img src="${window.location.origin}/logo.png" onerror="this.style.display='none'" />
    <div class="b" style="font-size:16px">VILLA VOGUE FASHIONS</div>
    <div>Where Fashion Finds a Home</div><div>Tel: 0782 860372 / 0745 903189</div><div>Kampala, Uganda</div></div>
    <hr class="hr"/>
    ${lastOrder?.offline ? '<div class="c"><span class="offline-badge">OFFLINE ORDER - PENDING SYNC</span></div><hr class="hr"/>' : ''}
    <table><tr><td>Receipt:</td><td class="b" style="text-align:right">${lastOrder?.orderNumber}</td></tr>
    <tr><td>Date:</td><td style="text-align:right">${new Date(lastOrder?.createdAt).toLocaleString()}</td></tr>
    ${lastOrder?.customerName && lastOrder?.customerName !== 'Walk-in Customer' ? `<tr><td>Customer:</td><td style="text-align:right">${lastOrder.customerName}</td></tr>` : ''}
    </table><hr class="hr"/>
    <table><tr><td class="b">ITEM</td><td class="b" style="text-align:center">QTY</td><td class="b" style="text-align:right">AMOUNT</td></tr>
    <tr><td colspan="3"><hr class="hr"/></td></tr>${itemRows}</table>
    <hr class="hr"/>
    <table>
    <tr><td>Subtotal:</td><td style="text-align:right">UGX ${subtotal.toLocaleString()}</td></tr>
    ${discount > 0 ? `<tr><td>Discount:</td><td style="text-align:right">-UGX ${discount.toLocaleString()}</td></tr>` : ''}
    <tr><td class="b total">TOTAL:</td><td class="b total" style="text-align:right">UGX ${lastOrder?.total?.toLocaleString()}</td></tr>
    ${payMethod === 'cash' && amountPaid ? `<tr><td>Paid:</td><td style="text-align:right">UGX ${parseFloat(amountPaid).toLocaleString()}</td></tr>
    <tr><td class="b">Change:</td><td class="b" style="text-align:right">UGX ${changeAmt.toLocaleString()}</td></tr>` : ''}
    </table>
    <hr class="hr"/>
    <div class="c foot">
    <p>Payment: ${payMethod?.replace(/_/g, ' ').toUpperCase()}</p>
    <br/><p>Thank you for shopping at Villa Vogue!</p>
    <p>Where Fashion Finds a Home</p>
    <p style="margin-top:8px;font-size:10px">Powered by Villa Vogue BMS</p>
    </div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 500);
  };

  const prods = productsData?.products || productsData || [];
  const cats = catsData || [];

  // ── SUCCESS SCREEN ──────────────────────────────────────────────────────────
  if (step === 'success' && lastOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 animate-fade-in">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${lastOrder.offline ? 'bg-amber-100' : 'bg-green-100'}`}>
          {lastOrder.offline
            ? <WifiOff size={36} className="text-amber-600" />
            : <CheckCircle size={36} className="text-green-500" />}
        </div>
        <h2 className="text-2xl font-heading font-bold mb-1">
          {lastOrder.offline ? 'Saved Offline!' : 'Sale Complete!'}
        </h2>
        <p className="text-gray-500 mb-1">{lastOrder.orderNumber}</p>
        {lastOrder.offline && (
          <p className="text-amber-600 text-sm mb-3 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
            ⚠️ This order is saved locally and will sync automatically when you're back online.
          </p>
        )}
        <p className="text-3xl font-bold text-[#A8824A] mb-1">UGX {lastOrder.total?.toLocaleString()}</p>
        <p className="text-gray-400 text-sm mb-6">{lastOrder.customerName} · {lastOrder.paymentMethod?.replace(/_/g, ' ')}</p>

        {payMethod === 'cash' && amountPaid && !lastOrder.offline && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-3 mb-6">
            <p className="text-sm text-green-700 font-semibold">
              Change: UGX {Math.max(0, parseFloat(amountPaid) - lastOrder.total).toLocaleString()}
            </p>
          </div>
        )}

        <div className="flex gap-3 flex-wrap justify-center">
          <button onClick={handlePrint} className="btn-secondary py-2.5 px-5">🖨️ Print Receipt</button>
          <button onClick={() => {
            const phone = cartCustomer?.phone || momoPhone;
            if (phone) {
              const intl = phone.replace(/\D/g, '').replace(/^0/, '256');
              const msg = `Thank you for shopping at Villa Vogue Fashions! 🛍️\nReceipt: ${lastOrder.orderNumber}\nTotal: UGX ${lastOrder.total?.toLocaleString()}\nWhere Fashion Finds a Home 👗`;
              window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`, '_blank');
            } else toast('No phone number for this customer');
          }} className="btn-secondary py-2.5 px-5">💬 WhatsApp Receipt</button>
          <button onClick={() => { setStep('cart'); setLastOrder(null); setAmountPaid(''); }}
            className="btn-primary py-2.5 px-5">New Sale</button>
        </div>
      </div>
    );
  }

  // ── MAIN POS ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 animate-fade-in -mx-4 -mt-4 px-4 pt-4">

      {/* ── LEFT: Product Grid ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Search + filters */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9 py-2.5 text-sm w-full" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setCatFilter('')} className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${!catFilter ? 'bg-[#C9A96E] text-white border-[#C9A96E]' : 'border-gray-200 text-gray-500 hover:border-[#C9A96E]'}`}>All</button>
            {cats.map(c => (
              <button key={c.id} onClick={() => setCatFilter(c.name)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${catFilter === c.name ? 'bg-[#C9A96E] text-white border-[#C9A96E]' : 'border-gray-200 text-gray-500 hover:border-[#C9A96E]'}`}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Offline banner */}
        {!isOnline && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 mb-3 text-sm">
            <WifiOff size={16} />
            <span className="font-medium">Offline mode</span>
            <span className="text-amber-600">— showing cached products. Orders will sync when online.</span>
            {pendingCount > 0 && <span className="ml-auto text-xs bg-amber-200 px-2 py-0.5 rounded-full">{pendingCount} pending</span>}
          </div>
        )}

        {/* Online — pending sync banner */}
        {isOnline && pendingCount > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-2.5 mb-3 text-sm">
            <Wifi size={16} />
            <span>{pendingCount} offline order{pendingCount > 1 ? 's' : ''} pending sync</span>
            <button onClick={syncPendingOrders} className="ml-auto flex items-center gap-1 text-xs bg-blue-100 hover:bg-blue-200 px-3 py-1 rounded-full font-medium transition-colors">
              <RefreshCw size={11} /> Sync Now
            </button>
          </div>
        )}

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto">
          {loadingProds && isOnline ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {[...Array(10)].map((_, i) => <div key={i} className="card h-28 animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {prods.map(p => {
                const inCart = cart.find(c => c.productId === p.id);
                const outOfStock = p.stock === 0;
                return (
                  <button key={p.id} onClick={() => { if (!outOfStock) addToCart(p); else toast.error('Out of stock'); }}
                    disabled={outOfStock}
                    className={`card p-3 text-left transition-all active:scale-95 relative ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:border-[#C9A96E]/30'} ${inCart ? 'border-[#C9A96E] border-2' : ''}`}>
                    {/* Stock badge */}
                    <div className={`absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full
                      ${outOfStock ? 'bg-red-100 text-red-600' : p.stock <= p.lowStockThreshold ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {outOfStock ? 'Out' : p.stock <= p.lowStockThreshold ? `${p.stock} left` : `${p.stock}`}
                    </div>
                    {inCart && (
                      <div className="absolute top-2 left-2 w-5 h-5 bg-[#C9A96E] rounded-full flex items-center justify-center text-white text-[9px] font-bold">{inCart.quantity}</div>
                    )}
                    <div className="w-full aspect-square rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2 overflow-hidden">
                      {p.images ? (
                        <img src={JSON.parse(p.images)[0]} alt={p.name} className="w-full h-full object-cover rounded-lg" onError={e => { e.target.style.display = 'none'; }} />
                      ) : (
                        <Package size={24} className="text-gray-300" />
                      )}
                    </div>
                    <p className="text-xs font-semibold leading-tight line-clamp-2 mb-1">{p.name}</p>
                    <p className="text-xs font-bold text-[#A8824A]">UGX {p.price?.toLocaleString()}</p>
                  </button>
                );
              })}
              {!prods.length && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400">
                  <Package size={36} className="mb-2 opacity-20" />
                  <p className="text-sm">{!isOnline ? 'No cached products available' : 'No products found'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT: Cart ── */}
      <div className="w-72 xl:w-80 shrink-0 flex flex-col card overflow-hidden">

        {/* Cart header */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-heading font-semibold text-sm">Cart</span>
            {cart.length > 0 && <span className="text-[10px] bg-[#C9A96E] text-white px-1.5 py-0.5 rounded-full">{cart.length}</span>}
          </div>
          <div className="flex items-center gap-2">
            {/* Online/offline indicator */}
            <div className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium
              ${isOnline ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
              {isOnline ? 'Online' : 'Offline'}
            </div>
            {cart.length > 0 && (
              <button onClick={() => { clearCart(); setCartCustomer(null); }} className="text-[10px] text-red-400 hover:text-red-600 transition-colors">Clear</button>
            )}
          </div>
        </div>

        {/* Customer */}
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          {cartCustomer ? (
            <div className="flex items-center gap-2 bg-[#C9A96E]/10 rounded-lg px-2 py-1.5">
              <div className="w-7 h-7 rounded-full bg-[#C9A96E] flex items-center justify-center text-white text-xs font-bold">{cartCustomer.name[0]}</div>
              <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate">{cartCustomer.name}</p><p className="text-[10px] text-gray-400">{cartCustomer.phone}</p></div>
              <button onClick={() => { setCartCustomer(null); setCustomerSearch(''); }}><X size={13} className="text-gray-400" /></button>
            </div>
          ) : (
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input text-xs py-2 pl-8" placeholder={isOnline ? 'Attach customer (optional)' : 'Customer search offline unavailable'}
                disabled={!isOnline}
                value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setShowCustDrop(true); }}
                onFocus={() => setShowCustDrop(true)}
                onBlur={() => setTimeout(() => setShowCustDrop(false), 200)} />
              {showCustDrop && custResults?.customers?.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl mt-1 overflow-hidden">
                  {custResults.customers.map(c => (
                    <button key={c.id} className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                      onMouseDown={() => { setCartCustomer(c); setCustomerSearch(''); setShowCustDrop(false); }}>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.phone} · {c.loyaltyPoints || 0} pts</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!cart.length && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
              <ShoppingCart size={36} className="mb-2 opacity-20" />
              <p className="text-sm">Cart is empty</p>
              <p className="text-xs">Click products to add</p>
            </div>
          )}
          {cart.map(item => (
            <div key={item.productId} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{item.name}</p>
                <p className="text-xs text-[#A8824A]">UGX {(item.price * item.quantity).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => updateCartQty(item.productId, item.quantity - 1)} className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors"><Minus size={9} /></button>
                <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateCartQty(item.productId, item.quantity + 1)} className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 border border-gray-200 flex items-center justify-center hover:bg-green-50 hover:text-green-600 transition-colors"><Plus size={9} /></button>
                <button onClick={() => removeFromCart(item.productId)} className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 ml-1"><Trash2 size={10} /></button>
              </div>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-3">

            {/* Discount */}
            {cartDiscount.amount > 0 ? (
              <div className="flex justify-between items-center text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
                <span>✓ {cartDiscount.code}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">-UGX {cartDiscount.amount?.toLocaleString()}</span>
                  <button onClick={removeDiscount} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  <button onClick={() => setManualDiscountType(t => t === 'fixed' ? 'percent' : 'fixed')}
                    className={`shrink-0 px-2.5 py-2 rounded-lg text-xs font-bold border-2 transition-all ${manualDiscountType === 'percent' ? 'bg-[#C9A96E] border-[#C9A96E] text-white' : 'border-gray-200 text-gray-500'}`}>
                    {manualDiscountType === 'percent' ? '%' : 'UGX'}
                  </button>
                  <input className="input text-xs py-2 flex-1" type="number" min="0"
                    placeholder={manualDiscountType === 'percent' ? 'e.g. 10 for 10% off' : 'e.g. 5000 off total'}
                    value={manualDiscountValue} onChange={e => setManualDiscountValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && manualDiscountValue && applyManualDiscount()} />
                  <button onClick={applyManualDiscount} disabled={!manualDiscountValue}
                    className="btn-secondary py-2 px-2.5 text-xs disabled:opacity-40"><Percent size={12} /></button>
                </div>
                {isOnline && (
                  <div className="flex gap-1.5">
                    <input className="input text-xs py-2 flex-1" placeholder="Or enter discount code"
                      value={discountCode} onChange={e => setDiscountCode(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && discountCode && applyDiscount.mutate()} />
                    <button onClick={() => applyDiscount.mutate()} disabled={!discountCode}
                      className="btn-secondary py-2 px-2 text-xs disabled:opacity-40"><Tag size={12} /></button>
                  </div>
                )}
              </div>
            )}

            {/* Totals */}
            <div className="text-sm space-y-1">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>UGX {subtotal.toLocaleString()}</span></div>
              {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-UGX {discount.toLocaleString()}</span></div>}
              <div className="flex justify-between font-bold text-lg pt-1.5 border-t border-gray-100 dark:border-gray-800">
                <span>TOTAL</span><span className="text-[#A8824A]">UGX {total.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment methods */}
            <div className="grid grid-cols-2 gap-1.5">
              {PAYMENT_METHODS.map(({ id, label, icon: Icon, color }) => (
                <button key={id} onClick={() => setPayMethod(id)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border-2 transition-all ${payMethod === id ? 'text-white' : 'border-gray-200 dark:border-gray-700 text-gray-600'}`}
                  style={payMethod === id ? { background: color, borderColor: color } : {}}>
                  <Icon size={12} />{label}
                </button>
              ))}
            </div>

            {payMethod === 'cash' && (
              <div>
                <input className="input text-sm py-2" type="number" placeholder="Amount paid (UGX)" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
                {amountPaid && parseFloat(amountPaid) >= total && (
                  <div className="flex justify-between text-sm font-bold text-green-700 bg-green-50 rounded-lg px-3 py-2 mt-1.5">
                    <span>Change</span><span>UGX {(parseFloat(amountPaid) - total).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
            {(payMethod === 'mtn_momo' || payMethod === 'airtel_money') && (
              <input className="input text-sm py-2" placeholder="Phone: 0771234567" value={momoPhone} onChange={e => setMomoPhone(e.target.value)} />
            )}

            {/* Checkout button */}
            <button onClick={handleCheckout} disabled={createOrder.isPending || !cart.length}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
              style={{ background: isOnline ? 'linear-gradient(135deg,#C9A96E,#A8824A)' : 'linear-gradient(135deg,#92400e,#78350f)', color: 'white' }}>
              {createOrder.isPending
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <>
                  {isOnline ? <CheckCircle size={16} /> : <WifiOff size={16} />}
                  {isOnline ? 'Complete' : 'Save Offline'} · UGX {total.toLocaleString()}
                </>}
            </button>

            {!isOnline && (
              <p className="text-[10px] text-amber-600 text-center">
                ⚠️ Offline — order will sync automatically when internet returns
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
