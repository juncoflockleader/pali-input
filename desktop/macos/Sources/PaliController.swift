// PaliController.swift — the InputMethodKit controller.
//
// A transliteration input method: it buffers the typed ASCII ("buddha.m"),
// shows the converted Pali live as marked (underlined) pre-edit text, and
// commits on space / return / punctuation. The target script and smart
// correction are chosen from the input-method menu.

import Cocoa
import InputMethodKit

@objc(PaliController)
final class PaliController: IMKInputController {

    private var buffer = ""
    private var script: PaliScript = .roman
    private var smartNasal = true

    private let notFound = NSRange(location: NSNotFound, length: 0)
    private let info = InfoPanel.shared
    private var candidates: [Completion] = []   // all completions for the buffer
    private var candidatePage = 0               // current page (paged with -/=)
    private let pageSize = 5                     // candidates per line/page

    override init!(server: IMKServer!, delegate: Any!, client inputClient: Any!) {
        super.init(server: server, delegate: delegate, client: inputClient)
        let d = UserDefaults.standard
        if let raw = d.string(forKey: "PaliScript"), let s = PaliScript(rawValue: raw) { script = s }
        if d.object(forKey: "PaliSmartNasal") != nil { smartNasal = d.bool(forKey: "PaliSmartNasal") }
    }

    private func save() {
        let d = UserDefaults.standard
        d.set(script.rawValue, forKey: "PaliScript")
        d.set(smartNasal, forKey: "PaliSmartNasal")
    }

    // MARK: Key handling
    override func handle(_ event: NSEvent!, client sender: Any!) -> Bool {
        guard let event = event, event.type == .keyDown,
              let client = sender as? IMKTextInput else { return false }

        // Let the system own ⌘/⌃ shortcuts; commit anything pending first.
        let flags = event.modifierFlags
        if flags.contains(.command) || flags.contains(.control) {
            if !buffer.isEmpty { commit(client) }
            return false
        }

        switch event.keyCode {
        case 51: // delete
            if buffer.isEmpty { return false }
            buffer.removeLast()
            candidatePage = 0
            updatePreedit(client)
            return true
        case 53: // escape — discard composition
            if buffer.isEmpty { return false }
            buffer = ""
            updatePreedit(client)
            return true
        case 36, 76: // return / enter — commit, swallow the newline
            if buffer.isEmpty { return false }
            commit(client)
            return true
        case 49: // space — commit, then a literal space
            if buffer.isEmpty { return false }
            commit(client)
            client.insertText(" ", replacementRange: notFound)
            return true
        default:
            guard let chars = event.characters, chars.count == 1, let c = chars.first else {
                if !buffer.isEmpty { commit(client) }
                return false
            }
            // candidate window keys (Chinese-IME style) while composing:
            if !buffer.isEmpty, !candidates.isEmpty {
                // -/= page through candidates
                if c == "=" || c == "+" {
                    if (candidatePage + 1) * pageSize < candidates.count { candidatePage += 1; updatePreedit(client) }
                    return true
                }
                if c == "-" || c == "_" {
                    if candidatePage > 0 { candidatePage -= 1; updatePreedit(client) }
                    return true
                }
                // 1–pageSize selects within the current page
                if let d = c.wholeNumberValue, d >= 1, d <= pageSize {
                    let idx = candidatePage * pageSize + (d - 1)
                    if idx < candidates.count { selectCandidate(client, idx); return true }
                }
            }
            if isInputChar(c) {
                buffer.append(c)
                candidatePage = 0
                updatePreedit(client)
                return true
            }
            // punctuation: commit pending word, then emit the char
            if !buffer.isEmpty { commit(client) }
            client.insertText(String(c), replacementRange: notFound)
            return true
        }
    }

    private func isInputChar(_ c: Character) -> Bool {
        c.isLetter || ".\"~;".contains(c)
    }

    // MARK: Composition
    private var converted: String {
        PaliEngine.transliterate(buffer, script: script, smartNasal: smartNasal)
    }

