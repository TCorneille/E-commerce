
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');

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
  // Add your deployed frontend origin here if needed.
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header (e.g. curl).
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error(`CORS blocked origin: ${origin}`)
    );
  },

  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept'
  ],

  credentials: true,
  optionsSuccessStatus: 204,
};

// Register CORS before routes and other middleware.
app.use(cors(corsOptions));

/* =====================================================
   2. MIDDLEWARES
===================================================== */

app.use(express.json({ limit: '10mb' }));

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb'
  })
);

app.use(cookieParser());

app.use(
  fileUpload({
    useTempFiles: false,
    tempFileDir: '/tmp/',
    limits: {
      fileSize: 50 * 1024 * 1024
    }
  })
);

// Request logging
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();

  console.log(
    `[${req.method}] ${req.originalUrl} - ${req.requestTime}`
  );

  next();
});

/* =====================================================
   3. MOUNT API ROUTES
===================================================== */

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/account', accountRoutes);
app.use('/api/v1/checkout', checkoutRoutes);

/* =====================================================
   4. HEALTH CHECK
===================================================== */

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'E-commerce API is running'
  });
});

/* =====================================================
   5. HANDLE UNKNOWN ROUTES
===================================================== */

app.use((req, res, next) => {
  const err = new Error(
    `Cannot find ${req.originalUrl} on this server!`
  );

  err.statusCode = 404;
  err.status = 'fail';

  next(err);
});

/* =====================================================
   6. GLOBAL ERROR HANDLER
===================================================== */

app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err);

  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
      ? err.statusCode
      : 500;

  const statusMessage =
    typeof err.status === 'string'
      ? err.status
      : statusCode >= 400 && statusCode < 500
        ? 'fail'
        : 'error';

  res.status(statusCode).json({
    status: statusMessage,
    success: false,
    message: err.message || 'Internal Server Error',
    stack:
      process.env.NODE_ENV === 'development'
        ? err.stack
        : undefined
  });
});

module.exports = app;