import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Increase limit to handle base64 image/document uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

const mongoURI = process.env.MONGO_URI || "mongodb+srv://aminaashraf246:amina@cluster0.y837guw.mongodb.net/portfolioDB?retryWrites=true&w=majority&appName=Cluster0";

// Serverless-friendly MongoDB connection handler
let isDbConnected = false;
const connectDB = async () => {
  if (isDbConnected || mongoose.connection.readyState >= 1) return;
  try {
    await mongoose.connect(mongoURI);
    isDbConnected = true;
    console.log('Connected to MongoDB successfully.');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
};

connectDB();

// Ensure DB connection before processing requests (essential for Vercel serverless cold starts)
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

// Schema Definition
const workSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  type: { type: String, required: true, enum: ['image', 'doc', 'video'] },
  fileData: { type: String }, // Base64 data
  fileUrl: { type: String },  // External URL
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const Work = mongoose.model('Work', workSchema);

// CV Schema definition
const cvSchema = new mongoose.Schema({
  fileData: { type: String }, // Base64 representation of PDF
  fileUrl: { type: String },  // External link fallback
  updatedAt: { type: Date, default: Date.now }
});

const CV = mongoose.model('CV', cvSchema);

// Router: Mounts on both /api and / to seamlessly support Vercel Serverless and local Express
const apiRouter = express.Router();

apiRouter.get('/works', async (req, res) => {
  try {
    const works = await Work.find().sort({ createdAt: -1 });
    res.json(works);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

apiRouter.post('/works', async (req, res) => {
  const { title, category, type, fileData, fileUrl, description } = req.body;
  if (!title || !category || !type) {
    return res.status(400).json({ message: 'Title, category, and type are required.' });
  }

  try {
    const newWork = new Work({ title, category, type, fileData, fileUrl, description });
    const savedWork = await newWork.save();
    res.status(201).json(savedWork);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

apiRouter.delete('/works/:id', async (req, res) => {
  try {
    const deletedWork = await Work.findByIdAndDelete(req.params.id);
    if (!deletedWork) {
      return res.status(404).json({ message: 'Work item not found.' });
    }
    res.json({ message: 'Work item deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

apiRouter.put('/works/:id', async (req, res) => {
  const { title, category, type, fileData, fileUrl, description } = req.body;
  try {
    const updatedWork = await Work.findByIdAndUpdate(
      req.params.id,
      { title, category, type, fileData, fileUrl, description },
      { new: true }
    );
    if (!updatedWork) {
      return res.status(404).json({ message: 'Work item not found.' });
    }
    res.json(updatedWork);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

apiRouter.post('/works/seed', async (req, res) => {
  try {
    const count = await Work.countDocuments();
    if (count > 0) {
      return res.json({ message: 'Database already has data. Skipping seed.' });
    }

    const initialWorks = [
      {
        title: "AD CREATIVES",
        category: "AD CREATIVES",
        type: "image",
        fileUrl: "/add.png"
      },
      {
        title: "POSTER DESIGNS",
        category: "POSTERS",
        type: "image",
        fileUrl: "/poster.png"
      },
      {
        title: "VIDEOS",
        category: "VIDEOS",
        type: "video",
        fileUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDaalbpM_ZD4mRKDrqVauzexRQFVFzB3uFOfDJ2XwXEqANVdREq3X6XVd4rXNS4NQQAYik6qBOLdvNiwtJjn1GvR7gSElgzGT7jrfWrUyByvT5p6aDJfBMM9MNheJZ44la7eLUXkjlAhbRDUB9QPuDCOoNDGFhyEBOoiCvmJEEIt1Vea3EVduSMT8q46oBkwqET3_F0WMxBDXPJDa9ToV2jODvUTL3sS3NQypzIhtTdKXW3DN07cDfBhvjevZoEskP0rZM_7eqne7E"
      },
      {
        title: "BROUCHERS",
        category: "BROUCHERS",
        type: "doc",
        fileUrl: "brouchers.pdf"
      },
      {
        title: "BRANDING",
        category: "BRANDING",
        type: "image",
        fileUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAYzL3AD1iaJx0iaTm8XTKbIRg9XIsFntaZoWKPNcyb8K-Z4VDV6ewJejTjw7-4xUwngrLO9fVCqlznKlsDR1du-X0yXVqAQN2Ljm79rxidI9vfDCtnMVZ1B7LMWPB5zPWcDUmRqrAXH6CMrTBxckGjWn7CNfHb5IYyrCCaIJSOu-w1xEDPrgmZxlLgytpdT1k_U4_PVEqnu8A85uUvBsilYacEaBL2DlfZ2_RHUBQZ_Xihpc9fMbSa6ftke3Q4vttAgJ1lTtQPvfk"
      },
      {
        title: "HORDINGS DESIGNS",
        category: "HORDINGS DESIGNS",
        type: "image",
        fileUrl: "https://images.unsplash.com/photo-1629729802306-2c19623253b8?q=80&w=800&auto=format&fit=crop"
      },
      {
        title: "SOCIAL MEDIA CREATIVES",
        category: "SOCIAL MEDIA CREATIVES",
        type: "image",
        fileUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAUnU14xk_0_7LBB1Ks-RqOVJFKjBkDOQF1W3S62-0T8ERBJnU47fjuwnSyImWkYSDrqfVNZ-h4BbfopyvBiYAWuj0NvitqKQXuv3DII3T5twmTh_uFtHouVnLjPZM_55Mi_0-1B2kdVFoSYaLUs2eyvWaSb1SKvdF2nhJueDNq5OnGzf_AKnrYnwVIbg4AzOctjCPWjdGwoDQpleYI1UbKVfMiMKLW5LTdkTEGklSd4LmVcCVtcdaUoCau9_kZ_v7M6Eajc3RpXsg"
      }
    ];

    await Work.insertMany(initialWorks);
    res.json({ message: 'Seeded initial works successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

apiRouter.get('/cv', async (req, res) => {
  try {
    const cvRecord = await CV.findOne().sort({ updatedAt: -1 });
    if (!cvRecord) {
      return res.json({ fileUrl: '/cv.pdf' });
    }
    res.json(cvRecord);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

apiRouter.get('/cv/view', async (req, res) => {
  try {
    const cvRecord = await CV.findOne().sort({ updatedAt: -1 });
    if (!cvRecord) {
      return res.redirect('/cv.pdf');
    }

    if (cvRecord.fileData && cvRecord.fileData.startsWith('data:')) {
      const base64Content = cvRecord.fileData.split(';base64,')[1] || cvRecord.fileData;
      const pdfBuffer = Buffer.from(base64Content, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="Jithin_Krishnan_CV.pdf"');
      return res.send(pdfBuffer);
    }

    if (cvRecord.fileUrl && !cvRecord.fileUrl.includes('cloudinary.com')) {
      return res.redirect(cvRecord.fileUrl);
    }

    res.redirect('/cv.pdf');
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

apiRouter.post('/cv', async (req, res) => {
  const { fileData, fileUrl } = req.body;
  try {
    let cvRecord = await CV.findOne();
    if (cvRecord) {
      if (fileData) cvRecord.fileData = fileData;
      if (fileUrl) cvRecord.fileUrl = fileUrl;
      cvRecord.updatedAt = new Date();
    } else {
      cvRecord = new CV({ fileData: fileData || "", fileUrl: fileUrl || "" });
    }
    await cvRecord.save();
    res.json(cvRecord);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

apiRouter.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Attach router to both /api prefix and root / prefix
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Root & Health check routes for DigitalOcean App Platform / Docker
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'Stitch Creative Portfolio API is running smoothly on DigitalOcean.' });
});

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
