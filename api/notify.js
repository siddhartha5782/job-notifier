const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  const filesToMonitor = [
    {
      repo: 'SimplifyJobs/Summer2025-Internships',
      branch: 'dev',
      filePath: '.github/scripts/listings.json',
      description: 'SimplifyJobs listings.json',
    },
    {
      repo: 'jobright-ai/2025-Data-Analysis-Internship',
      branch: 'master',
      filePath: 'README.md',
      description: 'Jobright.ai README.md',
    },
  ];

  try {
    for (const file of filesToMonitor) {
      const { repo, branch, filePath, description } = file;

      // Fetch the latest commit for the specific file
      const commitsRes = await fetch(
        `https://api.github.com/repos/${repo}/commits?path=${filePath}&sha=${branch}`,
        {
          headers: {
            'User-Agent': 'vercel-jobbot',
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );

      const commits = await commitsRes.json();
      const latestCommit = commits?.[0];
      const latestSha = latestCommit?.sha;

      if (!latestSha) {
        console.log(`No commit found for ${description}`);
        continue;
      }

      // Construct a unique environment variable name for storing the last commit SHA
      const envVarName = `LAST_COMMIT_${repo.replace(/[-\/]/g, '_').toUpperCase()}`;
      const storedSha = process.env[envVarName];

      if (storedSha !== latestSha) {
        // Fetch full commit details to extract patch (diff)
        const commitRes = await fetch(
          `https://api.github.com/repos/${repo}/commits/${latestSha}`,
          {
            headers: {
              'User-Agent': 'vercel-jobbot',
              'Accept': 'application/vnd.github.v3+json',
            },
          }
        );

        const commitData = await commitRes.json();

        const fileDiff = commitData.files.find((f) => f.filename === filePath);
        const patch = fileDiff?.patch;

        if (!patch) {
          console.log(`Commit found for ${description}, but no diff available.`);
          continue;
        }

        const emailText = `
📝 New Update Detected in ${description}!

Commit: ${latestSha}
Author: ${latestCommit.commit.author.name}
Date: ${latestCommit.commit.author.date}
Message: ${latestCommit.commit.message}
URL: ${latestCommit.html_url}

--- PATCH (diff) ---
${patch}
        `;

        await sendEmail(`🆕 Update in ${description}`, emailText);

        // Note: To persist the latest SHA, consider storing it in a database or external storage.
        // For demonstration, we're just logging it here.
        console.log(`Updated stored SHA for ${description}: ${latestSha}`);
      } else {
        console.log(`No new commit for ${description}`);
      }
    }

    return res.status(200).send('Monitoring completed.');
  } catch (err) {
    console.error('Error during monitoring:', err);
    return res.status(500).send('An error occurred during monitoring.');
  }
}

async function sendEmail(subject, text) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"JobBot" <${process.env.GMAIL_USER}>`,
    to: process.env.TO_EMAIL,
    subject,
    text,
  });

  console.log('✅ Email sent:', subject);
}
