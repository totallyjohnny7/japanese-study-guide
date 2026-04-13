// patch-ch5-ch6-depth.mjs
// Adds three new in-depth cards to the Chapter 5 and Chapter 6 tabs:
//
//   Ch5 panel:
//     1. "DESCRIBING TWO+ THINGS (Ch5 Multi-Object Patterns)" — chains
//        location + adjective + multiple objects in single sentences,
//        every situation a student might need.
//
//   Ch6 panel:
//     2. "て-FORM DUMBED DOWN (Step-by-Step)" — every group, every ending,
//        with the exact 3-step recipe and 20+ worked examples.
//     3. "DESCRIBING TWO+ THINGS WITH て-FORM (Ch6)" — chaining actions,
//        adjectives, and noun states using て to talk about multiple things
//        at once.
//
// Inserts each new card immediately AFTER the existing relevant card so the
// student sees the depth content right where they need it. Idempotent.

import fs from 'node:fs';
import path from 'node:path';

const FILE = path.join('public', 'index.html');
let html = fs.readFileSync(FILE, 'utf8');
const before = html.length;
const MARKER = 'CH56-DEPTH-V1';

// ────────────────────────────────────────────────────────────────────────────
// CSS for the new depth cards (idempotent)
// ────────────────────────────────────────────────────────────────────────────
const CSS_MARKER = '/* CH56-DEPTH-CSS */';
if (!html.includes(CSS_MARKER)) {
  const css = `${CSS_MARKER}
.depth-card { border:1px solid #6b5518; border-radius:10px; margin-bottom:18px; overflow:hidden; background:rgba(255,255,255,0.02); }
.depth-card .depth-header { background:linear-gradient(135deg,#6b5518,#8a6e1f); color:#fff; padding:10px 14px; font-weight:700; font-size:13px; letter-spacing:1px; }
.depth-card .depth-body { padding:14px 16px; font-size:13px; line-height:1.6; color:var(--text); }
.depth-step { background:rgba(158,204,255,0.05); border-left:3px solid #9eccff; border-radius:6px; padding:10px 12px; margin:10px 0; }
.depth-step b.step-label { display:block; color:#9eccff; font-size:10px; letter-spacing:1px; margin-bottom:4px; }
.depth-row { padding:8px 10px; margin:6px 0; background:rgba(226,180,73,0.06); border-left:3px solid #e2b449; border-radius:5px; }
.depth-row .dr-jp { color:var(--white); font-size:14px; line-height:1.6; display:block; }
.depth-row .dr-en { color:var(--text-dim); font-size:11px; display:block; margin-top:3px; }
.depth-row .dr-tag { display:inline-block; font-size:9px; font-weight:700; letter-spacing:0.6px; color:#e2b449; background:rgba(226,180,73,0.15); padding:2px 6px; border-radius:3px; margin-bottom:4px; }
.depth-recipe { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin:10px 0; }
.depth-recipe > div { background:rgba(158,204,255,0.06); border:1px solid #6b5518; border-radius:6px; padding:8px; text-align:center; font-size:12px; }
.depth-recipe > div b { display:block; color:#e2b449; font-size:10px; margin-bottom:4px; letter-spacing:0.5px; }
.depth-trap { background:rgba(232,84,84,0.08); border-left:3px solid #e85454; border-radius:6px; padding:10px 12px; margin:10px 0; font-size:12px; }
@media (max-width:600px) { .depth-recipe { grid-template-columns:1fr; } }
`;
  html = html.replace('</style>', css + '</style>');
  console.log('✓ Injected depth-card CSS');
}

