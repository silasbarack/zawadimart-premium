import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { query } from './db/pool.js';
import { errorHandler } from './errors.js';
import { authenticate } from './middleware/auth.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import cartRoutes from './routes/cart.js';
import catalogRoutes from './routes/catalog.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import wishlistRoutes from './routes/wishlist.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1); // Render and most hosts sit behind one proxy
  app.disable('x-powered-by');
  app.use(helmet());

  // Payment providers call these server-to-server; they parse their own bodies
  // (Paystack signatures need the raw bytes) and must not be subject to CORS.
  app.use('/api/payments', paymentRoutes);

  app.use(cors({
    origin: (origin, callback) => callback(null, !origin || config.corsOrigins.includes(origin)),
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Order-Key'],
    maxAge: 600,
  }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', async (req, res) => {
    try {
      await query('SELECT 1');
      res.json({ status: 'ok', database: 'ok' });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'unreachable' });
    }
  });

  app.use('/api', authenticate);
  app.use('/api', catalogRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/admin', adminRoutes);

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
  app.use(errorHandler);
  return app;
}
