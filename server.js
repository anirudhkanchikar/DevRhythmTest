const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.post('/download', (req, res) => {
    const query = req.body.query?.trim(); // Trim whitespace

    if (!query) {
        return res.status(400).json({ error: 'No song query provided' });
    }

    console.log(`🔎 Searching YouTube for: ${query}`);

    // Search YouTube for the top result
    const searchCommand = `yt-dlp "ytsearch1:${query}" --print "%(webpage_url)s"`;

    exec(searchCommand, (searchError, videoUrl) => {
        if (searchError || !videoUrl.trim()) {
            console.error('❌ Error fetching video URL:', searchError);
            return res.status(500).json({ error: 'Failed to find the song on YouTube' });
        }

        videoUrl = videoUrl.trim();
        console.log(`✅ Found video: ${videoUrl}`);

        // Generate a unique filename (to prevent conflicts)
        const timestamp = Date.now();
        const outputFileName = `audio_${timestamp}.m4a`;
        const filePath = path.resolve(__dirname, outputFileName);

        const downloadCommand = `yt-dlp -x --audio-format m4a -o "${outputFileName}" "${videoUrl}"`;

        exec(downloadCommand, (downloadError) => {
            if (downloadError) {
                console.error(`❌ Error downloading audio: ${downloadError.message}`);
                return res.status(500).json({ error: 'Download failed' });
            }

            console.log(`🎶 Audio downloaded: ${outputFileName}`);

            // Ensure the file exists before attempting to send
            setTimeout(() => {  // Delay ensures file write is complete
                if (fs.existsSync(filePath)) {
                    res.download(filePath, 'audio.m4a', (err) => {
                        if (err) console.error('❌ Error sending file:', err);

                        // Delete the file after sending to free up space
                        fs.unlink(filePath, (unlinkErr) => {
                            if (unlinkErr) console.error('❌ Error deleting file:', unlinkErr);
                            else console.log(`🗑️ Deleted: ${outputFileName}`);
                        });
                    });
                } else {
                    res.status(500).json({ error: 'File not found' });
                }
            }, 2000); // Delay for file write safety
        });
    });
});

app.listen(port, () => {
    console.log(`🚀 Server running at http://192.168.0.225:${port}`);
});