// ────────────────────────────────────────────────────────────────────────────
// CARD 1 — Ch5: Describing Two+ Things
// ────────────────────────────────────────────────────────────────────────────
const CH5_MULTI_CARD = `
<!-- DEPTH CARD: Ch5 Multi-Object Descriptions ${MARKER} -->
<div class="depth-card" data-depth="${MARKER}">
  <div class="depth-header">第五章 — DESCRIBING TWO OR MORE THINGS (CH5 MULTI-OBJECT PATTERNS)</div>
  <div class="depth-body">

    <p style="margin:0 0 12px 0;">When you need to describe <b>more than one thing</b> in the same room or sentence, you're chaining location nouns + objects with particles. Here is every Ch5 situation, dumbed down.</p>

    <div class="depth-step">
      <b class="step-label">PATTERN A — Two objects in the same place (Xに YとZが あります)</b>
      <div class="dr-jp">へやに つくえと いすが あります。</div>
      <div class="dr-en">In the room there is a desk and a chair.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">PATTERN B — Two objects in DIFFERENT spots (use ～には … ～には)</b>
      <div class="dr-jp">つくえの うえには ほんが あります。つくえの したには かばんが あります。</div>
      <div class="dr-en">On the desk there is a book. Under the desk there is a bag.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">PATTERN C — Add adjectives to BOTH things</b>
      <div class="dr-jp">つくえの うえに あたらしい ほんと、くろい かばんが あります。</div>
      <div class="dr-en">On the desk there is a new book and a black bag.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">PATTERN D — One object animate, one inanimate (mix います / あります)</b>
      <div class="dr-jp">ソファの したに ねこが いて、ソファの うえに ほんが あります。</div>
      <div class="dr-en">There's a cat under the sofa, and a book on top of the sofa.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">PATTERN E — Three or more locations chained</b>
      <div class="dr-jp">ドアの みぎに まどが、ひだりに とけいが、まんなかに え が あります。</div>
      <div class="dr-en">A window is right of the door, a clock to the left, and a picture in the middle.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">PATTERN F — Describing what is INSIDE another container</b>
      <div class="dr-jp">かばんの なかに ほんと ノートと ペンが あります。</div>
      <div class="dr-en">Inside the bag there is a book, a notebook, and a pen.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">PATTERN G — Negative + positive contrast (use は instead of が)</b>
      <div class="dr-jp">きょうしつに がくせいは いますが、せんせいは いません。</div>
      <div class="dr-en">In the classroom there are students, but no teacher.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">PATTERN H — Adjective chain on ONE thing (て-form preview from Ch6)</b>
      <div class="dr-jp">この へやは ひろくて、あかるくて、しずかです。</div>
      <div class="dr-en">This room is spacious, bright, and quiet.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">PATTERN I — Distance / duration between two places</b>
      <div class="dr-jp">うちから だいがくまで バスで にじゅっぷんぐらい かかります。</div>
      <div class="dr-en">From my house to the university, it takes about 20 minutes by bus.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">PATTERN J — Comparing two rooms / places</b>
      <div class="dr-jp">わたしの へやは ちいさいですが、リーさんの へやは おおきいです。</div>
      <div class="dr-en">My room is small, but Lee-san's room is big.</div>
    </div>

    <div class="depth-row">
      <span class="dr-tag">FULL COMBO</span>
      <span class="dr-jp">わたしの あたらしい アパートの おおきい へやには、まどの そばに あたらしい つくえと くろい いすが あって、その うえに ほんと ノートと ちいさい とけいが あります。</span>
      <span class="dr-en">In the big room of my new apartment, near the window there is a new desk and a black chair, and on top of them are a book, a notebook, and a small clock.</span>
    </div>

    <div class="depth-trap">
      ⚠️ <b>The 4 things students forget:</b><br>
      1. Use <b>と</b> only for full lists; use <b>や</b> for partial.<br>
      2. Use <b>と</b> for "and" between NOUNS, never between adjectives or verbs (use て-form for those).<br>
      3. Animate uses <b>います</b>, inanimate uses <b>あります</b> — even within the same sentence.<br>
      4. <b>となり</b> = same kind, <b>よこ</b> = different kind. Pick the right one.
    </div>
  </div>
</div>
`;

