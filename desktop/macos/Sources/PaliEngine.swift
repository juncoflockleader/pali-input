// PaliEngine.swift — Swift port of pali.js (the web transliteration engine).
//
// Faithful 1:1 port of the tokenizer, smart-nasal/final-niggahīta correction,
// and the five script renderers. Kept dependency-free so it can be compiled
// both into the input method bundle and into a standalone test binary.
//
// Verified against the JS engine's expected outputs by PaliEngineTest.swift.

import Foundation

enum TokType { case vowel, consonant, niggahita, other }

struct Tok {
    var type: TokType
    var iast: String
    var upper: Bool
}

enum PaliScript: String, CaseIterable {
    case roman, devanagari, sinhala, thai, myanmar
}

struct AbugidaTable {
    let cons: [String: String]
    let vowelIndep: [String: String]
    let vowelSign: [String: String]
    let leadingVowels: [String: String]?   // Thai only
    let stacker: String
    let killer: String
    let anusvara: String
    var kinzi: Set<String> = []            // Myanmar: ṅ → kinzi when non-final cluster member
}

enum PaliEngine {

    // MARK: Tokenizer table — [input, canonical IAST, type]. Longest first.
    private static let rawTokens: [(String, String, TokType)] = [
        ("aa", "ā", .vowel), ("ii", "ī", .vowel), ("uu", "ū", .vowel),
        ("a", "a", .vowel), ("i", "i", .vowel), ("u", "u", .vowel), ("e", "e", .vowel), ("o", "o", .vowel),
        ("ā", "ā", .vowel), ("ī", "ī", .vowel), ("ū", "ū", .vowel),

        (".m", "ṃ", .niggahita), ("ṃ", "ṃ", .niggahita), ("ṁ", "ṃ", .niggahita),

        ("\"n", "ṅ", .consonant), (";n", "ṅ", .consonant), ("ṅ", "ṅ", .consonant),
        ("~n", "ñ", .consonant), ("ñ", "ñ", .consonant),

        (".th", "ṭh", .consonant), (".t", "ṭ", .consonant),
        (".dh", "ḍh", .consonant), (".d", "ḍ", .consonant),
        (".n", "ṇ", .consonant), (".l", "ḷ", .consonant),
        ("ṭh", "ṭh", .consonant), ("ṭ", "ṭ", .consonant),
        ("ḍh", "ḍh", .consonant), ("ḍ", "ḍ", .consonant),
        ("ṇ", "ṇ", .consonant), ("ḷ", "ḷ", .consonant),

        ("kh", "kh", .consonant), ("gh", "gh", .consonant),
        ("ch", "ch", .consonant), ("jh", "jh", .consonant),
        ("th", "th", .consonant), ("dh", "dh", .consonant),
        ("ph", "ph", .consonant), ("bh", "bh", .consonant),

        ("k", "k", .consonant), ("g", "g", .consonant), ("c", "c", .consonant), ("j", "j", .consonant),
        ("t", "t", .consonant), ("d", "d", .consonant), ("p", "p", .consonant), ("b", "b", .consonant),
        ("n", "n", .consonant), ("m", "m", .consonant),
        ("y", "y", .consonant), ("r", "r", .consonant), ("l", "l", .consonant),
        ("v", "v", .consonant), ("w", "v", .consonant), ("s", "s", .consonant), ("h", "h", .consonant),
    ]

    // Precomputed: token input as a lowercase Character array, longest first.
    private static let tokens: [(input: [Character], iast: String, type: TokType)] = {
        rawTokens
            .map { (Array($0.0.lowercased()), $0.1, $0.2) }
            .sorted { $0.0.count > $1.0.count }
    }()

    private static let nasalBefore: [String: String] = [
        "k": "ṅ", "kh": "ṅ", "g": "ṅ", "gh": "ṅ",
        "c": "ñ", "ch": "ñ", "j": "ñ", "jh": "ñ",
        "ṭ": "ṇ", "ṭh": "ṇ", "ḍ": "ṇ", "ḍh": "ṇ",
        "p": "m", "ph": "m", "b": "m", "bh": "m",
    ]

