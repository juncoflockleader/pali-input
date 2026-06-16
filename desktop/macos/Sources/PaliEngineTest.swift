// PaliEngineTest.swift — verifies the Swift port matches the JS engine.
// Build & run:
//   swiftc -parse-as-library Sources/PaliEngine.swift Sources/PaliEngineTest.swift -o /tmp/palitest && /tmp/palitest

import Foundation

@main
struct EngineTests {
    static func main() {
        var pass = 0, fail = 0
        func eq(_ input: String, _ script: PaliScript, _ expected: String, smartNasal: Bool = true) {
            let got = PaliEngine.transliterate(input, script: script, smartNasal: smartNasal)
            if got == expected {
                pass += 1
            } else {
                fail += 1
                print("FAIL [\(script)] \"\(input)\"  expected: \(expected)  got: \(got)")
            }
        }

        // Roman / IAST + smart correction
        eq("buddha", .roman, "buddha")
        eq("sa\"ngha", .roman, "saṅgha")
        eq("sangha", .roman, "saṅgha")
        eq("panca", .roman, "pañca")
        eq("nibbaana", .roman, "nibbāna")
        eq("~naa.na", .roman, "ñāṇa")
        eq("araha.m", .roman, "arahaṃ")
        eq("Buddha", .roman, "Buddha")
        eq("buddham", .roman, "buddhaṃ")          // word-final m -> ṃ
        eq("dhammam", .roman, "dhammaṃ")
        eq("kamma", .roman, "kamma")              // medial mm untouched
        eq("metta", .roman, "metta")              // medial m+vowel untouched
        eq("sangha", .roman, "sangha", smartNasal: false)
        eq("buddham sara.nam", .roman, "buddhaṃ saraṇaṃ")

        // Devanāgarī
        eq("buddha", .devanagari, "बुद्ध")
        eq("dhamma", .devanagari, "धम्म")
        eq("sangha", .devanagari, "सङ्घ")
        eq("nibbaana", .devanagari, "निब्बान")
        eq("pa~n~naa", .devanagari, "पञ्ञा")
        eq("buddham", .devanagari, "बुद्धं")

        // Sinhala
        eq("buddha", .sinhala, "බුද්ධ")
        eq("mettaa", .sinhala, "මෙත්තා")
        eq("pa~n~naa", .sinhala, "පඤ්ඤා")

        // Thai (phinthu cluster + leading vowels)
        eq("buddha", .thai, "พุทฺธ")
        eq("mettaa", .thai, "เมตฺตา")
        eq("araha.m", .thai, "อรหํ")

        // Myanmar (stacked clusters)
        eq("buddha", .myanmar, "ဗုဒ္ဓ")
        eq("mettaa", .myanmar, "မေတ္တာ")

        // --- PaliData: glossary lookup + morphological analysis ---
        if let pd = PaliData(url: URL(fileURLWithPath: "Resources/pali-data.json"),
                             dpdURL: URL(fileURLWithPath: "Resources/dpd-dict.json"),
                             freqURL: URL(fileURLWithPath: "Resources/freq-words.json")) {
            func gloss(_ w: String, _ zh: String) {
                if pd.lookup(w)?.zh == zh { pass += 1 } else { fail += 1; print("FAIL gloss \(w) -> \(pd.lookup(w)?.zh ?? "nil")") }
            }
            gloss("buddha", "佛；觉者")
            gloss("mettā", "慈；慈爱")
            if let r = pd.lookup("buddhaṃ"), r.stem, r.key == "buddha" { pass += 1 } else { fail += 1; print("FAIL stem buddhaṃ") }

            // full DPD dictionary: words NOT in the curated glossary still resolve (English)
            func dpdHas(_ w: String) {
                let r = pd.lookup(w)
                if let r = r, !r.en.isEmpty { pass += 1 } else { fail += 1; print("FAIL dpd lookup \(w)") }
            }
            dpdHas("rukkha")   // tree — not in the 169 curated; from DPD
            dpdHas("udaka")    // water
            dpdHas("ākāsa")    // space
            dpdHas("pabbata")  // mountain

            func hasA(_ w: String, _ pred: (Analysis) -> Bool, _ msg: String) {
                let a = pd.analyze(pd.toAkk(w), limit: 3)
                if a.contains(where: pred) { pass += 1 }
                else { fail += 1; print("FAIL analyze \(msg): \(a.map { $0.prefixes.map { $0.form }.joined(separator: "+") + "|" + $0.stem.label + "|" + ($0.ending?.end ?? "") })") }
            }
            hasA("dhammassa", { $0.stem.label == "dhamma" && $0.ending?.end == "assa" }, "dhammassa")
            hasA("gacchati", { $0.stem.label == "√gam" || $0.stem.label == "gacchati" }, "gacchati")
            hasA("anugacchati", { $0.prefixes.contains { $0.form == "anu" } && $0.stem.label == "√gam" }, "anugacchati")
            hasA("anattā", { $0.prefixes.contains { $0.form == "an" } && $0.stem.label == "attā" }, "anattā")

            // word completion (frequency-ranked)
            let nibb = pd.completeWord("nibb", limit: 6).map { $0.w }
            if nibb.contains("nibbāna") { pass += 1 } else { fail += 1; print("FAIL completeWord nibb -> \(nibb)") }
            if pd.completeWord("dhamma", limit: 6).allSatisfy({ $0.w != "dhamma" }) { pass += 1 } else { fail += 1; print("FAIL completeWord skip exact") }
            if pd.completeWord("", limit: 6).isEmpty { pass += 1 } else { fail += 1; print("FAIL completeWord empty") }
        } else {
            fail += 1
            print("FAIL: could not load Resources/pali-data.json (run from desktop/macos)")
        }

        print("\n\(pass) passed, \(fail) failed")
        exit(fail == 0 ? 0 : 1)
    }
}
