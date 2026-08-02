'use client';
import { useState, useRef, useEffect } from 'react';

const STARTERS = [
  'What is Creator Studio and how do I use it?',
  'Write me a video idea for a furniture warehouse',
  'Why isn\'t my video posting?',
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your NicheCast assistant. Ask me how a feature works, or ask me to write a prompt for you." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || data.error || 'Something went wrong.' }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: 'Network error — try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open assistant"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 56, height: 56, borderRadius: '50%', border: 'none',
          background: '#6c5ce7', color: '#fff', fontSize: 24, cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(108,92,231,0.4)',
        }}
      >
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', bottom: 92, right: 24, zIndex: 1000,
            width: 340, maxWidth: 'calc(100vw - 32px)', height: 460,
            background: '#fff', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #eee',
          }}
        >
          <div style={{ padding: '12px 16px', background: '#6c5ce7', color: '#fff', fontWeight: 600 }}>
            NicheCast Assistant
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  background: m.role === 'user' ? '#6c5ce7' : '#f2f1fb',
                  color: m.role === 'user' ? '#fff' : '#222',
                  padding: '8px 12px', borderRadius: 12, maxWidth: '85%',
                  fontSize: 13.5, lineHeight: 1.4, whiteSpace: 'pre-wrap',
                }}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: '#999', fontSize: 12.5, padding: '4px 12px' }}>
                thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>

          {messages.length < 2 && (
            <div style={{ padding: '0 12px 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    textAlign: 'left', fontSize: 12.5, padding: '6px 10px', borderRadius: 8,
                    border: '1px solid #e4e2f7', background: '#fafafe', color: '#6c5ce7', cursor: 'pointer',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid #eee' }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd',
                fontSize: 13.5, outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '8px 14px', borderRadius: 8, border: 'none',
                background: '#6c5ce7', color: '#fff', fontSize: 13.5, cursor: 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
