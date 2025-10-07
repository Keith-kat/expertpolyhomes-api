// Expert Polyhomes Backend - PostgreSQL Version
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err);
});

// Initialize database tables
async function initializeDatabase() {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Quotes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quotes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        window_width DECIMAL(10,2) NOT NULL,
        window_height DECIMAL(10,2) NOT NULL,
        window_count INTEGER NOT NULL,
        mesh_type VARCHAR(50) NOT NULL,
        material_type VARCHAR(50) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        install_location TEXT,
        install_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Payments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        quote_id INTEGER REFERENCES quotes(id),
        amount DECIMAL(10,2) NOT NULL,
        mpesa_code VARCHAR(50),
        phone VARCHAR(20) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Contact messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'expert_polyhomes_secret_2024', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin Middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    res.json({ 
      status: 'OK', 
      message: 'Expert Polyhomes API is running!',
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Error', 
      message: 'Database connection failed',
      error: error.message 
    });
  }
});

// User Registration
app.post('/api/register', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, email, password, phone } = req.body;

    // Check if user exists
    const userExists = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (name, email, password, phone, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, email, role, phone, created_at`,
      [name, email, hashedPassword, phone, 'user']
    );

    const user = userResult.rows[0];

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'expert_polyhomes_secret_2024',
      { expiresIn: '7d' }
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        phone: user.phone
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  } finally {
    client.release();
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'expert_polyhomes_secret_2024',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, name, email, role, phone, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(userResult.rows[0]);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Submit quote (protected)
app.post('/api/quotes', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const quoteData = req.body;
    
    const priceMatrix = {
      'fixed': { 'fiberglass': 1500, 'polyester': 1800, 'stainless': 2200 },
      'roller': { 'fiberglass': 2800, 'polyester': 3200, 'stainless': 4500 },
      'slider': { 'fiberglass': 2600, 'polyester': 3000, 'stainless': 4200 },
      'magnetic': { 'fiberglass': 1800, 'polyester': 2000, 'stainless': 2500 }
    };
    
    const area = quoteData.windowWidth * quoteData.windowHeight;
    const unitPrice = priceMatrix[quoteData.meshType]?.[quoteData.materialType] || 2000;
    const totalPrice = area * unitPrice * quoteData.windowCount;
    
    const quoteResult = await client.query(
      `INSERT INTO quotes (
        user_id, window_width, window_height, window_count, 
        mesh_type, material_type, total_price, install_location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        req.user.userId,
        quoteData.windowWidth,
        quoteData.windowHeight,
        quoteData.windowCount,
        quoteData.meshType,
        quoteData.materialType,
        totalPrice,
        quoteData.installLocation
      ]
    );
    
    const quote = quoteResult.rows[0];
    
    // Send email notification
    await sendEmailNotification('new_quote', quote);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Quote received successfully!',
      quoteId: quote.id,
      totalPrice: totalPrice
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Quote submission error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  } finally {
    client.release();
  }
});

