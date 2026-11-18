import { PlayingCard } from './ThousandCards';
import ThousandModal from './ThousandModal';

const CARD_ROWS = [
  ['A♥', 'Ace', 11, 'Highest card in its suit'],
  ['10♥', 'Ten', 10, 'Second highest — beats the King!'],
  ['K♥', 'King', 4, ''],
  ['Q♥', 'Queen', 3, ''],
  ['J♥', 'Jack', 2, ''],
  ['9♥', 'Nine', 0, 'Lowest card']
];

const MARRIAGES = [
  ['♥', 'Hearts', 100],
  ['♦', 'Diamonds', 80],
  ['♣', 'Clubs', 60],
  ['♠', 'Spades', 40]
];

/** Full rules of 1000, written for someone learning at the kitchen table. */
export default function ThousandRules({ onClose }) {
  return (
    <ThousandModal label="How to play 1000" title="📖 How to play 1000" className="tk-rules" onClose={onClose}>
      <nav className="tk-rules-toc" aria-label="Rules sections">
        {[
          ['goal', 'Goal'],
          ['cards', 'Card values'],
          ['deal', 'The deal'],
          ['bid', 'Bidding'],
          ['musik', 'The musik'],
          ['play', 'Playing'],
          ['marriage', 'Marriages'],
          ['score', 'Scoring'],
          ['barrel', 'Barrel'],
          ['tips', 'Tips']
        ].map(([id, label]) => (
          <a
            key={id}
            href={`#tk-r-${id}`}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(`tk-r-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            {label}
          </a>
        ))}
      </nav>

      <section id="tk-r-goal">
        <h3>🎯 The goal</h3>
        <p>
          Be the first to reach <b>1000 points</b>. Each hand, one player (the <b>declarer</b>) promises to win a number
          of points — the <b>bid</b>. Everyone else (the <b>defenders</b>) tries to stop them while collecting points of
          their own.
        </p>
      </section>

      <section id="tk-r-cards">
        <h3>🃏 The cards and what they're worth</h3>
        <p>
          Only 24 cards are used: <b>9, J, Q, K, 10, A</b> in each suit. Note the order — the{' '}
          <b>Ten is the second-highest card</b>, above the King.
        </p>
        <table className="tk-rules-table">
          <thead>
            <tr>
              <th>Card</th>
              <th>Points</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {CARD_ROWS.map(([id, name, pts, note]) => (
              <tr key={id}>
                <td>
                  <span className="tk-rules-cardcell">
                    <PlayingCard id={id} size="xs" showPts={false} /> {name}
                  </span>
                </td>
                <td className="tk-num">{pts}</td>
                <td className="tk-dim">{note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="tk-dim">
          All the cards together are worth exactly <b>120 points</b>. The little number in the corner of each card in
          the game shows its value.
        </p>
      </section>

      <section id="tk-r-deal">
        <h3>🤲 The deal</h3>
        <ul>
          <li>
            <b>3 players</b> (the classic game): 7 cards each, and 3 cards face down in the middle — the <b>musik</b>.
          </li>
          <li>
            <b>2 players</b>: 10 cards each, and two musiks of 2 cards. The declarer picks one musik (blind); the other
            is put aside.
          </li>
          <li>
            <b>4 players</b>: the dealer sits the hand out and the other three play the 3-player game. The deal moves
            round each hand.
          </li>
        </ul>
      </section>

      <section id="tk-r-bid">
        <h3>🔨 Bidding</h3>
        <ul>
          <li>
            The player after the dealer <b>must open at 100</b>.
          </li>
          <li>
            Going round the table, each player either bids higher (in steps of 10) or <b>passes</b>. Once you pass
            you're out of the bidding for that hand.
          </li>
          <li>
            <b>You can only bid over 120 if you hold a marriage</b> (King + Queen of the same suit), and never more than
            120 + your marriages. E.g. with the ♥ marriage you can bid up to 220.
          </li>
          <li>The last player left is the declarer, and their bid is the contract.</li>
        </ul>
      </section>

      <section id="tk-r-musik">
        <h3>🎁 The musik</h3>
        <ul>
          <li>The declarer turns the musik face up so everyone sees it, then adds it to their hand.</li>
          <li>
            <b>3 players:</b> the declarer then gives <b>one card, face down, to each opponent</b>, so everyone has 8
            cards.
          </li>
          <li>
            <b>2 players:</b> the declarer discards 2 cards face down. Their points count for the declarer.
          </li>
          <li>
            Having seen the musik, the declarer may <b>raise the contract</b> (never lower it).
          </li>
        </ul>
      </section>

      <section id="tk-r-play">
        <h3>▶️ Playing the tricks</h3>
        <ul>
          <li>The declarer leads to the first trick. Each player then plays one card, going round the table.</li>
          <li>
            <b>You must follow suit</b> if you can. If you can't, <b>you must play a trump</b> if you have one.
            Otherwise play anything. You don't have to beat the card on the table.
          </li>
          <li>
            The highest trump wins the trick; if no trump was played, the highest card of the suit that was led wins.
            The winner leads the next trick.
          </li>
          <li>
            <b>There are no trumps at the start of a hand</b> — trumps only appear when someone declares a marriage.
          </li>
        </ul>
      </section>

      <section id="tk-r-marriage">
        <h3>💍 Marriages (King + Queen of the same suit)</h3>
        <table className="tk-rules-table">
          <tbody>
            {MARRIAGES.map(([s, name, pts]) => (
              <tr key={s}>
                <td>
                  <span className="tk-rules-cardcell">
                    <PlayingCard id={`K${s}`} size="xs" showPts={false} />
                    <PlayingCard id={`Q${s}`} size="xs" showPts={false} /> {name}
                  </span>
                </td>
                <td className="tk-num">{pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul>
          <li>
            To declare, <b>lead the King or Queen</b> while you still hold the other one. You can only do it when it's
            your lead — i.e. you won the previous trick — and <b>not on the very first trick</b>.
          </li>
          <li>
            You score the marriage points straight away and <b>that suit becomes trumps</b> (replacing any earlier
            trumps).
          </li>
          <li>Defenders can declare marriages too — the points count for them.</li>
        </ul>
      </section>

      <section id="tk-r-score">
        <h3>🧮 Scoring</h3>
        <ul>
          <li>Each player adds up the points in the tricks they won + any marriages they declared.</li>
          <li>
            <b>Declarer:</b> if their total is at least the contract they <b>score the contract</b>. If not, they{' '}
            <b>lose the contract</b> (scores can go below zero). Extra points over the contract don't count.
          </li>
          <li>
            <b>Defenders:</b> score their own points, rounded to the nearest 10 (5 rounds up).
          </li>
        </ul>
        <div className="tk-rules-example">
          <b>Example:</b> Anna bids 120. She takes 85 in tricks and declared the ♦ marriage (80) = 165 ≥ 120, so she
          scores <b>+120</b>. Ben took 23 → <b>+20</b>. Cara took 12 and declared ♠ (40) = 52 → <b>+50</b>.
        </div>
      </section>

      <section id="tk-r-barrel">
        <h3>🛢️ On the barrel (800+)</h3>
        <p>
          Once you reach <b>800 points</b> you're "on the barrel": you no longer score points as a defender. The only
          way to finish is to win a bid and make it. The first player to reach 1000 wins (if two players pass 1000 in
          the same hand, the higher score wins).
        </p>
      </section>

      <section id="tk-r-tips">
        <h3>💡 Tips to get better</h3>
        <ul>
          <li>
            <b>Count your sure points before bidding.</b> Aces win tricks; a Ten with its Ace is strong; a lone Ten is
            likely to be caught by someone's Ace. A marriage you can actually declare (you need to win a trick first —
            Aces help!) is the biggest boost.
          </li>
          <li>
            <b>About 100–110 is a typical hand.</b> To bid 120+ you usually need a marriage plus an Ace or two.
          </li>
          <li>
            <b>Give away your junk</b> (9s and Jacks) — but remember the cards you give help the defenders.
          </li>
          <li>
            <b>Cash Aces early, then declare your marriage</b> so its suit becomes trumps after you've used your
            side-suit winners.
          </li>
          <li>
            <b>Defenders work together.</b> When your fellow defender is winning a trick, throw your Tens and Aces onto
            it. When the declarer is winning, throw your cheapest card.
          </li>
          <li>
            <b>Remember who is out of a suit</b> — they'll be able to trump it once trumps exist.
          </li>
          <li>
            Stuck? Press <b>💡 Hint</b> in the game: the computer coach suggests a move and explains why.
          </li>
        </ul>
        <p className="tk-dim">
          1000 (Tysiąc / Тысяча) has lots of family variations. This table uses the common Polish rules; extras like the
          "bomb", the 3-strikes barrel penalty and the four-9s redeal aren't used.
        </p>
      </section>
    </ThousandModal>
  );
}
