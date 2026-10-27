// ==========================================
// DYNAMIC SEO & GOOGLE STRUCTURED DATA (JSON-LD) ENGINE
// ==========================================

const CATEGORY_SEO = {
  all: {
    title: 'THE MEMES.net — #1 Free Meme Generator, Dank Memes & 1v1 Meme Battle Arena',
    desc: 'Discover viral dank memes, programming & gaming memes, play 1v1 Meme Battles, mash the Crazy Meme Soundboard, and remix memes in the HTML5 Meme Forge Studio.'
  },
  dank: {
    title: 'Dank Memes & Viral Shitposts (2026) | THE MEMES.net Cyber-Arcade',
    desc: 'Browse the freshest dank memes, deep-fried shitposts, and viral internet humor. Upvote, react, and mutate memes for XP on THE MEMES.net.'
  },
  tech: {
    title: 'Funny Programming, Coding & Developer Memes | THE MEMES.net',
    desc: 'Top software engineering, Friday production deploy, AI coding, and developer memes. Built for programmers and tech lovers.'
  },
  gaming: {
    title: 'Gaming Memes, Boss Fights & Esports Humor | THE MEMES.net',
    desc: 'Viral gaming memes, RPG boss phase jokes, and squad lobby humor. Vote in the 1v1 Gaming Meme Battle Arena.'
  },
  relatable: {
    title: 'Relatable 3AM, Work & Everyday Life Memes | THE MEMES.net',
    desc: 'Hilarious relatable memes about sleep schedules, corporate meetings, and daily life. Remix any meme in 1 click.'
  }
};

export function updateDynamicSeo({ activeMeme = null, category = 'all', viewMode = 'feed' }) {
  if (typeof document === 'undefined') return;

  let pageTitle = CATEGORY_SEO[category]?.title || CATEGORY_SEO.all.title;
  let pageDesc = CATEGORY_SEO[category]?.desc || CATEGORY_SEO.all.desc;

  if (activeMeme) {
    pageTitle = `${activeMeme.title} — Meme by @${activeMeme.author_name || 'Anon'} | THE MEMES.net`;
    pageDesc = `View, upvote (${activeMeme.score || 1} pts), roast with AI, or remix "${activeMeme.title}" by @${activeMeme.author_name || 'Anon'} on THE MEMES.net.`;
  } else if (viewMode === 'slots') {
    pageTitle = 'Las Vegas 777 Retro Neon Slot Machine | THE MEMES.net Cyber-Arcade';
    pageDesc =
      'Pull the 3D chrome lever on THE MEMES.net Las Vegas 777 Slot Machine! Use Reel HOLD & NUDGE, hit Triple 777 Jackpots, and win fair Arcade Tokens.';
  } else if (viewMode === 'crush') {
    pageTitle = 'Meme Crush Saga — Candy-Crush Style Meme Puzzle Game | THE MEMES.net';
    pageDesc =
      'Play Meme Crush Saga online! Shatter Frosted Crystal Jelly with 2x2 Seeking Rockets, 3x3 Packet Bombs, Rainbow Lightning Beams, and win fair Arcade Tokens.';
  } else if (viewMode === 'pinball') {
    pageTitle = 'Las Vegas Retro Pinball Machine — Win Arcade Credits | THE MEMES.net';
    pageDesc =
      'Play the 60fps Las Vegas Retro Pinball Machine! Launch the silver ball, hit 777 & Rubber Duck pop bumpers, light L-U-C-K multipliers, and win fair Arcade Tokens.';
  } else if (viewMode === 'reels') {
    pageTitle = 'Vertical Meme Reels — Fullscreen Viral Memes | THE MEMES.net';
  } else if (viewMode === 'swipe') {
    pageTitle = 'Hyper-Swipe Meme Triage Deck | THE MEMES.net Cyber-Arcade';
  } else if (viewMode === 'battle') {
    pageTitle = '1v1 Sudden-Death Meme Battle Arena | THE MEMES.net';
  }

  document.title = pageTitle;

  const setMeta = (selector, attr, val) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, val);
  };

  setMeta('meta[name="description"]', 'content', pageDesc);
  setMeta('meta[property="og:title"]', 'content', pageTitle);
  setMeta('meta[property="og:description"]', 'content', pageDesc);
  setMeta('meta[name="twitter:title"]', 'content', pageTitle);
  setMeta('meta[name="twitter:description"]', 'content', pageDesc);

  // Inject dynamic Schema.org SocialMediaPosting JSON-LD when inspecting a meme
  let ldScript = document.getElementById('tm-dynamic-jsonld');
  if (activeMeme) {
    if (!ldScript) {
      ldScript = document.createElement('script');
      ldScript.id = 'tm-dynamic-jsonld';
      ldScript.type = 'application/ld+json';
      document.head.appendChild(ldScript);
    }
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'SocialMediaPosting',
      headline: activeMeme.title,
      datePublished: activeMeme.created_at || new Date().toISOString(),
      author: {
        '@type': 'Person',
        name: activeMeme.author_name || 'AnonMemer'
      },
      interactionStatistic: {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: Number(activeMeme.score || 1)
      },
      sharedContent: {
        '@type': 'ImageObject',
        name: activeMeme.title,
        caption: `${activeMeme.title} (${activeMeme.category || 'meme'})`
      }
    };
    ldScript.textContent = JSON.stringify(schema);
  } else if (ldScript) {
    ldScript.remove();
  }
}
