// KeyboardViewController.swift — iOS custom-keyboard extension.
//
// A transliteration keyboard: keys feed an ASCII buffer; the converted Pali is
// inserted live into the field (delete-and-replace) and shown with its gloss in
// the suggestion bar. Space/return commits the word; a key cycles the output
// script; the globe switches keyboards.
//
// Reuses PaliEngine.swift + PaliData.swift verbatim (add them, plus
// pali-data.json / dpd-dict.json, to this extension target — see README).

import UIKit

final class KeyboardViewController: UIInputViewController {

    private var buffer = ""
    private var insertedLen = 0           // graphemes of converted text currently in the field
    private var script: PaliScript = .roman
    private var smartNasal = true
    private let data = PaliData.shared    // loads bundled pali-data.json + dpd-dict.json

    private let suggestion = UILabel()
    private var scriptButton: UIButton?
    private let completionScroll = UIScrollView()
    private let completionStack = UIStackView()

    private let rows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"]
    private let scripts: [(PaliScript, String)] = [
        (.roman, "IAST"), (.devanagari, "देव"), (.sinhala, "සිං"), (.thai, "ไทย"), (.myanmar, "မြန်")
    ]

    override func viewDidLoad() {
        super.viewDidLoad()
        let stack = UIStackView()
        stack.axis = .vertical
        stack.distribution = .fillEqually
        stack.spacing = 5
        stack.translatesAutoresizingMaskIntoConstraints = false

        suggestion.font = .systemFont(ofSize: 15)
        suggestion.textAlignment = .center
        suggestion.numberOfLines = 2
        suggestion.adjustsFontSizeToFitWidth = true
        suggestion.minimumScaleFactor = 0.6

        // tappable completion strip (frequency-ranked whole words)
        completionScroll.showsHorizontalScrollIndicator = false
        completionStack.axis = .horizontal
        completionStack.spacing = 6
        completionStack.translatesAutoresizingMaskIntoConstraints = false
        completionScroll.addSubview(completionStack)
        let cg = completionScroll.contentLayoutGuide
        NSLayoutConstraint.activate([
            completionStack.leadingAnchor.constraint(equalTo: cg.leadingAnchor, constant: 4),
            completionStack.trailingAnchor.constraint(equalTo: cg.trailingAnchor, constant: -4),
            completionStack.topAnchor.constraint(equalTo: cg.topAnchor),
            completionStack.bottomAnchor.constraint(equalTo: cg.bottomAnchor),
            completionStack.heightAnchor.constraint(equalTo: completionScroll.frameLayoutGuide.heightAnchor),
            completionScroll.heightAnchor.constraint(equalToConstant: 38),
        ])

        let topStack = UIStackView()
        topStack.axis = .vertical
        topStack.spacing = 5
        topStack.translatesAutoresizingMaskIntoConstraints = false
        topStack.addArrangedSubview(completionScroll)
        topStack.addArrangedSubview(suggestion)
        topStack.addArrangedSubview(stack)

        for r in rows { stack.addArrangedSubview(letterRow(r)) }
        stack.addArrangedSubview(functionRow())

        view.addSubview(topStack)
        NSLayoutConstraint.activate([
            topStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 3),
            topStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -3),
            topStack.topAnchor.constraint(equalTo: view.topAnchor, constant: 4),
            topStack.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -4),
            suggestion.heightAnchor.constraint(equalToConstant: 34),
        ])
        refresh()
    }

    // MARK: key building
    private func rowStack() -> UIStackView {
        let s = UIStackView()
        s.axis = .horizontal
        s.distribution = .fillProportionally
        s.spacing = 5
        return s
    }
    private func letterRow(_ letters: String) -> UIStackView {
        let s = rowStack()
        s.distribution = .fillEqually
        for ch in letters { s.addArrangedSubview(makeKey(String(ch)) { [weak self] _ in self?.onChar(ch) }) }
        return s
    }
    private func functionRow() -> UIStackView {
        let s = rowStack()
        s.addArrangedSubview(makeKey(".") { [weak self] _ in self?.onChar(".") })
        s.addArrangedSubview(makeKey("\"") { [weak self] _ in self?.onChar("\"") })
        s.addArrangedSubview(makeKey("~") { [weak self] _ in self?.onChar("~") })
        let sb = makeKey(scriptLabel()) { [weak self] b in self?.cycleScript(b) }
        scriptButton = sb
        s.addArrangedSubview(sb)
        s.addArrangedSubview(makeKey("space") { [weak self] _ in self?.onSpace() })
        s.addArrangedSubview(makeKey("⌫") { [weak self] _ in self?.onDelete() })
        s.addArrangedSubview(makeKey("return") { [weak self] _ in self?.onReturn() })
        if needsInputModeSwitchKey {
            s.addArrangedSubview(makeKey("🌐") { [weak self] _ in self?.advanceToNextInputMode() })
        }
        return s
    }
    private func makeKey(_ title: String, _ action: @escaping (UIButton) -> Void) -> UIButton {
        let b = UIButton(type: .system)
        b.setTitle(title, for: .normal)
        b.titleLabel?.font = .systemFont(ofSize: 18)
        b.backgroundColor = UIColor.secondarySystemBackground
        b.layer.cornerRadius = 5
        b.addAction(UIAction { _ in action(b) }, for: .touchUpInside)
        return b
    }

    // MARK: input
    private var converted: String { PaliEngine.transliterate(buffer, script: script, smartNasal: smartNasal) }

    private func onChar(_ c: Character) { buffer.append(c); replaceInserted() }

    private func replaceInserted() {
        let proxy = textDocumentProxy
        for _ in 0..<insertedLen { proxy.deleteBackward() }
        let out = converted
        proxy.insertText(out)
        insertedLen = out.count
        refresh()
    }

    private func onSpace() {
        if buffer.isEmpty { textDocumentProxy.insertText(" "); return }
        textDocumentProxy.insertText(" ")   // converted word already in the field
        buffer = ""; insertedLen = 0; refresh()
    }
    private func onReturn() {
        if !buffer.isEmpty { buffer = ""; insertedLen = 0; refresh() }
        else { textDocumentProxy.insertText("\n") }
    }
    private func onDelete() {
        if buffer.isEmpty { textDocumentProxy.deleteBackward(); return }
        buffer.removeLast()
        replaceInserted()
    }

    private func cycleScript(_ b: UIButton) {
        let i = scripts.firstIndex { $0.0 == script } ?? 0
        script = scripts[(i + 1) % scripts.count].0
        b.setTitle(scriptLabel(), for: .normal)
        if !buffer.isEmpty { replaceInserted() } else { refresh() }
    }
    private func scriptLabel() -> String { scripts.first { $0.0 == script }?.1 ?? "IAST" }

    private func updateCompletions(_ iast: String) {
        completionStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        guard let d = data else { return }
        for c in d.completeWord(iast, limit: 10) {
            let b = UIButton(type: .system)
            var cfg = UIButton.Configuration.gray()
            cfg.title = c.w
            cfg.buttonSize = .small
            b.configuration = cfg
            b.addAction(UIAction { [weak self] _ in self?.acceptCompletion(c.w) }, for: .touchUpInside)
            completionStack.addArrangedSubview(b)
        }
    }
    // The engine accepts IAST input directly, so set the buffer to the lemma.
    private func acceptCompletion(_ lemma: String) {
        buffer = lemma
        replaceInserted()
    }

    private func refresh() {
        if buffer.isEmpty {
            suggestion.text = scriptLabel()
            completionStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
            return
        }
        let iast = PaliEngine.transliterate(buffer, script: .roman, smartNasal: smartNasal)
        updateCompletions(iast)
        let out = converted
        var line1 = out
        if let g = data?.lookup(iast) {
            let zh = g.zh.isEmpty ? "" : " · \(g.zh)"
            line1 = "\(out)    \(g.en)\(zh)"
        }
        // morphological split (prefix + root/word + ending)
        var split: String? = nil
        if let d = data, let a = d.analyze(d.toAkk(iast), limit: 1).first {
            let pf = a.prefixes.map { "\($0.form)-" }.joined()
            let end = a.ending.map { " -\($0.end)" } ?? ""
            split = "\(pf)\(a.stem.label)\(end)"
        }
        suggestion.text = (split != nil && split != out) ? "\(line1)\n\(split!)" : line1
    }
}