    // MARK: Tokenize
    static func tokenize(_ text: String, smartNasal: Bool = true) -> [Tok] {
        let chars = Array(text)
        let lower = Array(text.lowercased())
        let n = chars.count
        var toks: [Tok] = []
        var i = 0

        outer: while i < n {
            for (input, iast, type) in tokens where i + input.count <= n {
                var match = true
                for k in 0..<input.count where lower[i + k] != input[k] {
                    match = false
                    break
                }
                if match {
                    let first = String(chars[i])
                    toks.append(Tok(type: type, iast: iast, upper: first != first.lowercased()))
                    i += input.count
                    continue outer
                }
            }
            toks.append(Tok(type: .other, iast: String(chars[i]), upper: false))
            i += 1
        }

        if smartNasal {
            applyNasalAssimilation(&toks)
            applyFinalNiggahita(&toks)
        }
        return toks
    }

    private static func applyNasalAssimilation(_ toks: inout [Tok]) {
        guard toks.count > 1 else { return }
        for k in 0..<(toks.count - 1) where toks[k].type == .consonant && toks[k].iast == "n" {
            let next = toks[k + 1]
            if next.type == .consonant, let repl = nasalBefore[next.iast] {
                toks[k].iast = repl
            }
        }
    }

    private static func applyFinalNiggahita(_ toks: inout [Tok]) {
        for k in 0..<toks.count where toks[k].type == .consonant && toks[k].iast == "m" {
            let isFinal = (k + 1 >= toks.count) || toks[k + 1].type == .other
            if isFinal {
                toks[k].type = .niggahita
                toks[k].iast = "ṃ"
            }
        }
    }

    // MARK: Renderers
    private static func renderRoman(_ toks: [Tok]) -> String {
        var out = ""
        for t in toks {
            if t.upper, let f = t.iast.first {
                out += f.uppercased() + t.iast.dropFirst()
            } else {
                out += t.iast
            }
        }
        return out
    }

    private static func renderAbugida(_ toks: [Tok], _ m: AbugidaTable) -> String {
        var out = ""
        var run: [String] = []

        func flushWithVowel(_ vowel: String) {
            var s = ""
            if run.count > 1 {
                for k in 0..<(run.count - 1) {
                    let c = run[k]
                    // Myanmar kinzi: ṅ as a non-final cluster member = nga + asat + virama
                    s += m.kinzi.contains(c) ? (m.cons[c] ?? "") + m.killer + m.stacker : (m.cons[c] ?? "") + m.stacker
                }
            }
            let last = run[run.count - 1]
            if let lv = m.leadingVowels?[vowel] {
                s += lv + (m.cons[last] ?? "")
            } else {
                s += (m.cons[last] ?? "") + (m.vowelSign[vowel] ?? "")
            }
            out += s
            run = []
        }
        func flushDead() {
            for c in run { out += (m.cons[c] ?? "") + m.killer }
            run = []
        }

        for t in toks {
            switch t.type {
            case .consonant:
                run.append(t.iast)
            case .vowel:
                if !run.isEmpty { flushWithVowel(t.iast) } else { out += m.vowelIndep[t.iast] ?? t.iast }
            case .niggahita:
                if !run.isEmpty { flushDead() }
                out += m.anusvara
            case .other:
                if !run.isEmpty { flushDead() }
                out += t.iast
            }
        }
        if !run.isEmpty { flushDead() }
        return out
    }

    // MARK: Public API
    static func transliterate(_ text: String, script: PaliScript, smartNasal: Bool = true) -> String {
        let toks = tokenize(text, smartNasal: smartNasal)
        switch script {
        case .roman:      return renderRoman(toks)
        case .devanagari: return renderAbugida(toks, devanagari)
        case .sinhala:    return renderAbugida(toks, sinhala)
        case .thai:       return renderAbugida(toks, thai)
        case .myanmar:    return renderAbugida(toks, myanmar)
        }
    }

    // MARK: Script tables
    private static let devanagari = AbugidaTable(
        cons: [
            "k": "क", "kh": "ख", "g": "ग", "gh": "घ", "ṅ": "ङ",
            "c": "च", "ch": "छ", "j": "ज", "jh": "झ", "ñ": "ञ",
            "ṭ": "ट", "ṭh": "ठ", "ḍ": "ड", "ḍh": "ढ", "ṇ": "ण",
            "t": "त", "th": "थ", "d": "द", "dh": "ध", "n": "न",
            "p": "प", "ph": "फ", "b": "ब", "bh": "भ", "m": "म",
            "y": "य", "r": "र", "l": "ल", "ḷ": "ळ", "v": "व", "s": "स", "h": "ह",
        ],
        vowelIndep: ["a": "अ", "ā": "आ", "i": "इ", "ī": "ई", "u": "उ", "ū": "ऊ", "e": "ए", "o": "ओ"],
        vowelSign: ["a": "", "ā": "ा", "i": "ि", "ī": "ी", "u": "ु", "ū": "ू", "e": "े", "o": "ो"],
        leadingVowels: nil, stacker: "्", killer: "्", anusvara: "ं")

