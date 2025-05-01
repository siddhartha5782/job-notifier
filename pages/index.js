import { useState, useEffect } from 'react';

export default function Home() {
  const [status, setStatus] = useState('Idle');
  const [timeLeft, setTimeLeft] = useState(getInitialTimeLeft());

  function getInitialTimeLeft() {
    const now = new Date();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const next5 = 5 * Math.ceil((m + s / 60) / 5);
    const next = new Date(now);
    next.setMinutes(next5);
    next.setSeconds(0);
    return Math.floor((next - now) / 1000);
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => t > 0 ? t - 1 : getInitialTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  async function triggerJob() {
    setStatus('Running...');
    try {
      const res = await fetch('/api/notify');
      const text = await res.text();
      setStatus(text);
    } catch (e) {
      setStatus('❌ Failed');
    }
  }

  const fmt = s => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div style={{ fontFamily: 'Arial', padding: 20 }}>
      <h1>📬 Job Notifier</h1>
      <button onClick={triggerJob}>Trigger Now</button>
      <p>Status: {status}</p>
      <p>⏱ Next trigger in: {fmt(timeLeft)}</p>
    </div>
  );
}
