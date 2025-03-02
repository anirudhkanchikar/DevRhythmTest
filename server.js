const express = require("express");
const cors = require("cors");
const YTDlpWrap = require("yt-dlp-wrap").default;
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Define yt-dlp path and cookies
const ytDlpPath = path.join(__dirname, "yt-dlp");
const cookiesPath = path.join(__dirname, "cookies.txt");

// Ensure yt-dlp is available
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
}

// Initialize yt-dlp
const ytDlp = new YTDlpWrap(ytDlpPath);

// Ensure 'downloads' directory exists
const downloadsDir = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// User-Agent to mimic a browser
const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36";

// Retry function with delay
const downloadWithRetry = (command, retries = 3, delayMs = 5000) => {
    return new Promise((resolve, reject) => {
        let attempt = 0;

        const tryDownload = () => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Attempt ${attempt + 1} failed:`, stderr);
                    if ((stderr.includes("HTTP Error 429") || stderr.includes("Sign in to confirm")) && attempt < retries) {
                        attempt++;
                        console.log(`Retrying (${attempt}/${retries}) in ${delayMs}ms...`);
                        setTimeout(tryDownload, delayMs * attempt); // Exponential backoff
                    } else {
                        reject(error);
                    }
                } else {
                    resolve(stdout.trim());
                }
            });
        };

        tryDownload();
    });
};

// 📌 Download YouTube Audio
app.post("/download", async (req, res) => {
    const { song, artist } = req.body;

    if (!song || !artist) {
        return res.status(400).json({ error: "Song and artist are required." });
    }

    const query = `${song} ${artist}`;
    console.log(`🔍 Received request: Searching YouTube for: ${query}`);

    try {
        // 🎯 Step 1: Search for the song
        console.log("🔍 Running yt-dlp search...");
        const searchCommand = `${ytDlpPath} "ytsearch1:${query}" --cookies ${cookiesPath} --user-agent "${userAgent}" --print "%(id)s"`;
        const videoId = await downloadWithRetry(searchCommand);

        if (!videoId) {
            console.log("❌ No search results found!");
            return res.status(404).json({ error: "No results found." });
        }

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`🎵 Found video: ${videoUrl}`);

        // 📌 Step 2: Download the audio
        const outputFilePath = path.join(downloadsDir, `${videoId}.mp3`);
        console.log("⬇️ Downloading audio...");
        const downloadCommand = `${ytDlpPath} ${videoUrl} --cookies ${cookiesPath} -x --audio-format mp3 -o ${outputFilePath}`;
        await downloadWithRetry(downloadCommand);

        console.log("✅ Download complete!");

        // Send file URL to client
        res.json({ message: "Download complete!", file: `/downloads/${videoId}.mp3` });
    } catch (error) {
        console.error("❌ Error downloading:", error.message);
        if (error.message.includes("429") || error.message.includes("Sign in to confirm")) {
            return res.status(403).json({
                error: "YouTube blocked the request. Try again later or update cookies."
            });
        }
        res.status(500).json({ error: "Failed to download audio.", details: error.message });
    }
});

// Serve static files from 'downloads' folder
app.use("/downloads", express.static(downloadsDir));

// Start the server
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});
