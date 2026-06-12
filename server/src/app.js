// app.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import pinoHttp from 'pino-http';
import client from 'prom-client';
import authRoutes from './routes/authRouts.js'; // updated path to match file name
import adminRoutes from './routes/adminRoutes.js';
import prizeRoutes from './routes/prizeRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import evaluatorRoutes from './routes/evaluatorRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import { env } from './config/env.js';
import { authenticate } from './middleware/auth.js';
import { logger } from './config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Avoid weak ETags + conditional GET (304) on `res.json()` — browsers can keep showing
// stale list payloads (e.g. evaluator queue after marks / server logic changes).
app.set('etag', false);
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request latency in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [50, 100, 200, 500, 1000, 3000],
});
register.registerMetric(httpDuration);

const allowedOrigins = new Set(env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean));

app.set('trust proxy', 1);
app.use(cookieParser());
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);
app.use(pinoHttp({ logger }));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// JSON body parser with size limit
// Note: File uploads are handled by multer middleware with separate limits
// Application file uploads are limited to 200KB per file in upload.js
app.use(express.json({ limit: '10mb' }));

// Add logging middleware to see all incoming requests (before routes)
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('x-request-id', req.requestId);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Server] ${req.method} ${req.originalUrl} (${req.requestId})`);
  }
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    httpDuration.labels(req.method, req.route?.path || req.path, String(res.statusCode)).observe(durationMs);
  });
  next();
});

const publicDir = path.join(__dirname, '..', 'public');
const allowedFileBuckets = new Set(['photos', 'files', 'winnerPhotoes']);

const sendFileFromBucket = (res, bucket, filename) => {
  if (!allowedFileBuckets.has(bucket)) return res.status(400).json({ msg: 'Invalid file bucket' });

  const safeFilename = path.basename(filename);
  if (safeFilename !== filename) return res.status(400).json({ msg: 'Invalid filename' });

  const resolvedPath = path.join(publicDir, bucket, safeFilename);
  if (!resolvedPath.startsWith(path.join(publicDir, bucket))) {
    return res.status(400).json({ msg: 'Invalid path' });
  }
  return res.sendFile(resolvedPath, (err) => {
    if (err) {
      if (!res.headersSent) res.status(404).json({ msg: 'File not found' });
    }
  });
};

// Gallery winner photos are public because they are shown on the public award history page.
app.get('/api/files/winnerPhotoes/:filename', (req, res) => {
  return sendFileFromBucket(res, 'winnerPhotoes', req.params.filename);
});

app.get('/api/files/:bucket/:filename', authenticate, (req, res) => {
  const { bucket, filename } = req.params;
  return sendFileFromBucket(res, bucket, filename);
});

app.get('/', (req, res) => {
    res.send('backend is running');
});

// Health check endpoint for Docker
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
    });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/prize', prizeRoutes);
app.use('/api/application', applicationRoutes);
app.use('/api/evaluator', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, private');
  next();
});
app.use('/api/evaluator', evaluatorRoutes);
app.use('/api/gallery', galleryRoutes);

app.use((req, res) => {
  res.status(404).json({ msg: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  const message = err?.message || 'Internal server error';
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Unhandled Error]', err);
  }
  res.status(500).json({ msg: process.env.NODE_ENV === 'production' ? 'Internal server error' : message });
});

export default app;