// ────────────────────────────────────────────────────────────────────────────
// CARD 2 — Ch6: て-form DUMBED DOWN (step by step, every situation)
// ────────────────────────────────────────────────────────────────────────────
const CH6_TE_CARD = `
<!-- DEPTH CARD: Ch6 te-form dumbed down ${MARKER} -->
<div class="depth-card" data-depth="${MARKER}">
  <div class="depth-header">第六章 — て-FORM DUMBED DOWN (3-STEP RECIPE + EVERY SITUATION)</div>
  <div class="depth-body">

    <p style="margin:0 0 12px 0;"><b>What is the て-form?</b> It is the "<i>and then</i>" form of a verb. It lets you stick TWO actions together in one sentence. Without it you have to say "I ate breakfast." then a new sentence "I went to school." With it you say "I ate breakfast <b>and then</b> went to school." in one sentence: <span lang="ja">あさごはんを たべ<b>て</b>、がっこうに いきました。</span></p>

    <div class="depth-recipe">
      <div><b>STEP 1</b>What group is the verb? る / う / irregular?</div>
      <div><b>STEP 2</b>Apply the rule for that group.</div>
      <div><b>STEP 3</b>Final verb at the end of the sentence sets the TENSE for the whole chain.</div>
    </div>

    <h4 style="margin:14px 0 6px 0; color:#e2b449; font-size:12px; letter-spacing:0.5px;">RULE FOR る-VERBS (Class 2) — EASIEST</h4>
    <div class="depth-step">
      <b class="step-label">RECIPE</b>
      Drop ます → add て. That's it. Always works.<br>
      <span lang="ja">たべ<u>ます</u> → たべ<b>て</b></span> · <span lang="ja">み<u>ます</u> → み<b>て</b></span> · <span lang="ja">ね<u>ます</u> → ね<b>て</b></span> · <span lang="ja">おき<u>ます</u> → おき<b>て</b></span> · <span lang="ja">でかけ<u>ます</u> → でかけ<b>て</b></span>
    </div>

    <h4 style="margin:14px 0 6px 0; color:#e2b449; font-size:12px; letter-spacing:0.5px;">RULE FOR IRREGULAR VERBS — JUST 2, MEMORIZE</h4>
    <div class="depth-step">
      <span lang="ja">します → <b>して</b></span> · <span lang="ja">きます → <b>きて</b></span> · <span lang="ja">べんきょうします → べんきょう<b>して</b></span>
    </div>

    <h4 style="margin:14px 0 6px 0; color:#e2b449; font-size:12px; letter-spacing:0.5px;">RULES FOR う-VERBS (Class 1) — 5 ENDINGS, look at the sound BEFORE ます</h4>
    <div class="depth-step">
      <b class="step-label">ENDING 1 — し → して</b>
      <span lang="ja">はな<u>し</u>ます → はな<b>して</b></span> (to speak)
    </div>
    <div class="depth-step">
      <b class="step-label">ENDING 2 — き → いて  |  ぎ → いで</b>
      <span lang="ja">か<u>き</u>ます → か<b>いて</b></span> (write) · <span lang="ja">き<u>き</u>ます → き<b>いて</b></span> (listen) · <span lang="ja">およ<u>ぎ</u>ます → およ<b>いで</b></span> (swim — voiced ぎ becomes voiced で)
    </div>
    <div class="depth-step">
      <b class="step-label">ENDING 3 — い・ち・り → って  (the "small っ" group)</b>
      <span lang="ja">あ<u>い</u>ます → あ<b>って</b></span> (meet) · <span lang="ja">ま<u>ち</u>ます → ま<b>って</b></span> (wait) · <span lang="ja">かえ<u>り</u>ます → かえ<b>って</b></span> (return) · <span lang="ja">あ<u>り</u>ます → あ<b>って</b></span> (exist)
    </div>
    <div class="depth-step">
      <b class="step-label">ENDING 4 — み・び・に → んで  (the "ん" group)</b>
      <span lang="ja">の<u>み</u>ます → の<b>んで</b></span> (drink) · <span lang="ja">よ<u>み</u>ます → よ<b>んで</b></span> (read) · <span lang="ja">あそ<u>び</u>ます → あそ<b>んで</b></span> (play) · <span lang="ja">よ<u>び</u>ます → よ<b>んで</b></span> (call/invite)
    </div>
    <div class="depth-step">
      <b class="step-label">⚠️ THE ONE EXCEPTION YOU MUST MEMORIZE</b>
      <span lang="ja">い<u>き</u>ます → い<b>って</b></span> (NOT いいて). Even though いきます ends in き, its て-form is いって. This is the #1 most-tested exception.
    </div>

    <h4 style="margin:14px 0 6px 0; color:#e2b449; font-size:12px; letter-spacing:0.5px;">EVERY USE OF て-FORM IN CH 6</h4>

    <div class="depth-row">
      <span class="dr-tag">USE 1 — CHAIN ACTIONS IN ORDER</span>
      <span class="dr-jp">ろくじに おき<b>て</b>、あさごはんを たべ<b>て</b>、がっこうに いきます。</span>
      <span class="dr-en">I get up at 6, eat breakfast, and (then) go to school.</span>
    </div>
    <div class="depth-row">
      <span class="dr-tag">USE 2 — POLITE REQUEST (〜てください)</span>
      <span class="dr-jp">もういちど ゆっくり いっ<b>て</b>ください。</span>
      <span class="dr-en">Please say it slowly one more time.</span>
    </div>
    <div class="depth-row">
      <span class="dr-tag">USE 3 — ACTIVITY OVER A PERIOD (〜て、〜ました)</span>
      <span class="dr-jp">どようびは ともだちに あっ<b>て</b>、しぶやで かいものを し<b>て</b>、ばんごはんを たべました。</span>
      <span class="dr-en">Saturday I met a friend, went shopping in Shibuya, and ate dinner.</span>
    </div>
    <div class="depth-row">
      <span class="dr-tag">USE 4 — REASON / CAUSE (〜て、〜ました)</span>
      <span class="dr-jp">しゅくだいが たくさん あっ<b>て</b>、たいへんでした。</span>
      <span class="dr-en">There was a lot of homework, so it was tough.</span>
    </div>
    <div class="depth-row">
      <span class="dr-tag">USE 5 — DESCRIBING HOW (manner)</span>
      <span class="dr-jp">バスに のっ<b>て</b>、だいがくに いきます。</span>
      <span class="dr-en">I take the bus and go to the university. (= I go by bus.)</span>
    </div>
    <div class="depth-row">
      <span class="dr-tag">USE 6 — TENSE LIVES AT THE END</span>
      <span class="dr-jp">きのう うちに かえっ<b>て</b>、しゅくだいを し<b>て</b>、ねました。  (all PAST)</span>
      <span class="dr-en">Yesterday I returned home, did homework, and slept. (Only the final ねました is past — but the whole chain is in the past.)</span>
    </div>

    <div class="depth-trap">
      ⚠️ <b>5 mistakes that lose easy points:</b><br>
      1. <span lang="ja">いきます → いいて ❌</span> · <span lang="ja">いって ✅</span><br>
      2. <span lang="ja">かえります</span> looks like a る-verb but is う-verb → <span lang="ja">かえって</span>, not <span lang="ja">かえて</span>.<br>
      3. Forgetting that <b>only the FINAL verb</b> shows tense — never put ました on the middle one.<br>
      4. <span lang="ja">ぎ → いで</span> (voiced) — don't write <span lang="ja">およいて</span> for "swim".<br>
      5. <span lang="ja">のみます → のみて ❌</span> · <span lang="ja">のんで ✅</span> (み・び・に → んで).
    </div>
  </div>
</div>
`;

