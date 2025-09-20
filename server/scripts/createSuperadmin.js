// scripts/createSuperadmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

const createSuperadmin = async () => {
  try {
    const { SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = process.env;
    
    if (!SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
      console.error('SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set in environment variables');
      process.exit(1);
    }
    
    console.log('Creating/updating superadmin...');
    
    // Check if superadmin already exists
    let superadmin = await User.findOne({ email: SUPERADMIN_EMAIL, role: 'superadmin' });
    
    if (superadmin) {
      console.log('Superadmin found, updating password...');
      
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, salt);
      
      // Update the password
      superadmin.password = hashedPassword;
      await superadmin.save();
      
      console.log('Superadmin password updated successfully');
    } else {
      console.log('Creating new superadmin...');
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(SUPERADMIN_PASSWORD, salt);
      
      // Create new superadmin
      superadmin = new User({
        fullName: 'SuperAdmin',
        email: SUPERADMIN_EMAIL,
        password: hashedPassword,
        role: 'superadmin',
        isEmailVerified: true,
      });
      
      await superadmin.save();
      console.log('Superadmin created successfully');
    }
    
    console.log('Superadmin setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating superadmin:', error);
    process.exit(1);
  }
};

// Run the script
createSuperadmin();