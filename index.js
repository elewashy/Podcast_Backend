require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const podcastRoutes = require('./api/routes/podcastRoutes');

app.use('/api/podcasts', podcastRoutes);

// Routes
app.get('/', (req, res) => {
  res.json({ message: "Podcast API is running", status: 'success' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!',
    message: err.message || 'Internal Server Error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});