// ────────────────────────────────────────────────────────────────────────────
// CARD 3 — Ch6: Describing 2+ things WITH the て-form
// ────────────────────────────────────────────────────────────────────────────
const CH6_MULTI_CARD = `
<!-- DEPTH CARD: Ch6 multi-thing with te-form ${MARKER} -->
<div class="depth-card" data-depth="${MARKER}">
  <div class="depth-header">第六章 — DESCRIBING TWO OR MORE THINGS WITH て-FORM</div>
  <div class="depth-body">

    <p style="margin:0 0 12px 0;">In Ch6 the て-form is your tool for stitching multiple things together — actions, adjectives, even noun statements. Here is the cheat sheet for every "two or more things" situation.</p>

    <div class="depth-step">
      <b class="step-label">2 ACTIONS in one sentence</b>
      <div class="dr-jp">ろくじに おき<b>て</b>、あさごはんを たべました。</div>
      <div class="dr-en">I got up at 6 and ate breakfast.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">3 ACTIONS in one sentence</b>
      <div class="dr-jp">うちに かえっ<b>て</b>、しゅくだいを し<b>て</b>、ねました。</div>
      <div class="dr-en">I went home, did homework, and went to bed.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">5 ACTIONS — full day</b>
      <div class="dr-jp">しちじに おき<b>て</b>、あさごはんを たべ<b>て</b>、だいがくに いっ<b>て</b>、じゅぎょうを う け<b>て</b>、ろくじに うちに かえりました。</div>
      <div class="dr-en">I got up at 7, ate breakfast, went to the university, took classes, and returned home at 6.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">2 い-ADJECTIVES on the same noun (い → くて)</b>
      <div class="dr-jp">この へやは ひろく<b>て</b>、あかるいです。</div>
      <div class="dr-en">This room is spacious and bright.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">3 い-ADJECTIVES chained</b>
      <div class="dr-jp">あたらしい カフェは ひろく<b>て</b>、あかるく<b>て</b>、しずかです。</div>
      <div class="dr-en">The new cafe is spacious, bright, and quiet.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">な-ADJECTIVE + い-ADJECTIVE chain (な → で · い → くて)</b>
      <div class="dr-jp">この としょかんは しずか<b>で</b>、ひろく<b>て</b>、きれいです。</div>
      <div class="dr-en">This library is quiet, spacious, and clean.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">NOUN STATEMENT chain (noun + で)</b>
      <div class="dr-jp">リーさんは ちゅうごくじん<b>で</b>、じょうとうだいがくの さんねんせいです。</div>
      <div class="dr-en">Lee-san is Chinese and a junior at Joto University.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">MIX — noun + adj + verb in one sentence</b>
      <div class="dr-jp">リーさんは げんき<b>で</b>、まいにち としょかんで にほんごを べんきょうし<b>て</b>、よる ともだちと あいます。</div>
      <div class="dr-en">Lee-san is energetic, studies Japanese at the library every day, and meets friends in the evening.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">REASON + RESULT (て as "because")</b>
      <div class="dr-jp">しゅくだいが たくさん あっ<b>て</b>、しゅうまつは いそがしかったです。</div>
      <div class="dr-en">There was a lot of homework, so the weekend was busy.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">CONTRAST with が — chain + but</b>
      <div class="dr-jp">あさごはんを たべ<b>て</b>、コーヒーを のみました<b>が</b>、ぜんぜん おいしくなかったです。</div>
      <div class="dr-en">I ate breakfast and drank coffee, but it wasn't tasty at all.</div>
    </div>
    <div class="depth-step">
      <b class="step-label">DESCRIBING TWO PEOPLE in one sentence</b>
      <div class="dr-jp">リーさんは ちゅうごくじん<b>で</b>、ブラウンさんは アメリカじんです。</div>
      <div class="dr-en">Lee-san is Chinese, and Brown-san is American.</div>
    </div>

    <div class="depth-row">
      <span class="dr-tag">MEGA COMBO — every て-form move at once</span>
      <span class="dr-jp">きょうの あさは しちじに おき<b>て</b>、あたらしい カフェに いっ<b>て</b>、おいしい コーヒーを のみました。その カフェは ひろく<b>て</b>、しずか<b>で</b>、ともだちも きれいな がくせい<b>で</b>、とても たのしかったです。</span>
      <span class="dr-en">This morning I got up at 7, went to a new cafe, and drank delicious coffee. The cafe was spacious and quiet, my friend was a clean-cut student, and it was very fun.</span>
    </div>

    <div class="depth-trap">
      ⚠️ <b>Don't mix up the connectors:</b><br>
      • <b>VERB chain</b> → use <b>verb-て</b> (たべ<b>て</b>、いきます)<br>
      • <b>い-adj chain</b> → drop い → add <b>くて</b> (ひろ<b>くて</b>、あかるい)<br>
      • <b>な-adj or NOUN chain</b> → add <b>で</b> (しずか<b>で</b>、きれい / がくせい<b>で</b>、げんき)<br>
      • Tense stays at the END of the chain — never in the middle.
    </div>
  </div>
</div>
`;

