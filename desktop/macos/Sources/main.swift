// main.swift — InputMethodKit server bootstrap.

import Cocoa
import InputMethodKit

// Keep a strong reference for the lifetime of the process.
let connectionName = (Bundle.main.infoDictionary?["InputMethodConnectionName"] as? String) ?? "PaliIME_Connection"
let server = IMKServer(name: connectionName, bundleIdentifier: Bundle.main.bundleIdentifier)

NSApplication.shared.run()
