import { useState, useMemo } from 'react';
import { DANK_PET_STAGES } from '../data/starterMemes';
import { sfx } from '../utils/soundEngine';

export default function DankPetWidget({ onEarnPetXp }) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedsCount, setFeedsCount] = useState(() =>
    Number(localStorage.getItem('tm_pet_feeds') || 0)
  );
  const [animState, setAnimState] = useState('idle'); // 'idle' | 'squish' | 'dance' | 'eat'
  const [speechText, setSpeechText] = useState(
    'Tap me for goofy sounds or feed me spicy memes!'
  );

  const currentStage = useMemo(() => {
    let st = DANK_PET_STAGES[0];
    for (const item of DANK_PET_STAGES) {
      if (feedsCount >= item.minFeeds) st = item;
    }
    return st;
  }, [feedsCount]);

  const nextStage = useMemo(() => {
    return DANK_PET_STAGES.find((s) => s.minFeeds > feedsCount) || null;
  }, [feedsCount]);

  const triggerAnim = (type, quip) => {
    setAnimState(type);
    if (quip) setSpeechText(quip);
    setTimeout(() => setAnimState('idle'), 520);
  };

  const handleFeedPet = (e) => {
    const nextFeeds = feedsCount + 1;
    setFeedsCount(nextFeeds);
    localStorage.setItem('tm_pet_feeds', String(nextFeeds));

    sfx.playBoing(3);
    const quip =
      currentStage.quips[Math.floor(Math.random() * currentStage.quips.length)];
    triggerAnim('eat', `🌶️ NOM NOM! "${quip}"`);
    // Award XP only on the first 3 feeds of the day to prevent click-farming
    const today = new Date().toISOString().slice(0, 10);
    const dailyKey = `tm_pet_xp_${today}`;
    const dailyCount = Number(localStorage.getItem(dailyKey) || 0);
    if (dailyCount < 3 && onEarnPetXp) {
      localStorage.setItem(dailyKey, String(dailyCount + 1));
      onEarnPetXp(10, e, currentStage.emoji);
    }
  };

  const handleSquishPet = () => {
    sfx.playClownHonk();
    triggerAnim(
      'squish',
      '🤡 HONK! You squished my last two braincells!'
    );
  };

  const handleDancePet = () => {
    sfx.playNyanRiff();
    triggerAnim(
      'dance',
      '🕺 DISCO OVERDRIVE! Look at those 60fps moves!'
    );
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        className="tm-dank-pet-launcher"
        onClick={() => {
          sfx.playRubberDuck();
          setIsOpen(true);
        }}
        title="Open your Interactive Cyber-Arcade Dank Tamagotchi Pet!"
      >
        <span className="tm-dank-pet-launcher-emoji">{currentStage.emoji}</span>
        <span className="tm-dank-pet-launcher-text">{currentStage.name}</span>
      </button>
    );
  }

  return (
    <aside className="tm-dank-pet-card" aria-label="Interactive Dank Tamagotchi Cyber-Pet">
      <div className="tm-dank-pet-header">
        <div>
          <span className="tm-dank-pet-badge">{currentStage.title}</span>
          <div style={{ fontWeight: 900, fontSize: '13px', color: '#f8fafc' }}>
            {currentStage.name}
          </div>
        </div>
        <button
          type="button"
          className="tm-dank-pet-close"
          onClick={() => setIsOpen(false)}
          title="Minimize Dank Pet"
        >
          ▾
        </button>
      </div>

      <div
        className="tm-dank-pet-stage"
        onClick={handleSquishPet}
        title="Click to squish & honk!"
      >
        <div className={`tm-dank-pet-avatar ${animState}`}>
          {currentStage.emoji}
        </div>
        <div className="tm-dank-pet-speech">{speechText}</div>
      </div>

      <div className="tm-dank-pet-progress">
        <span>🌶️ Memes Fed: {feedsCount}</span>
        <span>
          {nextStage
            ? `Next Evo: ${nextStage.minFeeds - feedsCount} more`
            : '👑 MAX EVOLUTION!'}
        </span>
      </div>

      <div className="tm-dank-pet-actions">
        <button
          type="button"
          className="tm-dank-pet-btn"
          onClick={handleFeedPet}
        >
          🌶️ Feed
        </button>
        <button
          type="button"
          className="tm-dank-pet-btn"
          onClick={handleSquishPet}
        >
          🤡 Squish
        </button>
        <button
          type="button"
          className="tm-dank-pet-btn"
          onClick={handleDancePet}
        >
          🕺 Dance
        </button>
      </div>
    </aside>
  );
}
