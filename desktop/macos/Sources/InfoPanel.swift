// InfoPanel.swift — a small non-activating floating panel shown beside the
// caret while composing. Top: a single-line numbered candidate row (press 1–N
// to pick, -/= to page). Below: the word's gloss + morphological split.
// Purely informational — it never takes focus or eats clicks.

import Cocoa

final class InfoPanel {
    // One shared panel across all input clients (only one is visible at a time).
    static let shared = InfoPanel()

    private let panel: NSPanel
    private let candidateLabel = NSTextField(labelWithString: "")  // single line, no wrap
    private let infoLabel = NSTextField(labelWithString: "")       // gloss/analysis, wraps
    private let stack = NSStackView()
    private let maxWidth: CGFloat = 460

    private init() {
        panel = NSPanel(contentRect: NSRect(x: 0, y: 0, width: 220, height: 50),
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

        candidateLabel.lineBreakMode = .byTruncatingTail
        candidateLabel.maximumNumberOfLines = 1
        candidateLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        infoLabel.lineBreakMode = .byWordWrapping
        infoLabel.maximumNumberOfLines = 0
        infoLabel.preferredMaxLayoutWidth = maxWidth - 24

        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 5
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.addArrangedSubview(candidateLabel)
        stack.addArrangedSubview(infoLabel)
        card.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 12),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -12),
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 9),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -9),
        ])
        panel.contentView = card
    }

    func hide() { panel.orderOut(nil) }

    /// `candidates` is the CURRENT page only; numbered 1…count. `page`/`pageCount`
    /// are 0-based / total for the "-/=" pager hint.
    func update(converted: String, iast: String?, gloss: GlossResult?, analyses: [Analysis],
                candidates: [(label: String, en: String)], page: Int = 0, pageCount: Int = 1,
                compound: [String] = [], at rect: NSRect) {

        // --- candidate row (single line) ---
        candidateLabel.isHidden = candidates.isEmpty
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
            if pageCount > 1 {
                line.append(NSAttributedString(string: "  \(page + 1)/\(pageCount) ‹-/=›", attributes: [
                    .font: NSFont.systemFont(ofSize: 11),
                    .foregroundColor: NSColor.tertiaryLabelColor]))
            }
            candidateLabel.attributedStringValue = line
        }

        // --- info block (headword + gloss + analysis + compound) ---
        let s = NSMutableAttributedString()
        let head = converted + (iast.map { "   " + $0 } ?? "")
        s.append(NSAttributedString(string: head, attributes: [
            .font: NSFont.systemFont(ofSize: 18, weight: .medium),
            .foregroundColor: NSColor.labelColor]))
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
        infoLabel.attributedStringValue = s

        // --- size & place ---
        infoLabel.preferredMaxLayoutWidth = maxWidth - 24
        stack.layoutSubtreeIfNeeded()
        let fit = stack.fittingSize
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