// Get user quotes
app.get('/api/my-quotes', authenticateToken, async (req, res) => {
  try {
    const quotesResult = await pool.query(
      `SELECT * FROM quotes 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user.userId]
    );

    res.json(quotesResult.rows);
  } catch (error) {
    console.error('Fetch quotes error:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// Contact form
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message, phone } = req.body;
    
    await pool.query(
      'INSERT INTO contact_messages (name, email, message, phone) VALUES ($1, $2, $3, $4)',
      [name, email, message, phone]
    );
    
    // Send email notification
    await sendEmailNotification('contact_form', { name, email, message, phone });
    
    res.json({
      success: true,
      message: 'Message received! We will contact you soon.'
    });
    
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Service check
app.get('/api/service-check', (req, res) => {
  const location = req.query.location || '';
  const servedAreas = ['nairobi', 'westlands', 'karen', 'langata', 'thika', 'kiambu'];
  
  const isServed = servedAreas.some(area => 
    location.toLowerCase().includes(area)
  );
  
  res.json({
    served: isServed,
    estimate: isServed ? '24 hours' : '2-3 days',
    message: isServed ? 'We serve your area!' : 'Contact us for special arrangements'
  });
});

// Admin Routes

// Get all quotes (admin only)
app.get('/api/admin/quotes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const quotesResult = await pool.query(`
      SELECT q.*, u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM quotes q
      JOIN users u ON q.user_id = u.id
      ORDER BY q.created_at DESC
    `);

    res.json(quotesResult.rows);
  } catch (error) {
    console.error('Admin quotes fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const usersResult = await pool.query(
      'SELECT id, name, email, role, phone, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(usersResult.rows);
  } catch (error) {
    console.error('Admin users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update quote status (admin only)
app.patch('/api/admin/quotes/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const quoteId = req.params.id;

    const quoteResult = await pool.query(
      'UPDATE quotes SET status = $1 WHERE id = $2 RETURNING *',
      [status, quoteId]
    );

    if (quoteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const quote = quoteResult.rows[0];

    // Get user info for notification
    const userResult = await pool.query(
      'SELECT name, email, phone FROM users WHERE id = $1',
      [quote.user_id]
    );

    const quoteWithUser = {
      ...quote,
      user: userResult.rows[0] || {}
    };

    // Send status update notification
    await sendEmailNotification('quote_status_update', quoteWithUser);

    res.json(quoteWithUser);
  } catch (error) {
    console.error('Quote status update error:', error);
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

// M-Pesa Payment Integration
app.post('/api/mpesa/payment', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { phone, amount, quoteId } = req.body;

    // Validate phone number
    if (!phone.match(/^(2547\d{8}|07\d{8}|\+2547\d{8})$/)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid phone number format. Use 2547XXXXXXXX or 07XXXXXXXX' });
    }

    // Format phone number
    let formattedPhone = phone.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.substring(1);
    }

    // Verify quote exists and belongs to user
    const quoteResult = await client.query(
      'SELECT id, user_id FROM quotes WHERE id = $1',
      [quoteId]
    );

    if (quoteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Quote not found' });
    }

    if (quoteResult.rows[0].user_id !== parseInt(req.user.userId) && req.user.role !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Access denied' });
    }

    // Create payment record
    const paymentResult = await client.query(
      `INSERT INTO payments (user_id, quote_id, amount, phone, status) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [req.user.userId, quoteId, amount, formattedPhone, 'initiated']
    );

    const payment = paymentResult.rows[0];

    await client.query('COMMIT');

    // Simulate M-Pesa STK Push (Replace with actual Daraja API)
    setTimeout(async () => {
      const updateClient = await pool.connect();
      try {
        await updateClient.query('BEGIN');
        
        // In real implementation, this would be callback from Safaricom
        await updateClient.query(
          'UPDATE payments SET status = $1, mpesa_code = $2 WHERE id = $3',
          ['completed', 'MPE' + Date.now(), payment.id]
        );

        // Update quote status
        await updateClient.query(
          'UPDATE quotes SET status = $1 WHERE id = $2',
          ['paid', quoteId]
        );

        await updateClient.query('COMMIT');

        // Send payment confirmation
        await sendEmailNotification('payment_confirmation', { payment: { ...payment, status: 'completed' }, quoteId });
        
        console.log(`Payment completed for quote ${quoteId}`);
      } catch (updateError) {
        await updateClient.query('ROLLBACK');
        console.error('Error updating payment status:', updateError);
      } finally {
        updateClient.release();
      }
    }, 3000);

    res.json({
      success: true,
      message: 'M-Pesa prompt sent to your phone',
      paymentId: payment.id
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Payment initiation error:', error);
    res.status(500).json({ error: 'Payment initiation failed' });
  } finally {
    client.release();
  }
});

// Get payment status
app.get('/api/payment-status/:paymentId', authenticateToken, async (req, res) => {
  try {
    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE id = $1',
      [req.params.paymentId]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = paymentResult.rows[0];

    // Check if user owns this payment
    if (payment.user_id !== parseInt(req.user.userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      status: payment.status,
      mpesaCode: payment.mpesa_code,
      amount: payment.amount,
      createdAt: payment.created_at
    });
  } catch (error) {
    console.error('Payment status fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch payment status' });
  }
});

// Get dashboard stats (admin)
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [
      totalQuotes,
      totalUsers,
      totalRevenue,
      pendingQuotes
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM quotes'),
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = $1', ['completed']),
      pool.query('SELECT COUNT(*) FROM quotes WHERE status = $1', ['pending'])
    ]);

    res.json({
      totalQuotes: parseInt(totalQuotes.rows[0].count),
      totalUsers: parseInt(totalUsers.rows[0].count),
      totalRevenue: parseFloat(totalRevenue.rows[0].total),
      pendingQuotes: parseInt(pendingQuotes.rows[0].count)
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Email Notification System
async function sendEmailNotification(type, data) {
  try {
    // For demo purposes, we'll just log the email
    // In production, configure with real email service
    
    const emailConfig = {
      'new_quote': {
        subject: 'New Quote Request - Expert Polyhomes',
        message: `New quote received: ${data.window_width}m x ${data.window_height}m, ${data.mesh_type} nets. Total: KES ${data.total_price}`
      },
      'payment_confirmation': {
        subject: 'Payment Confirmed - Expert Polyhomes',
        message: `Payment of KES ${data.payment.amount} confirmed. M-Pesa Code: ${data.payment.mpesa_code}`
      },
      'quote_status_update': {
        subject: 'Quote Status Updated - Expert Polyhomes',
        message: `Quote status updated to: ${data.status}`
      },
      'contact_form': {
        subject: 'New Contact Form Submission - Expert Polyhomes',
        message: `New message from ${data.name} (${data.email}): ${data.message}`
      }
    };

    const config = emailConfig[type];
    if (config) {
      console.log(`📧 Email Notification [${type}]:`, config.subject);
      console.log(`Message: ${config.message}`);
      
      // In production, uncomment and configure:
      /*
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: config.subject,
        text: config.message
      });
      */
    }

  } catch (error) {
    console.error('Email sending failed:', error);
  }
}

// Simple token verification endpoint
app.get('/api/verify-token', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Create default admin user on startup
async function createDefaultAdmin() {
  try {
    const adminExists = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['admin@expertpolyhomes.com']
    );

    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await pool.query(
        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
        ['System Administrator', 'admin@expertpolyhomes.com', hashedPassword, 'admin']
      );
      console.log('✅ Default admin user created');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    await createDefaultAdmin();
    
    app.listen(PORT, () => {
      console.log(`🚀 Expert Polyhomes Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📊 PostgreSQL database connected`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
