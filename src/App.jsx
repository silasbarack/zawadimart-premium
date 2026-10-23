import { useEffect, useMemo, useState } from 'react';
import {
  Banknote, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, CircleUserRound, Clock3, Heart, Home,
  LayoutGrid, LogOut, Menu, Minus, PackageCheck, Plus, Search, ShieldCheck,
  ShoppingBag, ShoppingCart, Star, Tag, Trash2, Truck, X
} from 'lucide-react';
import {
  Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams
} from 'react-router-dom';
import { money, products } from './data';
import { api, errorText, loadSession, saveSession } from './api';
import { useCatalog } from './catalog';
import mpesaLogo from './assets/payments/mpesa.svg';
import visaLogo from './assets/payments/visa.svg';
import mastercardLogo from './assets/payments/mastercard.svg';

const discount = (p) => Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);

function BrandLogo({ compact=false }) {
  return (
    <span className={`brand-logo ${compact ? 'compact' : ''}`}>
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="4" y="7" width="40" height="36" rx="11" fill="#109b59"/>
        <path d="M15 19.2h18l-1.4 15.4H16.4L15 19.2Z" fill="#fff"/>
        <path d="M19 19.2c0-4.2 2-6.7 5-6.7s5 2.5 5 6.7" fill="none" stroke="#fff" strokeWidth="2.7" strokeLinecap="round"/>
        <path d="M19.1 24.2h10.4l-7.8 7.5h8.1" fill="none" stroke="#109b59" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="38.2" cy="11.2" r="4.6" fill="#f6b73c"/>
        <path d="M38.2 8.8v4.8M35.8 11.2h4.8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <span className="brand-wordmark"><span className="brand-name">Zawadi<strong>Mart</strong></span><small>SHOP SMART · LIVE BETTER</small></span>
    </span>
  );
}

const PAYMENT_BRANDS = {
  mpesa: {
    name: 'M-PESA',
    src: mpesaLogo,
  },
  visa: {
    name: 'Visa',
    src: visaLogo,
  },
  mastercard: {
    name: 'Mastercard',
    src: mastercardLogo,
  },
};

function PaymentBrand({ brand, compact=false }) {
  const item=PAYMENT_BRANDS[brand];
  return (
    <span className={`pay-logo official ${brand} ${compact ? 'compact' : ''}`} aria-label={item.name} title={item.name}>
      <img src={item.src} alt={item.name} loading="eager" decoding="async" />
    </span>
  );
}

function PaymentMarks({ compact=false, withLabel=true }) {
  return (
    <div className={`payment-marks ${compact ? 'compact' : ''}`} aria-label="Checkout payment methods">
      {withLabel && <span className="payment-label">Checkout options</span>}
      <PaymentBrand brand="mpesa" compact={compact}/>
      <PaymentBrand brand="visa" compact={compact}/>
      <PaymentBrand brand="mastercard" compact={compact}/>
    </div>
  );
}



function MobileRetailBars() {
  return (
    <div className="mobile-retail-bars">
      <div className="app-download-bar">
        <div className="container app-download-inner">
          <span className="app-icon"><BrandLogo compact /></span>
          <span className="app-copy"><b>Shop on the ZawadiMart App</b><small>Fast browsing, easy checkout & fresh deals</small></span>
          <Link to="/shop">Open</Link>
        </div>
      </div>
      <div className="cod-strip">
        <div className="container cod-strip-inner">
          <strong>Cash on Delivery</strong>
          <span>M-PESA · Visa · Mastercard</span>
          <Link to="/shop">SHOP NOW</Link>
        </div>
      </div>
    </div>
  );
}

function FlashCountdown() {
  const [seconds, setSeconds] = useState(4 * 3600 + 13 * 60 + 7);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => current > 0 ? current - 1 : 4 * 3600 + 13 * 60 + 7);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return <span className="flash-countdown"><Clock3 size={16}/>{hh}h : {mm}m : {ss}s</span>;
}

const KENYAN_PHONE = /^((\+?254)|0)?[17]\d{8}$/;

// Combines a device cart with the account's saved cart, keeping the larger quantity.
const mergeCarts = (local, saved) => {
  const merged = new Map(local.map((item) => [item.id, item.qty]));
  saved.forEach((item) => merged.set(item.id, Math.max(merged.get(item.id) || 0, item.qty)));
  return [...merged].map(([id, qty]) => ({ id, qty }));
};

