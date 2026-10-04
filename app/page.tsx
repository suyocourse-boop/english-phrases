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
  icon?: string; // зургийн линк (https://..., /icons/a.png) эсвэл emoji
}

// Түлхүүр үгээр автомат icon сонгох (өөрийн ангилал, хэллэгт тааруулж нэм)
const KEYWORD_ICONS: [RegExp, string][] = [
  [/hello|hi\b|meet|how's it going|nice to/i, '👋'],
  [/thank/i, '🙏'],
  [/sorry|excuse|pardon/i, '🙇'],
  [/where|station|airport|direction|map|turn/i, '🧭'],
  [/book|hotel|room|reserve/i, '🏨'],
  [/check|bill|pay|price|cost|how much/i, '💳'],
  [/eat|food|menu|order|drink|restaurant/i, '🍽️'],
  [/help|could you|can you|would you/i, '🤝'],
  [/time|late|early|o'clock|meeting/i, '⏰'],
  [/work|job|office|boss/i, '💼'],
];
const CATEGORY_ICONS: Record<string, string> = {
  'Мэндчилгээ': '👋',
  'Хүсэлт': '🙋',
  'Аялал': '✈️',
};

function resolveEmoji(item: PhraseItem): string {
  if (item.category && CATEGORY_ICONS[item.category]) return CATEGORY_ICONS[item.category];
  const hit = KEYWORD_ICONS.find(([re]) => re.test(item.en || ''));
  return hit ? hit[1] : '💬';
}

function PhraseIcon({ item }: { item: PhraseItem }) {
  const [failed, setFailed] = useState(false);
  const raw = item.icon?.trim();
  const isImage = !!raw && /^(https?:\/\/|\/|data:image)/.test(raw);

  return (
    <span className="icon-wrap" aria-hidden="true">
      {isImage && !failed ? (
        <img src={raw} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span>{raw && !isImage ? raw : resolveEmoji(item)}</span>
      )}
    </span>
  );
}

export default function Home() {
  const [chapter, setChapter] = useState('chapter1');
  const [phrases, setPhrases] = useState<PhraseItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [known, setKnown] = useState<Set<string>>(new Set());

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

  // "Learned" phrases are remembered in the browser
  useEffect(() => {
    try {
      const saved = localStorage.getItem('known');
      if (saved) setKnown(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  const toggleKnown = (key: string) => {
    setKnown(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      try { localStorage.setItem('known', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    const dark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
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

  const keyOf = (item: PhraseItem) => `${chapter}-${item.id}`;
  const knownCount = phrases.filter(p => known.has(keyOf(p))).length;
  const allOpen = filteredPhrases.length > 0 && filteredPhrases.every(p => openIds.has(p.id));

  const toggleOpen = (id: number) =>
    setOpenIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setOpenIds(allOpen ? new Set() : new Set(filteredPhrases.map(p => p.id)));

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>Англи Хэлний Ярианы Толь</h1>
          <p className="sub">Хэллэг дээр дарж тайлбар, жишээг нээнэ.</p>
        </div>
        <button className="theme-btn" onClick={toggleTheme} aria-label="Өнгө солих">◐</button>
      </header>

      <div className="progress">
        <div className="progress-row">
          <span>Сурсан хэллэг</span>
          <span><b>{knownCount}</b> / {phrases.length}</span>
        </div>
        <div className="bar">
          <i style={{ width: phrases.length ? `${(knownCount / phrases.length) * 100}%` : '0%' }} />
        </div>
      </div>

      <div className="controls-row">
        <select
          id="chapterSelect"
          value={chapter}
          onChange={(e) => {
            setChapter(e.target.value);
            setSelectedCategory('ALL');
            setSearchQuery('');
            setOpenIds(new Set());
          }}
        >
          <option value="chapter1">1  Мэндчилгээ</option>
          <option value="chapter2">2 Өдөр тутмын амьдрал</option>
          <option value="chapter3">3 Асуух ба хариулах</option>
          <option value="chapter4">4 Ажил ба сургууль</option>
          <option value="chapter5">5 Аялал</option>
          <option value="chapter6">6 Ресторан ба кафе</option>
          <option value="chapter7">7 Хүмүүстэй харилцах</option>
          <option value="chapter8">8 Мэдрэмж ба хэрэгцээ</option>
          <option value="chapter9">9 Асуудал шийдэх</option>
        </select>

        <div className="search-box">
          <input
            type="search"
            placeholder="Англи эсвэл Монгол үгээр хайх..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button className="ghost" onClick={toggleAll}>
          {allOpen ? 'Бүгдийг хаах' : 'Бүгдийг нээх'}
        </button>
      </div>

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
      <main className="phrases-list">
        {loading ? (
          <div className="empty">Ачаалж байна...</div>
        ) : filteredPhrases.length === 0 ? (
          <div className="empty">Тохирох илэрц олдсонгүй.</div>
        ) : (
          filteredPhrases.map(item => {
            const isOpen = openIds.has(item.id);
            const isKnown = known.has(keyOf(item));
            return (
              <div
                key={item.id}
                className={`item ${isOpen ? 'open' : ''} ${isKnown ? 'known' : ''}`}
              >
                <div
                  className="row"
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={() => toggleOpen(item.id)}
                  onKeyDown={(e) => {
                    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      toggleOpen(item.id);
                    }
                  }}
                >
                  <PhraseIcon item={item} />
                  <div>
                    <div className="en-title">{item.en}</div>
                    <div className="mn-title">{item.mn}</div>
                    <div className="cat-tag">#{item.id} {item.category || 'Ерөнхий'}</div>
                  </div>
                  <button
                    className="audio-btn"
                    title="Сонсох"
                    onClick={(e) => {
                      e.stopPropagation();
                      speakText(item.en);
                    }}
                  >
                    🔊
                  </button>
                  <span className="chev">▾</span>
                </div>

                <div className="more">
                  <div>
                    <div className="body">
                      {item.when && (
                        <p className="when-box"><span>{item.when}</span></p>
                      )}

                      {item.context && (
                        <div className="context-container">
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
                                onClick={() => speakText(textToSpeak)}
                              >
                                <span>{trimmed}</span>
                                <span className="small-audio-icon">🔊</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <button
                        className={`known-btn ${isKnown ? 'on' : ''}`}
                        onClick={() => toggleKnown(keyOf(item))}
                      >
                        {isKnown ? '✓ Сурсан' : 'Сурсан гэж тэмдэглэх'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}