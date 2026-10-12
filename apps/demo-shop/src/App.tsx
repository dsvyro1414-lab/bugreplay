import { useEffect, useRef, useState, type FormEvent } from 'react';

const products = [
  { id: 'canvas-pouch', name: 'Canvas pouch', price: 28, detail: 'A little order, wherever you go.', material: 'Heavyweight cotton / slate blue', illustration: 'pouch' },
  { id: 'desk-notebook', name: 'Desk notebook', price: 18, detail: 'Room for the next good idea.', material: 'Lay-flat binding / 160 dotted pages', illustration: 'notebook' },
  { id: 'travel-cup', name: 'Travel cup', price: 32, detail: 'For the desk and the way there.', material: 'Double-wall steel / 350 ml', illustration: 'cup' },
] as const;
type ProductId = typeof products[number]['id'];
type CartRow = { productId: ProductId; quantity: number };
type ShopState = {
  version: 1;
  cart: CartRow[];
  address: string;
  delivery: 'standard' | 'express';
  promo: '' | 'FIELD10';
  saveSeq: number;
};
const storageKey = 'fieldwork-shop-v1';
const initialState = (): ShopState => ({
  version: 1, cart: [], address: '24 Market Street, Portland', delivery: 'standard', promo: '', saveSeq: 0,
});
const money = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

function readStoredState(): ShopState {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (!raw || typeof raw !== 'object') return initialState();
    const state = raw as Record<string, unknown>;
    if (state.version !== 1 || !Array.isArray(state.cart) || typeof state.address !== 'string'
      || state.address.length < 5 || state.address.length > 200
      || !['standard', 'express'].includes(String(state.delivery))
      || !['', 'FIELD10'].includes(String(state.promo))
      || !Number.isSafeInteger(state.saveSeq) || Number(state.saveSeq) < 0) return initialState();
    const seen = new Set<string>();
    for (const row of state.cart) {
      if (!row || typeof row !== 'object' || !products.some(product => product.id === row.productId)
        || !Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 99 || seen.has(row.productId)) return initialState();
      seen.add(row.productId);
    }
    return state as ShopState;
  } catch {
    return initialState();
  }
}

function ProductDrawing({ kind }: { kind: typeof products[number]['illustration'] }) {
  return <svg className={`product-drawing drawing-${kind}`} viewBox="0 0 180 148" fill="none" aria-hidden="true">
    <ellipse cx="91" cy="126" rx="58" ry="8" fill="#224861" opacity=".09" />
    {kind === 'pouch' && <>
      <path d="M32 54 137 40 153 110 45 125Z" fill="#7696A8" />
      <path d="m32 54 105-14 5 15L37 70Z" fill="#36586E" />
      <path d="m40 61 97-13" stroke="#DDE6E8" strokeWidth="3" strokeDasharray="2 3" />
      <path d="m139 49 14 1 2 15-10 2" stroke="#D7AC65" strokeWidth="5" strokeLinejoin="round" />
      <path d="m43 75 98-13 9 43-98 14Z" stroke="#ABC0CA" strokeDasharray="3 3" />
      <path d="m84 87 31-4 2 13-31 4Z" fill="#E8EFF1" />
      <path d="m90 91 17-2m-16 6 12-2" stroke="#577284" strokeWidth="1.5" />
    </>}
    {kind === 'notebook' && <>
      <path d="m54 20 86 9-8 100-89-9Z" fill="#E8E4D9" />
      <path d="m48 18 86 9-8 98-85-9Z" fill="#B1BFC2" />
      <path d="m48 18 13 1-7 98-13-1Z" fill="#6E888E" />
      <path d="m58 31 62 6m-63 87 70 7" stroke="#D8E1DD" strokeWidth="2" />
      <path d="m72 50 43 4m-44 4 26 3" stroke="#385B67" strokeWidth="2" />
      <path d="m109 24-7 101" stroke="#D5A85C" strokeWidth="6" />
      <path d="m61 124-1 9 8-4" fill="#385B67" />
    </>}
    {kind === 'cup' && <>
      <path d="m57 43 69 1-8 78c-1 10-53 10-55 0Z" fill="#D9B765" />
      <path d="m62 55 58 1-2 15-55-1Z" fill="#EACA82" />
      <path d="m67 76 47 1-3 34-41-1Z" fill="#274D62" />
      <path d="m72 85 30 1m-30 6 22 1" stroke="#C9D8DF" strokeWidth="2" />
      <ellipse cx="91" cy="45" rx="35" ry="10" fill="#527080" />
      <path d="M56 41c0-13 69-13 70 1v6c-8 11-62 11-70-1Z" fill="#234457" />
      <ellipse cx="91" cy="39" rx="35" ry="10" fill="#375B6B" />
      <path d="M86 35h22" stroke="#142F40" strokeWidth="5" strokeLinecap="round" />
    </>}
  </svg>;
}