function App() {
  const { getProduct } = useCatalog();
  const [session,setSession] = useState(loadSession);
  const [cartSynced,setCartSynced] = useState(false);
  const [cart,setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zawadimart-cart')) || []; } catch { return []; }
  });
  const [wishlist,setWishlist] = useState([]);
  const [menuOpen,setMenuOpen] = useState(false);
  const [toast,setToast] = useState('');
  const [productLoading,setProductLoading] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(()=>localStorage.setItem('zawadimart-cart',JSON.stringify(cart)),[cart]);

  const signIn = (next) => { saveSession(next); setSession(next); };
  const signOut = () => { saveSession(null); setSession(null); setWishlist([]); setCartSynced(false); };
  const token = session?.token;

  // Refresh the profile, and drop sessions the API no longer accepts.
  useEffect(()=>{
    if (!token) return;
    api('/auth/me').then(({user})=>signIn({token,user})).catch((error)=>{ if (error.status===401) signOut(); });
    api('/wishlist').then((saved)=>setWishlist(saved.productIds)).catch(()=>{});
    let cancelled = false;
    api('/cart').then((saved)=>{
      if (cancelled) return;
      setCart((local)=>mergeCarts(local, saved.items.map((item)=>({id:item.productId,qty:item.quantity}))));
      setCartSynced(true);
    }).catch(()=>{});
    return () => { cancelled = true; };
  },[token]);

  // Keep the account's saved cart in step with this device.
  useEffect(()=>{
    if (!token || !cartSynced) return;
    const timer = setTimeout(()=>{
      api('/cart',{method:'PUT',body:{items:cart.map((item)=>({productId:item.id,quantity:Math.min(item.qty,100)}))}}).catch(()=>{});
    },500);
    return () => clearTimeout(timer);
  },[cart,cartSynced,token]);
  useEffect(()=>{ setMenuOpen(false); window.scrollTo({top:0,behavior:'smooth'}); },[location.pathname]);
  useEffect(()=>{
    if (!productLoading) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  },[productLoading]);

  const cartCount = cart.reduce((s,i)=>s+i.qty,0);
  const rows = cart.map(i=>({...i,product:getProduct(i.id)})).filter(i=>i.product);
  const subtotal = rows.reduce((s,i)=>s+i.product.price*i.qty,0);

  const notify = (m) => {
    setToast(m); clearTimeout(window.__zmToast);
    window.__zmToast=setTimeout(()=>setToast(''),1800);
  };
  const addToCart = (id,qty=1) => {
    const p=getProduct(id);
    if(!p||p.stock<=0) return notify('Sorry, this item is out of stock');
    setCart(c=>{
      const ex=c.find(i=>i.id===id);
      return ex ? c.map(i=>i.id===id?{...i,qty:Math.min(i.qty+qty,p.stock)}:i) : [...c,{id,qty:Math.min(qty,p.stock)}];
    });
    notify(`${p.name} added to cart`);
  };
  const setQty=(id,qty)=>setCart(c=>qty<=0?c.filter(i=>i.id!==id):c.map(i=>i.id===id?{...i,qty:Math.min(qty,getProduct(id).stock)}:i));
  const toggleWishlist=(id)=>{
    const saved=wishlist.includes(id);
    setWishlist(w=>saved?w.filter(x=>x!==id):[...w,id]);
    if(token) (saved?api('/wishlist/'+id,{method:'DELETE'}):api('/wishlist',{method:'POST',body:{productId:id}})).catch(()=>{});
  };

  const openProduct = (product) => {
    if (!product || productLoading) return;

    setProductLoading(product);

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const effectiveType = connection?.effectiveType || '4g';
    const minDelay = connection?.saveData
      ? 1400
      : effectiveType === 'slow-2g'
        ? 1900
        : effectiveType === '2g'
          ? 1600
          : effectiveType === '3g'
            ? 1000
            : 520;

    const startedAt = performance.now();
    let completed = false;

    const finish = () => {
      if (completed) return;
      completed = true;

      const elapsed = performance.now() - startedAt;
      const wait = Math.max(0, minDelay - elapsed);

      window.setTimeout(() => {
        navigate('/product/' + product.id);
        window.setTimeout(() => setProductLoading(null), 180);
      }, wait);
    };

    const image = new Image();
    image.onload = finish;
    image.onerror = finish;
    image.src = product.image;

    window.setTimeout(finish, Math.max(minDelay + 1400, 2800));
  };

  const shared={addToCart,wishlist,toggleWishlist,openProduct};

  return (
    <div className="app-shell">
      {toast && <div className="toast"><CircleCheck size={16}/>{toast}</div>}
      {productLoading && <ProductLoadingOverlay product={productLoading}/>}
      <Header cartCount={cartCount} menuOpen={menuOpen} setMenuOpen={setMenuOpen}/>
      <Routes>
        <Route path="/" element={<HomePage {...shared}/>}/>
        <Route path="/shop" element={<ShopPage {...shared}/>}/>
        <Route path="/category/:slug" element={<CategoryPage {...shared}/>}/>
        <Route path="/product/:id" element={<ProductPage {...shared}/>}/>
        <Route path="/deals" element={<DealsPage {...shared}/>}/>
        <Route path="/cart" element={<CartPage rows={rows} subtotal={subtotal} setQty={setQty} remove={(id)=>setCart(c=>c.filter(i=>i.id!==id))}/>}/>
        <Route path="/checkout" element={<CheckoutPage rows={rows} subtotal={subtotal} clearCart={()=>setCart([])} user={session?.user}/>}/>
        <Route path="/order-success" element={<OrderStatusPage/>}/>
        <Route path="/orders/:orderNumber" element={<OrderStatusPage/>}/>
        <Route path="/track-order" element={<TrackOrder/>}/>
        <Route path="/account" element={<AccountPage user={session?.user} signIn={signIn} signOut={signOut}/>}/>
        <Route path="*" element={<NotFound/>}/>
      </Routes>
      <Footer/>
      <MobileNav cartCount={cartCount}/>
    </div>
  );
}

function ProductLoadingOverlay({ product }) {
  return (
    <div className="product-loading-overlay" role="status" aria-live="polite" aria-label={'Loading ' + product.name}>
      <div className="product-loader-card">
        <div className="product-loader-logo"><BrandLogo /></div>
        <div className="product-loader-spinner" aria-hidden="true" />
        <strong>Loading product</strong>
        <span>{product.name}</span>
        <small>Preparing product details…</small>
      </div>
    </div>
  );
}

function Header({cartCount,menuOpen,setMenuOpen}) {
  const {categories}=useCatalog();
  const navigate=useNavigate();
  const location=useLocation();
  const [q,setQ]=useState('');
  const submit=(e)=>{e.preventDefault();navigate(q.trim()?'/shop?q='+encodeURIComponent(q.trim()):'/shop');};
  return (
    <>
      <div className="top-strip"><div className="container">Sell on ZawadiMart · Track your order · Help Centre · Prices in KES</div></div>
      <MobileRetailBars/>
      <header className="site-header">
        <div className="container header-main">
          <button className="menu-btn" onClick={()=>setMenuOpen(true)}><Menu/></button>
          <Link to="/" className="brand"><BrandLogo/></Link>
          <div className="header-search-stack">
            <form className="search-box" onSubmit={submit}><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products, brands and categories"/><button>Search</button></form>
            <div className="header-payment-row" aria-label="Accepted payment methods">
              <span className="header-payment-label">Pay securely with</span>
              <PaymentMarks compact withLabel={false}/>
            </div>
          </div>
          <Link to="/account" className="head-icon"><CircleUserRound/><span>Account</span></Link>
          <Link to="/cart" className="head-icon cart-link"><ShoppingCart/><span>Cart</span>{cartCount>0&&<i>{cartCount}</i>}</Link>
        </div>
        <div className="container mobile-search-row">
          <div className="mobile-search-stack">
            <form className="search-box mobile-search" onSubmit={submit}><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products, brands and categories"/></form>
            <div className="mobile-payment-row" aria-label="Accepted payment methods">
              <span>Pay securely with</span>
              <PaymentMarks compact withLabel={false}/>
            </div>
          </div>
        </div>
      </header>
      {location.pathname === '/' && <PromoCarousel/>}
      <nav className="desktop-cat-nav">
        <div className="container cat-nav-inner">
          <Link to="/shop"><LayoutGrid size={17}/>All Categories</Link>
          {categories.slice(0,8).map(c=><Link key={c.slug} to={'/category/'+c.slug}>{c.name}</Link>)}
          <Link className="deal-link" to="/deals">Deals</Link>
        </div>
      </nav>
      <div className={`drawer ${menuOpen?'open':''}`}>
        <button className="drawer-bg" onClick={()=>setMenuOpen(false)} />
        <aside>
          <div className="drawer-head"><BrandLogo compact/><button onClick={()=>setMenuOpen(false)}><X/></button></div>
          <Link to="/shop"><LayoutGrid/>All Categories</Link>
          {categories.map(c=><Link key={c.slug} to={'/category/'+c.slug}><span>{c.icon}</span>{c.name}</Link>)}
          <Link to="/deals"><Tag/>Deals & Offers</Link>
          <Link to="/track-order"><PackageCheck/>Track Order</Link>
          <Link to="/account"><CircleUserRound/>My Account</Link>
        </aside>
      </div>
    </>
  );
}

