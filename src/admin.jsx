import { useEffect, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, PackageCheck, Plus, Search, ShieldCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, errorText } from './api';
import { usePageTitle } from './page';
import { ButtonSpinner } from './button-spinner';
import { money } from './data';
import { useCatalog } from './catalog';
import {
  Breadcrumb, Empty, OrderDetails, PAYMENT_LABELS, PAYMENT_STATUS_LABELS, STATUS_LABELS, formatDate,
} from './App';

const TABS = [['overview', 'Overview'], ['orders', 'Orders'], ['products', 'Products'], ['customers', 'Customers']];
const ORDER_STATUSES = ['pending_payment', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
// Mirrors the API's allowed transitions so only valid next steps are offered.
const NEXT_STATUSES = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'shipped', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};
const STATUS_ACTIONS = {
  confirmed: 'Confirm order', processing: 'Start processing', shipped: 'Mark as shipped',
  delivered: 'Mark as delivered', cancelled: 'Cancel order',
};
const PAGE_SIZE = 25;

// Fetches an API path and refetches whenever the path changes or reload() is called.
function useApi(path) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!path) return undefined;
    let cancelled = false;
    setState((current) => ({ ...current, loading: true }));
    api(path)
      .then((data) => { if (!cancelled) setState({ data, error: '', loading: false }); })
      .catch((error) => { if (!cancelled) setState({ data: null, error: errorText(error), loading: false }); });
    return () => { cancelled = true; };
  }, [path, version]);
  return { ...state, reload: () => setVersion((v) => v + 1) };
}

const query = (params) => {
  const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== false));
  return search.toString() ? `?${search}` : '';
};

function Loading() {
  return <div className="loader-ring" aria-label="Loading"><span /></div>;
}

function Pager({ page, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  return (
    <div className="admin-pager">
      <button className="admin-btn" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={16} />Previous</button>
      <span>Page {page} of {pages}</span>
      <button className="admin-btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next<ChevronRight size={16} /></button>
    </div>
  );
}

function SearchBox({ value, onSearch, placeholder }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <form className="admin-search" onSubmit={(e) => { e.preventDefault(); onSearch(text.trim()); }}>
      <Search size={17} />
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} />
      <button className="admin-btn">Search</button>
    </form>
  );
}

export default function AdminPage({ user }) {
  usePageTitle('Admin');
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([key]) => key === params.get('tab')) ? params.get('tab') : 'overview';
  const go = (next) => setParams(next, { replace: false });

  if (!user) {
    return (
      <main className="container narrow">
        <div className="account-card"><ShieldCheck /><h1>Admin dashboard</h1><p>Sign in with your admin account to continue.</p><Link className="primary" to="/account">Sign in</Link></div>
      </main>
    );
  }
  if (user.role !== 'admin') {
    return <main className="container narrow"><Empty icon={<ShieldCheck />} title="This page is for ZawadiMart staff" /></main>;
  }

  return (
    <main className="container page-shell admin">
      <Breadcrumb items={[['Home', '/'], ['Account', '/account'], ['Admin']]} />
      <div className="admin-head"><span className="eyebrow">ZAWADIMART ADMIN</span><h1 className="page-title">Dashboard</h1></div>
      <nav className="admin-tabs" aria-label="Admin sections">
        {TABS.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => go({ tab: key })}>{label}</button>)}
      </nav>
      {tab === 'overview' && <Overview go={go} />}
      {tab === 'orders' && (params.get('order')
        ? <OrderAdmin number={params.get('order')} back={() => go({ tab: 'orders', status: params.get('status') || '' })} />
        : <OrdersList params={params} go={go} />)}
      {tab === 'products' && <ProductsAdmin />}
      {tab === 'customers' && <CustomersAdmin currentUserId={user.id} />}
    </main>
  );
}

