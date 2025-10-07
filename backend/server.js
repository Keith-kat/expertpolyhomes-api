// Enhanced Backend for Expert Polyhomes - Complete Version
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const nodemailer = require('nodemailer');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/expert_polyhomes', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Mongoose Models
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  phone: String,
  createdAt: { type: Date, default: Date.now }
});

const QuoteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  windowWidth: Number,
  windowHeight: Number,
  windowCount: Number,
  meshType: String,
  materialType: String,
  totalPrice: Number,
  status: { type: String, default: 'pending' },
  installLocation: String,
  installDate: Date,
  createdAt: { type: Date, default: Date.now }
});

const PaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  quote: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote' },
  amount: Number,
  mpesaCode: String,
  phone: String,
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Quote = mongoose.model('Quote', QuoteSchema);
const Payment = mongoose.model('Payment', PaymentSchema);

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
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Expert Polyhomes API is running!',
    timestamp: new Date().toISOString()
  });
});

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'expert_polyhomes_secret_2024',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });

  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'expert_polyhomes_secret_2024',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });

  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Submit quote (protected)
app.post('/api/quotes', authenticateToken, async (req, res) => {
  try {
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
    
    const quote = new Quote({
      user: req.user.userId,
      ...quoteData,
      totalPrice
    });
    
    await quote.save();
    
    // Send email notification
    await sendEmailNotification('new_quote', quote);
    
    res.json({
      success: true,
      message: 'Quote received successfully!',
      quoteId: quote._id,
      totalPrice: totalPrice
    });
    
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Get user quotes
app.get('/api/my-quotes', authenticateToken, async (req, res) => {
  try {
    const quotes = await Quote.find({ user: req.user.userId }).sort({ createdAt: -1 });
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// Contact form
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message, phone } = req.body;
    
    // Send email notification
    await sendEmailNotification('contact_form', { name, email, message, phone });
    
    res.json({
      success: true,
      message: 'Message received! We will contact you soon.'
    });
    
  } catch (error) {
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
    const quotes = await Quote.find().populate('user', 'name email phone').sort({ createdAt: -1 });
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update quote status (admin only)
app.patch('/api/admin/quotes/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const quote = await Quote.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user', 'name email phone');

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Send status update notification
    await sendEmailNotification('quote_status_update', quote);

    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

// M-Pesa Payment Integration
app.post('/api/mpesa/payment', authenticateToken, async (req, res) => {
  try {
    const { phone, amount, quoteId } = req.body;

    // Validate phone number
    if (!phone.match(/^(2547\d{8}|07\d{8}|\+2547\d{8})$/)) {
      return res.status(400).json({ error: 'Invalid phone number format. Use 2547XXXXXXXX or 07XXXXXXXX' });
    }

    // Format phone number
    let formattedPhone = phone.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.substring(1);
    }

    // Create payment record
    const payment = new Payment({
      user: req.user.userId,
      quote: quoteId,
      amount,
      phone: formattedPhone,
      status: 'initiated'
    });

    await payment.save();

    // Simulate M-Pesa STK Push (Replace with actual Daraja API)
    setTimeout(async () => {
      try {
        // In real implementation, this would be callback from Safaricom
        payment.status = 'completed';
        payment.mpesaCode = 'MPE' + Date.now();
        await payment.save();

        // Update quote status
        await Quote.findByIdAndUpdate(quoteId, { status: 'paid' });

        // Send payment confirmation
        await sendEmailNotification('payment_confirmation', { payment, quoteId });
        
        console.log(`Payment completed for quote ${quoteId}`);
      } catch (updateError) {
        console.error('Error updating payment status:', updateError);
      }
    }, 3000);

    res.json({
      success: true,
      message: 'M-Pesa prompt sent to your phone',
      paymentId: payment._id
    });

  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({ error: 'Payment initiation failed' });
  }
});

// Get payment status
app.get('/api/payment-status/:paymentId', authenticateToken, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Check if user owns this payment
    if (payment.user.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      status: payment.status,
      mpesaCode: payment.mpesaCode,
      amount: payment.amount,
      createdAt: payment.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payment status' });
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
        message: `New quote received: ${data.windowWidth}m x ${data.windowHeight}m, ${data.meshType} nets. Total: KES ${data.totalPrice}`
      },
      'payment_confirmation': {
        subject: 'Payment Confirmed - Expert Polyhomes',
        message: `Payment of KES ${data.payment.amount} confirmed. M-Pesa Code: ${data.payment.mpesaCode}`
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
    const adminExists = await User.findOne({ email: 'admin@expertpolyhomes.com' });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      const admin = new User({
        name: 'System Administrator',
        email: 'admin@expertpolyhomes.com',
        password: hashedPassword,
        role: 'admin'
      });
      await admin.save();
      console.log('✅ Default admin user created');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Expert Polyhomes Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  
  // Create default admin
  await createDefaultAdmin();
});