    private func updatePreedit(_ client: IMKTextInput) {
        if buffer.isEmpty {
            client.setMarkedText("", selectionRange: NSRange(location: 0, length: 0), replacementRange: notFound)
            candidates = []
            candidatePage = 0
            info.hide()
            return
        }
        let text = converted
        let attr = NSAttributedString(string: text, attributes: [
            .underlineStyle: NSUnderlineStyle.single.rawValue
        ])
        let end = (text as NSString).length
        client.setMarkedText(attr, selectionRange: NSRange(location: end, length: 0), replacementRange: notFound)
        updateInfo(client, converted: text)
    }

    // Show numbered completion candidates + the meaning / morphological split.
    private func updateInfo(_ client: IMKTextInput, converted: String) {
        guard let data = PaliData.shared else { info.hide(); return }
        let iast = PaliEngine.transliterate(buffer, script: .roman, smartNasal: smartNasal)
        let gloss = data.lookup(iast)
        let analyses = data.analyze(data.toAkk(iast), limit: 2)
        candidates = data.completeWord(iast, limit: pageSize * 9)   // up to 9 pages
        let compound = data.splitCompound(iast, lemma: gloss?.key)
        if gloss == nil && analyses.isEmpty && candidates.isEmpty && compound.isEmpty { info.hide(); return }

        // current page slice, converted into the active script
        let pageCount = max(1, (candidates.count + pageSize - 1) / pageSize)
        if candidatePage >= pageCount { candidatePage = pageCount - 1 }
        let start = candidatePage * pageSize
        let pageItems = Array(candidates[start..<min(start + pageSize, candidates.count)])
        let candDisplay = pageItems.map { c -> (label: String, en: String) in
            (PaliEngine.transliterate(c.w, script: script, smartNasal: false), c.en)
        }
        var rect = NSRect.zero
        _ = client.attributes(forCharacterIndex: 0, lineHeightRectangle: &rect)
        info.update(converted: converted,
                    iast: script == .roman ? nil : iast,
                    gloss: gloss, analyses: analyses, candidates: candDisplay,
                    page: candidatePage, pageCount: pageCount, compound: compound, at: rect)
    }

    // Pick completion #index: replace the composition with that whole word.
    private func selectCandidate(_ client: IMKTextInput, _ index: Int) {
        guard index < candidates.count else { return }
        buffer = candidates[index].w  // engine accepts IAST input directly
        commit(client)
    }

    private func commit(_ client: IMKTextInput) {
        guard !buffer.isEmpty else { return }
        client.insertText(converted, replacementRange: notFound)
        buffer = ""
        candidates = []
        candidatePage = 0
        info.hide()
    }

    override func commitComposition(_ sender: Any!) {
        if let client = sender as? IMKTextInput { commit(client) }
    }

    override func deactivateServer(_ sender: Any!) {
        if let client = sender as? IMKTextInput { commit(client) }
        super.deactivateServer(sender)
    }

    // MARK: Menu
    override func menu() -> NSMenu! {
        let menu = NSMenu(title: "Pali")
        for s in PaliScript.allCases {
            let item = NSMenuItem(title: scriptTitle(s), action: #selector(chooseScript(_:)), keyEquivalent: "")
            item.representedObject = s.rawValue
            item.state = (s == script) ? .on : .off
            item.target = self
            menu.addItem(item)
        }
        menu.addItem(.separator())
        let smart = NSMenuItem(title: "智能纠正 Smart correction", action: #selector(toggleSmart(_:)), keyEquivalent: "")
        smart.state = smartNasal ? .on : .off
        smart.target = self
        menu.addItem(smart)
        return menu
    }

    @objc private func chooseScript(_ sender: NSMenuItem) {
        if let raw = sender.representedObject as? String, let s = PaliScript(rawValue: raw) {
            script = s
            save()
        }
    }

    @objc private func toggleSmart(_ sender: NSMenuItem) {
        smartNasal.toggle()
        save()
    }

    private func scriptTitle(_ s: PaliScript) -> String {
        switch s {
        case .roman:      return "Pali — IAST (罗马)"
        case .devanagari: return "Pali — Devanāgarī देवनागरी"
        case .sinhala:    return "Pali — Sinhala සිංහල"
        case .thai:       return "Pali — Thai ไทย"
        case .myanmar:    return "Pali — Myanmar မြန်မာ"
        }
    }
}