function PromoCarousel(){
  const [active,setActive]=useState(0);
  const [touchStart,setTouchStart]=useState(null);
  const slides=[
    {
      kicker:'ZAWADIMART STYLE',
      title:'Shopping feels better',
      text:'Discover fashion, accessories and everyday favourites in one place.',
      cta:'Explore fashion',
      to:'/category/fashion',
      person:'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=85',
      personAlt:'Smiling woman enjoying a shopping day with shopping bags',
      product:products[34].image,
      tone:'lifestyle',
      accent:'Fresh picks'
    },
    {
      kicker:'SHOP TOGETHER',
      title:'Find something worth smiling about',
      text:'Browse deals across phones, fashion, beauty and accessories.',
      cta:'See today’s deals',
      to:'/deals',
      person:'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1600&q=85',
      personAlt:'Smiling friends laughing together over coffee',
      product:products[1].image,
      tone:'friends',
      accent:'Better together'
    },
    {
      kicker:'SOUND & AUDIO',
      title:'Turn up your day',
      text:'Wireless headphones, earbuds and speakers for work, travel and downtime.',
      cta:'Shop audio',
      to:'/category/audio',
      person:'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=1600&q=85',
      personAlt:'Smiling woman dancing to music with headphones',
      product:products[41].image,
      tone:'audio',
      accent:'Feel the sound'
    },
    {
      kicker:'WORK & STUDY',
      title:'Tech that keeps up with you',
      text:'Laptops, monitors and accessories for school, business and creators.',
      cta:'Shop computing',
      to:'/category/computing',
      person:'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=1600&q=85',
      personAlt:'Happy colleagues celebrating with a high five at a laptop',
      product:products[12].image,
      tone:'computing',
      accent:'Ready for more'
    }
  ];

  useEffect(()=>{
    const timer=window.setInterval(()=>setActive(i=>(i+1)%slides.length),4800);
    return ()=>window.clearInterval(timer);
  },[]);

  const move=(direction)=>setActive(i=>(i+direction+slides.length)%slides.length);
  const onTouchEnd=(event)=>{
    if(touchStart===null) return;
    const end=event.changedTouches?.[0]?.clientX ?? touchStart;
    const delta=end-touchStart;
    if(Math.abs(delta)>45) move(delta<0?1:-1);
    setTouchStart(null);
  };

  return (
    <section className="ad-carousel-wrap" aria-label="ZawadiMart promotional campaigns">
      <div className="container ad-carousel">
        <div
          className="ad-track"
          style={{transform:`translateX(-${active*100}%)`}}
          onTouchStart={(e)=>setTouchStart(e.touches[0].clientX)}
          onTouchEnd={onTouchEnd}
        >
          {slides.map((slide,index)=>(
            <article className={`ad-slide people-ad ${slide.tone}`} key={slide.title} aria-hidden={active!==index}>
              <div className="people-photo">
                <img src={slide.person} alt={slide.personAlt} loading={index === 0 ? "eager" : "lazy"} />
                <div className="people-photo-shade"/>
                <div className="campaign-mark"><BrandLogo compact/></div>
                <span className="campaign-model-note">ZawadiMart lifestyle campaign</span>
              </div>
              <div className="people-ad-copy">
                <span className="ad-kicker">{slide.kicker}</span>
                <h2>{slide.title}</h2>
                <p>{slide.text}</p>
                <div className="ad-cta-row">
                  <Link to={slide.to}>{slide.cta}<ChevronRight size={17}/></Link>
                  <span className="campaign-note">{slide.accent}</span>
                </div>
              </div>
              <div className="people-product">
                <span>Featured pick</span>
                <img src={slide.product} alt="" />
              </div>
            </article>
          ))}
        </div>
        <button className="ad-arrow prev" onClick={()=>move(-1)} aria-label="Previous promotion"><ChevronLeft/></button>
        <button className="ad-arrow next" onClick={()=>move(1)} aria-label="Next promotion"><ChevronRight/></button>
        <div className="ad-dots" role="tablist" aria-label="Promotion slides">
          {slides.map((slide,index)=>(
            <button key={slide.title} className={active===index?'active':''} onClick={()=>setActive(index)} aria-label={`Show promotion ${index+1}`}/>
          ))}
        </div>
      </div>
    </section>
  );
}

function LifestyleAds(){
  const ads=[
    {
      title:'Bring home the good feeling',
      text:'Discover fashion, accessories and everyday finds made for moments that feel good.',
      cta:'Shop fashion',
      to:'/category/fashion',
      image:'https://images.unsplash.com/photo-1758520387687-38a92a7ee42f?auto=format&fit=crop&w=1800&q=82',
      className:'shopping'
    },
    {
      title:'A better phone day',
      text:'Stay connected, capture the moment and enjoy more with phones and accessories from ZawadiMart.',
      cta:'Shop phones',
      to:'/category/phones-tablets',
      image:'https://images.unsplash.com/photo-1758874384969-30bc74c7661d?auto=format&fit=crop&w=1800&q=82',
      className:'phone'
    },
    {
      title:'Work, study, create',
      text:'Find laptops and tech that fit the way you work from home, campus or anywhere in between.',
      cta:'Shop computing',
      to:'/category/computing',
      image:'https://images.unsplash.com/photo-1758598306251-f68bda7168a2?auto=format&fit=crop&w=1800&q=82',
      className:'computing'
    },
    {
      title:'Good food, happy home',
      text:'Make everyday cooking easier with practical kitchen appliances and home essentials.',
      cta:'Shop home & kitchen',
      to:'/category/home-kitchen',
      image:'https://images.unsplash.com/photo-1758523420914-34c82b27a023?auto=format&fit=crop&w=1800&q=82',
      className:'kitchen'
    }
  ];

  return (
    <section className="lifestyle-ads-wrap" aria-label="ZawadiMart lifestyle promotions">
      <div className="container lifestyle-ads">
        {ads.map((ad)=>(
          <Link key={ad.title} to={ad.to} className={`lifestyle-ad ${ad.className}`}>
            <img src={ad.image} alt="" loading="lazy"/>
            <div className="lifestyle-ad-shade"/>
            <div className="lifestyle-ad-copy">
              <span>ZAWADIMART</span>
              <h3>{ad.title}</h3>
              <p>{ad.text}</p>
              <b>{ad.cta}<ChevronRight size={15}/></b>
            </div>
          </Link>
        ))}
      </div>
      <div className="container lifestyle-note">Lifestyle campaign imagery used for promotional presentation.</div>
    </section>
  );
}

