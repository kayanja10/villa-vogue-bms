import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Minus, Trash2, User, Tag, CreditCard, Smartphone, Banknote, CheckCircle, Printer, X, ShoppingCart, MessageCircle, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { products as productApi, orders, customers, discounts, categories } from '../lib/api';
import { useStore } from '../store/useStore';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote, color: '#2d7a4f' },
  { id: 'mtn_momo', label: 'MTN MoMo', icon: Smartphone, color: '#f5a623' },
  { id: 'airtel_money', label: 'Airtel', icon: Smartphone, color: '#e02020' },
  { id: 'card', label: 'Card', icon: CreditCard, color: '#2980b9' },
];

export default function POS() {
  const qc = useQueryClient();
  const { cart, addToCart, removeFromCart, updateCartQty, clearCart, getCartTotal, cartCustomer, setCartCustomer, cartDiscount, setCartDiscount } = useStore();
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
  const receiptRef = useRef();

  const { data: productsData, isLoading: loadingProds } = useQuery({
    queryKey: ['products-pos', search, catFilter],
    queryFn: () => productApi.list({ search, category: catFilter, limit: 80 }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: catsData } = useQuery({ queryKey: ['categories'], queryFn: () => categories.list().then(r => r.data) });

  const { data: custResults } = useQuery({
    queryKey: ['cust-srch', customerSearch],
    queryFn: () => customers.list({ search: customerSearch, limit: 5 }).then(r => r.data),
    enabled: customerSearch.length > 1,
  });

  const createOrder = useMutation({
    mutationFn: (d) => orders.create(d),
    onSuccess: (res) => {
      setLastOrder(res.data);
      setLastCart([...cart]);
      setStep('success');
      clearCart();
      setDiscountCode('');
      qc.invalidateQueries(['dashboard']);
      qc.invalidateQueries(['products-pos']);
      qc.invalidateQueries(['products']);
      toast.success('Sale completed!');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Order failed'),
  });

  const applyDiscount = useMutation({
    mutationFn: () => discounts.validate({ code: discountCode, orderTotal: subtotal }),
    onSuccess: (res) => { setCartDiscount({ code: discountCode, amount: res.data.discountAmount, type: res.data.type }); toast.success('Discount applied!'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Invalid code'),
  });

  const { subtotal, discount, total } = getCartTotal();

  const handleCheckout = () => {
    if (!cart.length) return toast.error('Cart is empty');
    if ((payMethod === 'mtn_momo' || payMethod === 'airtel_money') && !momoPhone) return toast.error('Enter phone number');
    createOrder.mutate({
      customerId: cartCustomer?.id,
      customerName: cartCustomer?.name || 'Walk-in Customer',
      customerPhone: cartCustomer?.phone || momoPhone || '',
      items: cart.map(i => ({ productId: i.productId, name: i.name, price: i.price, costPrice: i.costPrice || 0, quantity: i.quantity })),
      subtotal, discount, discountType: cartDiscount.type || 'fixed', total,
      paymentMethod: payMethod, orderSource: 'pos',
    });
  };

  const handlePrint = () => {
    const w = window.open('', '_blank', 'width=380,height=650');
    const itemRows = lastCart.map(i => `<tr><td>${i.name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">UGX ${(i.price * i.quantity).toLocaleString()}</td></tr>`).join('');
    const changeAmt = amountPaid ? Math.max(0, parseFloat(amountPaid) - lastOrder.total) : 0;
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;padding:15px;max-width:320px}
    .c{text-align:center}.b{font-weight:bold}.hr{border:none;border-top:1px dashed #000;margin:8px 0}
    table{width:100%;border-collapse:collapse}td{padding:2px 0}img{display:block;margin:0 auto 8px;max-width:80px;max-height:80px;object-fit:contain}
    .total{font-size:14px;font-weight:bold}.foot{font-size:11px}</style></head><body>
    <div class="c"><img src="${window.location.origin}/logo.png" onerror="this.style.display='none'" />
    <div class="b" style="font-size:16px">VILLA VOGUE FASHIONS</div>
    <div>Where Fashion Finds a Home</div><div>Tel: 0782 860372 / 0745 903189</div><div>Kampala, Uganda</div></div>
    <hr class="hr"/>
    <table><tr><td>Receipt:</td><td class="b" style="text-align:right">${lastOrder.orderNumber}</td></tr>
    <tr><td>Date:</td><td style="text-align:right">${new Date(lastOrder.createdAt).toLocaleString()}</td></tr>
    ${lastOrder.customerName && lastOrder.customerName !== 'Walk-in Customer' ? `<tr><td>Customer:</td><td style="text-align:right">${lastOrder.customerName}</td></tr>` : ''}
    </table><hr class="hr"/>
    <table><tr><td class="b">ITEM</td><td class="b" style="text-align:center">QTY</td><td class="b" style="text-align:right">AMOUNT</td></tr>
    <tr><td colspan="3"><hr class="hr"/></td></tr>${itemRows}</table>
    <hr class="hr"/>
    ${discount > 0 ? `<table><tr><td>Discount:</td><td style="text-align:right">-UGX ${discount.toLocaleString()}</td></tr></table>` : ''}
    <table><tr class="total"><td>TOTAL:</td><td style="text-align:right">UGX ${Number(lastOrder.total).toLocaleString()}</td></tr>
    ${amountPaid ? `<tr><td>Cash Paid:</td><td style="text-align:right">UGX ${parseFloat(amountPaid).toLocaleString()}</td></tr>` : ''}
    ${changeAmt > 0 ? `<tr class="b"><td>Change:</td><td style="text-align:right">UGX ${changeAmt.toLocaleString()}</td></tr>` : ''}
    <tr><td>Payment:</td><td style="text-align:right">${lastOrder.paymentMethod?.replace(/_/g,' ').toUpperCase()}</td></tr></table>
    <hr class="hr"/><div class="c foot"><div>Thank you for shopping at</div><div class="b">Villa Vogue Fashions!</div>
    <div>Goods not returnable after 24hrs</div><div>Keep this receipt</div></div>
    <script>window.onload=function(){window.print();setTimeout(window.close,500)}</script></body></html>`);
    w.document.close();
  };

  const handleWhatsApp = () => {
    const phone = cartCustomer?.phone || lastOrder?.customerPhone;
    if (!phone) return toast.error('No phone number on record');
    const items = lastCart.map(i => `• ${i.name} x${i.quantity} = UGX ${(i.price * i.quantity).toLocaleString()}`).join('\n');
    const msg = encodeURIComponent(`🛍️ *VILLA VOGUE FASHIONS*\n_Where Fashion Finds a Home_\n\n*Receipt: ${lastOrder.orderNumber}*\nDate: ${new Date(lastOrder.createdAt).toLocaleString()}\n\n${items}\n\n*TOTAL: UGX ${Number(lastOrder.total).toLocaleString()}*\nPayment: ${lastOrder.paymentMethod?.replace(/_/g,' ')}\n\nThank you! 💛\n📞 0782 860372`);
    const cleaned = phone.replace(/\D/g,'');
    const intl = cleaned.startsWith('0') ? '256'+cleaned.slice(1) : cleaned;
    window.open(`https://wa.me/${intl}?text=${msg}`, '_blank');
  };

  if (step === 'success' && lastOrder) {
    const changeAmt = amountPaid ? Math.max(0, parseFloat(amountPaid) - lastOrder.total) : 0;
    return (
      <div className="flex items-center justify-center min-h-[80vh] p-4">
        <div className="card w-full max-w-sm p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={36} className="text-green-600" />
          </div>
          <h2 className="font-heading text-2xl font-bold mb-1">Sale Complete!</h2>
          <p className="text-[#A8824A] font-semibold text-lg mb-1">{lastOrder.orderNumber}</p>
          <p className="text-3xl font-heading font-bold my-4">UGX {Number(lastOrder.total).toLocaleString()}</p>
          {changeAmt > 0 && <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4"><p className="text-green-700 font-bold text-lg">Change: UGX {changeAmt.toLocaleString()}</p></div>}
          <p className="text-sm text-gray-500 mb-5 capitalize">Via {lastOrder.paymentMethod?.replace(/_/g,' ')}</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={handlePrint} className="btn-secondary justify-center"><Printer size={15} /> Print Receipt</button>
            <button onClick={handleWhatsApp} className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium text-sm transition-colors">
              <MessageCircle size={15} /> WhatsApp
            </button>
          </div>
          <button onClick={() => { setStep('cart'); setAmountPaid(''); setLastOrder(null); }} className="btn-primary w-full justify-center">New Sale</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-3">
      {/* Products panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="relative mb-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 w-full" placeholder="Search products or scan barcode..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 shrink-0">
          {[{ id: '', name: 'All' }, ...(catsData || [])].map(c => (
            <button key={c.id || 'all'} onClick={() => setCatFilter(c.name === 'All' ? '' : c.name)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${catFilter === (c.name === 'All' ? '' : c.name) ? 'bg-[#C9A96E] text-white' : 'bg-white dark:bg-gray-800 text-gray-600 border border-gray-200 dark:border-gray-700'}`}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {productsData?.products?.map(product => {
              const inCart = cart.find(i => i.productId === product.id);
              const imgs = (() => { try { return JSON.parse(product.images||'[]'); } catch { return []; } })();
              return (
                <button key={product.id}
                  onClick={() => { if (!product.stock) return toast.error('Out of stock'); addToCart(product); }}
                  className={`relative bg-white dark:bg-gray-800 rounded-xl border-2 p-2 text-left transition-all hover:shadow-md active:scale-95 ${inCart ? 'border-[#C9A96E]' : 'border-gray-100 dark:border-gray-700'} ${!product.stock ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
                  {inCart && <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#C9A96E] text-white text-[10px] flex items-center justify-center font-bold">{inCart.quantity}</span>}
                  <div className="w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-1.5 overflow-hidden">
                    {imgs[0] ? <img src={imgs[0]} alt={product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">👗</div>}
                  </div>
                  <p className="text-[11px] font-medium truncate">{product.name}</p>
                  <p className="text-[11px] text-[#A8824A] font-semibold">UGX {product.price?.toLocaleString()}</p>
                  <p className={`text-[10px] ${product.stock <= 5 ? 'text-red-500' : 'text-gray-400'}`}>{product.stock} left</p>
                </button>
              );
            })}
          </div>
          {loadingProds && <div className="py-10 text-center text-gray-400"><div className="w-8 h-8 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin mx-auto" /></div>}
          {!loadingProds && !productsData?.products?.length && <div className="flex flex-col items-center justify-center h-48 text-gray-400"><Package size={40} className="mb-2 opacity-30" /><p>No products found</p></div>}
        </div>
      </div>

      {/* Cart panel */}
      <div className="w-80 xl:w-96 flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2"><ShoppingCart size={18} className="text-[#C9A96E]" /><span className="font-semibold">Cart</span>{cart.length > 0 && <span className="badge-gold">{cart.reduce((s,i)=>s+i.quantity,0)}</span>}</div>
          {cart.length > 0 && <button onClick={clearCart} className="text-red-400 hover:text-red-600"><X size={15} /></button>}
        </div>

        {/* Customer */}
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 relative">
          {cartCustomer ? (
            <div className="flex items-center gap-2 bg-[#C9A96E]/10 rounded-lg px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-[#C9A96E] flex items-center justify-center text-white text-xs font-bold">{cartCustomer.name[0]}</div>
              <div className="flex-1 min-w-0"><p className="text-xs font-semibold truncate">{cartCustomer.name}</p><p className="text-[10px] text-gray-400">{cartCustomer.phone}</p></div>
              <button onClick={() => { setCartCustomer(null); setCustomerSearch(''); }}><X size={13} className="text-gray-400" /></button>
            </div>
          ) : (
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input text-xs py-2 pl-8" placeholder="Attach customer (optional)" value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setShowCustDrop(true); }}
                onFocus={() => setShowCustDrop(true)} onBlur={() => setTimeout(()=>setShowCustDrop(false), 200)} />
              {showCustDrop && custResults?.customers?.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl mt-1 overflow-hidden">
                  {custResults.customers.map(c => (
                    <button key={c.id} className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                      onMouseDown={() => { setCartCustomer(c); setCustomerSearch(''); setShowCustDrop(false); }}>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.phone} · {c.loyaltyPoints||0} pts</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!cart.length && <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8"><ShoppingCart size={36} className="mb-2 opacity-20" /><p className="text-sm">Cart is empty</p><p className="text-xs">Click products to add</p></div>}
          {cart.map(item => (
            <div key={item.productId} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{item.name}</p>
                <p className="text-xs text-[#A8824A]">UGX {(item.price*item.quantity).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => updateCartQty(item.productId, item.quantity-1)} className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors"><Minus size={9}/></button>
                <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateCartQty(item.productId, item.quantity+1)} className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 border border-gray-200 flex items-center justify-center hover:bg-green-50 hover:text-green-600 transition-colors"><Plus size={9}/></button>
                <button onClick={() => removeFromCart(item.productId)} className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 ml-1"><Trash2 size={10}/></button>
              </div>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-800 p-3 space-y-3">
            <div className="flex gap-2">
              <input className="input text-xs py-2 flex-1" placeholder="Discount code" value={discountCode} onChange={e=>setDiscountCode(e.target.value)} onKeyDown={e=>e.key==='Enter'&&discountCode&&applyDiscount.mutate()} />
              <button onClick={()=>applyDiscount.mutate()} disabled={!discountCode} className="btn-secondary py-2 px-2 text-xs disabled:opacity-40"><Tag size={12}/></button>
            </div>
            {cartDiscount.amount>0 && <div className="flex justify-between text-xs text-green-600 bg-green-50 rounded-lg px-3 py-1.5"><span>✓ {cartDiscount.code}</span><span>-UGX {cartDiscount.amount?.toLocaleString()}</span></div>}

            <div className="text-sm space-y-1">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>UGX {subtotal.toLocaleString()}</span></div>
              {discount>0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-UGX {discount.toLocaleString()}</span></div>}
              <div className="flex justify-between font-bold text-lg pt-1.5 border-t border-gray-100 dark:border-gray-800"><span>TOTAL</span><span className="text-[#A8824A]">UGX {total.toLocaleString()}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {PAYMENT_METHODS.map(({id,label,icon:Icon,color})=>(
                <button key={id} onClick={()=>setPayMethod(id)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border-2 transition-all ${payMethod===id?'text-white':'border-gray-200 dark:border-gray-700 text-gray-600'}`}
                  style={payMethod===id?{background:color,borderColor:color}:{}}>
                  <Icon size={12}/>{label}
                </button>
              ))}
            </div>

            {payMethod==='cash' && (
              <div>
                <input className="input text-sm py-2" type="number" placeholder="Amount paid (UGX)" value={amountPaid} onChange={e=>setAmountPaid(e.target.value)} />
                {amountPaid && parseFloat(amountPaid)>=total && <div className="flex justify-between text-sm font-bold text-green-700 bg-green-50 rounded-lg px-3 py-2 mt-1.5"><span>Change</span><span>UGX {(parseFloat(amountPaid)-total).toLocaleString()}</span></div>}
              </div>
            )}
            {(payMethod==='mtn_momo'||payMethod==='airtel_money') && <input className="input text-sm py-2" placeholder="Phone: 0771234567" value={momoPhone} onChange={e=>setMomoPhone(e.target.value)} />}

            <button onClick={handleCheckout} disabled={createOrder.isPending||!cart.length}
              className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
              style={{background:'linear-gradient(135deg,#C9A96E,#A8824A)',color:'white'}}>
              {createOrder.isPending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><CheckCircle size={16}/>Complete · UGX {total.toLocaleString()}</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
