
  
  const nodemailer = require('nodemailer');
  
  export default async function handler(req, res) {
    const REPO = 'Summer2025-Internships';
    const FILE_PATH = 'README.md';
    const BRANCH = 'dev';
    const username = 'SimplifyJobs';
  
    try {
      const response = await fetch(
        `https://api.github.com/repos/${username}/${REPO}/commits?path=${FILE_PATH}&sha=${BRANCH}`,
        {
          headers: {
            'User-Agent': 'vercel-jobbot',
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
  
      const data = await response.json();
  
      const latestCommit = data?.[0];
      const latestSha = latestCommit?.sha;
  
      if (!latestSha) return res.status(404).send('No commit found.');
  
      const storedSha = process.env.LAST_COMMIT;
  
      if (storedSha !== latestSha) {
        const text = `
  New update made to README.md
  
  Commit: ${latestSha}
  Author: ${latestCommit.commit.author.name}
  Date: ${latestCommit.commit.author.date}
  Message: ${latestCommit.commit.message}
  URL: ${latestCommit.html_url}
        `;
        await sendEmail('📝 New README.md Commit Detected!', text);
        return res.status(200).send('New commit found — Email sent.');
      }
  
      return res.status(200).send('No new commit.');
    } catch (err) {
      console.error(err);
      return res.status(500).send('Failed to fetch GitHub commit.');
    }
  }
  
  async function sendEmail(subject, text) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });
  
    await transporter.sendMail({
      from: `"JobBot" <${process.env.GMAIL_USER}>`,
      to: process.env.TO_EMAIL,
      subject,
      text
    });
  }
  