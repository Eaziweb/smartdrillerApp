const mongoose = require('mongoose');
require('dotenv').config();

async function migrateUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Get the database
    const db = mongoose.connection.db;
    
    // Get all existing users
    const oldUsers = await db.collection('users').find({}).toArray();
    
    console.log(`Found ${oldUsers.length} users to migrate`);
    
    // Process each user
    for (const oldUser of oldUsers) {
      // Create update object with new fields
      const update = {
        $set: {
          trustedDevices: [],
          deviceOTP: null,
          deviceOTPExpires: null,
          maxDevices: 4
        }
      };
      
      
      // Update the existing document
      await db.collection('users').updateOne(
        { _id: oldUser._id },
        update
      );
      
      console.log(`Migrated user: ${oldUser.email}`);
    }
    
    // Create the unique index on trustedDevices.deviceId
    await db.collection('users').createIndex(
      { "trustedDevices.deviceId": 1 }, 
      { unique: true, sparse: true }
    );
    console.log('Created unique index on trustedDevices.deviceId');
    
    console.log('Migration completed successfully');
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateUsers();