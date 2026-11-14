-- The Apple iPhone 15 photo was removed from Unsplash (404), so the product showed a blank
-- image. Point it, and past orders that copied it, at a working photo. Rows already changed
-- (e.g. a new photo set in admin) are left alone.
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?auto=format&fit=crop&w=900&q=88', updated_at = now()
  WHERE image_url = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=88';
UPDATE order_items SET image_url = 'https://images.unsplash.com/photo-1678652197831-2d180705cd2c?auto=format&fit=crop&w=900&q=88'
  WHERE image_url = 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=900&q=88';
