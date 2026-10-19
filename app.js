const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fileUpload = require("express-fileupload");

// Import Routes
const authRoutes = require('./routes/authRoutes'); 
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const accountRoutes = require('./routes/accountRoutes');
const checkoutRoutes = require('./routes/checkoutRoutes');

const app = express();

/* =====================================================
    1. CORS CONFIGURATION
===================================================== */
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    // Explicit origin checking
    if (
      allowedOrigins.includes(origin) || 
      origin.endsWith('.vercel.app') || 
      origin.includes('onrender.com')
    ) {
      return callback(null, origin); // Pass back exact origin string for Access-Control-Allow-Origin
    }
    
    return callback(null, origin); // Fallback for dev environments
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200, // Legacy browser support for 204 response
};

// Apply CORS middleware globally
app.use(cors(corsOptions));

// Explicitly handle HTTP preflight (OPTIONS) requests across all routes
app.options('*', cors(corsOptions));

/* =====================================================
    2. MIDDLEWARES
===================================================== */
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(fileUpload({
  useTempFiles: false,
  tempFileDir: '/tmp/',
  limits: { fileSize: 50 * 1024 * 1024 },
}));

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(`[${req.method}] ${req.originalUrl} - ${req.requestTime}`);
  next();
});

/* =====================================================
    3. MOUNT ROUTES
===================================================== */
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/account', accountRoutes);
app.use('/api/v1/checkout', checkoutRoutes);

/* =====================================================
    4. ERROR HANDLING
===================================================== */

// Catch-all for undefined routes
app.all('*', (req, res, next) => {
  const err = new Error(`Cannot find ${req.originalUrl} on this server!`);
  err.statusCode = 404;
  err.status = 'fail'; 
  next(err);
});

// Global Error Middleware
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  let statusCode = 500;
  if (Number.isInteger(err.statusCode)) {
    statusCode = err.statusCode;
  } else if (Number.isInteger(err.status)) {
    statusCode = err.status;
  }

  const statusMessage = err.status && typeof err.status === 'string' 
    ? err.status 
    : (statusCode >= 400 && statusCode < 500 ? 'fail' : 'error');

  res.status(statusCode).json({
    status: statusMessage,
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;