// ────────────────────────────────────────────────────────────────────────────
// INSERTION
// ────────────────────────────────────────────────────────────────────────────

function insertAfter(html, anchorHeader, newCardHtml, label) {
  if (html.includes(`data-depth="${MARKER}"`) && newCardHtml.split('data-depth')[1] && html.includes(newCardHtml.split('<div class="depth-header">')[1].split('</div>')[0])) {
    console.log(`  ⊘ ${label} — already inserted`);
    return html;
  }
  // Find the card-header text
  const idx = html.indexOf(`>${anchorHeader}<`);
  if (idx === -1) {
    console.warn(`  ✗ ${label} — anchor "${anchorHeader}" not found`);
    return html;
  }
  // Find the closing </div> that ends THIS card. The card pattern is
  // <div class="card" ...> ... </div> (single </div> at depth 0).
  // We need to find the matching </div> using depth counting starting from
  // the <div class="card"> opener that contains this header.
  const cardOpenerRe = /<div class="card"[^>]*>/g;
  // Find the LAST card opener before idx
  let lastOpen = -1;
  let m;
  while ((m = cardOpenerRe.exec(html)) !== null) {
    if (m.index < idx) lastOpen = m.index + m[0].length;
    else break;
  }
  if (lastOpen === -1) {
    console.warn(`  ✗ ${label} — no card opener before header`);
    return html;
  }
  // Walk forward from lastOpen counting depth
  const openPat = /<div\b[^>]*>/g;
  const closePat = /<\/div>/g;
  let i = lastOpen;
  let depth = 1;
  let cardEnd = -1;
  while (depth > 0) {
    openPat.lastIndex = i;
    closePat.lastIndex = i;
    const o = openPat.exec(html);
    const c = closePat.exec(html);
    if (!c) break;
    if (o && o.index < c.index) { depth++; i = o.index + o[0].length; }
    else { depth--; i = c.index + c[0].length; if (depth === 0) cardEnd = i; }
  }
  if (cardEnd === -1) {
    console.warn(`  ✗ ${label} — could not find card end`);
    return html;
  }
  // Idempotency check: see if the new card's header is already in the file
  const newHeaderMatch = newCardHtml.match(/<div class="depth-header">([^<]+)<\/div>/);
  if (newHeaderMatch && html.includes(newHeaderMatch[0])) {
    console.log(`  ⊘ ${label} — already inserted`);
    return html;
  }
  console.log(`  ✓ ${label} — inserted after "${anchorHeader.slice(0, 35)}..."`);
  return html.slice(0, cardEnd) + '\n' + newCardHtml + html.slice(cardEnd);
}

// Insert in REVERSE order of position so earlier insertions don't shift later anchors.
// Anchors:
//   Ch5 multi → after "は vs が & DOUBLE PARTICLES" (last card in Ch5 panel)
//   Ch6 te-form dumbed → after "て-FORM CONJUGATION & USAGE"
//   Ch6 multi → after "INVITATIONS (ませんか)" (last card in Ch6 panel)

// Process from BOTTOM to TOP of file: Ch6 multi (latest) → Ch6 te → Ch5 multi
html = insertAfter(html, 'INVITATIONS (ませんか)', CH6_MULTI_CARD, 'Ch6 multi-thing card');
html = insertAfter(html, 'て-FORM CONJUGATION &amp; USAGE', CH6_TE_CARD, 'Ch6 て-form dumbed card');
html = insertAfter(html, 'は vs が &amp; DOUBLE PARTICLES', CH5_MULTI_CARD, 'Ch5 multi-thing card');

fs.writeFileSync(FILE, html);
console.log(`\n✓ Wrote ${FILE}`);
console.log(`  Size: ${before} → ${html.length} bytes (${html.length - before > 0 ? '+' : ''}${html.length - before})`);