export function App() {
  const [state, setState] = useState(readStoredState);
  const [addressDraft, setAddressDraft] = useState(state.address);
  const [promoDraft, setPromoDraft] = useState<string>(state.promo);
  const [promoMessage, setPromoMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); setStorageUnavailable(false); }
    catch { setStorageUnavailable(true); }
  }, [state]);
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const count = state.cart.reduce((total, row) => total + row.quantity, 0);
  const subtotal = state.cart.reduce((total, row) => total + products.find(product => product.id === row.productId)!.price * row.quantity, 0);
  const discount = state.promo === 'FIELD10' ? subtotal * 0.1 : 0;
  const deliveryCost = count === 0 ? 0 : state.delivery === 'express' ? 12 : 5;
  const editedAddress = addressDraft.trim();
  const canSave = !busy && editedAddress.length >= 5 && editedAddress !== state.address;

  function addProduct(productId: ProductId) {
    setState(current => {
      const existing = current.cart.find(row => row.productId === productId);
      return { ...current, cart: existing
        ? current.cart.map(row => row.productId === productId ? { ...row, quantity: Math.min(99, row.quantity + 1) } : row)
        : [...current.cart, { productId, quantity: 1 }] };
    });
  }

  function applyPromo(event: FormEvent) {
    event.preventDefault();
    const valid = promoDraft.trim().toUpperCase() === 'FIELD10';
    setState(current => ({ ...current, promo: valid ? 'FIELD10' : '' }));
    setPromoMessage(valid ? 'FIELD10 applied. 10% off your items.' : promoDraft.trim() ? 'That code is not available. Try FIELD10.' : 'Enter a promo code first.');
    setSaveMessage('');
  }

  function saveAddress(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;
    setBusy(true);
    setSaveMessage('');
    saveTimer.current = setTimeout(() => {
      setState(current => {
        // The controlled defect is kept in the shop; its conditions never belong in runtime-agent input.
        const losesCart = __SHOP_VARIANT__ === 'buggy'
          && current.delivery === 'express' && current.promo === 'FIELD10' && editedAddress !== current.address;
        return { ...current, address: editedAddress, saveSeq: current.saveSeq + 1, cart: losesCart ? [] : current.cart };
      });
      setAddressDraft(editedAddress);
      setSaveMessage('Address saved');
      setBusy(false);
      saveTimer.current = null;
    }, 350);
  }

  return <div className="shop-page">
    <header className="site-header">
      <div className="brand"><svg viewBox="0 0 30 30" fill="none" aria-hidden="true"><path d="M5 24V6h20M5 15h15M14 6v18" stroke="currentColor" strokeWidth="3" /><path d="M22 20h4v4h-4z" fill="currentColor" /></svg><span>Fieldwork<span className="brand-supply">Supply</span></span></div>
      <span className="demo-note"><span className="demo-dot" />Demo shop. No real purchases.</span>
    </header>

    <main className="shop-layout">
      <section className="catalog" aria-labelledby="catalog-heading">
        <div className="catalog-intro"><h1 id="catalog-heading">Good things for<br />everyday work.</h1><p>Thoughtful essentials. Made to be used,<br className="desktop-break" /> packed up, and used again.</p></div>
        <div className="product-list">
          {products.map(product => <article className="product" key={product.id}>
            <div className={`product-art art-${product.illustration}`}><ProductDrawing kind={product.illustration} /></div>
            <div className="product-info"><div className="product-heading"><h2>{product.name}</h2><span className="product-price">{money(product.price)}</span></div><p className="product-description">{product.detail}</p><p className="product-material">{product.material}</p><button className="add-button" type="button" data-action="cart-add" disabled={busy} aria-label={`Add ${product.name}`} onClick={() => addProduct(product.id)}><span aria-hidden="true">+</span> Add to cart</button></div>
          </article>)}
        </div>
        <div className="catalog-footer"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4 7 8-4 8 4v10l-8 4-8-4Zm0 0 8 4 8-4M12 11v10M8 5l8 4" stroke="currentColor" strokeWidth="1.5" /></svg><p>Three everyday essentials.<br /><span>One less thing to overthink.</span></p></div>
      </section>

      <aside className="checkout-panel" aria-label="Your order">
        <section className="cart" role="region" aria-label="Cart" aria-busy={busy}>
          <div className="section-heading"><h2>Your cart</h2><span className="cart-count">{count} {count === 1 ? 'item' : 'items'}</span></div>
          {state.cart.length === 0 ? <div className="cart-empty"><svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M6 9h17l-2 13H8L6 9Zm5 1V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg><p>Your cart is empty.<br /><span>Add an everyday essential to get started.</span></p></div> : <ul className="cart-items">{state.cart.map(row => {
            const product = products.find(item => item.id === row.productId)!;
            return <li className="cart-item" key={row.productId} data-product-id={row.productId} data-quantity={row.quantity}><div><span className="cart-item-name">{product.name}</span><span className="cart-item-detail">Qty {row.quantity} <button type="button" className="remove-button" aria-label={`Remove ${product.name}`} data-action="cart-remove" disabled={busy} onClick={() => setState(current => ({ ...current, cart: current.cart.filter(item => item.productId !== row.productId) }))}>Remove</button></span></div><span>{money(product.price * row.quantity)}</span></li>;
          })}</ul>}
          <dl className="cart-totals"><div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>{state.promo === 'FIELD10' && <div className="discount-line"><dt>FIELD10 discount</dt><dd>−{money(discount)}</dd></div>}<div><dt>Delivery</dt><dd>{count === 0 ? 'Calculated with items' : money(deliveryCost)}</dd></div><div className="grand-total"><dt>Total</dt><dd>{money(subtotal - discount + deliveryCost)}</dd></div></dl>
        </section>

        <section className="delivery-section" aria-labelledby="delivery-heading">
          <div className="section-heading"><h2 id="delivery-heading">Delivery details</h2><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h10v11H4zM14 10h4l3 4v3h-7M8 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="1.4" /></svg></div>
          <div className="current-address"><span>Currently delivering to</span><p data-checkout-address>{state.address}</p></div>
          <form className="address-form" onSubmit={saveAddress}>
            <label className="field-label" htmlFor="delivery-address">Delivery address</label>
            <input id="delivery-address" data-action="checkout-edit" value={addressDraft} disabled={busy} maxLength={200} minLength={5} required autoComplete="off" onChange={event => { setAddressDraft(event.target.value); setSaveMessage(''); }} />
            <label className="field-label" htmlFor="delivery-method">Delivery method</label>
            <select id="delivery-method" data-action="checkout-edit" value={state.delivery} disabled={busy} onChange={event => { const delivery = event.target.value as ShopState['delivery']; setState(current => ({ ...current, delivery })); setSaveMessage(''); }}><option value="standard">Standard — 3–5 days ($5)</option><option value="express">Express — next day ($12)</option></select>
            <button className="save-button" data-action="checkout-save" type="submit" disabled={!canSave}>{busy ? 'Saving address…' : 'Save delivery address'}</button>
            <p className="save-status" role="status" data-save-seq={state.saveSeq} aria-live="polite">{saveMessage}</p>
          </form>
        </section>

        <section className="promo-section" aria-labelledby="promo-heading"><h3 id="promo-heading">A little welcome gift</h3><p>Use <strong>FIELD10</strong> for 10% off your items.</p><form onSubmit={applyPromo}><label className="field-label" htmlFor="promo-code">Promo code</label><div className="promo-controls"><input id="promo-code" data-action="checkout-edit" value={promoDraft} maxLength={30} disabled={busy} autoComplete="off" aria-describedby="promo-message" onChange={event => { setPromoDraft(event.target.value); setPromoMessage(''); setSaveMessage(''); }} /><button type="submit" data-action="checkout-edit" disabled={busy} aria-label="Apply promo code">Apply</button></div><p id="promo-message" className="promo-message">{promoMessage || (state.promo ? 'FIELD10 applied. 10% off your items.' : 'One code per order.')}</p></form></section>
        {storageUnavailable && <p className="storage-warning">Browser storage is unavailable. Your cart will not be kept after a reload.</p>}
        <p className="checkout-footnote">This is a demo. No payment or order will be taken.</p>
      </aside>
    </main>
    <footer className="site-footer"><span>Fieldwork Supply</span><span>Built for the everyday.</span></footer>
  </div>;
}