function CategoryBubbles(){
  const {categories}=useCatalog();
  return <section className="container category-bubbles" aria-label="Shop by category">
    {categories.slice(0,12).map(c=><Link key={c.slug} to={'/category/'+c.slug}><div><img src={c.image} alt={c.name}/></div><span>{c.short}</span></Link>)}
  </section>;
}

function HomePage(props){
  const {products}=useCatalog();
  const topSelling=[...products].sort((a,b)=>b.reviews-a.reviews).slice(0,10);
  const flash=[...products].sort((a,b)=>discount(b)-discount(a)).slice(0,10);
  const phones=products.filter(p=>p.category==='phones-tablets').slice(0,8);
  const tv=products.filter(p=>p.category==='electronics' && /TV|Soundbar|Projector|Streaming/i.test(p.name)).slice(0,8);
  const homeKitchen=products.filter(p=>p.category==='home-kitchen').slice(0,8);
  const appliances=products.filter(p=>p.category==='home-appliances').slice(0,8);
  const computing=products.filter(p=>p.category==='computing').slice(0,8);
  const fashion=products.filter(p=>p.category==='fashion').slice(0,8);
  const beauty=products.filter(p=>p.category==='beauty').slice(0,8);
  const kids=products.filter(p=>p.category==='kids-baby').slice(0,8);
  const groceries=products.filter(p=>p.category==='groceries').slice(0,8);
  const sponsored=products.filter(p=>['accessories','audio','gaming'].includes(p.category)).slice(0,8);

  return <main className="jumia-home">
    <CategoryBubbles/>
    <DealSection title="Top selling items" tone="orange" items={topSelling} to="/shop" {...props}/>
    <DealSection title="Flash Sales | Live Now" tone="red" items={flash} flash to="/deals" {...props}/>
    <DealSection title="Phone Deals" tone="cream" items={phones} to="/category/phones-tablets" {...props}/>
    <DealSection title="TV Deals" tone="cream" items={tv} to="/category/electronics" {...props}/>
    <DealSection title="Home & Kitchen Deals" tone="gold" items={homeKitchen} to="/category/home-kitchen" {...props}/>
    <DealSection title="Large Appliances Deals" tone="cream" items={appliances} to="/category/home-appliances" {...props}/>
    <DealSection title="Laptop & Computing Deals" tone="blue" items={computing} to="/category/computing" {...props}/>
    <DealSection title="Fashion Deals" tone="lavender" items={fashion} to="/category/fashion" {...props}/>
    <DealSection title="Beauty Essentials" tone="pink" items={beauty} to="/category/beauty" {...props}/>
    <DealSection title="Kids & Baby" tone="gold" items={kids} to="/category/kids-baby" {...props}/>
    <DealSection title="Supermarket Deals" tone="cream" items={groceries} to="/category/groceries" {...props}/>
    <DealSection title="Sponsored Products" tone="mint" items={sponsored} to="/shop" sponsored {...props}/>
    <InfoBlock/>
  </main>
}

function DealSection({title,tone,items,addToCart,wishlist,toggleWishlist,openProduct,to='/shop',flash=false,sponsored=false}){
  return <section className={`container deal-section ${tone} ${sponsored?'sponsored':''}`}>
    <div className="deal-head">
      <div className="deal-title-wrap"><h2>{title}</h2>{flash&&<FlashCountdown/>}</div>
      <Link to={to} aria-label={'View '+title}><ChevronRight/></Link>
    </div>
    <div className="deal-scroll">{items.map(p=><ProductCard key={p.id} product={p} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist} openProduct={openProduct}/>)}</div>
  </section>
}

function ProductCard({product,addToCart,wishlist,toggleWishlist,openProduct}){
  const open = (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    openProduct(product);
  };

  return <article className="product-card">
    <Link className="product-img" to={'/product/'+product.id} onClick={open}><img src={product.image} alt={product.name}/><span className="stock-label">{product.stock} items in stock</span></Link>
    <div className="product-body">
      <Link to={'/product/'+product.id} onClick={open}><h3>{product.name}</h3></Link>
      <div className="rating"><Star size={14} fill="currentColor"/>{product.rating} <span>({product.reviews})</span></div>
      <strong className="price">{money(product.price)}</strong>
      <div className="old-row"><del>{money(product.oldPrice)}</del><span>-{discount(product)}%</span></div>
      <div className="card-actions"><button onClick={()=>addToCart(product.id)}>Add to cart</button><button className={wishlist.includes(product.id)?'wish active':'wish'} onClick={()=>toggleWishlist(product.id)}><Heart size={16} fill={wishlist.includes(product.id)?'currentColor':'none'}/></button></div>
    </div>
  </article>
}

function ShopPage(props){
  const {products,categories}=useCatalog();
  const [params]=useSearchParams();
  const q=(params.get('q')||'').toLowerCase();
  const [cat,setCat]=useState('all');
  const [sort,setSort]=useState('featured');
  const list=useMemo(()=>{
    let x=products.filter(p=>(cat==='all'||p.category===cat)&&(!q||(p.name+' '+p.description).toLowerCase().includes(q)));
    if(sort==='low')x=[...x].sort((a,b)=>a.price-b.price);
    if(sort==='high')x=[...x].sort((a,b)=>b.price-a.price);
    if(sort==='rating')x=[...x].sort((a,b)=>b.rating-a.rating);
    return x;
  },[products,q,cat,sort]);
  return <main className="container page-shell">
    <Breadcrumb items={[['Home','/'],['Shop']]}/>
    <div className="shop-top"><div><span className="eyebrow">ZAWADIMART MARKETPLACE</span><h1>{q?`Results for “${params.get('q')}”`:'Shop All Products'}</h1><p>{list.length} products</p></div><select value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: Low to high</option><option value="high">Price: High to low</option><option value="rating">Highest rated</option></select></div>
    <div className="filter-row"><button className={cat==='all'?'active':''} onClick={()=>setCat('all')}>All</button>{categories.map(c=><button key={c.slug} className={cat===c.slug?'active':''} onClick={()=>setCat(c.slug)}>{c.name}</button>)}</div>
    <div className="catalog-grid">{list.map(p=><ProductCard key={p.id} product={p} {...props}/>)}</div>
  </main>
}

