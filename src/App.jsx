import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Headphones,
  Heart,
  Home,
  LayoutGrid,
  MapPin,
  Menu,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Truck,
  X
} from 'lucide-react';

const categories = [
  { name: 'Smartphones', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=90' },
  { name: 'Electronics', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=500&q=90' },
  { name: 'Fashion', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=500&q=90' },
  { name: 'Shoes', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=90' },
  { name: 'Home Appliances', image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=500&q=90' },
  { name: 'Beauty Products', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=500&q=90' },
  { name: 'Accessories', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=90' }
];

const products = [
  {
    id: 1,
    name: 'Nova X5 Smartphone',
    meta: '8GB RAM | 256GB',
    price: 24999,
    oldPrice: 32999,
    discount: 24,
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=95'
  },
  {
    id: 2,
    name: 'ProBook 14 Laptop',
    meta: 'Intel Core i5 | 8GB | 512GB',
    price: 54999,
    oldPrice: 69999,
    discount: 21,
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=95'
  },
  {
    id: 3,
    name: 'Tune Pro Wireless Earbuds',
    meta: '36h Charging Case',
    price: 1800,
    oldPrice: 2999,
    discount: 40,
    image: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?auto=format&fit=crop&w=700&q=95'
  },
  {
    id: 4,
    name: 'Urban Step Sneakers',
    meta: 'Unisex',
    price: 3499,
    oldPrice: 4999,
    discount: 30,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=95'
  },
  {
    id: 5,
    name: 'HomeChef Air Fryer',
    meta: '5.5L | 1700W',
    price: 12999,
    oldPrice: 16999,
    discount: 24,
    image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=700&q=95'
  }
];

const navItems = ['Smartphones', 'Electronics', 'Fashion', 'Shoes', 'Home Appliances', 'Beauty', 'Accessories'];

const formatMoney = (value) => new Intl.NumberFormat('en-KE').format(value);

function App() {
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products;
    return products.filter((product) =>
      (product.name + ' ' + product.meta).toLowerCase().includes(normalized)
    );
  }, [query]);

  const addToCart = (product) => {
    setCartCount((count) => count + 1);
    setToast(product.name + ' added to cart');
    window.setTimeout(() => setToast(''), 1800);
  };

  const toggleWishlist = (productId) => {
    setWishlist((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  };

  return (
    <div className="app-shell">
      {toast && <div className="toast">{toast}</div>}

      <div className="utility-bar">
        <div className="container utility-inner">
          <span>Kenya's trusted online marketplace</span>
          <div className="utility-links">
            <a href="#support">Help</a>
            <span>|</span>
            <a href="#orders">Track Order</a>
            <span>|</span>
            <a href="#sell">Sell on ZawadiMart</a>
          </div>
        </div>
      </div>

      <header className="main-header">
        <div className="container header-row">
          <button className="icon-button mobile-only" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>

          <a className="brand" href="#" aria-label="ZawadiMart home">
            <ShoppingCart className="brand-cart" size={29} strokeWidth={2.4} />
            <span>Zawadi</span><strong>Mart</strong>
          </a>

          <label className="desktop-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for products, brands and more..."
            />
          </label>

          <button className="header-action location-action">
            <MapPin size={19} />
            <span>
              <small>Deliver to</small>
              <strong>Nairobi</strong>
            </span>
          </button>

          <button className="header-action account-action">
            <CircleUserRound size={20} />
            <span>
              <small>Hello, Sign in</small>
              <strong>Account</strong>
            </span>
          </button>

          <button className="cart-button" aria-label="Shopping cart">
            <ShoppingCart size={25} />
            <span className="cart-badge">{cartCount}</span>
          </button>
        </div>

        <div className="container mobile-search-wrap">
          <label className="mobile-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for products, brands..."
            />
          </label>
        </div>
      </header>

      <nav className="category-nav">
        <div className="container nav-inner">
          <button className="all-categories">
            <Menu size={18} />
            <span>All Categories</span>
            <ChevronDown size={15} />
          </button>
          {navItems.map((item) => (
            <a key={item} href="#categories">{item}</a>
          ))}
          <a className="deals-link" href="#deals">Deals</a>
        </div>
      </nav>

      <main>
        <section className="container hero-wrap">
          <div className="hero">
            <div className="hero-copy">
              <h1>A Brighter Way<br />to Shop in <span>Kenya</span></h1>
              <p>Great products. Better prices. Happier you.</p>
              <a href="#deals" className="shop-button">
                Shop Now <ChevronRight size={17} />
              </a>
            </div>

            <div className="skyline-art" aria-hidden="true">
              <span className="building b1" />
              <span className="building b2" />
              <span className="building b3" />
              <span className="building b4" />
              <span className="building b5" />
              <span className="building b6" />
            </div>

            <img
              className="hero-person"
              src="https://images.unsplash.com/photo-1758525223013-290ae3620f53?auto=format&fit=crop&w=1200&q=90"
              alt="Smiling shopper carrying shopping bags"
            />
            <div className="hero-script">Shop Local.<br />Live Better.</div>
          </div>
        </section>

        <section className="container trust-strip" aria-label="Shopping benefits">
          <div className="trust-item">
            <span className="trust-icon"><Truck /></span>
            <span><strong>Free Delivery</strong><small>On select orders</small></span>
          </div>
          <div className="trust-item">
            <span className="trust-icon"><ShieldCheck /></span>
            <span><strong>Secure Payments</strong><small>100% safe</small></span>
          </div>
          <div className="trust-item">
            <span className="trust-icon"><Headphones /></span>
            <span><strong>24/7 Support</strong><small>We're here for you</small></span>
          </div>
          <div className="trust-item">
            <span className="trust-icon"><BadgeCheck /></span>
            <span><strong>Trusted by Kenyans</strong><small>Quality you can count on</small></span>
          </div>
        </section>

        <section id="categories" className="container section-block">
          <div className="section-heading">
            <h2>Top Categories</h2>
            <a href="#categories">View All <ChevronRight size={16} /></a>
          </div>

          <div className="categories-grid">
            {categories.map((category) => (
              <button className="category-card" key={category.name}>
                <div className="category-image">
                  <img src={category.image} alt="" />
                </div>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section id="deals" className="container section-block deals-section">
          <div className="section-heading">
            <h2>Featured Deals</h2>
            <a href="#deals">View All Deals <ChevronRight size={16} /></a>
          </div>

          <div className="products-grid">
            {filteredProducts.length ? filteredProducts.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-media">
                  <span className="discount-badge">-{product.discount}%</span>
                  <button
                    className={'heart-button ' + (wishlist.includes(product.id) ? 'active' : '')}
                    onClick={() => toggleWishlist(product.id)}
                    aria-label="Toggle wishlist"
                  >
                    <Heart size={17} fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} />
                  </button>
                  <img src={product.image} alt={product.name} />
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p>{product.meta}</p>
                  <div className="price-line">
                    <strong>KES {formatMoney(product.price)}</strong>
                    <del>KES {formatMoney(product.oldPrice)}</del>
                  </div>
                  <button className="add-button" onClick={() => addToCart(product)}>
                    Add to Cart
                  </button>
                </div>
              </article>
            )) : (
              <div className="empty-search">No products found. Try a different search.</div>
            )}
          </div>
        </section>
      </main>

      <nav className="mobile-bottom-nav">
        <a className="active" href="#"><Home size={19} /><span>Home</span></a>
        <a href="#categories"><LayoutGrid size={19} /><span>Categories</span></a>
        <a href="#deals"><Tag size={19} /><span>Deals</span></a>
        <a href="#account"><CircleUserRound size={19} /><span>Account</span></a>
      </nav>

      <div className={'mobile-drawer ' + (menuOpen ? 'open' : '')}>
        <div className="drawer-panel">
          <div className="drawer-head">
            <a className="brand" href="#">
              <ShoppingCart className="brand-cart" size={25} />
              <span>Zawadi</span><strong>Mart</strong>
            </a>
            <button className="icon-button" onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <X size={22} />
            </button>
          </div>
          <a href="#categories" onClick={() => setMenuOpen(false)}>All Categories</a>
          {navItems.map((item) => (
            <a key={item} href="#categories" onClick={() => setMenuOpen(false)}>{item}</a>
          ))}
          <a className="drawer-deal" href="#deals" onClick={() => setMenuOpen(false)}>Deals</a>
          <div className="drawer-meta">
            <PackageCheck size={18} />
            <span>Track your order</span>
          </div>
        </div>
        <button className="drawer-overlay" onClick={() => setMenuOpen(false)} aria-label="Close menu overlay" />
      </div>
    </div>
  );
}

export default App;