    private static let sinhala = AbugidaTable(
        cons: [
            "k": "ක", "kh": "ඛ", "g": "ග", "gh": "ඝ", "ṅ": "ඞ",
            "c": "ච", "ch": "ඡ", "j": "ජ", "jh": "ඣ", "ñ": "ඤ",
            "ṭ": "ට", "ṭh": "ඨ", "ḍ": "ඩ", "ḍh": "ඪ", "ṇ": "ණ",
            "t": "ත", "th": "ථ", "d": "ද", "dh": "ධ", "n": "න",
            "p": "ප", "ph": "ඵ", "b": "බ", "bh": "භ", "m": "ම",
            "y": "ය", "r": "ර", "l": "ල", "ḷ": "ළ", "v": "ව", "s": "ස", "h": "හ",
        ],
        vowelIndep: ["a": "අ", "ā": "ආ", "i": "ඉ", "ī": "ඊ", "u": "උ", "ū": "ඌ", "e": "එ", "o": "ඔ"],
        vowelSign: ["a": "", "ā": "ා", "i": "ි", "ī": "ී", "u": "ු", "ū": "ූ", "e": "ෙ", "o": "ො"],
        leadingVowels: nil, stacker: "්", killer: "්", anusvara: "ං")

    private static let thai = AbugidaTable(
        cons: [
            "k": "ก", "kh": "ข", "g": "ค", "gh": "ฆ", "ṅ": "ง",
            "c": "จ", "ch": "ฉ", "j": "ช", "jh": "ฌ", "ñ": "ญ",
            "ṭ": "ฏ", "ṭh": "ฐ", "ḍ": "ฑ", "ḍh": "ฒ", "ṇ": "ณ",
            "t": "ต", "th": "ถ", "d": "ท", "dh": "ธ", "n": "น",
            "p": "ป", "ph": "ผ", "b": "พ", "bh": "ภ", "m": "ม",
            "y": "ย", "r": "ร", "l": "ล", "ḷ": "ฬ", "v": "ว", "s": "ส", "h": "ห",
        ],
        vowelIndep: ["a": "อ", "ā": "อา", "i": "อิ", "ī": "อี", "u": "อุ", "ū": "อู", "e": "เอ", "o": "โอ"],
        vowelSign: ["a": "", "ā": "า", "i": "ิ", "ī": "ี", "u": "ุ", "ū": "ู", "e": "", "o": ""],
        leadingVowels: ["e": "เ", "o": "โ"], stacker: "ฺ", killer: "ฺ", anusvara: "ํ")

    private static let myanmar = AbugidaTable(
        cons: [
            "k": "က", "kh": "ခ", "g": "ဂ", "gh": "ဃ", "ṅ": "င",
            "c": "စ", "ch": "ဆ", "j": "ဇ", "jh": "ဈ", "ñ": "ဉ",
            "ṭ": "ဋ", "ṭh": "ဌ", "ḍ": "ဍ", "ḍh": "ဎ", "ṇ": "ဏ",
            "t": "တ", "th": "ထ", "d": "ဒ", "dh": "ဓ", "n": "န",
            "p": "ပ", "ph": "ဖ", "b": "ဗ", "bh": "ဘ", "m": "မ",
            "y": "ယ", "r": "ရ", "l": "လ", "ḷ": "ဠ", "v": "ဝ", "s": "သ", "h": "ဟ",
        ],
        vowelIndep: ["a": "အ", "ā": "အာ", "i": "ဣ", "ī": "ဤ", "u": "ဥ", "ū": "ဦ", "e": "ဧ", "o": "ဩ"],
        vowelSign: ["a": "", "ā": "ာ", "i": "ိ", "ī": "ီ", "u": "ု", "ū": "ူ", "e": "ေ", "o": "ော"],
        leadingVowels: nil, stacker: "္", killer: "်", anusvara: "ံ", kinzi: ["ṅ"])
}
