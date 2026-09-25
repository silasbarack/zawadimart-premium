import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight, CircleCheck, CircleUserRound, CreditCard, Heart, Home,
  LayoutGrid, Menu, Minus, PackageCheck, Plus, Search, ShieldCheck,
  ShoppingBag, ShoppingCart, Smartphone, Star, Tag, Trash2, Truck, X
} from 'lucide-react';
import {
  Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams
} from 'react-router-dom';
import { categories, getCategory, getProduct, money, products } from './data';

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

function App() {
  const [cart,setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zawadimart-cart')) || []; } catch { return []; }
  });
  const [wishlist,setWishlist] = useState([]);
  const [menuOpen,setMenuOpen] = useState(false);
  const [toast,setToast] = useState('');
  const location = useLocation();

  useEffect(()=>localStorage.setItem('zawadimart-cart',JSON.stringify(cart)),[cart]);
  useEffect(()=>{ setMenuOpen(false); window.scrollTo({top:0,behavior:'smooth'}); },[location.pathname]);

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
  const shared={addToCart,wishlist,toggleWishlist};

  return (
    <div className="app-shell">
      {toast && <div className="toast"><CircleCheck size={16}/>{toast}</div>}
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

function Header({cartCount,menuOpen,setMenuOpen}) {
  const navigate=useNavigate();
  const [q,setQ]=useState('');
  const submit=(e)=>{e.preventDefault();navigate(q.trim()?'/shop?q='+encodeURIComponent(q.trim()):'/shop');};
  return (
    <>
      <div className="top-strip"><div className="container">Free delivery on selected Nairobi orders · Secure checkout · Prices in KES</div></div>
      <header className="site-header">
        <div className="container header-main">
          <button className="menu-btn" onClick={()=>setMenuOpen(true)}><Menu/></button>
          <Link to="/" className="brand"><BrandLogo/></Link>
          <form className="search-box" onSubmit={submit}><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products, brands and categories"/><button>Search</button></form>
          <Link to="/account" className="head-icon"><CircleUserRound/><span>Account</span></Link>
          <Link to="/cart" className="head-icon cart-link"><ShoppingCart/><span>Cart</span>{cartCount>0&&<i>{cartCount}</i>}</Link>
        </div>
        <div className="container mobile-search-row">
          <form className="search-box mobile-search" onSubmit={submit}><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products, brands and categories"/></form>
        </div>
      </header>
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

const CategoryBubbles=()=>(
  <section className="container category-bubbles">
    {categories.slice(0,8).map(c=><Link key={c.slug} to={'/category/'+c.slug}><div><img src={c.image} alt={c.name}/></div><span>{c.short}</span></Link>)}
  </section>
);

function HomePage(props){
  const flash=products.slice(0,10), phones=products.filter(p=>p.category==='phones-tablets').slice(0,6);
  const appliances=products.filter(p=>p.category==='home-appliances').slice(0,6);
  const computing=products.filter(p=>p.category==='computing').slice(0,6);
  const beauty=products.filter(p=>p.category==='beauty').slice(0,6);
  const sponsored=products.filter(p=>['accessories','audio','home-kitchen'].includes(p.category)).slice(0,6);
  return <main className="jumia-home">
    <section className="hero-zone">
      <div className="container hero-card">
        <div className="hero-copy"><span>MEGA SHOPPING DAYS</span><h1>Big deals.<br/>Better shopping.</h1><p>Discover phones, appliances, fashion, beauty and more — all priced in Kenyan shillings.</p><Link to="/deals">Shop Deals <ChevronRight/></Link></div>
        <div className="hero-collage">
          <div><img src={products[1].image}/></div><div><img src={products[18].image}/></div><div><img src={products[32].image}/></div>
        </div>
      </div>
    </section>
    <CategoryBubbles/>
    <DealSection title="Flash Sales | Live Now" tone="red" items={flash} {...props}/>
    <DealSection title="Phone Deals" tone="cream" items={phones} {...props}/>
    <DealSection title="Large Appliances Deals" tone="cream" items={appliances} {...props}/>
    <DealSection title="Laptop & Computing Deals" tone="blue" items={computing} {...props}/>
    <DealSection title="Beauty Essentials" tone="pink" items={beauty} {...props}/>
    <DealSection title="Sponsored Products" tone="mint" items={sponsored} {...props}/>
    <InfoBlock/>
  </main>
}

function DealSection({title,tone,items,addToCart,wishlist,toggleWishlist}){
  return <section className={`container deal-section ${tone}`}>
    <div className="deal-head"><h2>{title}</h2><Link to="/shop"><ChevronRight/></Link></div>
    <div className="deal-scroll">{items.map(p=><ProductCard key={p.id} product={p} addToCart={addToCart} wishlist={wishlist} toggleWishlist={toggleWishlist}/>)}</div>
  </section>
}

function ProductCard({product,addToCart,wishlist,toggleWishlist}){
  return <article className="product-card">
    <Link className="product-img" to={'/product/'+product.id}><img src={product.image} alt={product.name}/><span className="stock-label">{product.stock} items in stock</span></Link>
    <div className="product-body">
      <Link to={'/product/'+product.id}><h3>{product.name}</h3></Link>
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
  const {id}=useParams(); const p=getProduct(id); const [qty,setQty]=useState(1); if(!p)return <NotFound/>; const cat=getCategory(p.category);
  return <main className="container page-shell"><Breadcrumb items={[['Home','/'],[cat.name,'/category/'+cat.slug],[p.name]]}/><section className="product-detail"><div className="detail-image"><img src={p.image}/><span>-{discount(p)}%</span></div><div className="detail-copy"><span className="eyebrow">{cat.name}</span><h1>{p.name}</h1><div className="rating"><Star size={16} fill="currentColor"/>{p.rating} <span>({p.reviews} reviews)</span></div><div className="detail-price">{money(p.price)} <del>{money(p.oldPrice)}</del></div><p>{p.description}</p><div className="in-stock"><CircleCheck/>In stock — {p.stock} units available</div><div className="detail-actions"><div className="qty"><button onClick={()=>setQty(Math.max(1,qty-1))}><Minus/></button><span>{qty}</span><button onClick={()=>setQty(Math.min(p.stock,qty+1))}><Plus/></button></div><button className="buy" onClick={()=>addToCart(p.id,qty)}><ShoppingCart/>Add to Cart</button><button className="heart" onClick={()=>toggleWishlist(p.id)}><Heart fill={wishlist.includes(p.id)?'currentColor':'none'}/></button></div><div className="benefits"><span><Truck/><b>Delivery</b><small>Calculated at checkout</small></span><span><ShieldCheck/><b>Secure Checkout</b><small>M-Pesa & cards</small></span><span><PackageCheck/><b>Support</b><small>Order assistance</small></span></div></div></section></main>
}

function CartPage({rows,subtotal,setQty,remove}){
  const delivery=subtotal>=10000?0:(subtotal?350:0);
  return <main className="container page-shell"><Breadcrumb items={[['Home','/'],['Cart']]}/><h1 className="page-title">Shopping Cart</h1>{!rows.length?<Empty icon={<ShoppingCart/>} title="Your cart is empty"/>:<div className="cart-layout"><div>{rows.map(({product,qty})=><div className="cart-row" key={product.id}><img src={product.image}/><div><h3>{product.name}</h3><strong>{money(product.price)}</strong></div><div className="cart-controls"><div className="qty"><button onClick={()=>setQty(product.id,qty-1)}><Minus/></button><span>{qty}</span><button onClick={()=>setQty(product.id,qty+1)}><Plus/></button></div><button onClick={()=>remove(product.id)}><Trash2/>Remove</button></div></div>)}</div><OrderSummary subtotal={subtotal} delivery={delivery} checkout/></div>}</main>
}

function OrderSummary({subtotal,delivery,checkout=false}){
  const total=subtotal+delivery;
  return <aside className="summary"><h2>Order Summary</h2><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Delivery</span><b>{delivery?money(delivery):'FREE'}</b></div><div className="summary-total"><span>Total</span><b>{money(total)}</b></div>{checkout&&<Link to="/checkout">Proceed to Checkout <ChevronRight/></Link>}<p><ShieldCheck/>Secure checkout</p></aside>
}

function CheckoutPage({rows,subtotal,clearCart}){
  const nav=useNavigate(); const [method,setMethod]=useState('mpesa'); const [error,setError]=useState(''); const delivery=subtotal>=10000?0:(subtotal?350:0);
  const submit=(e)=>{e.preventDefault();if(!rows.length)return nav('/cart');const f=new FormData(e.currentTarget);if(!f.get('fullName')||!f.get('phone')||!f.get('address'))return setError('Please complete contact and delivery details.');if(method==='mpesa'&&!/^((\+?254)|0)?7\d{8}$/.test(String(f.get('mpesa')).replace(/\s/g,'')))return setError('Enter a valid Kenyan M-Pesa number.');if(method==='card'&&(!f.get('cardName')||String(f.get('cardNumber')).replace(/\s/g,'').length<13||String(f.get('cvc')).length<3))return setError('Complete the card details correctly.');clearCart();nav('/order-success',{state:{method,total:subtotal+delivery}})};
  if(!rows.length)return <main className="container page-shell"><Empty icon={<ShoppingBag/>} title="No items to checkout"/></main>;
  return <main className="container page-shell"><Breadcrumb items={[['Home','/'],['Cart','/cart'],['Checkout']]}/><div className="checkout-title"><h1>Checkout</h1><ShieldCheck/></div><form className="checkout-layout" onSubmit={submit}><div className="checkout-forms"><section className="form-card"><h2>Delivery Details</h2><div className="form-grid"><label>Full name<input name="fullName" placeholder="e.g. Amina Wanjiku"/></label><label>Phone number<input name="phone" placeholder="0712 345 678"/></label><label className="wide">Email<input name="email" type="email" placeholder="you@example.com"/></label><label className="wide">Delivery address<input name="address" placeholder="Estate, street, building and house number"/></label><label>County<select name="county"><option>Nairobi</option><option>Kiambu</option><option>Machakos</option><option>Kajiado</option><option>Mombasa</option><option>Nakuru</option><option>Kisumu</option></select></label><label>Town / area<input name="town" placeholder="e.g. Kilimani"/></label></div></section><section className="form-card"><h2>Payment Method</h2><div className="payment-tabs"><button type="button" className={method==='mpesa'?'active':''} onClick={()=>setMethod('mpesa')}><Smartphone/><span><b>M-Pesa</b><small>Pay from phone</small></span></button><button type="button" className={method==='card'?'active':''} onClick={()=>setMethod('card')}><CreditCard/><span><b>Card</b><small>Visa / Mastercard</small></span></button></div>{method==='mpesa'?<div className="payment-panel"><div className="mpesa">M-PESA</div><label>M-Pesa phone number<input name="mpesa" placeholder="0712 345 678"/></label><p>STK Push would be sent after a live payment gateway is connected.</p></div>:<div className="payment-panel"><div className="form-grid"><label className="wide">Name as it appears on card<input name="cardName" placeholder="CARDHOLDER NAME"/></label><label className="wide">Card number<input name="cardNumber" placeholder="1234 5678 9012 3456"/></label><label>Expiry<input name="expiry" placeholder="MM / YY"/></label><label>CVC<input name="cvc" placeholder="123"/></label></div><p>Card data is not stored by this frontend.</p></div>}</section>{error&&<div className="error">{error}</div>}</div><div><aside className="checkout-items"><h2>Your Order</h2>{rows.map(({product,qty})=><div key={product.id}><img src={product.image}/><span><b>{product.name}</b><small>Qty {qty}</small></span><strong>{money(product.price*qty)}</strong></div>)}</aside><OrderSummary subtotal={subtotal} delivery={delivery}/><button className="place-order">Place Order <ChevronRight/></button></div></form></main>
}

function OrderSuccess(){const l=useLocation();return <main className="container success"><CircleCheck/><h1>Order received</h1><p>Your demo order was created using {l.state?.method==='mpesa'?'M-Pesa':'card'} checkout.</p><Link to="/shop">Continue Shopping</Link></main>}
function TrackOrder(){return <main className="container narrow"><Breadcrumb items={[['Home','/'],['Track Order']]}/><h1>Track your order</h1><div className="form-card"><label>Order number<input placeholder="e.g. ZM-381204"/></label><label>Phone or email<input placeholder="Used at checkout"/></label><button className="primary">Track Order</button></div></main>}
function AccountPage(){return <main className="container narrow"><Breadcrumb items={[['Home','/'],['Account']]}/><div className="account-card"><CircleUserRound/><h1>Welcome back</h1><p>Sign in to manage orders and saved items.</p><label>Email or phone<input placeholder="you@example.com"/></label><label>Password<input type="password" placeholder="••••••••"/></label><button className="primary">Sign in</button></div></main>}
function Empty({icon,title}){return <div className="empty">{icon}<h2>{title}</h2><p>Explore the store and find something you like.</p><Link to="/shop">Start Shopping</Link></div>}
function Breadcrumb({items}){return <nav className="breadcrumb">{items.map(([label,href],i)=><span key={label}>{i>0&&<ChevronRight size={12}/>} {href?<Link to={href}>{label}</Link>:<b>{label}</b>}</span>)}</nav>}
function NotFound(){return <main className="container narrow"><Empty icon={<span className="big404">404</span>} title="Page not found"/></main>}

function InfoBlock(){return <section className="container info-block"><h2>ZawadiMart Kenya — Shopping Made Easier</h2><p>Explore a broad catalogue of products for everyday Kenyan life, including phones, electronics, appliances, computing, fashion, beauty, home essentials and more. ZawadiMart is designed as a realistic e-commerce shopping experience with transparent KES pricing, product categories, cart functionality and convenient checkout flows.</p></section>}

function Footer(){return <footer><div className="back-top" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>⌃<span>BACK TO TOP</span></div><div className="container footer-grid"><div><BrandLogo compact/><p>Modern online shopping for Kenya.</p></div><div><h4>HELP</h4><Link to="/track-order">Track Order</Link><Link to="/account">My Account</Link><span>Shipping & Delivery</span><span>Returns</span></div><div><h4>ABOUT</h4><Link to="/shop">Shop</Link><Link to="/deals">Deals</Link><span>Terms & Conditions</span><span>Privacy Notice</span></div><div><h4>PAYMENTS</h4><span>M-Pesa</span><span>Visa / Mastercard</span><span>Prices in KES</span></div></div><div className="footer-bottom">© 2026 ZawadiMart. Frontend demonstration.</div></footer>}

function MobileNav({cartCount}){return <nav className="mobile-nav"><NavLink to="/"><Home/><span>Home</span></NavLink><NavLink to="/shop"><LayoutGrid/><span>Shop</span></NavLink><NavLink to="/deals"><Tag/><span>Deals</span></NavLink><NavLink to="/cart" className="mobile-cart"><ShoppingCart/><span>Cart</span>{cartCount>0&&<i>{cartCount}</i>}</NavLink><NavLink to="/account"><CircleUserRound/><span>Account</span></NavLink></nav>}

export default App;
