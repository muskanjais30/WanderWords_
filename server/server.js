require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const JWT_SECRET = crypto.randomBytes(64).toString('hex');
const { User, VerificationCode } = require('./models/BlogPost');  // Assuming you have User and VerificationCode models

// Create an Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(bodyParser.json()); // For handling JSON payloads

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// Create a transporter object using your email provider (Gmail example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'muskj12345@gmail.com',  // Replace with your email
    pass: 'hdxo ksnn hceb czld',   // Replace with your email password or use OAuth2
  },
});

// Route to send verification email
app.post('/api/send-verification-email', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  // Generate a random verification code (6-digit code)
  const verificationToken = Math.floor(Math.random() * 1000000); // 6-digit code

  // Set expiration time for 10 minutes
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  try {
    // Save the verification code to the database
    const verificationCode = new VerificationCode({
      email,
      code: verificationToken.toString(),
      expiresAt
    });

    await verificationCode.save();

    // Send verification email
    const mailOptions = {
      from: 'muskj12345@gmail.com',   // Sender address
      to: email,                      // Recipient email
      subject: 'Email Verification',  // Email subject
      text: `Your verification code is: ${verificationToken}`, // Verification code in text
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
        return res.status(500).json({ message: 'Failed to send verification email' });
      }
      console.log('Email sent:', info.response);
      return res.status(200).json({ message: 'Verification email sent' });
    });
  } catch (error) {
    console.error('Error saving verification code:', error);
    return res.status(500).json({ message: 'Failed to generate verification code' });
  }
});

// Route to verify the email code
app.post('/api/verify-code', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: 'Email and code are required' });
  }

  try {
    // Find the verification code in the database
    const verificationCode = await VerificationCode.findOne({ email, code });

    if (!verificationCode) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Check if the code has expired
    const now = new Date();
    if (now > verificationCode.expiresAt) {
      return res.status(400).json({ message: 'Verification code has expired' });
    }

    // Code is valid and not expired
    // Update the user to set their isVerified to true
    await User.updateOne({ email }, { isVerified: true });

    return res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Error verifying code:', error);
    return res.status(500).json({ message: 'Failed to verify the code' });
  }
});

// Signup route
app.post('/api/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password before saving it
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      email,
      password: hashedPassword,
      isVerified: false,  // User is not verified initially
    });

    await newUser.save();
    return res.status(201).json({ message: 'User created successfully, please verify your email' });
  } catch (error) {
    console.error('Error signing up user:', error);
    return res.status(500).json({ message: 'Failed to sign up user' });
  }
});

// Login route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Check if the user is verified
    if (!user.isVerified) {
      return res.status(400).json({ message: 'Please verify your email before logging in' });
    }

    // Compare the password with the hashed password in the database
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    // Generate a JWT token for the user
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Error logging in user:', error);
    return res.status(500).json({ message: 'Failed to log in user' });
  }
});

// Routes
app.use('/api/blogs', require('./routes/blogRoutes'));

// Start your server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
