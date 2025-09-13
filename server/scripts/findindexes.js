// migrateStudyProgress.js
const mongoose = require("mongoose");

async function migrate() {
  try {
    // 1. Connect to your MongoDB
    await mongoose.connect("mongodb+srv://fayeye1ezekiel1:gVcuJ46xEvjMEhgk@cluster0.vzo3v2d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    // 2. Check existing indexes
    const indexes = await db.collection("studyprogresses").indexInformation();
    console.log("📌 Existing indexes:", indexes);

    // 3. Drop the old bad index if it exists (user_1_question_1)
    try {
      await db.collection("studyprogresses").dropIndex("user_1_question_1");
      console.log("🗑️ Dropped old index user_1_question_1");
    } catch (err) {
      if (err.codeName === "IndexNotFound") {
        console.log("✅ Old index not found (already removed).");
      } else {
        throw err;
      }
    }

    // 4. Create the correct compound index (user+course+year)
    await db.collection("studyprogresses").createIndex(
      { user: 1, course: 1, year: 1 },
      { unique: true }
    );
    console.log("✅ Created correct index user_1_course_1_year_1");

    // 5. (Optional cleanup) Remove bad docs with `question: null`
    const deleted = await db
      .collection("studyprogresses")
      .deleteMany({ question: null });
    if (deleted.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deleted.deletedCount} invalid docs`);
    } else {
      console.log("✅ No invalid docs found to clean up.");
    }

    console.log("🎉 Migration completed successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

migrate();
