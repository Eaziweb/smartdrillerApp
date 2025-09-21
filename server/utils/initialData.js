const mongoose = require("mongoose");
const axios = require("axios");
const User = require("../models/User");
const CourseofStudy = require("../models/CourseofStudy");
const University = require("../models/University");
const bcrypt = require("bcryptjs");

const defaultCourses = {
  Agriculture: [
    "Agricultural Economics",
    "Agricultural Economics/Extension",
    "Agricultural Education",
    "Agricultural Engineering",
    "Agricultural Extension",
    "Agricultural Science",
    "Agronomy",
    "Animal Production",
    "Animal Science",
    "Crop Production",
    "Crop Science",
    "Family, Nutrition And Consumer Sciences",
    "Fisheries",
    "Food Science and Technology",
    "Forestry",
    "Plant Science",
    "Soil Science",
    "Water Resources Management And Agrometerorology",
  ],
  Engineering: [
    "Engineering",
    "Automobile Engineering",
    "Biomedical Engineering",
    "Chemical Engineering",
    "Civil Engineering",
    "Computer Engineering",
    "Aerospace/Aeronautic Engineering",
    "Electrical Engineering",
    "Engineering Physics",
    "Food Science and Engineering",
    "Industrial and Production Engineering",
    "Information Communication Engineering",
    "Mechanical Engineering",
    "Mechatronics Engineering",
    "Metallurgical Engineering",
    "Water Resources and Environmental Engineering",
    "Software Engineering",
    "System Engineering",
    "Petroleum Engineering",
  ],
  "Medicine & Pharmacy": [
    "Anatomy",
    "Biochemistry",
    "Human Nutrition and Dietetics",
    "Medical Laboratory Technology/Science",
    "Medicine & Surgery",
    "Nursing",
    "Pharmacy",
    "Physiology",
    "Public Health Technology",
    "Veterinary Medicine",
  ],
  "Arts, Management & Social Science": [
    "Accounting",
    "Arabic",
    "Banking and Finance",
    "Business Administration",
    "Communication Arts",
    "Criminology and Security Studies",
    "Curriculum Studies",
    "Demography and Social Statistics",
    "Economics",
    "English Language",
    "Entrepreneurship",
    "Fine Arts",
    "French",
    "Hausa",
    "History",
    "Home Economics",
    "Hospitality and Tourism Management",
    "Human Resource Management",
    "Igbo",
    "Insurance",
    "International Relations",
    "Islamic Studies",
    "Linguistics",
    "Marketing",
    "Mass Communication",
    "Media and Communication Studies",
    "Music",
    "Peace and Conflict Resolution",
    "Performing Arts",
    "Philosophy",
    "Political Science",
    "Project Management",
    "Psychology",
    "Public Administration",
    "Religious Studies",
    "Social Works",
    "Sociology",
    "Taxation",
    "Tourism Studies",
    "Theology",
    "Yoruba",
  ],
  "Science & Technology": [
    "Architecture",
    "Bio-Informatics",
    "Biology",
    "Botany",
    "Building Technology",
    "Computer Science",
    "Cyber Security Science",
    "Estate Management",
    "Chemistry",
    "Geography",
    "Geophysics",
    "Geology",
    "Human Nutrition and Dietetics",
    "Information Resource Management",
    "Information Systems",
    "Information Technology",
    "Library and Information Science",
    "Management Information System",
    "Mathematics",
    "Microbiology",
    "Physics",
    "Plant Science",
    "Statistics",
    "Urban and Regional Planning",
    "Veterinary Medicine",
    "Zoology",
  ],
  Education: [
    "Adult Education",
    "Agricultural Education",
    "Business Education",
    "Counsellor Education",
    "Early Childhood Education",
    "Education Administration",
    "Education & Accounting",
    "Education & Arabic",
    "Education & Biology",
    "Education & Business Administration",
    "Education & Chemistry",
    "Education & Computer Science",
    "Education & Christian Religious Studies",
    "Education & Economics",
    "Education & Fine Art",
    "Education & English Language",
    "Education & French",
    "Education & Geography",
    "Education & Geography/Physics",
    "Education & History",
    "Education & Integrated Science",
    "Education & Introductory Technology",
    "Education & Islamic Studies",
    "Education & Mathematics",
    "Education & Music",
    "Education & Physics",
    "Education & Political Science",
    "Education & Religious Studies",
    "Education & Social Studies",
    "Education Arts",
    "Education Foundation",
    "Environmental Education",
    "Guidance and Counselling",
    "Health Education",
    "Vocational Education",
    "Special Education",
  ],
  Law: [
    "Law",
    "Civil Law",
    "Sharia/Islamic Law",
    "Private Law",
    "Public Law",
    "Commercial Law",
    "International Law & Jurisprudence",
  ],
 Administration: [
  "Administration",
  "SuperAdministration"
],
};
const populateCourses = async () => {
  try {
    console.log("🔄 Ensuring courses exist...");

    // First, check if SuperAdministration course exists
    const superAdminCourse = await CourseofStudy.findOne({ 
      name: "SuperAdministration", 
      category: "Administration" 
    });
    
    if (!superAdminCourse) {
      console.log("Creating SuperAdministration course...");
      await CourseofStudy.create({
        name: "SuperAdministration",
        category: "Administration"
      });
      console.log("✅ SuperAdministration course created");
    }

    // Process all other courses
    const bulkOps = [];
    for (const category in defaultCourses) {
      defaultCourses[category].forEach((name) => {
        // Skip SuperAdministration since we already handled it
        if (name === "SuperAdministration" && category === "Administration") {
          return;
        }
        
        bulkOps.push({
          updateOne: {
            filter: { name, category },
            update: { $set: { name, category } },
            upsert: true
          }
        });
      });
    }

    if (bulkOps.length > 0) {
      await CourseofStudy.bulkWrite(bulkOps);
      console.log("✅ Courses ensured in database");
    }
  } catch (error) {
    console.error("❌ Error populating courses:", error);
  }
};

