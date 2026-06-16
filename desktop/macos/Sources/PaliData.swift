// PaliData.swift — loads pali-data.json (glossary + roots/affixes exported from
// the web app) and ports the glossary lookup + morphological splitter
// (mirrors glossary.js + predict.js). Used by the IME's info panel to show
// meanings and prefix+root+ending analysis as you type.

import Foundation

struct Gloss: Codable { let en: String; let zh: String }
struct Root: Codable { let root: String; let forms: [String]; let en: String; let zh: String }
struct Affix: Codable { let form: String; let en: String; let zh: String }
struct Ending: Codable { let end: String; let kind: String; let en: String; let zh: String }

private struct Bundled: Codable {
    let glossary: [String: Gloss]
    let phrases: [String: Gloss]
    let roots: [Root]
    let upasagga: [Affix]
    let endings: [Ending]
    let prefixExtra: [Affix]
}

// Lookup / analysis results
struct GlossResult { let en: String; let zh: String; let key: String; let stem: Bool }
struct Completion { let w: String; let en: String }
struct StemMatch { let kind: String; let label: String; let en: String; let zh: String } // kind: root/word/raw
struct PrefixHit { let form: String; let en: String; let zh: String }
struct EndingHit { let end: String; let en: String; let zh: String }
struct Analysis {
    let prefixes: [PrefixHit]
    let stem: StemMatch
    let ending: EndingHit?
    let full: Bool
    let recognized: Int
    var morphemes: Int { prefixes.count + (ending == nil ? 0 : 1) }
}

final class PaliData {
    static let shared: PaliData? = {
        guard let url = Bundle.main.url(forResource: "pali-data", withExtension: "json") else { return nil }
        let dpdURL = Bundle.main.url(forResource: "dpd-dict", withExtension: "json")
        let freqURL = Bundle.main.url(forResource: "freq-words", withExtension: "json")
        let compURL = Bundle.main.url(forResource: "compounds", withExtension: "json")
        let bigramURL = Bundle.main.url(forResource: "bigram", withExtension: "json")
        return PaliData(url: url, dpdURL: dpdURL, freqURL: freqURL, compoundsURL: compURL, bigramURL: bigramURL)
    }()

    private let data: Bundled
    private let dpd: [String: String]   // full DPD lemma -> English meaning (75k+)
    private let freqWords: [(w: String, en: String)]  // frequency-ranked, for completion
    private let compounds: [String: [String]]  // compound lemma -> member lemmas
    private let bigram: [String: [String]]     // word -> top next words (corpus order)
    private let rootForms: [(root: Root, forms: [(form: String, akk: [String])])]
    private let prefixesAll: [(aff: Affix, akk: [String])]
    private let endingsSorted: [(end: Ending, akk: [String])]
    private let glossAkk: [(w: String, akk: [String], en: String, zh: String)]

    init?(url: URL, dpdURL: URL? = nil, freqURL: URL? = nil, compoundsURL: URL? = nil, bigramURL: URL? = nil) {
        guard let raw = try? Data(contentsOf: url),
              let d = try? JSONDecoder().decode(Bundled.self, from: raw) else { return nil }
        data = d
        if let cu = compoundsURL, let craw = try? Data(contentsOf: cu),
           let cc = try? JSONDecoder().decode([String: [String]].self, from: craw) {
            compounds = cc
        } else {
            compounds = [:]
        }
        if let bu = bigramURL, let braw = try? Data(contentsOf: bu),
           let bb = try? JSONDecoder().decode([String: [String]].self, from: braw) {
            bigram = bb
        } else {
            bigram = [:]
        }
        if let du = dpdURL, let draw = try? Data(contentsOf: du),
           let dd = try? JSONDecoder().decode([String: String].self, from: draw) {
            dpd = dd
        } else {
            dpd = [:]
        }
        // freq-words.json is an array of [lemma, freq, meaning], pre-sorted by
        // frequency; parsed loosely (heterogeneous arrays) via JSONSerialization.
        if let fu = freqURL, let fraw = try? Data(contentsOf: fu),
           let arr = try? JSONSerialization.jsonObject(with: fraw) as? [[Any]] {
            freqWords = arr.compactMap { row in
                guard let w = row.first as? String else { return nil }
                let en = row.count >= 3 ? (row[2] as? String ?? "") : ""
                return (w, en)
            }
        } else {
            freqWords = []
        }
        func toA(_ s: String) -> [String] {
            PaliEngine.tokenize(s, smartNasal: false).filter { $0.type != .other }.map { $0.iast }
        }
        rootForms = d.roots.map { r in (r, r.forms.map { (form: $0, akk: toA($0)) }) }
        prefixesAll = (d.upasagga + d.prefixExtra).map { ($0, toA($0.form)) }
        endingsSorted = d.endings.map { ($0, toA($0.end)) }.sorted { $0.1.count > $1.1.count }
        glossAkk = d.glossary.map { (w: $0.key, akk: toA($0.key), en: $0.value.en, zh: $0.value.zh) }
    }

