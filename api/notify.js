const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  const REPO = 'Summer2025-Internships';
  const BRANCH = 'dev';
  const FILE_PATH = '.github/scripts/listings.json';
  const USERNAME = 'SimplifyJobs';

  try {
    // 1. Get latest commit that touched listings.json
    const commitsRes = await fetch(
      `https://api.github.com/repos/${USERNAME}/${REPO}/commits?path=${FILE_PATH}&sha=${BRANCH}`,
      {
        headers: {
          'User-Agent': 'vercel-jobbot',
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    const commits = await commitsRes.json();
    const latestCommit = commits?.[0];
    const latestSha = latestCommit?.sha;

    if (!latestSha) {
      return res.status(404).send('No commit found for listings.json');
    }

    const storedSha = process.env.LAST_COMMIT;

    if (storedSha !== latestSha) {
      // 2. Fetch full commit details to extract patch (diff)
      const commitRes = await fetch(
        `https://api.github.com/repos/${USERNAME}/${REPO}/commits/${latestSha}`,
        {
          headers: {
            'User-Agent': 'vercel-jobbot',
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      const commitData = await commitRes.json();

      const listingFile = commitData.files.find(f => f.filename === FILE_PATH);
      const patch = listingFile?.patch;

      if (!patch) {
        return res.status(200).send('Commit found, but no diff in listings.json');
      }

      const emailText = `
📝 New Update to listings.json Detected!

Commit: ${latestSha}
Author: ${latestCommit.commit.author.name}
Date: ${latestCommit.commit.author.date}
Message: ${latestCommit.commit.message}
URL: ${latestCommit.html_url}

--- PATCH (diff) ---
${patch}
      `;

      await sendEmail('🆕 listings.json Updated!', emailText);

      return res.status(200).send('New diff emailed!');
    }

    return res.status(200).send('No new commit.');
  } catch (err) {
    console.error('Error fetching commit diff:', err);
    return res.status(500).send('Failed to fetch GitHub diff.');
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

  console.log('✅ Email sent:', subject);
}
