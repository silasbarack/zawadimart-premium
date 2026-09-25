export const categories = [
  { slug: 'phones-tablets', name: 'Phones & Tablets', short: 'Phones', icon: '📱', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=88' },
  { slug: 'electronics', name: 'Electronics', short: 'Electronics', icon: '📺', image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=800&q=88' },
  { slug: 'computing', name: 'Computing', short: 'Laptops', icon: '💻', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&q=88' },
  { slug: 'home-appliances', name: 'Home Appliances', short: 'Appliances', icon: '🏠', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=88' },
  { slug: 'home-kitchen', name: 'Home & Kitchen', short: 'Kitchen', icon: '🍳', image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=800&q=88' },
  { slug: 'fashion', name: 'Fashion', short: 'Fashion', icon: '👕', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=88' },
  { slug: 'beauty', name: 'Beauty & Personal Care', short: 'Beauty', icon: '✨', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=88' },
  { slug: 'audio', name: 'Audio', short: 'Audio', icon: '🎧', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=88' },
  { slug: 'gaming', name: 'Gaming', short: 'Gaming', icon: '🎮', image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=88' },
  { slug: 'kids-baby', name: 'Kids & Baby', short: 'Kids', icon: '🧸', image: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&w=800&q=88' },
  { slug: 'groceries', name: 'Supermarket', short: 'Groceries', icon: '🛒', image: 'https://images.unsplash.com/photo-1543168256-418811576931?auto=format&fit=crop&w=800&q=88' },
  { slug: 'accessories', name: 'Accessories', short: 'Accessories', icon: '⌚', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=88' },
];

const P = (id, name, category, price, oldPrice, rating, reviews, stock, badge, image, description) => ({
  id, name, category, price, oldPrice, rating, reviews, stock, badge, image, description,
});

export const products = [
  P(1,'Samsung Galaxy A16 128GB 4GB RAM','phones-tablets',18499,21999,4.6,428,24,'Popular','https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=88','6.7-inch Android smartphone with dependable battery life, dual SIM support and 128GB storage.'),
  P(2,'Redmi Note 14 256GB 8GB RAM','phones-tablets',27999,31999,4.7,316,18,'Hot Deal','https://images.unsplash.com/photo-1605236453806-6ff36851218e?auto=format&fit=crop&w=900&q=88','Powerful everyday smartphone with large AMOLED display, fast charging and generous storage.'),
  P(3,'Tecno Spark 30C 128GB','phones-tablets',15999,18499,4.5,211,31,'Value Pick','https://images.unsplash.com/photo-1580910051074-3eb694886505?auto=format&fit=crop&w=900&q=88','Affordable 4G smartphone with smooth display, large battery and practical camera system.'),
  P(4,'Infinix Hot 50i 128GB','phones-tablets',13999,15999,4.4,188,36,'Budget Buy','https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=900&q=88','Dual-SIM smartphone with 128GB storage, bright display and long-lasting battery.'),
  P(5,'Apple iPhone 15 128GB','phones-tablets',102999,118999,4.9,94,7,'Premium','https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=88','Premium smartphone with advanced camera system, fast performance and durable design.'),
  P(6,'Samsung Galaxy Tab A9 64GB','phones-tablets',22999,25999,4.6,102,14,'Tablet Deal','https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=88','Compact Android tablet suited to study, streaming, browsing and everyday productivity.'),

  P(7,'Vision Plus 43-inch Full HD Smart TV','electronics',26999,31999,4.5,219,15,'TV Deal','https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=88','43-inch smart television with Full HD picture, streaming apps, HDMI and Wi-Fi.'),
  P(8,'TCL 55-inch 4K UHD Google TV','electronics',51999,58999,4.8,87,8,'4K Deal','https://images.unsplash.com/photo-1571415060716-baff5f717c37?auto=format&fit=crop&w=900&q=88','Large 4K smart TV with Google TV interface, HDR support and multiple HDMI ports.'),
  P(9,'Hisense 50-inch 4K Smart TV','electronics',44999,50999,4.7,114,9,'Best Seller','https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&w=900&q=88','Crisp 4K television with smart streaming features and slim-bezel design.'),
  P(10,'Sony 2.1ch Soundbar with Subwoofer','electronics',24999,28999,4.8,73,11,'Cinema Sound','https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=88','Home audio soundbar with wireless subwoofer for movies, music and gaming.'),
  P(11,'Portable Digital Projector 1080p','electronics',11999,14999,4.3,166,29,'Movie Night','https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=900&q=88','Portable projector with HDMI, USB and wireless screen mirroring for home entertainment.'),
  P(12,'Android TV Streaming Box 4K','electronics',4499,5999,4.4,287,44,'Streaming','https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=900&q=88','Compact streaming box with 4K output, Wi-Fi and access to popular entertainment apps.'),

  P(13,'HP 15 Core i5 16GB RAM 512GB SSD','computing',74999,82999,4.8,86,8,'Work Ready','https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=88','15-inch laptop with Core i5 performance, 16GB RAM and a fast 512GB SSD.'),
  P(14,'Lenovo IdeaPad Slim 3 8GB 512GB','computing',58999,64999,4.7,97,12,'Student Pick','https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=900&q=88','Lightweight everyday laptop ideal for school, office work and entertainment.'),
  P(15,'Acer Aspire 5 Ryzen 5 16GB','computing',67999,75999,4.6,64,9,'Productivity','https://images.unsplash.com/photo-1484788984921-03950022c9ef?auto=format&fit=crop&w=900&q=88','Balanced productivity laptop with strong multitasking performance and Full HD display.'),
  P(16,'24-inch Full HD IPS Monitor','computing',14999,17999,4.5,135,22,'Office Deal','https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=88','Slim 24-inch IPS monitor with Full HD resolution and HDMI connectivity.'),
  P(17,'Wireless Keyboard & Mouse Combo','computing',2499,3299,4.4,328,57,'Office Essential','https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=88','Quiet wireless keyboard and mouse combo for home, study and office setups.'),
  P(18,'1TB Portable External SSD','computing',12999,14999,4.7,144,26,'Fast Storage','https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=900&q=88','Compact high-speed portable SSD for backups, media and everyday file transfer.'),

  P(19,'Ramtons 138L Double Door Fridge','home-appliances',39999,45999,4.6,119,10,'Home Deal','https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=900&q=88','Compact double-door refrigerator ideal for apartments and small households.'),
  P(20,'200L Chest Freezer','home-appliances',34999,39999,4.5,82,9,'Freezer Deal','https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?auto=format&fit=crop&w=900&q=88','Energy-conscious chest freezer with generous storage for home or small business use.'),
  P(21,'8kg Front Load Washing Machine','home-appliances',52999,59999,4.7,77,7,'Laundry','https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=88','8kg front-load washing machine with multiple wash programmes and efficient spin cycle.'),
  P(22,'20L Digital Microwave Oven','home-appliances',12999,15999,4.5,158,16,'Kitchen Deal','https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=900&q=88','Compact microwave with digital controls, quick-start functions and timer settings.'),
  P(23,'Standing Fan 18-inch 5 Blade','home-appliances',3999,4999,4.4,296,38,'Cooling','https://images.unsplash.com/photo-1621619856624-42fd193a0661?auto=format&fit=crop&w=900&q=88','Adjustable standing fan with wide oscillation and multiple speed settings.'),
  P(24,'2.0L Stainless Electric Kettle','home-appliances',1699,2299,4.6,612,66,'Top Seller','https://images.unsplash.com/photo-1594213114663-d94db9b17125?auto=format&fit=crop&w=900&q=88','Fast-boil stainless steel kettle with automatic shut-off and boil-dry protection.'),

  P(25,'HomeChef Digital Air Fryer 5.5L','home-kitchen',12999,16999,4.8,187,13,'Kitchen Pick','https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=900&q=88','Family-size digital air fryer with preset modes and an easy-clean basket.'),
  P(26,'6L Electric Pressure Cooker','home-kitchen',8999,10999,4.6,151,17,'Meal Prep','https://images.unsplash.com/photo-1588279102819-f4520e40b1d9?auto=format&fit=crop&w=900&q=88','Multi-function electric pressure cooker for rice, stews, beans and everyday meals.'),
  P(27,'BlendGo 1.5L Countertop Blender','home-kitchen',5999,7499,4.3,98,18,'Home Pick','https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=900&q=88','Powerful countertop blender with pulse mode and stainless-steel blades.'),
  P(28,'12-piece Non-stick Cookware Set','home-kitchen',7499,9499,4.5,203,21,'Cookware','https://images.unsplash.com/photo-1584990347449-a87e8c47a6e1?auto=format&fit=crop&w=900&q=88','Non-stick cookware set with saucepans, frying pans and glass lids for everyday cooking.'),
  P(29,'3-tier Dish Rack & Cutlery Holder','home-kitchen',2999,3799,4.4,174,33,'Organise','https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=900&q=88','Space-saving dish drying rack with cutlery holder and removable drip tray.'),
  P(30,'Premium Cotton Bedsheet Set 6pc','home-kitchen',3299,4499,4.5,222,41,'Bedroom','https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=88','Soft six-piece bedding set designed for a clean and comfortable bedroom refresh.'),

  P(31,'Men Classic Cotton Polo Shirt','fashion',1899,2499,4.4,116,58,'Everyday','https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=88','Soft breathable cotton polo with a clean tailored fit for workdays and weekends.'),
  P(32,'Women Midi Office Dress','fashion',2999,3999,4.6,92,35,'Workwear','https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=88','Elegant midi dress with comfortable tailoring for office, church or events.'),
  P(33,'Men Lightweight Running Sneakers','fashion',4299,5499,4.5,131,34,'Sport','https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=900&q=88','Lightweight trainers with breathable mesh and flexible cushioning.'),
  P(34,'Women Classic Heels 3-inch','fashion',3499,4499,4.5,104,26,'Occasion','https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=88','Classic heels with comfortable fit for formal events and office wear.'),
  P(35,'Executive Leather Tote Bag','fashion',6499,7999,4.7,77,16,'Premium','https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=88','Structured premium-look tote with roomy compartments and shoulder straps.'),
  P(36,'Metro Backpack 20L','fashion',3299,4199,4.5,210,40,'Campus','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=88','Durable backpack with padded laptop sleeve, organised pockets and comfortable straps.'),

  P(37,'CeraCare Gentle Facial Cleanser','beauty',2299,2899,4.7,238,44,'Skin Care','https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=88','Gentle daily facial cleanser for removing oil, dirt and sunscreen without over-drying.'),
  P(38,'Vitamin C Brightening Serum 30ml','beauty',1799,2299,4.5,312,61,'Glow','https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=88','Lightweight brightening serum with vitamin C for a simple daily skincare routine.'),
  P(39,'Signature Eau de Parfum 100ml','beauty',4299,5499,4.4,93,28,'Fragrance','https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=88','Long-lasting fragrance with warm amber, fresh citrus and soft woody notes.'),
  P(40,'2000W Professional Hair Dryer','beauty',2799,3499,4.3,108,36,'Beauty Tool','https://images.unsplash.com/photo-1522338140262-f46f5913618a?auto=format&fit=crop&w=900&q=88','Salon-inspired hair dryer with multiple heat settings and cool-shot function.'),

  P(41,'Tune Pro Wireless Earbuds ANC','audio',5900,7999,4.6,544,42,'Top Rated','https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?auto=format&fit=crop&w=900&q=88','True-wireless earbuds with active noise cancellation and USB-C charging.'),
  P(42,'StudioMax Over-Ear Headphones','audio',8499,10999,4.7,265,24,'Popular','https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=88','Wireless headphones with deep bass, soft cushions and long battery life.'),
  P(43,'Portable Bluetooth Speaker 20W','audio',3999,4999,4.5,301,39,'Party','https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=900&q=88','Portable Bluetooth speaker with punchy sound, splash resistance and strong battery life.'),
  P(44,'Wireless Clip-on Lavalier Mic','audio',2499,3299,4.4,193,45,'Creator','https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=900&q=88','Compact wireless microphone for interviews, social video and mobile content creation.'),

  P(45,'PlayCore Wireless Game Controller','gaming',4999,6499,4.6,194,26,'Gamer Pick','https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=900&q=88','Low-latency wireless controller with textured grip and responsive triggers.'),
  P(46,'Arena RGB Mechanical Keyboard','gaming',4199,5299,4.6,157,27,'RGB','https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=900&q=88','Gaming keyboard with tactile keys, RGB lighting and dedicated media controls.'),
  P(47,'Precision Gaming Mouse 12000 DPI','gaming',2599,3299,4.5,211,44,'Esports','https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=900&q=88','Ergonomic gaming mouse with adjustable DPI and programmable controls.'),
  P(48,'Immersive Gaming Headset','gaming',4499,5799,4.7,173,21,'Surround','https://images.unsplash.com/photo-1599669454699-248893623440?auto=format&fit=crop&w=900&q=88','Comfortable gaming headset with clear microphone and immersive stereo sound.'),

  P(49,'Kids Remote Control Construction Truck','kids-baby',2499,3199,4.5,128,32,'Kids Pick','https://images.unsplash.com/photo-1594787318286-3d835c1d207f?auto=format&fit=crop&w=900&q=88','Durable remote-control construction toy designed for imaginative indoor play.'),
  P(50,'Baby Feeding Chair Foldable','kids-baby',6999,8499,4.6,71,17,'Baby','https://images.unsplash.com/photo-1599443015574-be5fe8a05783?auto=format&fit=crop&w=900&q=88','Foldable high chair with easy-clean tray, safety harness and compact storage.'),
  P(51,'Kids Educational Building Blocks 120pc','kids-baby',1599,2199,4.7,284,54,'Learning','https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?auto=format&fit=crop&w=900&q=88','Colourful building block set for creative play, motor skills and early learning.'),
  P(52,'Soft Baby Blanket 100x120cm','kids-baby',1299,1699,4.6,176,63,'Comfort','https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=900&q=88','Soft lightweight blanket suitable for cot, stroller or everyday baby comfort.'),

  P(53,'Premium Kenyan AA Coffee 500g','groceries',1299,1499,4.8,376,72,'Local Favourite','https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=900&q=88','Freshly roasted Kenyan coffee with rich aroma and balanced acidity.'),
  P(54,'Cooking Oil 5L','groceries',1799,1999,4.6,244,85,'Pantry','https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=88','Family-size cooking oil for everyday frying, baking and meal preparation.'),
  P(55,'Laundry Detergent Powder 3.5kg','groceries',1399,1699,4.7,491,90,'Household','https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=900&q=88','Large detergent pack formulated for everyday machine and hand washing.'),
  P(56,'Rice Premium Pishori 5kg','groceries',1299,1499,4.8,315,78,'Kitchen Staple','https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=88','Premium aromatic rice suitable for pilau, biryani and everyday family meals.'),

  P(57,'SmartFit AMOLED Watch Series 5','accessories',6999,8999,4.5,301,31,'Fitness','https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=88','AMOLED smartwatch with fitness tracking, notifications and sleep insights.'),
  P(58,'UltraCharge 20,000mAh Power Bank','accessories',3799,4699,4.5,402,64,'Fast Charge','https://images.unsplash.com/photo-1609592424824-9af9f6f641ae?auto=format&fit=crop&w=900&q=88','High-capacity portable power bank with dual outputs and fast charging.'),
  P(59,'65W USB-C Fast Charger','accessories',2499,3299,4.6,218,48,'Fast Charge','https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=900&q=88','Compact high-output wall charger suitable for compatible phones, tablets and laptops.'),
  P(60,'Laptop Sleeve 15.6-inch Water Resistant','accessories',1599,2199,4.4,187,51,'Protection','https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=88','Padded water-resistant laptop sleeve with accessory pocket and soft interior lining.'),
];

export const getCategory = (slug) => categories.find((category) => category.slug === slug);
export const getProduct = (id) => products.find((product) => product.id === Number(id));
export const money = (value) => new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  maximumFractionDigits: 0,
}).format(value);
