# 🎧 Podcast Backend API

[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/en)

A high-performance backend API for fetching YouTube channel data, playlists, videos, and download links. Optimized for speed with parallel processing and intelligent caching.

> ⚠️ **IMPORTANT LEGAL NOTICE**: This project is for **educational and research purposes only**. Users are responsible for complying with YouTube's Terms of Service, copyright laws, and applicable regulations in their jurisdiction.

> 🎓 **EDUCATIONAL PURPOSE**: This code is shared to demonstrate backend development concepts, API design patterns, and performance optimization techniques. Please use responsibly and respect content creators' rights.

## ✨ Features

### 🚀 **Performance Optimized**
- **Parallel Requests**: All channel data fetched simultaneously for 5-8x speed improvement
- **HTTP Caching**: Browser and CDN caching with optimized cache durations
- **Serverless Ready**: Optimized for Vercel deployment with edge caching

### 📺 **YouTube Data Fetching**
- Fetch multiple YouTube channels information
- Get channel playlists with metadata
- Extract video details from playlists
- Web scraping with robust error handling

### 🔗 **Download Links Extraction**
- **Audio Links**: MP3, M4A, AAC formats
- **Video Links**: Multiple quality options (360p, 720p, 1080p, 4K)
- **Smart Categorization**: Automatic audio/video type detection
- **Parallel Processing**: Fast download link generation for multiple videos

### 🛡️ **Reliability**
- Comprehensive error handling
- Timeout protection for slow requests
- Fallback mechanisms for different HTML structures
- Clean, maintainable code with detailed comments

## 🛠️ Technologies Used

- **Node.js** - JavaScript runtime environment
- **Express.js** - Fast, minimalist web framework
- **Axios** - Promise-based HTTP client
- **Cheerio** - Server-side jQuery implementation for web scraping

## 🚀 Quick Start