    // MARK: akkhara helpers (lenient nasals / final-m, mirroring predict.js)
    func toAkk(_ iast: String) -> [String] {
        PaliEngine.tokenize(iast, smartNasal: false).filter { $0.type != .other }.map { $0.iast }
    }
    private func akkEq(_ u: String, _ l: String) -> Bool {
        if u == l { return true }
        if u == "n" && (l == "ṅ" || l == "ñ" || l == "ṇ") { return true }
        if u == "m" && l == "ṃ" { return true }
        return false
    }
    private func startsWith(_ lex: [String], _ pre: [String]) -> Bool {
        if pre.count > lex.count { return false }
        for i in 0..<pre.count where !akkEq(pre[i], lex[i]) { return false }
        return true
    }
    private func endsWith(_ arr: [String], _ suf: [String]) -> Bool {
        if suf.count > arr.count { return false }
        let off = arr.count - suf.count
        for i in 0..<suf.count where !akkEq(arr[off + i], suf[i]) { return false }
        return true
    }
    private func equalAkk(_ a: [String], _ b: [String]) -> Bool {
        a.count == b.count && startsWith(a, b)
    }

    // MARK: glossary lookup (exact, then strip a trailing ṃ/m)
    func lookup(_ iastWord: String) -> GlossResult? {
        let k = iastWord.lowercased()
        // 1) curated bilingual glossary (exact, then strip a trailing ṃ/m)
        if let g = data.glossary[k] { return GlossResult(en: g.en, zh: g.zh, key: k, stem: false) }
        if let last = k.last, last == "ṃ" || last == "m" {
            let k2 = String(k.dropLast())
            if let g = data.glossary[k2] { return GlossResult(en: g.en, zh: g.zh, key: k2, stem: true) }
        }
        // 2) full DPD dictionary (English only)
        if let m = dpd[k] { return GlossResult(en: m, zh: "", key: k, stem: false) }
        if let last = k.last, last == "ṃ" || last == "m" {
            let k2 = String(k.dropLast())
            if let m = dpd[k2] { return GlossResult(en: m, zh: "", key: k2, stem: true) }
        }
        // 3) inflection fallback: morphologically analyze and return the best
        //    fully-explained stem's gloss (so declined/conjugated forms resolve).
        if let a = analyze(toAkk(k), limit: 1).first, a.full, !a.stem.en.isEmpty {
            return GlossResult(en: a.stem.en, zh: a.stem.zh, key: a.stem.label, stem: true)
        }
        return nil
    }

    // MARK: compound (samāsa) split — member lemmas, or [] if not a compound
    func splitCompound(_ word: String, lemma: String? = nil) -> [String] {
        let w = word.lowercased()
        if let m = compounds[w] { return m }
        if let last = w.last, last == "ṃ" || last == "m", let m = compounds[String(w.dropLast())] { return m }
        if let l = lemma?.lowercased(), let m = compounds[l] { return m }
        return []
    }

    // MARK: word completion (frequency-ranked; freqWords is pre-sorted)
    func completeWord(_ prefix: String, limit: Int = 6) -> [Completion] {
        let p = prefix.lowercased()
        if p.isEmpty { return [] }
        var out: [Completion] = []
        for e in freqWords where e.w.count > p.count && e.w.hasPrefix(p) {
            out.append(Completion(w: e.w, en: e.en))
            if out.count >= limit { break }
        }
        return out
    }

    // MARK: next-word prediction (bigram model from the Pali canon)
    // Given the word just committed, return likely following words (with glosses).
    func nextWord(_ word: String, limit: Int = 5) -> [Completion] {
        let w = word.lowercased()
        var succ = bigram[w]
        if succ == nil, let last = w.last, last == "ṃ" || last == "m" {
            succ = bigram[String(w.dropLast())]
        }
        guard let words = succ else { return [] }
        return words.prefix(limit).map { Completion(w: $0, en: lookup($0)?.en ?? "") }
    }

