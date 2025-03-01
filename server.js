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

// Endpoint to download YouTube audio
app.post("/download", async (req, res) => {
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: "No search query provided." });
    }

    console.log(`🔍 Searching YouTube for: ${query}`);

    try {
        // Search YouTube for the best match
        const searchResult = await ytDlp.execPromise([
            "ytsearch1:" + query,
            "--print", "%(id)s"
        ]);

        const videoId = searchResult.trim();
        if (!videoId) {
            return res.status(404).json({ error: "No results found." });
        }

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`🎵 Found video: ${videoUrl}`);

        // Define output file path
        const outputFilePath = path.join(__dirname, "downloads", `${videoId}.mp3`);

        // Ensure downloads folder exists
        if (!fs.existsSync(path.join(__dirname, "downloads"))) {
            fs.mkdirSync(path.join(__dirname, "downloads"), { recursive: true });
        }

        // Download the audio
        console.log("⬇️ Downloading audio...");
        await ytDlp.execPromise([
            videoUrl,
            "-x",
            "--audio-format", "mp3",
            "-o", outputFilePath
        ]);

        console.log("✅ Download complete!");

        // Send file URL
        res.json({ message: "Download complete!", file: `/downloads/${videoId}.mp3` });

    } catch (error) {
        console.error("❌ Error downloading:", error);
        res.status(500).json({ error: "Failed to download audio." });
    }
});

// Serve static files from the downloads folder
app.use("/downloads", express.static(path.join(__dirname, "downloads")));

// Start server
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});