function CategoryPage(props){
  const {products,getCategory,ready}=useCatalog();
  const {slug}=useParams(); const cat=getCategory(slug); if(!cat)return ready?<NotFound/>:<main className="container narrow"><div className="loader-ring" aria-label="Loading"><span/></div></main>;
  const items=products.filter(p=>p.category===slug);
  return <main className="container page-shell"><Breadcrumb items={[['Home','/'],['Shop','/shop'],[cat.name]]}/><div className="category-banner"><div><span>{cat.icon}</span><h1>{cat.name}</h1><p>Shop curated {cat.name.toLowerCase()} with realistic Kenyan pricing.</p></div><img src={cat.image}/></div><div className="catalog-grid">{items.map(p=><ProductCard key={p.id} product={p} {...props}/>)}</div></main>
}

function DealsPage(props){
  const {products}=useCatalog();
  const items=[...products].sort((a,b)=>discount(b)-discount(a));
  return <main className="container page-shell"><Breadcrumb items={[['Home','/'],['Deals']]}/><div className="promo-banner"><span>LIMITED-TIME OFFERS</span><h1>Today's Best Deals</h1><p>Save across phones, TVs, appliances, fashion, beauty and more.</p></div><div className="catalog-grid">{items.map(p=><ProductCard key={p.id} product={p} {...props}/>)}</div></main>
}

function ProductPage({addToCart,wishlist,toggleWishlist}){
  const {getProduct,getCategory,ready}=useCatalog();
  const {id}=useParams();
  const p=getProduct(id);
  const [qty,setQty]=useState(1);
  const [loading,setLoading]=useState(true);
  const [offline,setOffline]=useState(!navigator.onLine);

  useEffect(()=>{
    if(!p) return;
    let cancelled=false;
    let retryTimer;

    const networkDelay=()=>{
      const type=navigator.connection?.effectiveType;
      if(type==='slow-2g') return 1400;
      if(type==='2g') return 1000;
      if(type==='3g') return 650;
      return 280;
    };

    const loadProduct=()=>{
      if(cancelled) return;
      if(!navigator.onLine){
        setOffline(true);
        setLoading(true);
        return;
      }
      setOffline(false);
      setLoading(true);
      const started=Date.now();
      const image=new Image();
      const finish=()=>{
        const wait=Math.max(0,networkDelay()-(Date.now()-started));
        retryTimer=setTimeout(()=>{ if(!cancelled) setLoading(false); },wait);
      };
      image.onload=finish;
      image.onerror=finish;
      image.src=p.image;
      if(image.complete) finish();
    };

    const onlineHandler=()=>loadProduct();
    const offlineHandler=()=>{setOffline(true);setLoading(true);};
    window.addEventListener('online',onlineHandler);
    window.addEventListener('offline',offlineHandler);
    loadProduct();

    return ()=>{
      cancelled=true;
      clearTimeout(retryTimer);
      window.removeEventListener('online',onlineHandler);
      window.removeEventListener('offline',offlineHandler);
    };
  },[p?.id]);

  if(!p)return ready?<NotFound/>:<main className="container narrow"><div className="loader-ring" aria-label="Loading"><span/></div></main>;
  const cat=getCategory(p.category)||{name:'Shop',slug:''};

  if(loading){
    return <main className="product-loading-page">
      <div className="product-loader-card">
        <BrandLogo/>
        <div className="loader-ring" aria-hidden="true"><span/></div>
        <h2>{offline?'You are offline':'Loading product'}</h2>
        <p>{offline?'Reconnect to the internet and ZawadiMart will continue automatically.':'Fetching the latest product details and image…'}</p>
        <div className="loader-progress"><span/></div>
        {!offline&&<small>Loading speed depends on your internet connection.</small>}
      </div>
      <div className="container product-loading-skeleton" aria-hidden="true">
        <div className="skeleton-image shimmer"/>
        <div className="skeleton-copy">
          <div className="skeleton-line wide shimmer"/>
          <div className="skeleton-line mid shimmer"/>
          <div className="skeleton-line price shimmer"/>
          <div className="skeleton-line short shimmer"/>
          <div className="skeleton-button shimmer"/>
        </div>
      </div>
    </main>;
  }

  return <main className="container page-shell"><Breadcrumb items={[['Home','/'],[cat.name,cat.slug?'/category/'+cat.slug:'/shop'],[p.name]]}/><section className="product-detail"><div className="detail-image"><img src={p.image} alt={p.name}/><span>-{discount(p)}%</span></div><div className="detail-copy"><span className="eyebrow">{cat.name}</span><h1>{p.name}</h1><div className="rating"><Star size={16} fill="currentColor"/>{p.rating} <span>({p.reviews} reviews)</span></div><div className="detail-price">{money(p.price)} <del>{money(p.oldPrice)}</del></div><p>{p.description}</p>{p.stock>0?<div className="in-stock"><CircleCheck/>In stock — {p.stock} units available</div>:<div className="in-stock out"><CircleAlert/>Out of stock</div>}<div className="detail-actions"><div className="qty"><button onClick={()=>setQty(Math.max(1,qty-1))}><Minus/></button><span>{qty}</span><button onClick={()=>setQty(Math.min(p.stock,qty+1))}><Plus/></button></div><button className="buy" onClick={()=>addToCart(p.id,qty)}><ShoppingCart/>Add to Cart</button><button className="heart" onClick={()=>toggleWishlist(p.id)}><Heart fill={wishlist.includes(p.id)?'currentColor':'none'}/></button></div><div className="benefits"><span><Truck/><b>Delivery</b><small>Calculated at checkout</small></span><span><ShieldCheck/><b>Secure Checkout</b><small>M-Pesa & cards</small></span><span><PackageCheck/><b>Support</b><small>Order assistance</small></span></div><div className="detail-payment-marks"><span>Supported at checkout</span><PaymentMarks compact withLabel={false}/></div></div></section></main>
}

