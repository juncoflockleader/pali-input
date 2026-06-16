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
            if isInputChar(c) {
                buffer.append(c)
                updatePreedit(client)
                return true
            }
            // punctuation / digit: commit pending word, then emit the char
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
            return
        }
        let text = converted
        let attr = NSAttributedString(string: text, attributes: [
            .underlineStyle: NSUnderlineStyle.single.rawValue
        ])
        let end = (text as NSString).length
        client.setMarkedText(attr, selectionRange: NSRange(location: end, length: 0), replacementRange: notFound)
    }

    private func commit(_ client: IMKTextInput) {
        guard !buffer.isEmpty else { return }
        client.insertText(converted, replacementRange: notFound)
        buffer = ""
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
