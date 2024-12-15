const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinaryConfig');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const BlogPost = require('../models/BlogPost').BlogPost;

const router = express.Router();

// Configure Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'wanderwords', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage });

// **GET all blog posts**
router.get('/', async (req, res) => {
  try {
    const posts = await BlogPost.find().sort({ createdAt: -1 }); // Sort by latest
    res.json(posts);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});

// Create a new blog post with media
router.post('/', upload.single('media'), async (req, res) => {
  const { title, content, author } = req.body;
  const mediaUrl = req.file ? req.file.path : null;

  try {
    const newPost = new BlogPost({ title, content, author, media: mediaUrl });
    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
// router.post("/", upload.single("file"), async (req, res) => {
//   const { title, content, author } = req.body;
//   const file = req.file;

//   try {
//     // Upload the image to Cloudinary
//     let imageUrl = "";
//     if (file) {
//       const cloudinaryResponse = await cloudinary.uploader.upload(file.buffer, {
//         folder: "wanderwords",
//         allowed_formats: ['jpg', 'png', 'jpeg'],
//       });
//       imageUrl = cloudinaryResponse.secure_url;
//     }

//     // Create a new blog post with the image URL
//     const newPost = new BlogPost({
//       title,
//       content,
//       author,
//       media: imageUrl, // Save the Cloudinary URL
//     });

//     await newPost.save();

//     res.status(201).json(newPost);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Failed to create blog post" });
//   }
// });

module.exports = router;
