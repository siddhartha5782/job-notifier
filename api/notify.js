const nodemailer = require('nodemailer');
const { format } = require('date-fns');

export default async function handler(req, res) {
  try {
    const today = new Date();
    const formattedTextDate = format(today, 'MMM dd');      // For Jobright e.g. "May 01"
    const dayStart = new Date(today.setHours(0, 0, 0, 0)).getTime() / 1000;
    const dayEnd = dayStart + 86400;

    const [markdownJobs, jsonJobs] = await Promise.all([
      fetchJobrightMarkdown(formattedTextDate),
      fetchSimplifyJSON(dayStart, dayEnd)
    ]);

    const html = buildEmailHTML(markdownJobs, jsonJobs, formattedTextDate);
    if (markdownJobs.length === 0 && jsonJobs.length === 0) {
      console.log('✅ No listings found for today.');
      return res.status(200).send('No listings for today.');
    }

    await sendEmail(`📬 ${formattedTextDate} Job Listings`, html);
    return res.status(200).send('Email sent.');
  } catch (err) {
    console.error('❌ Job email failed:', err);
    return res.status(500).send('Job processing failed.');
  }
}

async function fetchJobrightMarkdown(dateStr) {
  const url = 'https://raw.githubusercontent.com/jobright-ai/2025-Data-Analysis-Internship/master/README.md';
  const res = await fetch(url);
  const md = await res.text();

  const tableStart = md.indexOf('| Company | Job Title');
  const tableEnd = md.indexOf('<!--', tableStart);
  const rows = md.slice(tableStart, tableEnd).trim().split('\n').slice(2); // skip headers

  return rows
    .map(r => r.split('|').map(x => x.trim()))
    .filter(cols => cols.length >= 6 && cols[5] === dateStr)
    .map(cols => ({
      company: cols[1].replace(/\*\*|\[|\]\(.*?\)/g, '').trim(),
      title: (cols[2].match(/\[(.*?)\]/) || [])[1] || cols[2],
      url: (cols[2].match(/\((.*?)\)/) || [])[1] || '',
      location: cols[3],
      model: cols[4]
    }));
}

async function fetchSimplifyJSON(from, to) {
  const url = 'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/.github/scripts/listings.json';
  const res = await fetch(url);
  const data = await res.json();

  return data.filter(
    job => job.date_posted >= from && job.date_posted < to && job.is_visible
  ).map(job => ({
    company: job.company_name,
    title: job.title,
    url: job.url,
    location: job.locations.join(', ')
  }));
}

function buildEmailHTML(jobright, simplify, dateStr) {
  const section = (title, rows) => `
    <h3>${title}</h3>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; font-family: Arial;">
      <thead>
        <tr><th>Company</th><th>Title</th><th>Location</th></tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>${r.company}</td>
            <td><a href="${r.url}">${r.title}</a></td>
            <td>${r.location}</td>
          </tr>
        `).join('')}
      </tbody>
    </table><br/>`;

  const htmlParts = [];
  if (jobright.length > 0) htmlParts.push(section('📘 Jobright.ai', jobright));
  if (simplify.length > 0) htmlParts.push(section('📗 SimplifyJobs', simplify));
  if (htmlParts.length === 0) return '<p>No job listings posted today.</p>';

  return `
    <div style="font-family: Arial, sans-serif;">
      <h2>📅 Job Listings for ${dateStr}</h2>
      ${htmlParts.join('\n')}
      <p style="margin-top: 2rem; font-size: 12px;">This is an automated email from JobBot.</p>
    </div>
  `;
}

async function sendEmail(subject, html) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });
  console.log(process.env.TO_EMAILS)
  const recipients = process.env.TO_EMAILS.split(',').map(e => e.trim());
  await transporter.sendMail({
    from: `"JobBot" <${process.env.GMAIL_USER}>`,
    recipients,
    subject,
    html
  });

  console.log('✅ Email sent:', recipients);
}
