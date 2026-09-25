import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, CircleCheck, CircleUserRound, Clock3, Heart, Home,
  LayoutGrid, Menu, Minus, PackageCheck, Plus, Search, ShieldCheck,
  ShoppingBag, ShoppingCart, Star, Tag, Trash2, Truck, X
} from 'lucide-react';
import {
  Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams
} from 'react-router-dom';
import { categories, getCategory, getProduct, money, products } from './data';
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
      <span className="brand-wordmark"><span>Zawadi</span><strong>Mart</strong><small>SHOP SMART · LIVE BETTER</small></span>
    </span>
  );
}

const PAYMENT_BRANDS = {
  mpesa: {
    name: 'M-PESA',
    src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/M-PESA_LOGO-01.svg',
    fallback: mpesaLogo,
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
  const [src,setSrc]=useState(item.src);
  return (
    <span className={`pay-logo official ${brand} ${compact ? 'compact' : ''}`} aria-label={item.name} title={item.name}>
      <img src={src} alt={item.name} loading="eager" decoding="async" onError={()=>item.fallback&&src!==item.fallback&&setSrc(item.fallback)} />
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

function App() {
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
    setCart(c=>{
      const ex=c.find(i=>i.id===id);
      return ex ? c.map(i=>i.id===id?{...i,qty:Math.min(i.qty+qty,p.stock)}:i) : [...c,{id,qty:Math.min(qty,p.stock)}];
    });
    notify(`${p.name} added to cart`);
  };
  const setQty=(id,qty)=>setCart(c=>qty<=0?c.filter(i=>i.id!==id):c.map(i=>i.id===id?{...i,qty:Math.min(qty,getProduct(id).stock)}:i));
  const toggleWishlist=(id)=>setWishlist(w=>w.includes(id)?w.filter(x=>x!==id):[...w,id]);

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
        <Route path="/checkout" element={<CheckoutPage rows={rows} subtotal={subtotal} clearCart={()=>setCart([])}/>}/>
        <Route path="/order-success" element={<OrderSuccess/>}/>
        <Route path="/track-order" element={<TrackOrder/>}/>
        <Route path="/account" element={<AccountPage/>}/>
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
      person:'https://unsplash.com/photos/DvHdJ5PLVPU/download?force=true&w=1600',
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
      person:'https://unsplash.com/photos/ddrlTPoEuqQ/download?force=true&w=1600',
      personAlt:'Two smiling friends taking a selfie with shopping bags',
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
      person:'https://unsplash.com/photos/WLil1emp65c/download?force=true&w=1600',
      personAlt:'Smiling man enjoying music with headphones',
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
      person:'https://unsplash.com/photos/Ayoppgw5eFU/download?force=true&w=1600',
      personAlt:'Happy man celebrating while using a laptop',
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

const CategoryBubbles=()=>(
  <section className="container category-bubbles" aria-label="Shop by category">
    {categories.slice(0,12).map(c=><Link key={c.slug} to={'/category/'+c.slug}><div><img src={c.image} alt={c.name}/></div><span>{c.short}</span></Link>)}
  </section>
);

function HomePage(props){
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
  },[q,cat,sort]);
  return <main className="container page-shell">
    <Breadcrumb items={[['Home','/'],['Shop']]}/>
    <div className="shop-top"><div><span className="eyebrow">ZAWADIMART MARKETPLACE</span><h1>{q?`Results for “${params.get('q')}”`:'Shop All Products'}</h1><p>{list.length} products</p></div><select value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: Low to high</option><option value="high">Price: High to low</option><option value="rating">Highest rated</option></select></div>
    <div className="filter-row"><button className={cat==='all'?'active':''} onClick={()=>setCat('all')}>All</button>{categories.map(c=><button key={c.slug} className={cat===c.slug?'active':''} onClick={()=>setCat(c.slug)}>{c.name}</button>)}</div>
    <div className="catalog-grid">{list.map(p=><ProductCard key={p.id} product={p} {...props}/>)}</div>
  </main>
}

function CategoryPage(props){
  const {slug}=useParams(); const cat=getCategory(slug); if(!cat)return <NotFound/>;
  const items=products.filter(p=>p.category===slug);
  return <main className="container page-shell"><Breadcrumb items={[['Home','/'],['Shop','/shop'],[cat.name]]}/><div className="category-banner"><div><span>{cat.icon}</span><h1>{cat.name}</h1><p>Shop curated {cat.name.toLowerCase()} with realistic Kenyan pricing.</p></div><img src={cat.image}/></div><div className="catalog-grid">{items.map(p=><ProductCard key={p.id} product={p} {...props}/>)}</div></main>
}

function DealsPage(props){
  const items=[...products].sort((a,b)=>discount(b)-discount(a));
  return <main className="container page-shell"><Breadcrumb items={[['Home','/'],['Deals']]}/><div className="promo-banner"><span>LIMITED-TIME OFFERS</span><h1>Today's Best Deals</h1><p>Save across phones, TVs, appliances, fashion, beauty and more.</p></div><div className="catalog-grid">{items.map(p=><ProductCard key={p.id} product={p} {...props}/>)}</div></main>
}

function ProductPage({addToCart,wishlist,toggleWishlist}){
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

  if(!p)return <NotFound/>;
  const cat=getCategory(p.category);

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

  return <main className="container page-shell"><Breadcrumb items={[['Home','/'],[cat.name,'/category/'+cat.slug],[p.name]]}/><section className="product-detail"><div className="detail-image"><img src={p.image} alt={p.name}/><span>-{discount(p)}%</span></div><div className="detail-copy"><span className="eyebrow">{cat.name}</span><h1>{p.name}</h1><div className="rating"><Star size={16} fill="currentColor"/>{p.rating} <span>({p.reviews} reviews)</span></div><div className="detail-price">{money(p.price)} <del>{money(p.oldPrice)}</del></div><p>{p.description}</p><div className="in-stock"><CircleCheck/>In stock — {p.stock} units available</div><div className="detail-actions"><div className="qty"><button onClick={()=>setQty(Math.max(1,qty-1))}><Minus/></button><span>{qty}</span><button onClick={()=>setQty(Math.min(p.stock,qty+1))}><Plus/></button></div><button className="buy" onClick={()=>addToCart(p.id,qty)}><ShoppingCart/>Add to Cart</button><button className="heart" onClick={()=>toggleWishlist(p.id)}><Heart fill={wishlist.includes(p.id)?'currentColor':'none'}/></button></div><div className="benefits"><span><Truck/><b>Delivery</b><small>Calculated at checkout</small></span><span><ShieldCheck/><b>Secure Checkout</b><small>M-Pesa & cards</small></span><span><PackageCheck/><b>Support</b><small>Order assistance</small></span></div><div className="detail-payment-marks"><span>Supported at checkout</span><PaymentMarks compact withLabel={false}/></div></div></section></main>
}

function CartPage({rows,subtotal,setQty,remove}){
  const delivery=subtotal>=10000?0:(subtotal?350:0);
  return <main className="container page-shell"><Breadcrumb items={[['Home','/'],['Cart']]}/><h1 className="page-title">Shopping Cart</h1>{!rows.length?<Empty icon={<ShoppingCart/>} title="Your cart is empty"/>:<div className="cart-layout"><div>{rows.map(({product,qty})=><div className="cart-row" key={product.id}><img src={product.image}/><div><h3>{product.name}</h3><strong>{money(product.price)}</strong></div><div className="cart-controls"><div className="qty"><button onClick={()=>setQty(product.id,qty-1)}><Minus/></button><span>{qty}</span><button onClick={()=>setQty(product.id,qty+1)}><Plus/></button></div><button onClick={()=>remove(product.id)}><Trash2/>Remove</button></div></div>)}</div><OrderSummary subtotal={subtotal} delivery={delivery} checkout/></div>}</main>
}

function OrderSummary({subtotal,delivery,checkout=false}){
  const total=subtotal+delivery;
  return <aside className="summary"><h2>Order Summary</h2><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Delivery</span><b>{delivery?money(delivery):'FREE'}</b></div><div className="summary-total"><span>Total</span><b>{money(total)}</b></div>{checkout&&<Link to="/checkout">Proceed to Checkout <ChevronRight/></Link>}<div className="summary-payments"><PaymentMarks compact withLabel={false}/></div><p><ShieldCheck/>Secure checkout</p></aside>
}

function CheckoutPage({rows,subtotal,clearCart}){
  const nav=useNavigate(); const [method,setMethod]=useState('mpesa'); const [error,setError]=useState(''); const delivery=subtotal>=10000?0:(subtotal?350:0);
  const submit=(e)=>{e.preventDefault();if(!rows.length)return nav('/cart');const f=new FormData(e.currentTarget);if(!f.get('fullName')||!f.get('phone')||!f.get('address'))return setError('Please complete contact and delivery details.');if(method==='mpesa'&&!/^((\+?254)|0)?7\d{8}$/.test(String(f.get('mpesa')).replace(/\s/g,'')))return setError('Enter a valid Kenyan M-Pesa number.');if(method==='card'&&(!f.get('cardName')||String(f.get('cardNumber')).replace(/\s/g,'').length<13||String(f.get('cvc')).length<3))return setError('Complete the card details correctly.');clearCart();nav('/order-success',{state:{method,total:subtotal+delivery}})};
  if(!rows.length)return <main className="container page-shell"><Empty icon={<ShoppingBag/>} title="No items to checkout"/></main>;
  return <main className="container page-shell"><Breadcrumb items={[['Home','/'],['Cart','/cart'],['Checkout']]}/><div className="checkout-title"><h1>Checkout</h1><ShieldCheck/></div><form className="checkout-layout" onSubmit={submit}><div className="checkout-forms"><section className="form-card"><h2>Delivery Details</h2><div className="form-grid"><label>Full name<input name="fullName" placeholder="e.g. Amina Wanjiku"/></label><label>Phone number<input name="phone" placeholder="0712 345 678"/></label><label className="wide">Email<input name="email" type="email" placeholder="you@example.com"/></label><label className="wide">Delivery address<input name="address" placeholder="Estate, street, building and house number"/></label><label>County<select name="county"><option>Nairobi</option><option>Kiambu</option><option>Machakos</option><option>Kajiado</option><option>Mombasa</option><option>Nakuru</option><option>Kisumu</option></select></label><label>Town / area<input name="town" placeholder="e.g. Kilimani"/></label></div></section><section className="form-card"><div className="payment-heading-row"><h2>Payment Method</h2><PaymentMarks compact withLabel={false}/></div><div className="payment-tabs"><button type="button" className={method==='mpesa'?'active':''} onClick={()=>setMethod('mpesa')}><PaymentBrand brand="mpesa" compact/><span><b>M-Pesa</b><small>Pay securely from your phone</small></span></button><button type="button" className={method==='card'?'active':''} onClick={()=>setMethod('card')}><span className="tab-card-logos"><PaymentBrand brand="visa" compact/><PaymentBrand brand="mastercard" compact/></span><span><b>Card</b><small>Visa / Mastercard</small></span></button></div>{method==='mpesa'?<div className="payment-panel"><div className="checkout-brand-row"><PaymentBrand brand="mpesa"/><span>Gateway-ready checkout</span></div><label>M-Pesa phone number<input name="mpesa" placeholder="0712 345 678"/></label><p>STK Push would be sent after a live payment gateway is connected.</p></div>:<div className="payment-panel"><div className="checkout-brand-row"><PaymentBrand brand="visa"/><PaymentBrand brand="mastercard"/><span>Gateway-ready checkout</span></div><div className="form-grid"><label className="wide">Name as it appears on card<input name="cardName" placeholder="CARDHOLDER NAME"/></label><label className="wide">Card number<input name="cardNumber" placeholder="1234 5678 9012 3456"/></label><label>Expiry<input name="expiry" placeholder="MM / YY"/></label><label>CVC<input name="cvc" placeholder="123"/></label></div><p>Card data is not stored by this frontend.</p></div>}</section>{error&&<div className="error">{error}</div>}</div><div><aside className="checkout-items"><h2>Your Order</h2>{rows.map(({product,qty})=><div key={product.id}><img src={product.image}/><span><b>{product.name}</b><small>Qty {qty}</small></span><strong>{money(product.price*qty)}</strong></div>)}</aside><OrderSummary subtotal={subtotal} delivery={delivery}/><button className="place-order">Place Order <ChevronRight/></button></div></form></main>
}

function OrderSuccess(){const l=useLocation();return <main className="container success"><CircleCheck/><h1>Order received</h1><p>Your demo order was created using {l.state?.method==='mpesa'?'M-Pesa':'card'} checkout.</p><Link to="/shop">Continue Shopping</Link></main>}
function TrackOrder(){return <main className="container narrow"><Breadcrumb items={[['Home','/'],['Track Order']]}/><h1>Track your order</h1><div className="form-card"><label>Order number<input placeholder="e.g. ZM-381204"/></label><label>Phone or email<input placeholder="Used at checkout"/></label><button className="primary">Track Order</button></div></main>}
function AccountPage(){return <main className="container narrow"><Breadcrumb items={[['Home','/'],['Account']]}/><div className="account-card"><CircleUserRound/><h1>Welcome back</h1><p>Sign in to manage orders and saved items.</p><label>Email or phone<input placeholder="you@example.com"/></label><label>Password<input type="password" placeholder="••••••••"/></label><button className="primary">Sign in</button></div></main>}
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
    <div><h4>PAYMENTS</h4><span>M-PESA checkout</span><span>Visa checkout</span><span>Mastercard checkout</span><span>Live processing requires configured merchant gateway</span></div>
  </div>
  <div className="container footer-payment-panel">
    <div className="footer-payment-copy"><strong>Secure payment methods</strong><span>Pay using M-PESA, Visa or Mastercard at checkout.</span></div>
    <PaymentMarks withLabel={false}/>
  </div>
  <div className="footer-bottom">© 2026 ZawadiMart. Frontend demonstration.</div>
</footer>}

function MobileNav({cartCount}){return <nav className="mobile-nav"><NavLink to="/"><Home/><span>Home</span></NavLink><NavLink to="/shop"><LayoutGrid/><span>Shop</span></NavLink><NavLink to="/deals"><Tag/><span>Deals</span></NavLink><NavLink to="/cart" className="mobile-cart"><ShoppingCart/><span>Cart</span>{cartCount>0&&<i>{cartCount}</i>}</NavLink><NavLink to="/account"><CircleUserRound/><span>Account</span></NavLink></nav>}

export default App;
