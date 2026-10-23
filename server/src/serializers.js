// Shapes match the storefront's src/data.js so the frontend can use API data directly.
export const categoryOut = (row) => ({
  slug: row.slug,
  name: row.name,
  short: row.short_name,
  icon: row.icon,
  image: row.image_url,
  ...(row.product_count !== undefined ? { productCount: row.product_count } : {}),
});

export const productOut = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category_slug,
  price: row.price,
  oldPrice: row.old_price,
  rating: Number(row.rating),
  reviews: row.review_count,
  stock: row.stock,
  badge: row.badge,
  image: row.image_url,
  description: row.description,
  ...(row.is_active === false ? { isActive: false } : {}),
});

export const adminProductOut = (row) => ({ ...productOut(row), isActive: row.is_active, createdAt: row.created_at, updatedAt: row.updated_at });

export const userOut = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  role: row.role,
  createdAt: row.created_at,
});

export const orderSummaryOut = (row) => ({
  orderNumber: row.order_number,
  status: row.status,
  paymentStatus: row.payment_status,
  paymentMethod: row.payment_method,
  total: row.total,
  currency: row.currency,
  itemCount: row.item_count,
  createdAt: row.created_at,
});

export const orderOut = (order, items, events, { includeCustomer = true } = {}) => ({
  orderNumber: order.order_number,
  status: order.status,
  paymentStatus: order.payment_status,
  paymentMethod: order.payment_method,
  ...(includeCustomer ? {
    customer: { name: order.customer_name, phone: order.phone, email: order.email },
    delivery: { address: order.address, county: order.county, town: order.town },
    notes: order.notes,
  } : {}),
  items: items.map((item) => ({
    productId: item.product_id,
    name: item.product_name,
    image: item.image_url,
    unitPrice: item.unit_price,
    quantity: item.quantity,
    lineTotal: item.line_total,
  })),
  subtotal: order.subtotal,
  deliveryFee: order.delivery_fee,
  total: order.total,
  currency: order.currency,
  createdAt: order.created_at,
  paidAt: order.paid_at,
  events: events.map((event) => ({ status: event.status, note: event.note, createdAt: event.created_at })),
});
