const express = require('express');
const cors = require('cors');
const YTDlpWrap = require('yt-dlp-wrap').default;
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const ytDlpWrap = new YTDlpWrap(); // Use yt-dlp-wrap

app.post('/download', async (req, res) => {
    const query = req.body.query?.trim();
    if (!query) return res.status(400).json({ error: 'No song query provided' });

    console.log(`🔎 Searching YouTube for: ${query}`);

    try {
        const videoUrls = await ytDlpWrap.execPromise([
            `ytsearch1:${query}`,
            '--print', '%(webpage_url)s'
        ]);
        const videoUrl = videoUrls.trim();
        if (!videoUrl) throw new Error('No results found');

        console.log(`✅ Found video: ${videoUrl}`);

        const timestamp = Date.now();
        const outputFileName = `/tmp/audio_${timestamp}.m4a`;

        await ytDlpWrap.execPromise([
            '-x', '--audio-format', 'm4a',
            '-o', outputFileName,
            videoUrl
        ]);

        console.log(`🎶 Downloaded: ${outputFileName}`);

        res.download(outputFileName, 'audio.m4a', (err) => {
            if (err) console.error('❌ Error sending file:', err);
            fs.unlink(outputFileName, (unlinkErr) => {
                if (unlinkErr) console.error('❌ Error deleting file:', unlinkErr);
                else console.log(`🗑️ Deleted: ${outputFileName}`);
            });
        });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