function Overview({ go }) {
  const { data, error, loading } = useApi('/admin/stats');
  if (error) return <div className="error">{error}</div>;
  if (loading && !data) return <Loading />;
  const counts = data.ordersByStatus;
  const toFulfil = (counts.confirmed || 0) + (counts.processing || 0);
  return (
    <>
      <section className="admin-stats">
        <div><span>Revenue (paid)</span><b>{money(data.revenue.total)}</b><small>{data.revenue.paidOrders} paid order{data.revenue.paidOrders === 1 ? '' : 's'}</small></div>
        <div><span>Revenue today</span><b>{money(data.revenue.today)}</b><small>Kenyan time</small></div>
        <div className="clickable" onClick={() => go({ tab: 'orders', status: 'confirmed' })}><span>To fulfil</span><b>{toFulfil}</b><small>Confirmed or processing</small></div>
        <div className="clickable" onClick={() => go({ tab: 'customers' })}><span>Customers</span><b>{data.customers}</b><small>Registered accounts</small></div>
      </section>
      <section className="form-card admin-section">
        <h2>Orders by status</h2>
        <div className="admin-chips">
          {ORDER_STATUSES.map((status) => (
            <button key={status} onClick={() => go({ tab: 'orders', status })}>
              <span className={`status-pill ${status}`}>{STATUS_LABELS[status]}</span><b>{counts[status] || 0}</b>
            </button>
          ))}
        </div>
      </section>
      <div className="admin-columns">
        <section className="form-card admin-section">
          <h2>Recent orders</h2>
          {!data.recentOrders.length ? <p className="admin-muted">No orders yet.</p> : (
            <div className="admin-list">
              {data.recentOrders.map((o) => (
                <button key={o.orderNumber} onClick={() => go({ tab: 'orders', order: o.orderNumber })}>
                  <span><b>{o.orderNumber}</b><small>{o.customerName} · {formatDate(o.createdAt)}</small></span>
                  <span className="admin-list-end"><b>{money(o.total)}</b><span className={`status-pill ${o.status}`}>{STATUS_LABELS[o.status]}</span></span>
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="form-card admin-section">
          <h2>Low stock</h2>
          {!data.lowStock.length ? <p className="admin-muted">All products have more than 5 in stock.</p> : (
            <div className="admin-list">
              {data.lowStock.map((p) => (
                <button key={p.id} onClick={() => go({ tab: 'products' })}>
                  <span><b>{p.name}</b><small>{money(p.price)}</small></span>
                  <span className={`stock-badge ${p.stock === 0 ? 'out' : ''}`}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function OrdersList({ params, go }) {
  const status = params.get('status') || '';
  const q = params.get('q') || '';
  const page = Number(params.get('page')) || 1;
  const { data, error, loading } = useApi(`/admin/orders${query({ status, q, page, limit: PAGE_SIZE })}`);
  const update = (changes) => go({ tab: 'orders', ...Object.fromEntries(Object.entries({ status, q, page: '', ...changes }).filter(([, v]) => v)) });

  return (
    <section className="form-card admin-section">
      <div className="admin-toolbar">
        <SearchBox value={q} onSearch={(text) => update({ q: text })} placeholder="Order number, name, phone or email" />
      </div>
      <div className="filter-row admin-filter">
        <button className={!status ? 'active' : ''} onClick={() => update({ status: '' })}>All</button>
        {ORDER_STATUSES.map((s) => <button key={s} className={status === s ? 'active' : ''} onClick={() => update({ status: s })}>{STATUS_LABELS[s]}</button>)}
      </div>
      {error && <div className="error">{error}</div>}
      {loading && !data ? <Loading /> : data && (!data.items.length ? <p className="admin-muted">No orders match.</p> : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Placed</th></tr></thead>
              <tbody>
                {data.items.map((o) => (
                  <tr key={o.orderNumber} onClick={() => go({ tab: 'orders', order: o.orderNumber, status })}>
                    <td><b>{o.orderNumber}</b><small>{o.itemCount} item{o.itemCount === 1 ? '' : 's'}</small></td>
                    <td>{o.customerName}<small>0{o.phone.slice(3)}</small></td>
                    <td><b>{money(o.total)}</b></td>
                    <td>{PAYMENT_LABELS[o.paymentMethod]}<small>{PAYMENT_STATUS_LABELS[o.paymentStatus]}</small></td>
                    <td><span className={`status-pill ${o.status}`}>{STATUS_LABELS[o.status]}</span></td>
                    <td>{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={data.total} onPage={(p) => update({ page: String(p) })} />
        </>
      ))}
    </section>
  );
}

function OrderAdmin({ number, back }) {
  const { data, error, loading } = useApi(`/admin/orders/${encodeURIComponent(number)}`);
  const [order, setOrder] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ text: '', tone: '' });
  useEffect(() => { if (data) setOrder(data.order); }, [data]);

  const patch = async (body, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setMessage({ text: '', tone: '' });
    try {
      const result = await api(`/admin/orders/${encodeURIComponent(number)}`, { method: 'PATCH', body: { ...body, note: note.trim() || undefined } });
      setOrder(result.order); setNote('');
      setMessage({ text: 'Order updated.', tone: 'ok' });
    } catch (err) {
      setMessage({ text: errorText(err), tone: 'error' });
    }
    setBusy(false);
  };

  if (error) return <><button className="admin-btn" onClick={back}><ArrowLeft size={16} />All orders</button><div className="error admin-gap">{error}</div></>;
  if (!order || loading) return <Loading />;
  const next = NEXT_STATUSES[order.status];

  return (
    <div className="admin-order">
      <button className="admin-btn" onClick={back}><ArrowLeft size={16} />All orders</button>
      <div className="admin-columns wide-left">
        <OrderDetails order={order} />
        <div className="admin-side">
          <section className="form-card admin-section">
            <h2>Update order</h2>
            {next.length ? (
              <div className="admin-actions">
                {next.map((s) => (
                  <button key={s} disabled={busy} className={s === 'cancelled' ? 'admin-btn danger' : 'primary'}
                    onClick={() => patch({ status: s }, s === 'cancelled' ? `Cancel ${order.orderNumber}? Its items go back into stock.` : null)}>
                    {STATUS_ACTIONS[s]}
                  </button>
                ))}
              </div>
            ) : <p className="admin-muted">This order is {STATUS_LABELS[order.status].toLowerCase()}; no further status changes.</p>}
            <label>Note for the order timeline (optional)<textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder="e.g. Out with rider Kevin, 0712 000 000" /></label>
            <div className="admin-actions">
              {note.trim() && <button className="admin-btn" disabled={busy} onClick={() => patch({})}>Add note only</button>}
              {order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded' && order.status !== 'cancelled' && (
                <button className="admin-btn" disabled={busy} onClick={() => patch({ paymentStatus: 'paid' }, 'Mark this order as paid? Only do this once you have confirmed the money was received.')}>Mark as paid</button>
              )}
              {order.paymentStatus === 'paid' && (
                <button className="admin-btn" disabled={busy} onClick={() => patch({ paymentStatus: 'refunded' }, 'Mark this payment as refunded? This records the refund; it does not send money.')}>Mark as refunded</button>
              )}
            </div>
            {message.text && <div className={message.tone === 'error' ? 'error' : 'admin-ok'}>{message.text}</div>}
          </section>
          <section className="form-card admin-section">
            <h2>Customer & delivery</h2>
            <dl className="admin-dl">
              <dt>Name</dt><dd>{order.customer.name}</dd>
              <dt>Phone</dt><dd><a href={`tel:+${order.customer.phone}`}>0{order.customer.phone.slice(3)}</a></dd>
              {order.customer.email && <><dt>Email</dt><dd><a href={`mailto:${order.customer.email}`}>{order.customer.email}</a></dd></>}
              <dt>Address</dt><dd>{order.delivery.address}{order.delivery.town ? `, ${order.delivery.town}` : ''}, {order.delivery.county}</dd>
              {order.notes && <><dt>Notes</dt><dd>{order.notes}</dd></>}
            </dl>
          </section>
          <section className="form-card admin-section">
            <h2>Payment attempts</h2>
            {!order.payments.length ? <p className="admin-muted">{order.paymentMethod === 'cod' ? 'Cash on delivery: collected by the rider.' : 'No payment attempts yet.'}</p> : (
              <div className="admin-list static">
                {order.payments.map((p, i) => (
                  <div key={i}>
                    <span><b>{p.provider === 'paystack' ? 'Card (Paystack)' : p.provider === 'mpesa' ? 'M-Pesa' : 'Simulated'} · {money(p.amount)}</b>
                      <small>{p.receipt ? `Receipt ${p.receipt}` : p.failureReason || formatDate(p.createdAt)}</small></span>
                    <span className={`payment-state ${p.status}`}>{p.status === 'success' ? 'Paid' : p.status === 'failed' ? 'Failed' : 'Pending'}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

const EMPTY_PRODUCT = { name: '', category: '', price: '', oldPrice: '', stock: '', badge: '', image: '', description: '', isActive: true };

function ProductsAdmin() {
  const { categories } = useCatalog();
  const [filters, setFilters] = useState({ q: '', category: '', includeInactive: false, page: 1 });
  const [editing, setEditing] = useState(null);
  const { data, error, loading, reload } = useApi(`/admin/products${query({ ...filters, includeInactive: filters.includeInactive ? 'true' : '', limit: PAGE_SIZE })}`);
  const categoryName = (slug) => categories.find((c) => c.slug === slug)?.name || slug;
  const set = (changes) => setFilters((f) => ({ ...f, page: 1, ...changes }));

  const toggleActive = async (product) => {
    if (product.isActive && !window.confirm(`Hide "${product.name}" from the store? You can restore it later.`)) return;
    try {
      await (product.isActive
        ? api(`/admin/products/${product.id}`, { method: 'DELETE' })
        : api(`/admin/products/${product.id}`, { method: 'PATCH', body: { isActive: true } }));
      reload();
    } catch (err) { window.alert(errorText(err)); }
  };

  if (editing) {
    return <ProductForm product={editing} categories={categories} onDone={(saved) => { setEditing(null); if (saved) reload(); }} />;
  }

  return (
    <section className="form-card admin-section">
      <div className="admin-toolbar">
        <SearchBox value={filters.q} onSearch={(q) => set({ q })} placeholder="Search products" />
        <select value={filters.category} onChange={(e) => set({ category: e.target.value })} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <label className="admin-check"><input type="checkbox" checked={filters.includeInactive} onChange={(e) => set({ includeInactive: e.target.checked })} />Show hidden</label>
        <button className="primary admin-add" onClick={() => setEditing(EMPTY_PRODUCT)}><Plus size={16} />Add product</button>
      </div>
      {error && <div className="error">{error}</div>}
      {loading && !data ? <Loading /> : data && (!data.items.length ? <p className="admin-muted">No products match.</p> : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr></thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id} className={p.isActive ? '' : 'inactive'}>
                    <td><span className="admin-product">{p.image ? <img src={p.image} alt="" /> : <span className="admin-noimg"><PackageCheck size={18} /></span>}<span><b>{p.name}</b><small>#{p.id}{p.badge ? ` · ${p.badge}` : ''}</small></span></span></td>
                    <td>{categoryName(p.category)}</td>
                    <td><b>{money(p.price)}</b>{p.oldPrice ? <small><del>{money(p.oldPrice)}</del></small> : null}</td>
                    <td><span className={`stock-badge ${p.stock === 0 ? 'out' : p.stock <= 5 ? 'low' : ''}`}>{p.stock}</span></td>
                    <td>{p.isActive ? 'Live' : 'Hidden'}</td>
                    <td className="admin-row-actions">
                      <button className="admin-btn" onClick={() => setEditing(p)}>Edit</button>
                      <button className="admin-btn" onClick={() => toggleActive(p)}>{p.isActive ? 'Hide' : 'Restore'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={filters.page} total={data.total} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
        </>
      ))}
    </section>
  );
}

function ProductForm({ product, categories, onDone }) {
  const isNew = !product.id;
  const [form, setForm] = useState({
    ...EMPTY_PRODUCT,
    ...product,
    oldPrice: product.oldPrice ?? '',
    badge: product.badge ?? '',
    image: product.image ?? '',
    category: product.category || categories[0]?.slug || '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const field = (key) => ({ value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const body = {
      name: form.name, category: form.category, price: form.price, stock: form.stock,
      oldPrice: form.oldPrice, badge: form.badge, image: form.image, description: form.description, isActive: form.isActive,
    };
    // A new product has nothing to clear, so leave its empty optional fields out.
    if (isNew) for (const key of ['oldPrice', 'badge', 'image']) if (body[key] === '') delete body[key];
    try {
      await api(isNew ? '/admin/products' : `/admin/products/${product.id}`, { method: isNew ? 'POST' : 'PATCH', body });
      onDone(true);
    } catch (err) {
      setError(errorText(err)); setBusy(false);
    }
  };

  return (
    <form className="form-card admin-section admin-form" onSubmit={save}>
      <button type="button" className="admin-btn" onClick={() => onDone(false)}><ArrowLeft size={16} />All products</button>
      <h2>{isNew ? 'Add product' : `Edit #${product.id}`}</h2>
      <div className="admin-form-layout">
        <div className="form-grid">
          <label className="wide">Name<input required minLength={2} maxLength={200} {...field('name')} /></label>
          <label>Category<select required {...field('category')}>{categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>
          <label>Badge (optional)<input maxLength={40} placeholder="e.g. Hot Deal" {...field('badge')} /></label>
          <label>Price (KES)<input required type="number" min="0" step="1" inputMode="numeric" {...field('price')} /></label>
          <label>Was price (KES, optional)<input type="number" min="0" step="1" inputMode="numeric" placeholder="Shows a discount" {...field('oldPrice')} /></label>
          <label>Stock<input required type="number" min="0" step="1" inputMode="numeric" {...field('stock')} /></label>
          <label className="admin-check inline"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />Visible in the store</label>
          <label className="wide">Image URL (optional)<input type="url" placeholder="https://…" {...field('image')} /></label>
          <label className="wide">Description<textarea rows={4} maxLength={5000} {...field('description')} /></label>
        </div>
        <div className="admin-preview">{form.image ? <img src={form.image} alt="Preview" /> : <span className="admin-noimg"><PackageCheck size={32} /></span>}<small>Image preview</small></div>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="admin-actions">
        <button className="primary" disabled={busy} aria-busy={busy}>{busy ? <ButtonSpinner label="Saving" /> : isNew ? 'Add product' : 'Save changes'}</button>
        <button type="button" className="admin-btn" onClick={() => onDone(false)}>Cancel</button>
      </div>
      <p className="admin-muted">Shoppers see changes the next time they load the store.</p>
    </form>
  );
}

function CustomersAdmin({ currentUserId }) {
  const [filters, setFilters] = useState({ q: '', page: 1 });
  const { data, error, loading, reload } = useApi(`/admin/users${query({ ...filters, limit: PAGE_SIZE })}`);

  const setRole = async (person, role) => {
    const prompt = role === 'admin'
      ? `Give ${person.name} full admin access? They will be able to change products, orders and other admins.`
      : `Remove admin access from ${person.name}?`;
    if (!window.confirm(prompt)) return;
    try { await api(`/admin/users/${person.id}`, { method: 'PATCH', body: { role } }); reload(); } catch (err) { window.alert(errorText(err)); }
  };

  return (
    <section className="form-card admin-section">
      <div className="admin-toolbar"><SearchBox value={filters.q} onSearch={(q) => setFilters({ q, page: 1 })} placeholder="Name, email or phone" /></div>
      {error && <div className="error">{error}</div>}
      {loading && !data ? <Loading /> : data && (!data.items.length ? <p className="admin-muted">No customers match.</p> : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th><th /></tr></thead>
              <tbody>
                {data.items.map((person) => (
                  <tr key={person.id}>
                    <td><b>{person.name}</b></td>
                    <td>{person.email}</td>
                    <td>{person.phone ? `0${person.phone.slice(3)}` : '—'}</td>
                    <td>{person.role === 'admin' ? <span className="status-pill confirmed">Admin</span> : 'Customer'}</td>
                    <td>{formatDate(person.createdAt)}</td>
                    <td className="admin-row-actions">
                      {person.id === currentUserId ? <small>You</small>
                        : <button className="admin-btn" onClick={() => setRole(person, person.role === 'admin' ? 'customer' : 'admin')}>{person.role === 'admin' ? 'Remove admin' : 'Make admin'}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={filters.page} total={data.total} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
        </>
      ))}
    </section>
  );
}