function CartPage({rows,subtotal,setQty,remove}){
  const delivery=subtotal>=10000?0:(subtotal?350:0);
  return <main className="container page-shell"><Breadcrumb items={[['Home','/'],['Cart']]}/><h1 className="page-title">Shopping Cart</h1>{!rows.length?<Empty icon={<ShoppingCart/>} title="Your cart is empty"/>:<div className="cart-layout"><div>{rows.map(({product,qty})=><div className="cart-row" key={product.id}><img src={product.image}/><div><h3>{product.name}</h3><strong>{money(product.price)}</strong></div><div className="cart-controls"><div className="qty"><button onClick={()=>setQty(product.id,qty-1)}><Minus/></button><span>{qty}</span><button onClick={()=>setQty(product.id,qty+1)}><Plus/></button></div><button onClick={()=>remove(product.id)}><Trash2/>Remove</button></div></div>)}</div><OrderSummary subtotal={subtotal} delivery={delivery} checkout/></div>}</main>
}

function OrderSummary({subtotal,delivery,checkout=false}){
  const total=subtotal+delivery;
  return <aside className="summary"><h2>Order Summary</h2><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Delivery</span><b>{delivery?money(delivery):'FREE'}</b></div><div className="summary-total"><span>Total</span><b>{money(total)}</b></div>{checkout&&<Link to="/checkout">Proceed to Checkout <ChevronRight/></Link>}<div className="summary-payments"><PaymentMarks compact withLabel={false}/></div><p><ShieldCheck/>Secure checkout</p></aside>
}

