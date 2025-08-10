# Podcast Backend

This is the backend for the Podcast application, providing APIs to fetch podcast information from YouTube channels.

[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/en)

## Features

- Fetch podcast episodes from a YouTube channel.
- Get details for a specific podcast episode.

## Technologies Used

- **Node.js**: JavaScript runtime environment.
- **Express.js**: Web framework for Node.js.
- **dotenv**: To manage environment variables.
- **googleapis**: To interact with YouTube Data API v3.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) installed on your machine.
- A YouTube API Key. You can get one from the [Google Cloud Console](https://console.cloud.google.com/).

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/elewashy/Podcast_Backend.git
   ```
2. Navigate to the project directory:
   ```sh
   cd Podcast_Backend
   ```
3. Install the dependencies:
   ```sh
   npm install
   ```
4. Create a `.env` file in the root directory and add your environment variables. You can use the `.env.example` file as a template:
    ```
    PORT=3000
    YOUTUBE_API_KEY=your_youtube_api_key
    ```
5. Start the server:
   ```sh
   npm start
   ```
   Or for development with automatic restarts:
   ```sh
   npm run dev
   ```

## API Endpoints

The base URL is `http://localhost:3000`.

- `GET /api/channels`: Get a list of all available YouTube channels.
- `GET /api/channels/:channelId/playlists`: Get all playlists for a specific YouTube channel.
- `GET /api/playlists/:playlistId/videos`: Get all videos for a specific playlist.

## Project Structure

```
Podcast_Backend/
├── api/
│   ├── controllers/
│   │   └── podcastController.js
│   ├── data/
│   │   └── channels.json
│   ├── models/
│   └── routes/
│       └── podcastRoutes.js
├── index.js
├── package.json
└── vercel.json
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any changes.
