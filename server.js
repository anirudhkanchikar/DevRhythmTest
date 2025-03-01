const express = require('express');
const cors = require('cors');
const YTDlpWrap = require('yt-dlp-wrap').default;
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

const ytDlp = new YTDlpWrap(); // Use yt-dlp-wrap

app.post('/download', async (req, res) => {
    const query = req.body.query?.trim();
    if (!query) return res.status(400).json({ error: 'No song query provided' });

    console.log(`🔎 Searching YouTube for: ${query}`);

    try {
        // Get video URL
        const videoUrl = await ytDlp.execPromise(['ytsearch1:' + query, '--print', '%(webpage_url)s']);
        if (!videoUrl) throw new Error('Failed to find the song on YouTube');
        
        console.log(`✅ Found video: ${videoUrl.trim()}`);

        const outputFileName = `audio_${Date.now()}.m4a`;
        const filePath = path.resolve(__dirname, outputFileName);

        // Download audio
        await ytDlp.execPromise(['-x', '--audio-format', 'm4a', '-o', outputFileName, videoUrl.trim()]);

        if (fs.existsSync(filePath)) {
            res.download(filePath, 'audio.m4a', (err) => {
                if (err) console.error('❌ Error sending file:', err);
                fs.unlink(filePath, () => console.log(`🗑️ Deleted: ${outputFileName}`));
            });
        } else {
            throw new Error('File not found');
        }
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});