function CheckoutPage({rows,subtotal,clearCart,user}){
  const nav=useNavigate(); const [method,setMethod]=useState('mpesa'); const [error,setError]=useState(''); const [submitting,setSubmitting]=useState(false); const delivery=subtotal>=10000?0:(subtotal?350:0);
  const submit=async(e)=>{
    e.preventDefault(); if(submitting)return; if(!rows.length)return nav('/cart');
    const f=new FormData(e.currentTarget); const field=(name)=>String(f.get(name)||'').trim();
    if(!field('fullName')||!field('phone')||!field('address'))return setError('Please complete contact and delivery details.');
    if(method==='mpesa'&&!KENYAN_PHONE.test(field('mpesa').replace(/\s/g,'')))return setError('Enter a valid Kenyan M-Pesa number.');
    if(method==='card'&&!field('email'))return setError('Enter your email address to pay by card.');
    setError(''); setSubmitting(true);
    try{
      const {order,accessKey,payment}=await api('/orders',{method:'POST',body:{
        items:rows.map(({product,qty})=>({productId:product.id,quantity:qty})),
        customer:{fullName:field('fullName'),phone:field('phone'),email:field('email')},
        delivery:{address:field('address'),county:field('county'),town:field('town')},
        paymentMethod:method,
        mpesaPhone:method==='mpesa'?field('mpesa'):undefined,
      }});
      clearCart();
      if(payment.status==='redirect')return window.location.assign(payment.checkoutUrl);
      nav(`/order-success?order=${order.orderNumber}&key=${accessKey}`,{state:{order,payment}});
    }catch(err){setError(errorText(err));setSubmitting(false);}
  };
  if(!rows.length)return <main className="container page-shell"><Empty icon={<ShoppingBag/>} title="No items to checkout"/></main>;
  return <main className="container page-shell"><Breadcrumb items={[['Home','/'],['Cart','/cart'],['Checkout']]}/><div className="checkout-title"><h1>Checkout</h1><ShieldCheck/></div><form className="checkout-layout" onSubmit={submit}><div className="checkout-forms"><section className="form-card"><h2>Delivery Details</h2><div className="form-grid"><label>Full name<input name="fullName" defaultValue={user?.name||''} placeholder="e.g. Amina Wanjiku"/></label><label>Phone number<input name="phone" defaultValue={user?.phone?'0'+user.phone.slice(3):''} placeholder="0712 345 678"/></label><label className="wide">Email{method==='card'?' (required for card payments)':''}<input name="email" type="email" defaultValue={user?.email||''} placeholder="you@example.com"/></label><label className="wide">Delivery address<input name="address" placeholder="Estate, street, building and house number"/></label><label>County<select name="county"><option>Nairobi</option><option>Kiambu</option><option>Machakos</option><option>Kajiado</option><option>Mombasa</option><option>Nakuru</option><option>Kisumu</option></select></label><label>Town / area<input name="town" placeholder="e.g. Kilimani"/></label></div></section><section className="form-card"><div className="payment-heading-row"><h2>Payment Method</h2><PaymentMarks compact withLabel={false}/></div><div className="payment-tabs three"><button type="button" className={method==='mpesa'?'active':''} onClick={()=>setMethod('mpesa')}><PaymentBrand brand="mpesa" compact/><span><b>M-Pesa</b><small>Pay securely from your phone</small></span></button><button type="button" className={method==='card'?'active':''} onClick={()=>setMethod('card')}><span className="tab-card-logos"><PaymentBrand brand="visa" compact/><PaymentBrand brand="mastercard" compact/></span><span><b>Card</b><small>Visa / Mastercard</small></span></button><button type="button" className={method==='cod'?'active':''} onClick={()=>setMethod('cod')}><span className="cod-mark"><Banknote/></span><span><b>Cash on Delivery</b><small>Pay when your order arrives</small></span></button></div>{method==='mpesa'&&<div className="payment-panel"><div className="checkout-brand-row"><PaymentBrand brand="mpesa"/><span>STK Push</span></div><label>M-Pesa phone number<input name="mpesa" defaultValue={user?.phone?'0'+user.phone.slice(3):''} placeholder="0712 345 678"/></label><p>After you place your order, an M-Pesa prompt will appear on this phone. Enter your PIN to pay.</p></div>}{method==='card'&&<div className="payment-panel"><div className="checkout-brand-row"><PaymentBrand brand="visa"/><PaymentBrand brand="mastercard"/><span>Secure hosted checkout</span></div><p>After you place your order you will be taken to our secure payment partner's page to enter your card details. ZawadiMart never sees or stores your card number.</p></div>}{method==='cod'&&<div className="payment-panel"><p>Pay in cash or M-Pesa to our rider when your order is delivered. Please have the exact amount ready.</p></div>}</section>{error&&<div className="error">{error}</div>}</div><div><aside className="checkout-items"><h2>Your Order</h2>{rows.map(({product,qty})=><div key={product.id}><img src={product.image}/><span><b>{product.name}</b><small>Qty {qty}</small></span><strong>{money(product.price*qty)}</strong></div>)}</aside><OrderSummary subtotal={subtotal} delivery={delivery}/><button className="place-order" disabled={submitting}>{submitting?'Placing order…':<>Place Order <ChevronRight/></>}</button></div></form></main>
}

const STATUS_LABELS={pending_payment:'Awaiting payment',confirmed:'Confirmed',processing:'Processing',shipped:'On the way',delivered:'Delivered',cancelled:'Cancelled',payment_failed:'Payment not completed'};
const PAYMENT_LABELS={mpesa:'M-Pesa',card:'Card',cod:'Cash on delivery'};
const PAYMENT_STATUS_LABELS={unpaid:'Unpaid',pending:'Awaiting confirmation',paid:'Paid',failed:'Not completed',refunded:'Refunded'};
const formatDate=(value)=>new Date(value).toLocaleString('en-KE',{dateStyle:'medium',timeStyle:'short'});

function OrderDetails({order}){
  return <section className="form-card order-details">
    <div className="order-head"><div><span className="eyebrow">ORDER</span><h2>{order.orderNumber}</h2><small>Placed {formatDate(order.createdAt)}</small></div><span className={`status-pill ${order.status}`}>{STATUS_LABELS[order.status]}</span></div>
    <div className="order-lines">{order.items.map((item,i)=><div key={i}><img src={item.image} alt=""/><span><b>{item.name}</b><small>Qty {item.quantity} × {money(item.unitPrice)}</small></span><strong>{money(item.lineTotal)}</strong></div>)}</div>
    <div className="order-totals"><div><span>Subtotal</span><b>{money(order.subtotal)}</b></div><div><span>Delivery</span><b>{order.deliveryFee?money(order.deliveryFee):'FREE'}</b></div><div className="summary-total"><span>Total</span><b>{money(order.total)}</b></div><div><span>Payment</span><b>{PAYMENT_LABELS[order.paymentMethod]} · {PAYMENT_STATUS_LABELS[order.paymentStatus]}</b></div></div>
    <ol className="order-timeline">{order.events.map((event,i)=><li key={i}><b>{STATUS_LABELS[event.status]||event.status}</b><span>{event.note}</span><small>{formatDate(event.createdAt)}</small></li>)}</ol>
  </section>;
}

function OrderStatusPage(){
  const {orderNumber:param}=useParams(); const [params]=useSearchParams(); const location=useLocation();
  const number=param||params.get('order')||''; const key=params.get('key')||'';
  const [order,setOrder]=useState(location.state?.order||null);
  const [notice,setNotice]=useState(location.state?.payment?.message||'');
  const [error,setError]=useState(''); const [paymentError,setPaymentError]=useState(''); const [busy,setBusy]=useState(false);
  const path='/orders/'+encodeURIComponent(number); const headers=key?{'X-Order-Key':key}:{};

  // Asks the API for the latest payment state (it checks with M-Pesa / Paystack if needed).
  const refresh=async()=>{
    const status=await api(path+'/payment-status',{headers});
    setPaymentError(status.lastError||'');
    setOrder((await api(path,{headers})).order);
    return status;
  };

  useEffect(()=>{
    if(!number)return;
    api(path,{headers}).then((r)=>{setOrder(r.order); if(r.order.paymentStatus==='failed') refresh().catch(()=>{});}).catch((e)=>setError(errorText(e)));
  },[number,key]);

  const awaiting=order?.status==='pending_payment'&&order?.paymentStatus==='pending';
  useEffect(()=>{
    if(!awaiting)return;
    let attempts=0;
    const tick=()=>{attempts+=1; refresh().catch(()=>{}); if(attempts>=45)clearInterval(timer);};
    const timer=setInterval(tick,4000); tick();
    return ()=>clearInterval(timer);
  },[awaiting,number,key]);

  const retry=async(paymentMethod)=>{
    setBusy(true); setPaymentError('');
    try{
      const r=await api(path+'/pay',{method:'POST',headers,body:{paymentMethod}});
      if(r.payment.status==='redirect')return window.location.assign(r.payment.checkoutUrl);
      setOrder(r.order); setNotice(r.payment.message);
      if(r.payment.status==='failed')setPaymentError(r.payment.message);
    }catch(e){setPaymentError(errorText(e));}
    setBusy(false);
  };

  if(!number)return <main className="container narrow"><Empty icon={<PackageCheck/>} title="No order selected"/></main>;
  if(!order)return <main className="container narrow">{error?<><div className="error">{error}</div><p><Link className="primary" to="/track-order">Track an order</Link></p></>:<div className="loader-ring" aria-label="Loading order"><span/></div>}</main>;

  const failed=order.status==='pending_payment'&&order.paymentStatus==='failed';
  const hero=order.status==='cancelled'?{tone:'cancelled',icon:<X/>,title:'Order cancelled',text:'This order has been cancelled. Any reserved items have been released.'}
    :failed?{tone:'failed',icon:<CircleAlert/>,title:'Payment not completed',text:paymentError||'Your payment did not go through. You can try again below.'}
    :awaiting?{tone:'pending',icon:<Clock3/>,title:order.paymentMethod==='mpesa'?'Check your phone':'Confirming your payment',text:notice||(order.paymentMethod==='mpesa'?'Enter your M-Pesa PIN on the prompt sent to your phone. This page updates automatically.':'We are confirming your card payment. This page updates automatically.')}
    :order.status==='pending_payment'?{tone:'pending',icon:<Clock3/>,title:'Awaiting payment',text:'Complete payment to confirm your order.'}
    :{tone:'confirmed',icon:<CircleCheck/>,title:order.paymentMethod==='cod'&&order.paymentStatus!=='paid'?'Order confirmed':'Thank you for your order',text:order.paymentMethod==='cod'&&order.paymentStatus!=='paid'?`Please have ${money(order.total)} ready when your order is delivered.`:'Your payment has been received and your order is confirmed.'};

  return <main className="container narrow order-page">
    <div className={`order-hero ${hero.tone}`}>{hero.icon}<h1>{hero.title}</h1><p>{hero.text}</p>
      {awaiting&&<div className="loader-ring" aria-hidden="true"><span/></div>}
      {(failed||(order.status==='pending_payment'&&!awaiting))&&<div className="order-actions">
        <button className="primary" disabled={busy} onClick={()=>retry('mpesa')}>{busy?'Please wait…':'Send M-Pesa prompt again'}</button>
        {order.customer?.email&&<button className="secondary" disabled={busy} onClick={()=>retry('card')}>Pay by card instead</button>}
      </div>}
    </div>
    <OrderDetails order={order}/>
    <p className="order-footnote">Keep your order number <b>{order.orderNumber}</b> to track this order. <Link to="/shop">Continue shopping</Link></p>
  </main>;
}

function TrackOrder(){
  const [order,setOrder]=useState(null); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const submit=async(e)=>{
    e.preventDefault(); const f=new FormData(e.currentTarget);
    setBusy(true); setError('');
    try{ setOrder((await api('/orders/track',{method:'POST',body:{orderNumber:String(f.get('orderNumber')).trim(),contact:String(f.get('contact')).trim()}})).order); }
    catch(err){ setOrder(null); setError(errorText(err)); }
    setBusy(false);
  };
  return <main className="container narrow"><Breadcrumb items={[['Home','/'],['Track Order']]}/><h1>Track your order</h1><form className="form-card" onSubmit={submit}><label>Order number<input name="orderNumber" placeholder="e.g. ZM-381204" required/></label><label>Phone or email<input name="contact" placeholder="Used at checkout" required/></label><button className="primary" disabled={busy}>{busy?'Checking…':'Track Order'}</button></form>{error&&<div className="error track-error">{error}</div>}{order&&<OrderDetails order={order}/>}</main>
}

function AccountPage({user,signIn,signOut}){
  const [mode,setMode]=useState('signin'); const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const [orders,setOrders]=useState(null);
  useEffect(()=>{ if(user) api('/orders').then((r)=>setOrders(r.items)).catch(()=>setOrders([])); },[user?.id]);

  const submit=async(e)=>{
    e.preventDefault(); const f=Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true); setError('');
    try{
      const body=mode==='signin'?{identifier:f.identifier,password:f.password}:{name:f.name,email:f.email,phone:f.phone,password:f.password};
      const {token,user:account}=await api(mode==='signin'?'/auth/login':'/auth/register',{method:'POST',body});
      signIn({token,user:account});
    }catch(err){setError(errorText(err));}
    setBusy(false);
  };

  if(user)return <main className="container narrow"><Breadcrumb items={[['Home','/'],['Account']]}/><div className="account-card"><div className="account-profile"><span><h1>Hi, {user.name.split(' ')[0]}</h1><p>{user.email}{user.phone?` · 0${user.phone.slice(3)}`:''}</p></span><button onClick={signOut}><LogOut/>Sign out</button></div></div>
    <section className="form-card account-section"><h2>My orders</h2>{orders===null?<p>Loading your orders…</p>:!orders.length?<p>You have not placed any orders yet. <Link to="/shop">Start shopping</Link></p>:<div className="account-orders">{orders.map((o)=><Link key={o.orderNumber} to={'/orders/'+o.orderNumber}><span><b>{o.orderNumber}</b><small>{formatDate(o.createdAt)} · {o.itemCount} item{o.itemCount===1?'':'s'} · {money(o.total)}</small></span><span className={`status-pill ${o.status}`}>{STATUS_LABELS[o.status]}</span></Link>)}</div>}</section></main>;

  return <main className="container narrow"><Breadcrumb items={[['Home','/'],['Account']]}/><form className="account-card" onSubmit={submit}><CircleUserRound/>{mode==='signin'?<><h1>Welcome back</h1><p>Sign in to manage orders and saved items.</p><label>Email or phone<input name="identifier" placeholder="you@example.com" autoComplete="username" required/></label></>:<><h1>Create your account</h1><p>Save your cart and wishlist, and follow your orders.</p><label>Full name<input name="name" placeholder="e.g. Amina Wanjiku" autoComplete="name" required/></label><label>Email<input name="email" type="email" placeholder="you@example.com" autoComplete="email" required/></label><label>Phone (optional)<input name="phone" placeholder="0712 345 678" autoComplete="tel"/></label></>}<label>Password<input name="password" type="password" placeholder="••••••••" autoComplete={mode==='signin'?'current-password':'new-password'} minLength={mode==='signin'?undefined:8} required/></label>{error&&<div className="error">{error}</div>}<button className="primary" disabled={busy}>{busy?'Please wait…':mode==='signin'?'Sign in':'Create account'}</button><p className="account-switch">{mode==='signin'?'New to ZawadiMart? ':'Already have an account? '}<button type="button" onClick={()=>{setMode(mode==='signin'?'register':'signin');setError('');}}>{mode==='signin'?'Create an account':'Sign in'}</button></p></form></main>;
}
function Empty({icon,title}){return <div className="empty">{icon}<h2>{title}</h2><p>Explore the store and find something you like.</p><Link to="/shop">Start Shopping</Link></div>}
function Breadcrumb({items}){return <nav className="breadcrumb">{items.map(([label,href],i)=><span key={label}>{i>0&&<ChevronRight size={12}/>} {href?<Link to={href}>{label}</Link>:<b>{label}</b>}</span>)}</nav>}
function NotFound(){return <main className="container narrow"><Empty icon={<span className="big404">404</span>} title="Page not found"/></main>}

