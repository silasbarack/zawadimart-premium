import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck, ChevronDown, ChevronLeft, ChevronRight, CircleCheck,
  CircleUserRound, CreditCard, Heart, Headphones, Home, LayoutGrid,
  MapPin, Menu, Minus, PackageCheck, Plus, Search, ShieldCheck,
  ShoppingBag, ShoppingCart, Smartphone, Star, Tag, Trash2, Truck,
  X
} from 'lucide-react';
import {
  Link, NavLink, Route, Routes, useLocation, useNavigate,
  useParams, useSearchParams
} from 'react-router-dom';
import { categories, getCategory, getProduct, money, products } from './data';

const discount = (product) =>
  Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);

function BrandLogo({ compact = false }) {
  return (
    <span className={`brand-logo ${compact ? 'compact' : ''}`}>
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="4" y="7" width="40" height="36" rx="11" fill="#109b59" />
        <path d="M15 19.2h18l-1.4 15.4H16.4L15 19.2Z" fill="#ffffff" opacity=".98" />
        <path d="M19 19.2c0-4.2 2-6.7 5-6.7s5 2.5 5 6.7" fill="none" stroke="#ffffff" strokeWidth="2.7" strokeLinecap="round" />
        <path d="M19.1 24.2h10.4l-7.8 7.5h8.1" fill="none" stroke="#109b59" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="38.2" cy="11.2" r="4.6" fill="#f6b73c" />
        <path d="M38.2 8.8v4.8M35.8 11.2h4.8" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="brand-wordmark">
        <span>Zawadi</span><strong>Mart</strong>
        <small>SHOP SMART · LIVE BETTER</small>
      </span>
    </span>
  );
}

