export const categories = [
  { slug: 'smartphones', name: 'Smartphones', short: 'Phones', icon: '📱', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=700&q=86' },
  { slug: 'electronics', name: 'Electronics', short: 'Electronics', icon: '💻', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=700&q=86' },
  { slug: 'fashion', name: 'Fashion', short: 'Fashion', icon: '👕', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=86' },
  { slug: 'shoes', name: 'Shoes', short: 'Shoes', icon: '👟', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=86' },
  { slug: 'home-appliances', name: 'Home Appliances', short: 'Home', icon: '🏠', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=700&q=86' },
  { slug: 'beauty', name: 'Beauty', short: 'Beauty', icon: '✨', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=700&q=86' },
  { slug: 'accessories', name: 'Accessories', short: 'Accessories', icon: '🎧', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=86' },
  { slug: 'gaming', name: 'Gaming', short: 'Gaming', icon: '🎮', image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=700&q=86' },
];

const P = (id, name, category, price, oldPrice, rating, reviews, stock, badge, image, description) => ({
  id, name, category, price, oldPrice, rating, reviews, stock, badge, image, description,
});

export const products = [
  P(1,'Nova X5 5G Smartphone 256GB','smartphones',24999,29999,4.7,318,17,'Best Seller','https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=88','A fast 5G smartphone with a vivid display, 8GB RAM, 256GB storage and all-day battery life.'),
  P(2,'Nova Lite 6.6-inch Smartphone 128GB','smartphones',16499,18999,4.4,182,28,'Value Pick','https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=88','A slim everyday smartphone with dependable performance, dual SIM support and a large battery.'),
  P(3,'Orbit Pro Camera Phone 512GB','smartphones',41999,46999,4.8,96,8,'Camera Pick','https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=900&q=88','Premium camera-focused phone with generous storage, bright OLED screen and fast charging.'),
  P(4,'Pocket Mini Smartphone 64GB','smartphones',10999,12999,4.2,141,34,'Compact','https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=88','Compact dual-SIM smartphone for calls, messaging, social apps and everyday browsing.'),

  P(5,'ProBook 14 Slim Laptop 16GB / 512GB','electronics',54999,64999,4.8,126,9,'Hot Deal','https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=88','Portable 14-inch productivity laptop with 16GB RAM, 512GB SSD and a crisp Full HD display.'),
  P(6,'Vision 43-inch Full HD Smart TV','electronics',32999,38999,4.6,149,11,'Limited','https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=88','43-inch smart television with Full HD picture, streaming apps, HDMI and Wi-Fi connectivity.'),
  P(7,'Sonic Mini Bluetooth Speaker','electronics',2999,3999,4.4,238,47,'Portable','https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=88','Pocket-size Bluetooth speaker with full sound, splash resistance and up to 12 hours battery.'),
  P(8,'PixelCam Mirrorless Creator Camera','electronics',79999,89999,4.9,64,7,'Creator','https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=900&q=88','Compact mirrorless camera with crisp video, fast autofocus and interchangeable lens support.'),

  P(9,'Classic Cotton Polo Shirt','fashion',1899,2499,4.4,116,58,'Everyday','https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=88','Soft breathable cotton polo with a clean tailored fit suitable for workdays and weekends.'),
  P(10,'Executive Leather Tote Bag','fashion',6499,7999,4.7,77,16,'Premium','https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=88','Structured premium-look tote with roomy compartments and comfortable shoulder straps.'),
  P(11,'Everyday Denim Jacket','fashion',4499,5999,4.6,84,22,'Trending','https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?auto=format&fit=crop&w=900&q=88','Classic denim jacket with a comfortable regular fit and timeless layering style.'),
  P(12,'Metro Backpack 20L','fashion',3299,4199,4.5,210,40,'Campus','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=88','Durable everyday backpack with padded laptop sleeve, organised pockets and comfortable straps.'),

  P(13,'Urban Step Everyday Sneakers','shoes',3499,4999,4.5,221,35,'-30%','https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=88','Comfortable everyday sneakers with breathable lining and a cushioned sole.'),
  P(14,'RunFlex Lightweight Trainers','shoes',4299,5499,4.5,131,34,'Sport','https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=900&q=88','Lightweight trainers with breathable mesh, flexible sole and supportive cushioning.'),
  P(15,'Street Classic Low Sneakers','shoes',3899,4999,4.7,242,41,'Streetwear','https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=88','Low-profile casual sneakers with clean panels and a durable rubber sole.'),
  P(16,'TrailGrip Outdoor Shoes','shoes',5799,6999,4.6,88,19,'Outdoor','https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=900&q=88','Supportive outdoor shoes with grippy outsole and reinforced toe protection.'),

  P(17,'HomeChef Digital Air Fryer 5.5L','home-appliances',12999,16999,4.8,187,13,'Kitchen Pick','https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=900&q=88','Family-size digital air fryer with preset modes and an easy-clean basket.'),
  P(18,'BlendGo 1.5L Countertop Blender','home-appliances',5999,7499,4.3,98,18,'Home Pick','https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=900&q=88','Powerful countertop blender with pulse mode and stainless-steel blades.'),
  P(19,'FreshPress Steam Iron 2200W','home-appliances',3499,4299,4.4,120,33,'Home','https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=900&q=88','Fast-heating steam iron with ceramic soleplate and adjustable steam control.'),
  P(20,'QuickBoil Stainless Kettle 1.7L','home-appliances',2799,3499,4.5,164,45,'Fast Boil','https://images.unsplash.com/photo-1594213114663-d94db9b17125?auto=format&fit=crop&w=900&q=88','Modern cordless kettle with automatic shut-off and boil-dry protection.'),

  P(21,'Signature Eau de Parfum 100ml','beauty',4299,5499,4.4,93,28,'New','https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=88','A refined long-lasting fragrance with warm amber, fresh citrus and soft woody notes.'),
  P(22,'SoftGlow Skincare Essentials Set','beauty',3899,4899,4.7,173,29,'Self Care','https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=88','Daily skincare set with cleanser, serum and moisturiser for a fresh hydrated routine.'),
  P(23,'GlowPro Hair Dryer 2000W','beauty',2799,3499,4.3,108,36,'Beauty Tool','https://images.unsplash.com/photo-1522338140262-f46f5913618a?auto=format&fit=crop&w=900&q=88','Salon-inspired hair dryer with multiple heat modes and cool-shot setting.'),
  P(24,'Velvet Matte Lip Colour Set','beauty',1699,2299,4.5,132,52,'Beauty Deal','https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=900&q=88','A wearable lipstick set with smooth matte finish and rich everyday shades.'),

  P(25,'Tune Pro Wireless Earbuds ANC','accessories',5900,7999,4.6,544,42,'Top Rated','https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=900&q=88','Compact true-wireless earbuds with active noise cancellation and USB-C charging.'),
  P(26,'StudioMax Over-Ear Headphones','accessories',8499,10999,4.7,265,24,'Popular','https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=88','Wireless over-ear headphones with deep bass and up to 35 hours of listening.'),
  P(27,'SmartFit AMOLED Watch Series 5','accessories',6999,8999,4.5,301,31,'Fitness','https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=88','AMOLED smartwatch with fitness tracking, notifications and sleep insights.'),
  P(28,'UltraCharge 20,000mAh Power Bank','accessories',3799,4699,4.5,402,64,'Fast Charge','https://images.unsplash.com/photo-1609592424824-9af9f6f641ae?auto=format&fit=crop&w=900&q=88','High-capacity portable power bank with dual outputs and fast charging.'),

  P(29,'PlayCore Wireless Game Controller','gaming',4999,6499,4.6,194,26,'Gamer Pick','https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=88','Low-latency wireless controller with textured grip and responsive triggers.'),
  P(30,'Arena RGB Gaming Keyboard','gaming',4199,5299,4.6,157,27,'RGB','https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=88','Full-size gaming keyboard with tactile keys, RGB lighting and media controls.'),
  P(31,'Precision Gaming Mouse 12000 DPI','gaming',2599,3299,4.5,211,44,'Esports','https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=88','Ergonomic programmable gaming mouse with adjustable DPI and responsive switches.'),
  P(32,'Immersive Gaming Headset','gaming',4499,5799,4.7,173,21,'Surround','https://images.unsplash.com/photo-1599669454699-248893623440?auto=format&fit=crop&w=900&q=88','Comfortable gaming headset with clear microphone and immersive stereo sound.'),
];

export const getCategory = (slug) => categories.find((category) => category.slug === slug);
export const getProduct = (id) => products.find((product) => product.id === Number(id));
export const money = (value) => new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
}).format(value);