function InfoBlock(){return <section className="container info-block"><h2>ZawadiMart Kenya — Shopping Made Easier</h2><p>Explore a broad catalogue of products for everyday Kenyan life, including phones, electronics, appliances, computing, fashion, beauty, home essentials and more. ZawadiMart is designed as a realistic e-commerce shopping experience with transparent KES pricing, product categories, cart functionality and convenient checkout flows.</p></section>}

function Footer(){return <footer>
  <div className="back-top" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>⌃<span>BACK TO TOP</span></div>
  <div className="container footer-grid">
    <div><BrandLogo compact/><p>Modern online shopping for Kenya.</p></div>
    <div><h4>HELP</h4><Link to="/track-order">Track Order</Link><Link to="/account">My Account</Link><span>Shipping & Delivery</span><span>Returns</span></div>
    <div><h4>ABOUT</h4><Link to="/shop">Shop</Link><Link to="/deals">Deals</Link><span>Terms & Conditions</span><span>Privacy Notice</span></div>
    <div><h4>PAYMENTS</h4><span>M-PESA checkout</span><span>Visa checkout</span><span>Mastercard checkout</span><span>Cash on delivery</span></div>
  </div>
  <div className="container footer-payment-panel">
    <div className="footer-payment-copy"><strong>Secure payment methods</strong><span>Pay using M-PESA, Visa or Mastercard at checkout.</span></div>
    <PaymentMarks withLabel={false}/>
  </div>
  <div className="footer-bottom">© 2026 ZawadiMart.</div>
</footer>}

function MobileNav({cartCount}){return <nav className="mobile-nav"><NavLink to="/"><Home/><span>Home</span></NavLink><NavLink to="/shop"><LayoutGrid/><span>Shop</span></NavLink><NavLink to="/deals"><Tag/><span>Deals</span></NavLink><NavLink to="/cart" className="mobile-cart"><ShoppingCart/><span>Cart</span>{cartCount>0&&<i>{cartCount}</i>}</NavLink><NavLink to="/account"><CircleUserRound/><span>Account</span></NavLink></nav>}

export default App;
