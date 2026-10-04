'use client';

import { useState, useEffect } from 'react';

interface PhraseItem {
  id: number;
  chapter: number;
  category: string;
  en: string;
  mn: string;
  when: string;
  context: string;
}

export default function Home() {
  const [chapter, setChapter] = useState('chapter1');
  const [phrases, setPhrases] = useState<PhraseItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Web Speech API
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') || v.lang.includes('US'));
    if (englishVoice) utterance.voice = englishVoice;

    window.speechSynthesis.speak(utterance);
  };

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/phrases?chapter=${chapter}`);
        const data = await res.json();
        setPhrases(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [chapter]);

  // Unique categories
  const categories = ['ALL', ...Array.from(new Set(phrases.map(item => item.category).filter(Boolean)))];

  // Filtered List
  const filteredPhrases = phrases.filter(item => {
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = 
      !query ||
      (item.en && item.en.toLowerCase().includes(query)) ||
      (item.mn && item.mn.toLowerCase().includes(query)) ||
      (item.when && item.when.toLowerCase().includes(query)) ||
      (item.context && item.context.toLowerCase().includes(query));

    return matchesCategory && matchesQuery;
  });

  return (
    <div className="container">
      <header className="header">
        <h1>💬 Англи Хэлний Ярианы Толь</h1>
        
        <div className="controls-row">
          <select 
            id="chapterSelect" 
            value={chapter} 
            onChange={(e) => {
              setChapter(e.target.value);
              setSelectedCategory('ALL');
              setSearchQuery('');
            }}
          >
            <option value="chapter1">Chapter 1</option>
            <option value="chapter2">Chapter 2</option>
          </select>

          <div className="search-box">
            <input 
              type="text" 
              placeholder="Англи эсвэл Монгол үгээр хайх..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Category Navigation */}
      <nav className="category-bar">
        {categories.map(cat => (
          <button 
            key={cat} 
            className={`cat-pill ${cat === selectedCategory ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === 'ALL' ? 'Бүгд' : cat}
          </button>
        ))}
      </nav>

      {/* Phrase List */}
      <main className="phrases-grid">
        {loading ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#64748b', padding: '40px' }}>
            Ачаалж байна...
          </div>
        ) : filteredPhrases.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#64748b', padding: '40px' }}>
            Тохирох илэрц олдсонгүй.
          </div>
        ) : (
          filteredPhrases.map(item => (
            <div key={item.id} className="card">
              <div className="card-header">
                <span className="category-badge">{item.category || 'Ерөнхий'}</span>
                <span className="id-badge">#{item.id}</span>
              </div>

              <div className="en-box" onClick={() => speakText(item.en)}>
                <span className="en-title">{item.en}</span>
                <button className="audio-btn" title="Сонсох">🔊</button>
              </div>

              <div className="mn-title">{item.mn}</div>

              {item.when && <div className="when-box">💡 {item.when}</div>}

              {item.context && (
                <div className="context-container">
                  <div className="context-header">💬 Харилцан ярианы жишээ:</div>
                  {item.context.split('\n').map((line, idx) => {
                    const trimmed = line.trim();
                    if (!trimmed) return null;
                    const isA = trimmed.startsWith('A:');
                    const isB = trimmed.startsWith('B:');
                    const speakerClass = isA ? 'speaker-a' : (isB ? 'speaker-b' : 'speaker-other');
                    const textToSpeak = trimmed.replace(/^[A-Z]:\s*/, '');

                    return (
                      <div 
                        key={idx} 
                        className={`context-bubble ${speakerClass}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          speakText(textToSpeak);
                        }}
                      >
                        <span>{trimmed}</span>
                        <span className="small-audio-icon">🔊</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}