// Phase 33 task 33.11: legal, safety, takedown, and contact pages.
// Owner signed these off for publication on 16 Nov 2026 (draft labels removed).

export const LEGAL_LAST_UPDATED = 'Last updated 16 November 2026';

export const LEGAL_PAGES = {
  '/rules': {
    path: '/rules',
    navLabel: '📜 House Rules',
    badge: LEGAL_LAST_UPDATED,
    title: 'House Rules — Keep It Funny, Keep It Legal | THE MEMES.net',
    h1: 'THE MEMES.net House Rules',
    subtitle: 'Short, honest, and easy to follow so the arcade stays open for everyone.',
    sections: [
      {
        heading: '✅ What Is Welcome Here',
        bullets: [
          'Original jokes, wholesome roasts, coding & gaming memes, GIFs, and spicy remix chains.',
          'Public-domain reaction formats and commentary that punch up or poke fun at everyday life.',
          'Friendly banter in comments that stays playful instead of personal.',
          'THE MEMES.net is for people aged 13 and over, and everything posted is kept teen-safe.'
        ]
      },
      {
        heading: '🚫 What Gets Removed On Sight',
        bullets: [
          'Zero tolerance: anything exploiting or sexualising minors (reported and permanently banned immediately).',
          'No nudity, sexually explicit imagery, gore, self-harm, or graphic real-world violence.',
          'No hate speech, slurs, harassment, doxxing, private phone numbers, home addresses, or emails.',
          'No spam links, phishing domains, impersonating @TheMemesHQ or moderators, or content you have no right to share.'
        ]
      },
      {
        heading: '⚖️ How Strikes Work',
        bullets: [
          'Every image, GIF, caption, and comment is screened automatically and queued for moderators if borderline.',
          '3 reports from distinct accounts (or 1 severe safety report) hides a post immediately until reviewed.',
          'Strike 1 = warning and post removal. Strike 2 = temporary 7-day posting pause. Strike 3 = permanent suspension.'
        ]
      }
    ]
  },
  '/terms': {
    path: '/terms',
    navLabel: '⚖️ Terms',
    badge: LEGAL_LAST_UPDATED,
    title: 'Terms of Use | THE MEMES.net',
    h1: 'Terms of Use',
    subtitle: 'Plain-English rules for browsing, creating memes, and playing arcade cabinets.',
    sections: [
      {
        heading: '1. Using THE MEMES.net',
        bullets: [
          'By creating memes, commenting, or playing here, you confirm you are at least 13 years old (or older if the law where you live requires it) and will follow the House Rules.',
          'All arcade cabinets run on pretend tokens (MemeDollarz M$ and MemeCentz ¢) that are 100% free, just for fun, and cannot be bought, sold, or cashed out.'
        ]
      },
      {
        heading: '2. Your Uploads & Rights',
        bullets: [
          'You remain responsible for everything you post. Only upload images or GIFs you created or have permission to share.',
          'You grant THE MEMES.net a non-exclusive, worldwide, royalty-free licence to host, re-encode, display, and allow community remixes of memes you post.',
          'We may remove or hide any upload, comment, or account at any time to enforce safety, copyright, or UK Online Safety obligations.'
        ]
      },
      {
        heading: '3. Takedowns & Disputes',
        bullets: [
          'Believe something infringes your copyright or invades your privacy? Submit a high-priority notice on /takedown or see /contact for other questions.'
        ]
      }
    ]
  },
  '/privacy': {
    path: '/privacy',
    navLabel: '🔐 Privacy',
    badge: LEGAL_LAST_UPDATED,
    title: 'Privacy Policy | THE MEMES.net',
    h1: 'Privacy Policy & Data Controls',
    subtitle: 'What we store, why we store it, and how to delete everything in one place.',
    sections: [
      {
        heading: '📦 What We Store',
        bullets: [
          'Account data: if you sign in via Magic Link or OAuth, Supabase stores your email/provider ID and chosen handle. First-time commenters/voters may use an anonymous Supabase session ID.',
          'Browser localStorage: saves pretend arcade tokens, CRT/sound settings, muted categories, and bookmarked memes locally on your device.',
          'Abuse & rate-limit logs: uploads and reports record hashed IPs briefly for spam prevention and strip EXIF/GPS metadata from every uploaded image/GIF.',
          'Automated safety checks: every uploaded image/GIF and the text of titles, captions, comments and usernames is sent to the OpenAI moderation service to be checked against the House Rules before it can appear. We do not send your email address or account details with it.'
        ]
      },
      {
        heading: '📊 Analytics & Anti-Bot Protection',
        bullets: [
          'We use privacy-friendly Vercel Analytics for aggregate page views, and may use Cloudflare Turnstile on upload and comment checks to stop automated bots.',
          'We do not sell your personal information or run third-party ad tracking profiles.'
        ]
      },
      {
        heading: '🗑️ How To Delete Your Data',
        bullets: [
          'Signed-in users can permanently delete their account, memes, comments, votes, reactions, and storage files from Settings (⚙️ -> "Delete my account and memes").',
          'You can also clear device-local storage anytime via your browser settings or submit a privacy removal request at /takedown.'
        ]
      }
    ]
  },
  '/takedown': {
    path: '/takedown',
    navLabel: '🚩 Takedown',
    badge: LEGAL_LAST_UPDATED,
    title: 'Copyright & Privacy Takedown Request | THE MEMES.net',
    h1: 'Copyright & "Picture of Me" Takedown',
    subtitle: 'Creates an immediate high-priority review item for moderators.',
    sections: [
      {
        heading: '⚡ When To Use This Form',
        bullets: [
          'Copyright / DMCA notices for artwork, photos, or templates posted without permission.',
          '"This is a picture of me" or personal-information removal requests.'
        ]
      }
    ]
  },
  '/contact': {
    path: '/contact',
    navLabel: '✉️ Contact',
    badge: LEGAL_LAST_UPDATED,
    title: 'Contact THE MEMES.net | THE MEMES.net',
    h1: 'Contact & Safety Desk',
    subtitle: 'Where to reach the site maintainer for safety, press, or legal inquiries.',
    sections: [
      {
        heading: '📬 Reaching The Owner',
        bullets: [
          'Safety, copyright, or privacy removals: submit directly on /takedown so your request logs straight into the moderation queue with priority 95.',
          'There is no public email address: the /takedown form is the way to reach the site owner and moderators, and it accepts any kind of request (choose "Other").',
          'For bug reports or feature ideas, use the same form and include the meme URL (/m/...) or route path where you noticed the issue.'
        ]
      }
    ]
  }
};

export const LEGAL_ROUTE_PATHS = Object.keys(LEGAL_PAGES);