> 📢 **REMINDER**: By using this software, you agree to use it for educational purposes only and to comply with all applicable laws and terms of service.

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v14 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/elewashy/Podcast_Backend.git
   cd Podcast_Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   # Create .env file (optional)
   echo "PORT=3000" > .env
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   ```

5. **Access the API**
   ```
   Local: http://localhost:3000
   ```

## 📚 API Documentation

### Base URL
```
Local: http://localhost:3000
```

### 🎯 Endpoints

#### 1. **Get All Channels**
```http
GET /api/channels
```

**Response Example:**
```json
[
  {
    "id": "UCChannelId",
    "name": "Channel Name",
    "description": "Channel description",
    "thumbnail": "https://...",
    "channelUrl": "https://youtube.com/channel/UCChannelId"
  }
]
```

**Features:**
- ⚡ **Fast**: Parallel processing of all channels
- 🔄 **Cached**: 10-minute browser/CDN cache
- 🛡️ **Reliable**: Continues even if some channels fail

---

#### 2. **Get Channel Playlists**
```http
GET /api/channels/{channelId}/playlists
```

**Parameters:**
- `channelId` - YouTube channel ID

**Response Example:**
```json
[
  {
    "id": "PLPlaylistId",
    "title": "Playlist Title",
    "description": "",
    "thumbnail": "https://...",
    "itemCount": 25,
    "channelTitle": "Channel Name"
  }
]
```

---

#### 3. **Get Playlist Videos**
```http
GET /api/playlists/{playlistId}/videos
```

**Parameters:**
- `playlistId` - YouTube playlist ID
- `includeDownloads` (optional) - Set to `true` to include download links

**Basic Response:**
```json
[
  {
    "id": "videoId",
    "title": "Video Title",
    "description": "",
    "thumbnail": "https://...",
    "publishedAt": "2 years ago"
  }
]
```

**With Download Links (`?includeDownloads=true`):**
```json
[
  {
    "id": "videoId",
    "title": "Video Title",
    "thumbnail": "https://...",
    "publishedAt": "2 years ago",
    "downloads": {
      "success": true,
      "audioLinks": [
        {
          "url": "https://googlevideo.com/...",
          "quality": "M4A",
          "size": "2.6MB",
          "type": "audio"
        }
      ],
      "videoLinks": [
        {
          "url": "https://googlevideo.com/...",
          "quality": "1080p",
          "size": "35.3MB",
          "type": "video"
        }
      ],
      "error": null
    }
  }
]
```

---

#### 4. **Get Video Download Links**
```http
GET /api/videos/{videoId}/downloads
```

**Parameters:**
- `videoId` - YouTube video ID

**Response Example:**
```json
{
  "videoId": "qIPCvWI42tk",
  "success": true,
  "audioLinks": [
    {
      "url": "https://googlevideo.com/...",
      "quality": "M4A",
      "hasAudio": "true",
      "size": "2.6MB",
      "type": "audio"
    }
  ],
  "videoLinks": [
    {
      "url": "https://googlevideo.com/...",
      "quality": "720p",
      "hasAudio": "false",
      "size": "6.4MB",
      "type": "video"
    },
    {
      "url": "https://googlevideo.com/...",
      "quality": "1080p",
      "hasAudio": "false",
      "size": "35.3MB",
      "type": "video"
    }
  ],
  "totalLinks": 3,
  "error": null,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🎯 Usage Examples

### Fetch Channels (Fast)
```javascript
// All channels fetched in parallel - very fast!
const response = await fetch('/api/channels');
const channels = await response.json();
```

### Get Videos with Download Links
```javascript
// Includes download links for all videos
const response = await fetch('/api/playlists/PLxxx/videos?includeDownloads=true');
const videosWithDownloads = await response.json();
```

### Get Single Video Downloads
```javascript
// Get download links for specific video
const response = await fetch('/api/videos/qIPCvWI42tk/downloads');
const downloads = await response.json();

// Access audio links
downloads.audioLinks.forEach(link => {
  console.log(`${link.quality}: ${link.url}`);
});
```

## ⚡ Performance Features

### 🔄 **Smart Caching**
```http
Cache-Control: public, max-age=600, s-maxage=600
```
- **Channels/Playlists**: 10 minutes cache
- **Download Links**: 30 minutes cache (shorter due to expiration)
- **Vercel Edge**: Global CDN caching
- **Browser**: Client-side caching

### 🚀 **Parallel Processing**
- **Before**: Sequential requests (30-40 seconds)
- **After**: Parallel requests (5-8 seconds)
- **Method**: `Promise.all()` for concurrent execution

### 🛡️ **Error Handling**
- Individual channel failures don't affect others
- Timeout protection (10-15 seconds per request)
- Graceful fallbacks for different HTML structures
- Detailed error logging for debugging

## 📁 Project Structure

```
Podcast_Backend/
├── 📁 api/
│   ├── 📁 controllers/
│   │   └── 📄 podcastController.js    # Main API logic
│   ├── 📁 data/
│   │   └── 📄 channels.json           # Channel configurations
│   └── 📁 routes/
│       └── 📄 podcastRoutes.js        # API routes
├── 📄 index.js                        # Server entry point
├── 📄 package.json                    # Dependencies
├── 📄 vercel.json                     # Vercel deployment config
└── 📄 README.md                       # This file
```

## 🔧 Configuration

### Adding New Channels
Edit `api/data/channels.json`:
```json
[
  {
    "id": "channel_id",
    "name": "Channel Name",
    "channelUrl": "https://www.youtube.com/@channelname"
  }
]
```

### Adjusting Cache Duration
In `podcastController.js`:
```javascript
const CACHE_DURATION_SECONDS = 10 * 60; // 10 minutes
```

## 🎨 Response Formats

### Audio Links
- **M4A** - High quality audio (AAC codec)
- **MP3** - Universal compatibility
- **AAC** - Advanced Audio Coding

### Video Links
- **360p, 480p** - Lower quality for mobile
- **720p** - HD quality
- **1080p** - Full HD
- **4K** - Ultra HD (when available)

## 🤝 Contributing

1. **Fork** the repository
2. **Create** your feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

## ⚖️ Legal Disclaimer & Educational Purpose

### 🎓 **Educational Use Only**
This project is developed and shared for **educational, learning, and research purposes only**. It serves as:
- A demonstration of Node.js and Express.js development
- An example of web scraping techniques and API design
- A showcase of performance optimization methods
- A learning resource for backend development concepts

### ⚠️ **Important Legal Notices**

#### 📋 **Terms of Use**
- **YouTube Terms of Service**: Users must comply with [YouTube's Terms of Service](https://www.youtube.com/t/terms)
- **Copyright Compliance**: Respect all copyright laws and intellectual property rights
- **Personal Responsibility**: Users are solely responsible for their use of this software
- **No Commercial Use**: This project should not be used for commercial purposes without proper licensing

#### 🚫 **Prohibited Uses**
- Mass downloading of copyrighted content
- Circumventing YouTube's official APIs for commercial gain
- Violating content creators' intellectual property rights
- Any usage that violates local laws or regulations

#### 🛡️ **Developer Disclaimer**
- The developers do **NOT** encourage or endorse copyright infringement
- This tool does **NOT** host, store, or distribute any copyrighted content
- Users must obtain proper permissions before downloading copyrighted material
- The developers are **NOT** responsible for misuse of this software

### 📚 **Recommended Ethical Usage**
- Use for learning web development and API design
- Analyze data structures and response formats for educational purposes
- Study performance optimization techniques
- Research web scraping methodologies
- Respect content creators and their work

### 🤝 **Respect Content Creators**
- Always credit original content creators
- Consider supporting creators through official channels
- Respect copyright and intellectual property
- Use content responsibly and legally

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Note**: The MIT License applies to the code only, not to any content accessed through the API.

## 🆘 Support

If you encounter any issues or have questions:

1. **Check** the [Issues](https://github.com/elewashy/Podcast_Backend/issues) page
2. **Create** a new issue with detailed information
3. **Include** error messages and request examples

## 🎉 Acknowledgments

- **YouTube** for providing the content platform
- **ssyoutube.online** for download link extraction
- **Vercel** for seamless serverless deployment
- **Express.js** community for the excellent framework

---

<div align="center">

**Made with ❤️ for the podcast community**

> ⚖️ **Please use this project responsibly and for educational purposes only**

[⭐ Star this repo](https://github.com/elewashy/Podcast_Backend) • [🐛 Report Bug](https://github.com/elewashy/Podcast_Backend/issues) • [💡 Request Feature](https://github.com/elewashy/Podcast_Backend/issues)

</div>