    // MARK: morphological split (prefix + root/word + ending)
    private func matchStemWord(_ stem: [String]) -> StemMatch? {
        for g in glossAkk where equalAkk(g.akk, stem) {
            return StemMatch(kind: "word", label: g.w, en: g.en, zh: g.zh)
        }
        for g in glossAkk where g.akk.count > stem.count && g.akk.count - stem.count <= 1 && startsWith(g.akk, stem) {
            return StemMatch(kind: "word", label: g.w, en: g.en, zh: g.zh)
        }
        return nil
    }
    // Last resort: the full DPD dictionary (exact stem, English only). Tried
    // after roots so the morphological panel prefers the more informative √root.
    private func matchStemDpd(_ stem: [String]) -> StemMatch? {
        let key = stem.joined()
        if let m = dpd[key] { return StemMatch(kind: "word", label: key, en: m, zh: "") }
        return nil
    }
    private func matchStemRoot(_ stem: [String]) -> StemMatch? {
        for rf in rootForms {
            for f in rf.forms {
                if equalAkk(f.akk, stem) ||
                    (stem.count > f.akk.count && stem.count - f.akk.count <= 1 && startsWith(stem, f.akk)) {
                    return StemMatch(kind: "root", label: "√" + rf.root.root, en: rf.root.en, zh: rf.root.zh)
                }
            }
        }
        return nil
    }

    func analyze(_ akk: [String], limit: Int = 2) -> [Analysis] {
        if akk.isEmpty { return [] }

        var prefixOpts: [(prefixes: [PrefixHit], rest: [String])] = [([], akk)]
        for p in prefixesAll where akk.count > p.akk.count && startsWith(akk, p.akk) {
            let rest1 = Array(akk[p.akk.count...])
            let ph = PrefixHit(form: p.aff.form, en: p.aff.en, zh: p.aff.zh)
            prefixOpts.append(([ph], rest1))
            for q in prefixesAll where rest1.count > q.akk.count && startsWith(rest1, q.akk) {
                let qh = PrefixHit(form: q.aff.form, en: q.aff.en, zh: q.aff.zh)
                prefixOpts.append(([ph, qh], Array(rest1[q.akk.count...])))
            }
        }

        var cands: [Analysis] = []
        for po in prefixOpts {
            var endOpts: [(ending: Ending?, stem: [String])] = [(nil, po.rest)]
            for e in endingsSorted where po.rest.count > e.akk.count && endsWith(po.rest, e.akk) {
                endOpts.append((e.end, Array(po.rest[0..<(po.rest.count - e.akk.count)])))
            }
            for eo in endOpts {
                if eo.stem.isEmpty { continue }
                let match = matchStemWord(eo.stem) ?? matchStemRoot(eo.stem) ?? matchStemDpd(eo.stem)
                let stem = match ?? StemMatch(kind: "raw", label: eo.stem.joined(), en: "", zh: "")
                let pfxLen = akk.count - po.rest.count
                let endLen = po.rest.count - eo.stem.count
                let stemLen = match != nil ? eo.stem.count : 0
                let endingHit = eo.ending.map { EndingHit(end: $0.end, en: $0.en, zh: $0.zh) }
                cands.append(Analysis(prefixes: po.prefixes, stem: stem, ending: endingHit,
                                      full: match != nil, recognized: pfxLen + endLen + stemLen))
            }
        }

        cands.sort {
            if $0.full != $1.full { return $0.full && !$1.full }
            if $0.recognized != $1.recognized { return $0.recognized > $1.recognized }
            if $0.morphemes != $1.morphemes { return $0.morphemes < $1.morphemes }
            return $0.prefixes.count < $1.prefixes.count
        }
        var seen = Set<String>()
        var dedup: [Analysis] = []
        for c in cands {
            let sig = c.prefixes.map { $0.form }.joined(separator: "+") + "|" + c.stem.label
            if seen.contains(sig) { continue }
            seen.insert(sig)
            dedup.append(c)
        }
        let fulls = dedup.filter { $0.full }
        return fulls.isEmpty ? Array(dedup.prefix(1)) : Array(fulls.prefix(limit))
    }
}