const ensureSuperAdminCourse = async () => {
  try {
    console.log("🔄 Ensuring SuperAdministration course exists...");
    
    let superAdminCourse = await CourseofStudy.findOne({ 
      name: "SuperAdministration", 
      category: "Administration" 
    });
    
    if (!superAdminCourse) {
      superAdminCourse = new CourseofStudy({
        name: "SuperAdministration",
        category: "Administration"
      });
      await superAdminCourse.save();
      console.log("✅ SuperAdministration course created");
    } else {
      console.log("ℹ️ SuperAdministration course already exists");
    }
    
    return superAdminCourse;
  } catch (error) {
    console.error("❌ Error ensuring SuperAdministration course:", error);
    return null;
  }
};
// Fetch and populate Nigerian universities
const populateUniversities = async () => {
  try {
    const universityCount = await University.countDocuments();
    
    if (universityCount === 0) {
      console.log("🔄 Fetching Nigerian universities...");
      
      const response = await axios.get(
        "https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json"
      );
      
      const universities = response.data
        .filter((uni) => uni.country === "Nigeria")
        .map((uni) => uni.name);
      
      for (const name of universities) {
        const exists = await University.findOne({ name });
        if (!exists) {
          await University.create({ name });
        }
      }
      
      console.log(`✅ ${universities.length} universities populated successfully`);
    } else {
      console.log("ℹ️ Universities already exist in the database");
    }
  } catch (error) {
    console.error("❌ Error populating universities:", error.message);
  }
};

// Create or update superadmin user
// Create or update superadmin user
const createOrUpdateSuperAdmin = async () => {
  try {
    // Find the SuperAdministration course
    let superAdminCourse = await CourseofStudy.findOne({ 
      name: "SuperAdministration", 
      category: "Administration" 
    });
    
    // If course doesn't exist, create it
    if (!superAdminCourse) {
      console.log("Creating SuperAdministration course...");
      superAdminCourse = new CourseofStudy({
        name: "SuperAdministration",
        category: "Administration"
      });
      await superAdminCourse.save();
      console.log("✅ SuperAdministration course created");
    }
    
    // Check if superadmin exists
    let superadmin = await User.findOne({ role: "superadmin" });
    
    if (!superadmin) {
      // Create new superadmin
      const hashedPassword = await bcrypt.hash(
        process.env.SUPERADMIN_PASSWORD || "superadmin123", 
        10
      );
      
      superadmin = new User({
        fullName: "Super Administrator",
        email: process.env.SUPERADMIN_EMAIL || "superadmin@example.com",
        password: hashedPassword,
        role: "superadmin",
        course: superAdminCourse._id,
        isEmailVerified: true,
      });
      
      await superadmin.save();
      console.log("✅ Superadmin created successfully");
    } else {
      // Update existing superadmin's course if needed
      if (superadmin.course && superadmin.course.toString() !== superAdminCourse._id.toString()) {
        superadmin.course = superAdminCourse._id;
        await superadmin.save();
        console.log("✅ Superadmin course updated");
      } else if (!superadmin.course) {
        // If superadmin exists but has no course assigned
        superadmin.course = superAdminCourse._id;
        await superadmin.save();
        console.log("✅ Superadmin course assigned");
      } else {
        console.log("ℹ️ Superadmin already exists with correct course");
      }
    }
  } catch (error) {
    console.error("❌ Error creating/updating superadmin:", error);
  }
};

// Initialize all data
const initializeData = async () => {
  console.log("🚀 Initializing database data...");
  
  // First ensure SuperAdministration course exists
  await ensureSuperAdminCourse();
  
  // Then populate all other courses
  await populateCourses();
  
  // Populate universities
  await populateUniversities();
  
  // Finally create/update superadmin
  await createOrUpdateSuperAdmin();
  
  console.log("✅ Database initialization completed");
};

module.exports = { initializeData };