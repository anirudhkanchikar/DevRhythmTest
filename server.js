const express = require("express");
const cors = require("cors");
const YTDlpWrap = require("yt-dlp-wrap").default;
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Define yt-dlp path
const ytDlpPath = path.join(__dirname, "yt-dlp");

// Download yt-dlp if not found
if (!fs.existsSync(ytDlpPath)) {
    console.log("🔽 Downloading yt-dlp...");
    try {
        execSync(
            `curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ${ytDlpPath} && chmod +x ${ytDlpPath}`,
            { stdio: "inherit" }
        );
        console.log("✅ yt-dlp downloaded successfully!");
    } catch (error) {
        console.error("❌ Failed to download yt-dlp:", error);
    }
} else {
    console.log("✅ yt-dlp already exists!");
}

// Initialize yt-dlp with correct binary path
const ytDlp = new YTDlpWrap(ytDlpPath);

// Function to ensure 'downloads' directory exists
const downloadsDir = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// Define cookies.txt path
const cookiesPath = path.join(__dirname, "cookies.txt");

// Check if cookies file exists
if (!fs.existsSync(cookiesPath)) {
    console.error("❌ ERROR: cookies.txt file not found!");
} else {
    console.log("✅ Found cookies.txt");
}

// Endpoint to download YouTube audio
app.post("/download", async (req, res) => {
    const { song, artist } = req.body;

    if (!song || !artist) {
        return res.status(400).json({ error: "Song name and artist are required." });
    }

    const query = `${song} ${artist}`;
    console.log(`🔍 Searching YouTube for: ${query}`);

    try {
        // Search YouTube using cookies.txt
        const searchResult = await ytDlp.execPromise([
            `ytsearch1:${query}`,
            "--cookies", cookiesPath, // Use cookies.txt
            "--print", "%(id)s"
        ]);

        const videoId = searchResult.trim();
        if (!videoId) {
            console.error("❌ No results found.");
            return res.status(404).json({ error: "No results found." });
        }

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`🎵 Found video: ${videoUrl}`);

        // Define output file path
        const outputFilePath = path.join(downloadsDir, `${videoId}.mp3`);

        // Debugging: Check if yt-dlp and cookies are properly set
        console.log("ℹ️ Running yt-dlp with cookies...");

        // Download the audio using cookies.txt
        await ytDlp.execPromise([
            videoUrl,
            "--cookies", cookiesPath, // Use cookies.txt
            "-x",
            "--audio-format", "mp3",
            "-o", outputFilePath
        ]);

        console.log("✅ Download complete!");

        // Send file URL
        res.json({ message: "Download complete!", file: `/downloads/${videoId}.mp3` });

    } catch (error) {
        console.error("❌ Error downloading:", error);

        // Check if error is due to bot detection or invalid cookies
        if (error.message.includes("429") || error.message.includes("Sign in to confirm")) {
            return res.status(403).json({
                error: "YouTube is blocking requests. Update cookies.txt or try a different network."
            });
        }

        res.status(500).json({ error: "Failed to download audio." });
    }
});

// Serve static files from the downloads folder
app.use("/downloads", express.static(downloadsDir));

// Start server
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});
