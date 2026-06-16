// glossary.js — a curated Pali → English / 中文 glossary.
//
// Keys are normalized IAST (lowercase, diacritics kept). Values: { en, zh }.
// Covers core doctrinal terms, common chant vocabulary, and frequent function
// words. Not a full dictionary — a teaching aid for the most common words.
//
// Exposes window.PaliGlossary = { GLOSSARY, PHRASES, lookup, lookupPhrase }.

(function (global) {
  'use strict';

  const GLOSSARY = {
    // --- The Three Jewels & refuge ---
    buddha: { en: 'awakened one; the Buddha', zh: '佛；觉者' },
    buddho: { en: 'the Awakened One', zh: '佛；觉者' },
    dhamma: { en: 'the teaching; truth; phenomenon; nature', zh: '法；佛法；现象' },
    saṅgha: { en: 'community of monks; the Sangha', zh: '僧；僧团' },
    saraṇa: { en: 'refuge; shelter', zh: '皈依；庇护处' },
    ratana: { en: 'jewel; treasure', zh: '宝；珍宝' },
    tiratana: { en: 'the Triple Gem', zh: '三宝' },

    // --- Core doctrine: four noble truths & three marks ---
    dukkha: { en: 'suffering; unsatisfactoriness', zh: '苦' },
    dukkhā: { en: 'suffering (pl./fem.)', zh: '苦（复数）' },
    samudaya: { en: 'arising; origin', zh: '集；生起' },
    nirodha: { en: 'cessation; ending', zh: '灭' },
    magga: { en: 'path; way', zh: '道' },
    sacca: { en: 'truth', zh: '谛；真理' },
    ariyasacca: { en: 'noble truth', zh: '圣谛' },
    anicca: { en: 'impermanent; impermanence', zh: '无常' },
    aniccā: { en: 'impermanent (pl.)', zh: '无常（诸…）' },
    anattā: { en: 'non-self; not-self', zh: '无我' },
    attā: { en: 'self', zh: '我；自我' },
    sukha: { en: 'happiness; ease; pleasant', zh: '乐；安乐' },
    sukhī: { en: 'happy; at ease', zh: '安乐的；快乐的' },

    // --- Liberation ---
    nibbāna: { en: 'nibbāna; liberation; the extinguishing of greed, hatred, delusion', zh: '涅槃；寂灭' },
    vimutti: { en: 'liberation; release', zh: '解脱' },
    vimokkha: { en: 'deliverance; release', zh: '解脱' },
    santi: { en: 'peace; stillness', zh: '寂静；安宁' },
    bodhi: { en: 'awakening; enlightenment', zh: '菩提；觉悟' },
    sambodhi: { en: 'full awakening', zh: '正觉' },

    // --- Kamma & rebirth ---
    kamma: { en: 'action; deed; kamma', zh: '业；行为' },
    saṃsāra: { en: 'the round of rebirth', zh: '轮回' },
    bhava: { en: 'becoming; existence', zh: '有；存在' },
    jāti: { en: 'birth', zh: '生' },
    jarā: { en: 'old age', zh: '老' },
    maraṇa: { en: 'death', zh: '死' },
    paṭiccasamuppāda: { en: 'dependent origination', zh: '缘起' },
    hetu: { en: 'cause', zh: '因' },
    paccaya: { en: 'condition; requisite', zh: '缘；条件' },
    phala: { en: 'fruit; result', zh: '果；果报' },
    gati: { en: 'destination; course of rebirth', zh: '趣；去处' },

    // --- The five aggregates & mind ---
    khandha: { en: 'aggregate; heap', zh: '蕴' },
    rūpa: { en: 'form; matter; body', zh: '色；形' },
    vedanā: { en: 'feeling; sensation', zh: '受' },
    saññā: { en: 'perception', zh: '想' },
    saṅkhāra: { en: 'formation; volitional activity; conditioned thing', zh: '行；造作' },
    saṅkhārā: { en: 'formations (pl.)', zh: '诸行' },
    viññāṇa: { en: 'consciousness', zh: '识' },
    nāma: { en: 'name; mind (mental)', zh: '名' },
    citta: { en: 'mind; heart', zh: '心' },
    mano: { en: 'mind; mentality', zh: '意' },
    kāya: { en: 'body', zh: '身' },
    vācā: { en: 'speech', zh: '语；言语' },
    āyatana: { en: 'sense base; sphere', zh: '处' },
    indriya: { en: 'faculty', zh: '根' },

    // --- Defilements ---
    lobha: { en: 'greed', zh: '贪' },
    rāga: { en: 'lust; passion', zh: '贪欲；染著' },
    dosa: { en: 'hatred; aversion', zh: '瞋' },
    moha: { en: 'delusion', zh: '痴' },
    taṇhā: { en: 'craving; thirst', zh: '渴爱；贪爱' },
    avijjā: { en: 'ignorance', zh: '无明' },
    vijjā: { en: 'true knowledge', zh: '明；智明' },
    upādāna: { en: 'clinging; grasping', zh: '取；执取' },
    diṭṭhi: { en: 'view (often: wrong view)', zh: '见；见解' },
    nīvaraṇa: { en: 'hindrance', zh: '盖；障碍' },
    saṃyojana: { en: 'fetter', zh: '结；系缚' },
    āsava: { en: 'taint; mental effluent', zh: '漏；烦恼' },
    kilesa: { en: 'defilement', zh: '烦恼；染污' },
    pāpa: { en: 'evil; demerit', zh: '恶；罪' },
    akusala: { en: 'unwholesome', zh: '不善' },

    // --- The path & cultivation ---
    sīla: { en: 'virtue; moral conduct; precept', zh: '戒；持戒' },
    samādhi: { en: 'concentration; meditative stillness', zh: '定；三摩地' },
    paññā: { en: 'wisdom; discernment', zh: '慧；智慧' },
    ñāṇa: { en: 'knowledge', zh: '智' },
    sati: { en: 'mindfulness', zh: '念；正念' },
    sampajañña: { en: 'clear comprehension', zh: '正知' },
    viriya: { en: 'energy; effort', zh: '精进' },
    saddhā: { en: 'faith; confidence', zh: '信' },
    chanda: { en: 'desire; intention (to act)', zh: '欲（意欲）' },
    bhāvanā: { en: 'cultivation; meditation; development', zh: '修习；禅修' },
    jhāna: { en: 'meditative absorption', zh: '禅那；禅定' },
    samatha: { en: 'tranquility; calm', zh: '奢摩他；止' },
    vipassanā: { en: 'insight', zh: '毗婆舍那；内观' },
    satipaṭṭhāna: { en: 'foundation of mindfulness', zh: '念处' },
    bojjhaṅga: { en: 'factor of awakening', zh: '觉支' },
    bala: { en: 'power; strength', zh: '力' },
    ānāpānasati: { en: 'mindfulness of breathing', zh: '安那般那念；出入息念' },
    anussati: { en: 'recollection', zh: '随念' },
    asubha: { en: 'unattractiveness; foulness', zh: '不净' },
    khanti: { en: 'patience; forbearance', zh: '忍辱；堪忍' },
    kusala: { en: 'wholesome; skillful', zh: '善；善巧' },
    puñña: { en: 'merit', zh: '福；功德' },
    dāna: { en: 'giving; generosity', zh: '布施；施' },
    cāga: { en: 'generosity; relinquishment', zh: '施舍；舍离' },

    // --- The sublime abidings ---
    mettā: { en: 'loving-kindness', zh: '慈；慈爱' },
    karuṇā: { en: 'compassion', zh: '悲；悲悯' },
    muditā: { en: 'sympathetic joy', zh: '喜；随喜' },
    upekkhā: { en: 'equanimity', zh: '舍；平等心' },
    brahmavihāra: { en: 'sublime abiding; divine abode', zh: '梵住；四无量心' },
    vihāra: { en: 'dwelling; abiding; monastery', zh: '住；精舍' },

    // --- Persons & epithets ---
    arahant: { en: 'arahant; worthy one (fully liberated)', zh: '阿罗汉；应供' },
    arahā: { en: 'the worthy one; arahant', zh: '阿罗汉；应供' },
    arahato: { en: 'of the Worthy One (gen./dat.)', zh: '应供者的' },
    bhagavā: { en: 'the Blessed One; the Fortunate One', zh: '世尊；薄伽梵' },
    bhagavato: { en: 'of the Blessed One (gen./dat.)', zh: '世尊的' },
    tathāgata: { en: 'the Tathāgata; the Thus-gone (epithet of a Buddha)', zh: '如来' },
    sammāsambuddha: { en: 'the fully self-awakened one', zh: '正等正觉者' },
    bhikkhu: { en: 'monk; mendicant', zh: '比丘' },
    bhikkhunī: { en: 'nun', zh: '比丘尼' },
    sāvaka: { en: 'disciple; hearer', zh: '声闻；弟子' },
    upāsaka: { en: 'lay male follower', zh: '优婆塞；男居士' },
    upāsikā: { en: 'lay female follower', zh: '优婆夷；女居士' },
    ācariya: { en: 'teacher', zh: '阿阇黎；师' },
    bodhisatta: { en: 'bodhisatta; Buddha-to-be', zh: '菩萨' },
    puggala: { en: 'person; individual', zh: '补特伽罗；人' },
    sotāpanna: { en: 'stream-enterer', zh: '须陀洹；入流' },
    sakadāgāmī: { en: 'once-returner', zh: '斯陀含；一来' },
    anāgāmī: { en: 'non-returner', zh: '阿那含；不还' },

    // --- Canon ---
    sutta: { en: 'discourse; thread', zh: '经' },
    vinaya: { en: 'monastic discipline', zh: '律' },
    abhidhamma: { en: 'higher doctrine; analysis', zh: '阿毗达摩；论' },
    tipiṭaka: { en: 'the three baskets (Pali canon)', zh: '三藏' },
    gāthā: { en: 'verse; stanza', zh: '偈；偈颂' },
    pāramī: { en: 'perfection', zh: '波罗蜜；圆满' },

    // --- Realms & beings ---
    loka: { en: 'world', zh: '世间；世界' },
    deva: { en: 'deity; deva; god', zh: '天；天神' },
    brahmā: { en: 'Brahmā (a high deity)', zh: '梵天' },
    manussa: { en: 'human being', zh: '人；人类' },
    satta: { en: 'being; sentient being (also: seven)', zh: '有情；众生（亦：七）' },
    sattā: { en: 'beings (pl.)', zh: '众生' },
    yakkha: { en: 'yakkha; spirit', zh: '夜叉' },
    peta: { en: 'hungry ghost; departed spirit', zh: '饿鬼；亡者' },
    tiracchāna: { en: 'animal', zh: '畜生；旁生' },
    niraya: { en: 'hell', zh: '地狱' },
    sagga: { en: 'heaven; happy destination', zh: '天界；善趣' },

    // --- Common words & function words ---
    namo: { en: 'homage; honor (to)', zh: '礼敬；皈命' },
    tassa: { en: 'to/of him; his (gen./dat. of "that")', zh: '彼的；那位的' },
    sabba: { en: 'all; every', zh: '一切；全部' },
    sabbe: { en: 'all (nom. pl.)', zh: '一切；所有' },
    vata: { en: 'indeed; truly; alas', zh: '实在；唉（感叹）' },
    sammā: { en: 'rightly; perfectly; complete', zh: '正；正确地' },
    micchā: { en: 'wrongly; false', zh: '邪；错误地' },
    sādhu: { en: 'good!; well done; it is good', zh: '善哉；好' },
    maṅgala: { en: 'blessing; auspicious; good fortune', zh: '吉祥；福祉' },
    sotthi: { en: 'well-being; safety', zh: '平安；吉祥' },
    jaya: { en: 'victory', zh: '胜利' },
    pi: { en: 'also; too; even', zh: '也；亦' },
    ca: { en: 'and', zh: '和；及' },
    vā: { en: 'or', zh: '或' },
    na: { en: 'not', zh: '不；非' },
    hi: { en: 'indeed; for', zh: '确实；因为' },
    eva: { en: 'just; only; indeed', zh: '正是；仅；即' },
    evaṃ: { en: 'thus; in this way', zh: '如是；这样' },
    iti: { en: 'thus; "…" (end-quote marker)', zh: '如是；引文结束' },
    yathā: { en: 'as; just as', zh: '如同；犹如' },
    tathā: { en: 'so; thus; likewise', zh: '如是；那样' },
    pana: { en: 'but; moreover; now', zh: '然而；又' },
    sace: { en: 'if', zh: '若；如果' },
    atthi: { en: 'there is; exists', zh: '有；存在' },
    natthi: { en: 'there is not', zh: '无；不存在' },
    ahaṃ: { en: 'I', zh: '我' },
    tvaṃ: { en: 'you', zh: '你' },
    mayaṃ: { en: 'we', zh: '我们' },
    so: { en: 'he; that one', zh: '他；那' },
    idaṃ: { en: 'this', zh: '此；这个' },
    etaṃ: { en: 'this; that', zh: '此；那' },
    dutiyampi: { en: 'for a second time', zh: '第二次' },
    tatiyampi: { en: 'for a third time', zh: '第三次' },

    // --- Verbs (common chant forms) ---
    gacchāmi: { en: 'I go', zh: '我前往；我去' },
    gacchati: { en: '(he/she) goes', zh: '去；走' },
    hontu: { en: 'may they be (3rd pl. imperative)', zh: '愿……成为' },
    hoti: { en: 'is; becomes', zh: '是；成为' },
    hotu: { en: 'may it be (3rd sg. imperative)', zh: '愿其如是' },
  };

  // Whole-phrase translations for well-known chants (normalized lowercase IAST).
  const PHRASES = {
    'buddhaṃ saraṇaṃ gacchāmi': { en: 'I go to the Buddha for refuge.', zh: '我皈依佛。' },
    'dhammaṃ saraṇaṃ gacchāmi': { en: 'I go to the Dhamma for refuge.', zh: '我皈依法。' },
    'saṅghaṃ saraṇaṃ gacchāmi': { en: 'I go to the Sangha for refuge.', zh: '我皈依僧。' },
    'namo tassa bhagavato arahato sammāsambuddhassa': {
      en: 'Homage to the Blessed One, the Worthy One, the Fully Self-Awakened One.',
      zh: '礼敬世尊、阿罗汉、正等正觉者。',
    },
    'sabbe sattā sukhī hontu': { en: 'May all beings be happy.', zh: '愿一切众生快乐。' },
    'aniccā vata saṅkhārā': { en: 'Impermanent, alas, are all formations.', zh: '诸行无常啊！' },
    'sabbe saṅkhārā aniccā': { en: 'All formations are impermanent.', zh: '一切诸行无常。' },
    'sabbe saṅkhārā dukkhā': { en: 'All formations are suffering.', zh: '一切诸行皆苦。' },
    'sabbe dhammā anattā': { en: 'All things are non-self.', zh: '一切诸法无我。' },
  };

  /**
   * Look up a single word by its normalized IAST form.
   * Falls back to stripping a trailing niggahīta/-m (a very common accusative
   * / niggahīta ending) so e.g. "buddhaṃ" resolves to "buddha".
   * @returns {{en:string, zh:string, key:string, stem?:boolean}|null}
   */
  function lookup(iastWord) {
    const k = iastWord.toLowerCase();
    if (GLOSSARY[k]) return { key: k, ...GLOSSARY[k] };
    if (/[ṃm]$/.test(k)) {
      const k2 = k.slice(0, -1);
      if (GLOSSARY[k2]) return { key: k2, stem: true, ...GLOSSARY[k2] };
    }
    return null;
  }

  /** Look up a whole phrase (already normalized: lowercase, single spaces). */
  function lookupPhrase(normalized) {
    return PHRASES[normalized] || null;
  }

  global.PaliGlossary = { GLOSSARY, PHRASES, lookup, lookupPhrase };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.PaliGlossary;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
