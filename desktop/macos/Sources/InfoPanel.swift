// InfoPanel.swift — a small non-activating floating panel shown beside the
// caret while composing. It surfaces the same hints as the web app: the
// word's English/Chinese gloss and a morphological split (prefix + root/word
// + ending). Purely informational — it never takes focus or eats clicks.

import Cocoa

final class InfoPanel {
    // One shared panel across all input clients (only one is visible at a time).
    static let shared = InfoPanel()

    private let panel: NSPanel
    private let label: NSTextField
    private let maxWidth: CGFloat = 380

    private init() {
        panel = NSPanel(contentRect: NSRect(x: 0, y: 0, width: 220, height: 60),
                        styleMask: [.nonactivatingPanel, .borderless],
                        backing: .buffered, defer: true)
        panel.isFloatingPanel = true
        panel.level = .popUpMenu
        panel.hidesOnDeactivate = false
        panel.hasShadow = true
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.ignoresMouseEvents = true
        panel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]

        let card = NSView()
        card.wantsLayer = true
        card.layer?.cornerRadius = 10
        card.layer?.backgroundColor = NSColor.windowBackgroundColor.cgColor
        card.layer?.borderWidth = 1
        card.layer?.borderColor = NSColor.separatorColor.cgColor

        label = NSTextField(labelWithString: "")
        label.translatesAutoresizingMaskIntoConstraints = false
        label.lineBreakMode = .byWordWrapping
        label.maximumNumberOfLines = 0
        label.preferredMaxLayoutWidth = maxWidth - 24
        card.addSubview(label)
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
            label.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12),
            label.topAnchor.constraint(equalTo: card.topAnchor, constant: 9),
            label.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -9),
        ])
        panel.contentView = card
    }

    func hide() { panel.orderOut(nil) }

    func update(converted: String, iast: String?, gloss: GlossResult?, analyses: [Analysis],
                candidates: [(label: String, en: String)], compound: [String] = [], at rect: NSRect) {
        let s = NSMutableAttributedString()

        let head = converted + (iast.map { "   " + $0 } ?? "")
        s.append(NSAttributedString(string: head, attributes: [
            .font: NSFont.systemFont(ofSize: 20, weight: .medium),
            .foregroundColor: NSColor.labelColor]))

        // numbered completion candidates — press 1–9 to choose
        if !candidates.isEmpty {
            let line = NSMutableAttributedString()
            for (i, c) in candidates.enumerated() {
                line.append(NSAttributedString(string: "\(i + 1) ", attributes: [
                    .font: NSFont.systemFont(ofSize: 15, weight: .bold),
                    .foregroundColor: NSColor.systemOrange]))
                line.append(NSAttributedString(string: c.label + "   ", attributes: [
                    .font: NSFont.systemFont(ofSize: 15),
                    .foregroundColor: NSColor.labelColor]))
            }
            s.append(NSAttributedString(string: "\n"))
            s.append(line)
        }

        if let g = gloss {
            let note = g.stem ? "  (\(g.key))" : ""
            let zhPart = g.zh.isEmpty ? "" : " · \(g.zh)"
            s.append(NSAttributedString(string: "\n\(g.en)\(zhPart)\(note)", attributes: [
                .font: NSFont.systemFont(ofSize: 12),
                .foregroundColor: NSColor.secondaryLabelColor]))
        }
        for a in analyses {
            s.append(NSAttributedString(string: "\n"))
            s.append(analysisLine(a))
        }
        if !compound.isEmpty {
            s.append(NSAttributedString(string: "\n⊕ " + compound.joined(separator: " + "), attributes: [
                .font: NSFont.systemFont(ofSize: 12),
                .foregroundColor: NSColor.systemTeal]))
        }
        label.attributedStringValue = s

        label.preferredMaxLayoutWidth = maxWidth - 24
        let fit = label.fittingSize
        let w = min(maxWidth, fit.width + 24)
        let h = fit.height + 18
        panel.setContentSize(NSSize(width: w, height: h))
        panel.setFrameTopLeftPoint(NSPoint(x: rect.minX, y: rect.minY - 3))
        panel.orderFront(nil)
    }

    private func analysisLine(_ a: Analysis) -> NSAttributedString {
        let line = NSMutableAttributedString()
        let f = NSFont.systemFont(ofSize: 12, weight: .semibold)
        let sep = NSAttributedString(string: " ", attributes: [.font: f])
        func part(_ t: String, _ c: NSColor) {
            line.append(NSAttributedString(string: t, attributes: [.font: f, .foregroundColor: c]))
        }

        var first = true
        for p in a.prefixes {
            if !first { line.append(sep) }
            first = false
            part(p.form + "-", .systemBrown)
        }
        if !first { line.append(sep) }
        let stemColor: NSColor = a.stem.kind == "root" ? .systemOrange
            : (a.stem.kind == "word" ? .systemGreen : .tertiaryLabelColor)
        part(a.stem.label, stemColor)
        if let e = a.ending {
            line.append(sep)
            part("-" + e.end, .systemPurple)
        }
        let tail = a.stem.en.isEmpty ? (a.ending?.en ?? "") : a.stem.en
        if !tail.isEmpty {
            line.append(NSAttributedString(string: "  " + tail, attributes: [
                .font: NSFont.systemFont(ofSize: 11),
                .foregroundColor: NSColor.tertiaryLabelColor]))
        }
        return line
    }
}
