const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post('/download', (req, res) => {
    const query = req.body.query?.trim();
    if (!query) return res.status(400).json({ error: 'No song query provided' });

    const searchCommand = `yt-dlp "ytsearch1:${query}" --print "%(webpage_url)s"`;
    exec(searchCommand, (searchError, videoUrl) => {
        if (searchError || !videoUrl.trim()) return res.status(500).json({ error: 'Failed to find the song' });

        const outputFile = `audio_${Date.now()}.m4a`;
        const filePath = path.resolve(__dirname, outputFile);
        const downloadCommand = `yt-dlp -x --audio-format m4a -o "${outputFile}" "${videoUrl.trim()}"`;

        exec(downloadCommand, () => {
            setTimeout(() => {
                if (fs.existsSync(filePath)) {
                    res.download(filePath, 'audio.m4a', () => fs.unlinkSync(filePath));
                } else {
                    res.status(500).json({ error: 'File not found' });
                }
            }, 2000);
        });
    });
});

app.listen(port, () => console.log(`Server running on port ${port}`));
