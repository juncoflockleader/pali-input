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

        print("\n\(pass) passed, \(fail) failed")
        exit(fail == 0 ? 0 : 1)
    }
}
