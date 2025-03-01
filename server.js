const express = require("express");
const cors = require("cors");
const YTDlpWrap = require("yt-dlp-wrap").default;
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const ytDlpPath = path.join(__dirname, "yt-dlp");

// Ensure yt-dlp is downloaded
const ytDlp = new YTDlpWrap(ytDlpPath);
if (!fs.existsSync(ytDlpPath)) {
  console.log("🔽 Downloading yt-dlp...");
  ytDlp
    .downloadFromGithub(ytDlpPath)
    .then(() => console.log("✅ yt-dlp downloaded successfully"))
    .catch((err) => console.error("❌ Error downloading yt-dlp:", err));
}

// YouTube Download Endpoint
app.post("/download", async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Missing query parameter" });
    }

    console.log(`🔍 Searching YouTube for: ${query}`);
    const outputFilePath = path.join(__dirname, "audio.mp3");

    await ytDlp.execPromise([
      "-x",
      "--audio-format",
      "mp3",
      "-o",
      outputFilePath,
      `ytsearch:${query}`,
    ]);

    console.log(`✅ Download complete: ${outputFilePath}`);
    res.download(outputFilePath, "audio.mp3", () => {
      fs.unlinkSync(outputFilePath); // Delete file after download
    });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