function App() {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zawadimart-cart')) || []; }
    catch { return []; }
  });
  const [wishlist, setWishlist] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState('');
  const location = useLocation();

  useEffect(() => {
    localStorage.setItem('zawadimart-cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartRows = cart
    .map((item) => ({ ...item, product: getProduct(item.id) }))
    .filter((item) => item.product);
  const subtotal = cartRows.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(window.__zawadiToast);
    window.__zawadiToast = window.setTimeout(() => setToast(''), 1900);
  };

  const addToCart = (id, qty = 1) => {
    const product = getProduct(id);
    setCart((current) => {
      const existing = current.find((item) => item.id === id);
      return existing
        ? current.map((item) => item.id === id ? { ...item, qty: Math.min(item.qty + qty, product.stock) } : item)
        : [...current, { id, qty: Math.min(qty, product.stock) }];
    });
    notify(`${product.name} added to cart`);
  };

  const setQty = (id, qty) => {
    if (qty <= 0) {
      setCart((current) => current.filter((item) => item.id !== id));
      return;
    }
    const product = getProduct(id);
    setCart((current) => current.map((item) =>
      item.id === id ? { ...item, qty: Math.min(qty, product.stock) } : item
    ));
  };

  const removeFromCart = (id) =>
    setCart((current) => current.filter((item) => item.id !== id));

  const toggleWishlist = (id) => {
    setWishlist((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const shared = { addToCart, wishlist, toggleWishlist };

  return (
    <div className="app-shell">
      {toast && <div className="toast"><CircleCheck size={17} />{toast}</div>}
      <Header cartCount={cartCount} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />

      <Routes>
        <Route path="/" element={<HomePage {...shared} />} />
        <Route path="/shop" element={<ShopPage {...shared} />} />
        <Route path="/category/:slug" element={<CategoryPage {...shared} />} />
        <Route path="/product/:id" element={<ProductPage {...shared} />} />
        <Route path="/deals" element={<DealsPage {...shared} />} />
        <Route path="/cart" element={
          <CartPage rows={cartRows} subtotal={subtotal} setQty={setQty} removeFromCart={removeFromCart} />
        } />
        <Route path="/checkout" element={
          <CheckoutPage rows={cartRows} subtotal={subtotal} clearCart={() => setCart([])} />
        } />
        <Route path="/order-success" element={<OrderSuccessPage />} />
        <Route path="/track-order" element={<TrackOrderPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <Footer />
      <MobileBottomNav cartCount={cartCount} />
    </div>
  );
}

function Header({ cartCount, menuOpen, setMenuOpen }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const submitSearch = (event) => {
    event.preventDefault();
    if (query.trim()) navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
    else navigate('/shop');
  };

  return (
    <>
      <div className="utility-bar">
        <div className="container utility-inner">
          <span>Kenya's trusted online marketplace</span>
          <div className="utility-links">
            <Link to="/track-order">Track Order</Link>
            <span>•</span>
            <Link to="/account">Help & Account</Link>
            <span>•</span>
            <span>Sell on ZawadiMart</span>
          </div>
        </div>
      </div>

      <header className="main-header">
        <div className="container header-row">
          <button className="icon-button mobile-only" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
            <Menu size={23} />
          </button>

          <Link className="brand" to="/" aria-label="ZawadiMart home"><BrandLogo /></Link>

          <form className="desktop-search" onSubmit={submitSearch}>
            <Search size={18} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search for products, brands and more..." />
            <button type="submit">Search</button>
          </form>

          <div className="header-action location-action">
            <MapPin size={19} />
            <span><small>Deliver to</small><strong>Nairobi</strong></span>
          </div>

          <Link className="header-action" to="/account">
            <CircleUserRound size={20} />
            <span><small>Hello, sign in</small><strong>Account</strong></span>
          </Link>

          <Link className="cart-button" to="/cart" aria-label="Shopping cart">
            <ShoppingCart size={25} />
            <span className="cart-badge">{cartCount}</span>
          </Link>
        </div>

        <div className="container mobile-search-wrap">
          <form className="mobile-search" onSubmit={submitSearch}>
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products, brands..." />
          </form>
        </div>
      </header>

      <nav className="category-nav">
        <div className="container nav-inner">
          <Link className="all-categories" to="/shop">
            <Menu size={18} /><span>All Categories</span><ChevronDown size={15} />
          </Link>
          {categories.slice(0, 7).map((category) => (
            <NavLink key={category.slug} to={`/category/${category.slug}`}>{category.name}</NavLink>
          ))}
          <NavLink className="deals-link" to="/deals">Deals</NavLink>
        </div>
      </nav>

      <div className={`mobile-drawer ${menuOpen ? 'open' : ''}`}>
        <button className="drawer-overlay" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />
        <aside className="drawer-panel">
          <div className="drawer-head">
            <Link className="brand" to="/"><BrandLogo compact /></Link>
            <button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X /></button>
          </div>
          <Link to="/shop"><LayoutGrid size={18} />All Categories</Link>
          {categories.map((category) => (
            <Link key={category.slug} to={`/category/${category.slug}`}><span>{category.icon}</span>{category.name}</Link>
          ))}
          <Link className="drawer-deal" to="/deals"><Tag size={18} />Deals & Offers</Link>
          <Link to="/track-order"><PackageCheck size={18} />Track Order</Link>
          <Link to="/account"><CircleUserRound size={18} />My Account</Link>
        </aside>
      </div>
    </>
  );
}

function HomePage(props) {
  return (
    <main>
      <section className="container hero-wrap">
        <div className="hero">
          <div className="hero-copy">
            <span className="eyebrow">EVERYDAY VALUE • FAST DELIVERY</span>
            <h1>A Brighter Way<br />to Shop in <span>Kenya</span></h1>
            <p>Discover useful products, fair prices and a checkout built for how Kenya shops.</p>
            <div className="hero-actions">
              <Link to="/shop" className="primary-button">Shop now <ChevronRight size={17} /></Link>
              <Link to="/deals" className="secondary-button">View deals</Link>
            </div>
          </div>
          <div className="hero-photo-wrap">
            <img
              className="hero-photo"
              src="https://images.unsplash.com/photo-1618375531912-867984bdfd87?auto=format&fit=crop&w=1200&q=90"
              alt="Happy shopper with shopping bags"
            />
          </div>
          <div className="hero-note">Shop local.<br />Live better.</div>
          <div className="skyline" aria-hidden="true"><span/><span/><span/><span/><span/></div>
        </div>
      </section>

      <TrustStrip />

      <section className="container section-block">
        <SectionHeading title="Top Categories" link="/shop" label="View all" />
        <div className="categories-grid">
          {categories.map((category) => (
            <Link className="category-card" to={`/category/${category.slug}`} key={category.slug}>
              <div className="category-image"><img src={category.image} alt={category.name} /></div>
              <span>{category.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container section-block">
        <SectionHeading title="Featured Deals" link="/deals" label="View all deals" />
        <ProductGrid products={products.slice(0, 10)} {...props} />
      </section>

      <section className="container promo-grid">
        <article className="promo-card green">
          <div>
            <span>HOME UPGRADE</span>
            <h3>Make everyday living easier.</h3>
            <p>Kitchen and home essentials at practical prices.</p>
            <Link to="/category/home-appliances">Shop home <ChevronRight size={15}/></Link>
          </div>
          <ShoppingBag size={88} />
        </article>
        <article className="promo-card dark">
          <div>
            <span>TECH PICKS</span>
            <h3>Smart gear for work and play.</h3>
            <p>Phones, laptops, accessories and gaming essentials.</p>
            <Link to="/category/electronics">Shop tech <ChevronRight size={15}/></Link>
          </div>
          <Smartphone size={88} />
        </article>
      </section>

      <section className="container section-block home-last">
        <SectionHeading title="Popular Right Now" link="/shop" label="Browse more" />
        <ProductGrid products={products.slice(18, 28)} {...props} />
      </section>
    </main>
  );
}

function TrustStrip() {
  const benefits = [
    [Truck, 'Fast Delivery', 'Across Nairobi & selected towns'],
    [ShieldCheck, 'Secure Checkout', 'Protected payment experience'],
    [Headphones, 'Helpful Support', 'Assistance when you need it'],
    [BadgeCheck, 'Quality Selection', 'Products chosen with care'],
  ];
  return (
    <section className="container trust-strip">
      {benefits.map(([Icon, title, text]) => (
        <div className="trust-item" key={title}>
          <span className="trust-icon"><Icon /></span>
          <span><strong>{title}</strong><small>{text}</small></span>
        </div>
      ))}
    </section>
  );
}

function SectionHeading({ title, link, label }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      <Link to={link}>{label} <ChevronRight size={16} /></Link>
    </div>
  );
}

function ProductGrid({ products: items, addToCart, wishlist, toggleWishlist }) {
  if (!items.length) return <div className="empty-state">No matching products were found.</div>;
  return (
    <div className="products-grid">
      {items.map((product) => (
        <ProductCard key={product.id} product={product} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />
      ))}
    </div>
  );
}

function ProductCard({ product, addToCart, wishlist, toggleWishlist }) {
  return (
    <article className="product-card">
      <Link className="product-media" to={`/product/${product.id}`}>
        <span className="discount-badge">-{discount(product)}%</span>
        <button
          className={`heart-button ${wishlist.includes(product.id) ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); toggleWishlist(product.id); }}
          aria-label="Save product"
        >
          <Heart size={17} fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} />
        </button>
        <img src={product.image} alt={product.name} loading="lazy" />
      </Link>
      <div className="product-info">
        <Link to={`/product/${product.id}`}><h3>{product.name}</h3></Link>
        <div className="rating-line"><Star size={12} fill="currentColor" />{product.rating}<span>({product.reviews})</span></div>
        <div className="price-line"><strong>{money(product.price)}</strong><del>{money(product.oldPrice)}</del></div>
        <button className="add-button" onClick={() => addToCart(product.id)}>Add to Cart</button>
      </div>
    </article>
  );
}

function ShopPage(props) {
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') || '').toLowerCase();
  const [sort, setSort] = useState('featured');
  const [category, setCategory] = useState('all');

  const filtered = useMemo(() => {
    let list = products.filter((product) =>
      (!q || (product.name + ' ' + product.description).toLowerCase().includes(q)) &&
      (category === 'all' || product.category === category)
    );
    if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price);
    if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [q, sort, category]);

  return (
    <main className="container page-shell">
      <Breadcrumb items={[['Home','/'],['Shop']]} />
      <div className="catalog-heading">
        <div><span className="page-kicker">ZAWADIMART CATALOG</span><h1>{q ? `Results for “${searchParams.get('q')}”` : 'Shop all products'}</h1><p>{filtered.length} products available</p></div>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="featured">Sort: Featured</option>
          <option value="low">Price: Low to high</option>
          <option value="high">Price: High to low</option>
          <option value="rating">Customer rating</option>
        </select>
      </div>
      <div className="filter-chips">
        <button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>All</button>
        {categories.map((item) => (
          <button className={category === item.slug ? 'active' : ''} key={item.slug} onClick={() => setCategory(item.slug)}>
            {item.name}
          </button>
        ))}
      </div>
      <ProductGrid products={filtered} {...props} />
    </main>
  );
}

function CategoryPage(props) {
  const { slug } = useParams();
  const category = getCategory(slug);
  if (!category) return <NotFoundPage />;
  const items = products.filter((product) => product.category === slug);
  return (
    <main className="container page-shell">
      <Breadcrumb items={[['Home','/'],['Shop','/shop'],[category.name]]} />
      <section className="category-hero">
        <div><span className="page-kicker">{category.icon} CURATED CATEGORY</span><h1>{category.name}</h1><p>Explore our latest {category.name.toLowerCase()} picks with prices shown in Kenyan shillings.</p></div>
        <img src={category.image} alt={category.name} />
      </section>
      <ProductGrid products={items} {...props} />
    </main>
  );
}

function DealsPage(props) {
  const deals = [...products].sort((a, b) => discount(b) - discount(a));
  return (
    <main className="container page-shell">
      <Breadcrumb items={[['Home','/'],['Deals']]} />
      <div className="deal-banner">
        <span>LIMITED-TIME SAVINGS</span>
        <h1>Deals worth adding to cart.</h1>
        <p>Browse discounted picks across tech, fashion, beauty, home and more.</p>
      </div>
      <ProductGrid products={deals} {...props} />
    </main>
  );
}

function ProductPage({ addToCart, wishlist, toggleWishlist }) {
  const { id } = useParams();
  const product = getProduct(id);
  const [qty, setQty] = useState(1);
  if (!product) return <NotFoundPage />;
  const category = getCategory(product.category);
  const related = products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4);

  return (
    <main className="container page-shell">
      <Breadcrumb items={[['Home','/'],[category.name,`/category/${category.slug}`],[product.name]]} />
      <section className="product-detail">
        <div className="product-gallery">
          <span className="deal-pill">Save {discount(product)}%</span>
          <img src={product.image} alt={product.name} />
        </div>
        <div className="product-copy">
          <span className="page-kicker">{category.name}</span>
          <h1>{product.name}</h1>
          <div className="detail-rating"><Star size={16} fill="currentColor" /> {product.rating} <span>{product.reviews} reviews</span></div>
          <div className="detail-price"><strong>{money(product.price)}</strong><del>{money(product.oldPrice)}</del></div>
          <p>{product.description}</p>
          <div className="stock-line"><CircleCheck size={17}/> In stock — {product.stock} units available</div>
          <div className="detail-actions">
            <div className="qty-picker">
              <button onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={16}/></button>
              <span>{qty}</span>
              <button onClick={() => setQty(Math.min(product.stock, qty + 1))}><Plus size={16}/></button>
            </div>
            <button className="detail-cart" onClick={() => addToCart(product.id, qty)}><ShoppingCart size={18}/> Add to cart</button>
            <button className={`detail-heart ${wishlist.includes(product.id) ? 'active' : ''}`} onClick={() => toggleWishlist(product.id)}><Heart size={19} fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} /></button>
          </div>
          <div className="purchase-benefits">
            <span><Truck size={17}/><b>Delivery</b><small>Calculated at checkout</small></span>
            <span><ShieldCheck size={17}/><b>Secure</b><small>Protected checkout</small></span>
            <span><PackageCheck size={17}/><b>Returns</b><small>Easy support process</small></span>
          </div>
        </div>
      </section>
      <section className="section-block">
        <SectionHeading title="You may also like" link={`/category/${category.slug}`} label="More in category" />
        <ProductGrid products={related} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} />
      </section>
    </main>
  );
}

function CartPage({ rows, subtotal, setQty, removeFromCart }) {
  const delivery = subtotal >= 10000 ? 0 : (subtotal ? 350 : 0);
  return (
    <main className="container page-shell">
      <Breadcrumb items={[['Home','/'],['Cart']]} />
      <div className="page-title"><h1>Your cart</h1><p>{rows.length ? 'Review your items before checkout.' : 'Your cart is ready for something good.'}</p></div>
      {!rows.length ? (
        <div className="empty-cart">
          <ShoppingCart size={50}/><h2>Your cart is empty</h2><p>Explore the store and add something you like.</p><Link className="primary-button" to="/shop">Start shopping</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <section className="cart-list">
            {rows.map(({ product, qty }) => (
              <article className="cart-row" key={product.id}>
                <Link to={`/product/${product.id}`}><img src={product.image} alt={product.name}/></Link>
                <div className="cart-copy">
                  <Link to={`/product/${product.id}`}><h3>{product.name}</h3></Link>
                  <span>In stock</span>
                  <strong>{money(product.price)}</strong>
                </div>
                <div className="cart-controls">
                  <div className="qty-picker">
                    <button onClick={() => setQty(product.id, qty - 1)}><Minus size={15}/></button>
                    <span>{qty}</span>
                    <button onClick={() => setQty(product.id, qty + 1)}><Plus size={15}/></button>
                  </div>
                  <button className="remove-button" onClick={() => removeFromCart(product.id)}><Trash2 size={16}/> Remove</button>
                </div>
              </article>
            ))}
          </section>
          <OrderSummary subtotal={subtotal} delivery={delivery} checkout />
        </div>
      )}
    </main>
  );
}

function OrderSummary({ subtotal, delivery, checkout = false }) {
  const total = subtotal + delivery;
  return (
    <aside className="order-summary">
      <h2>Order summary</h2>
      <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
      <div><span>Delivery</span><strong>{delivery ? money(delivery) : 'FREE'}</strong></div>
      <div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div>
      {checkout && <Link className="checkout-button" to="/checkout">Proceed to checkout <ChevronRight size={17}/></Link>}
      <p><ShieldCheck size={15}/> Secure checkout experience</p>
    </aside>
  );
}

function CheckoutPage({ rows, subtotal, clearCart }) {
  const navigate = useNavigate();
  const [method, setMethod] = useState('mpesa');
  const [error, setError] = useState('');
  const delivery = subtotal >= 10000 ? 0 : (subtotal ? 350 : 0);

  const submit = (event) => {
    event.preventDefault();
    if (!rows.length) return navigate('/cart');
    const form = new FormData(event.currentTarget);
    if (!form.get('fullName') || !form.get('phone') || !form.get('address')) {
      setError('Please complete your contact and delivery details.');
      return;
    }
    if (method === 'mpesa' && !/^((\+?254)|0)?7\d{8}$/.test(String(form.get('mpesa')).replace(/\s/g,''))) {
      setError('Enter a valid Kenyan M-Pesa phone number.');
      return;
    }
    if (method === 'card') {
      const card = String(form.get('cardNumber')).replace(/\s/g,'');
      if (card.length < 13 || !form.get('cardName') || String(form.get('cvc')).length < 3) {
        setError('Please complete the card details correctly.');
        return;
      }
    }
    clearCart();
    navigate('/order-success', { state: { method, total: subtotal + delivery } });
  };

  if (!rows.length) {
    return (
      <main className="container page-shell">
        <div className="empty-cart"><ShoppingBag size={52}/><h2>No items to checkout</h2><p>Add products to your cart first.</p><Link className="primary-button" to="/shop">Browse products</Link></div>
      </main>
    );
  }

  return (
    <main className="container page-shell">
      <Breadcrumb items={[['Home','/'],['Cart','/cart'],['Checkout']]} />
      <div className="checkout-title"><div><span className="page-kicker">SECURE CHECKOUT</span><h1>Complete your order</h1><p>Delivery and payment details</p></div><ShieldCheck size={36}/></div>
      <form className="checkout-layout" onSubmit={submit}>
        <div className="checkout-forms">
          <section className="form-card">
            <div className="form-card-title"><span>1</span><div><h2>Contact & delivery</h2><p>Where should we deliver your order?</p></div></div>
            <div className="form-grid">
              <label>Full name<input name="fullName" placeholder="e.g. Amina Wanjiku" /></label>
              <label>Phone number<input name="phone" inputMode="tel" placeholder="0712 345 678" /></label>
              <label className="wide">Email address<input name="email" type="email" placeholder="you@example.com" /></label>
              <label className="wide">Delivery address<input name="address" placeholder="Estate, street / building, house number" /></label>
              <label>County<select name="county" defaultValue="Nairobi"><option>Nairobi</option><option>Kiambu</option><option>Machakos</option><option>Kajiado</option><option>Mombasa</option><option>Nakuru</option><option>Kisumu</option></select></label>
              <label>Town / area<input name="town" placeholder="e.g. Kilimani" /></label>
            </div>
          </section>

          <section className="form-card">
            <div className="form-card-title"><span>2</span><div><h2>Payment method</h2><p>Choose how you would like to pay.</p></div></div>
            <div className="payment-tabs">
              <button type="button" className={method === 'mpesa' ? 'active' : ''} onClick={() => setMethod('mpesa')}><Smartphone size={20}/><span><b>M-Pesa</b><small>Pay from your phone</small></span></button>
              <button type="button" className={method === 'card' ? 'active' : ''} onClick={() => setMethod('card')}><CreditCard size={20}/><span><b>Card</b><small>Visa / Mastercard</small></span></button>
            </div>

            {method === 'mpesa' ? (
              <div className="payment-panel">
                <div className="mpesa-mark">M-PESA</div>
                <label>M-Pesa phone number<input name="mpesa" inputMode="tel" placeholder="0712 345 678" /></label>
                <p>An STK Push would be sent to this number after a live payment gateway is connected.</p>
              </div>
            ) : (
              <div className="payment-panel">
                <div className="card-visual"><span>ZawadiMart</span><CreditCard/><small>Secure card checkout</small></div>
                <div className="form-grid card-fields">
                  <label className="wide">Name as it appears on the card<input name="cardName" autoComplete="cc-name" placeholder="CARDHOLDER NAME" /></label>
                  <label className="wide">Card number<input name="cardNumber" autoComplete="cc-number" inputMode="numeric" placeholder="1234 5678 9012 3456" maxLength="23" /></label>
                  <label>Expiry date<input name="expiry" autoComplete="cc-exp" placeholder="MM / YY" maxLength="7" /></label>
                  <label>CVC<input name="cvc" autoComplete="cc-csc" inputMode="numeric" placeholder="123" maxLength="4" /></label>
                </div>
                <p>Card details are not stored by this frontend. Connect a PCI-compliant payment gateway for live processing.</p>
              </div>
            )}
          </section>

          {error && <div className="form-error">{error}</div>}
          <div className="demo-note"><ShieldCheck size={17}/><span><strong>Frontend preview:</strong> this checkout simulates an order confirmation. No real M-Pesa or card charge is made until a live payment backend is integrated.</span></div>
        </div>

        <div>
          <aside className="checkout-items">
            <h2>Your order</h2>
            {rows.map(({ product, qty }) => (
              <div className="checkout-item" key={product.id}><img src={product.image} alt=""/><span><b>{product.name}</b><small>Qty {qty}</small></span><strong>{money(product.price * qty)}</strong></div>
            ))}
          </aside>
          <OrderSummary subtotal={subtotal} delivery={delivery} />
          <button className="place-order-button" type="submit">{method === 'mpesa' ? 'Place order with M-Pesa' : 'Place order with card'} <ChevronRight size={17}/></button>
        </div>
      </form>
    </main>
  );
}

function OrderSuccessPage() {
  const location = useLocation();
  const method = location.state?.method || 'payment';
  const total = location.state?.total;
  const orderNo = useMemo(() => `ZM-${Math.floor(100000 + Math.random() * 900000)}`, []);
  return (
    <main className="container page-shell success-wrap">
      <div className="success-card">
        <div className="success-icon"><CircleCheck size={50}/></div>
        <span className="page-kicker">ORDER RECEIVED</span>
        <h1>Thank you for shopping with us.</h1>
        <p>Your demo order has been created successfully using {method === 'mpesa' ? 'M-Pesa' : 'card'} checkout.</p>
        <div className="success-order"><span>Order number</span><strong>{orderNo}</strong>{total && <><span>Total</span><strong>{money(total)}</strong></>}</div>
        <div className="success-actions"><Link className="primary-button" to="/shop">Continue shopping</Link><Link className="secondary-button" to="/track-order">Track order</Link></div>
      </div>
    </main>
  );
}

function TrackOrderPage() {
  const [shown, setShown] = useState(false);
  return (
    <main className="container narrow-page">
      <Breadcrumb items={[['Home','/'],['Track order']]} />
      <div className="page-title"><span className="page-kicker">ORDER TRACKING</span><h1>Where is my order?</h1><p>Enter your order reference to see the delivery journey.</p></div>
      <form className="track-card" onSubmit={(e) => { e.preventDefault(); setShown(true); }}>
        <label>Order number<input placeholder="e.g. ZM-381204" /></label>
        <label>Phone or email<input placeholder="Used at checkout" /></label>
        <button className="primary-button" type="submit">Track order</button>
      </form>
      {shown && <div className="tracking-result"><h3>Order status</h3><div className="track-steps"><span className="done">Order placed</span><span className="done">Confirmed</span><span>Out for delivery</span><span>Delivered</span></div><p>This is a frontend demonstration of the tracking experience.</p></div>}
    </main>
  );
}

function AccountPage() {
  return (
    <main className="container narrow-page">
      <Breadcrumb items={[['Home','/'],['Account']]} />
      <div className="account-card">
        <div className="account-icon"><CircleUserRound size={42}/></div>
        <span className="page-kicker">MY ZAWADIMART</span>
        <h1>Welcome back</h1>
        <p>Sign in to manage orders, saved items and delivery information.</p>
        <label>Email or phone<input placeholder="you@example.com" /></label>
        <label>Password<input type="password" placeholder="••••••••" /></label>
        <button className="primary-button">Sign in</button>
        <div className="account-divider"><span>or</span></div>
        <button className="secondary-button account-register">Create a new account</button>
      </div>
    </main>
  );
}

function Breadcrumb({ items }) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      {items.map(([label, href], index) => (
        <span key={label}>{index > 0 && <ChevronRight size={13}/>} {href ? <Link to={href}>{label}</Link> : <b>{label}</b>}</span>
      ))}
    </nav>
  );
}

function NotFoundPage() {
  return (
    <main className="container narrow-page">
      <div className="empty-cart"><span className="big-404">404</span><h2>That page wandered off.</h2><p>Head back to the shop and keep browsing.</p><Link className="primary-button" to="/">Back home</Link></div>
    </main>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div><Link className="brand footer-brand" to="/"><BrandLogo compact /></Link><p>A modern Kenyan shopping experience built around clear pricing, useful products and convenient checkout.</p></div>
        <div><h4>Shop</h4><Link to="/shop">All products</Link><Link to="/deals">Deals</Link><Link to="/category/electronics">Electronics</Link><Link to="/category/fashion">Fashion</Link></div>
        <div><h4>Help</h4><Link to="/track-order">Track order</Link><Link to="/account">My account</Link><span>Delivery information</span><span>Returns & support</span></div>
        <div><h4>Payments</h4><span>M-Pesa</span><span>Visa / Mastercard</span><span>Prices in KES</span><span>Secure checkout</span></div>
      </div>
      <div className="container footer-bottom">© 2026 ZawadiMart. Storefront UI demonstration.</div>
    </footer>
  );
}

function MobileBottomNav({ cartCount }) {
  return (
    <nav className="mobile-bottom-nav">
      <NavLink to="/"><Home size={19}/><span>Home</span></NavLink>
      <NavLink to="/shop"><LayoutGrid size={19}/><span>Shop</span></NavLink>
      <NavLink to="/deals"><Tag size={19}/><span>Deals</span></NavLink>
      <NavLink to="/cart" className="mobile-cart-link"><ShoppingCart size={19}/><span>Cart</span>{cartCount > 0 && <i>{cartCount}</i>}</NavLink>
      <NavLink to="/account"><CircleUserRound size={19}/><span>Account</span></NavLink>
    </nav>
  );
}

export default App;
