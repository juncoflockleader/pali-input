#!/usr/bin/env bash
# build.sh — compile the Swift sources and assemble PaliIME.app (an IMK input
# method bundle). No Xcode project needed.
#
#   ./build.sh            # build ./build/PaliIME.app
#   ./build.sh install    # build, then copy to ~/Library/Input Methods/
#
# After installing: System Settings → Keyboard → Input Sources → + →
# (search "Pali"), then pick it from the input menu. A logout/login (or
# `killall PaliIME`) may be needed the first time.

set -euo pipefail
cd "$(dirname "$0")"

APP="build/PaliIME.app"
MACOS="$APP/Contents/MacOS"
RES="$APP/Contents/Resources"

rm -rf "$APP"
mkdir -p "$MACOS" "$RES"

echo "• compiling…"
# main.swift carries top-level code (the IMKServer bootstrap); the test file is
# excluded from the app build.
swiftc -O \
  -framework Cocoa -framework InputMethodKit \
  Sources/PaliEngine.swift Sources/PaliController.swift Sources/main.swift \
  -o "$MACOS/PaliIME"

cp Info.plist "$APP/Contents/Info.plist"
plutil -lint "$APP/Contents/Info.plist" >/dev/null

# Ad-hoc codesign so the bundle loads on the local machine.
codesign --force --sign - "$APP" 2>/dev/null || echo "  (codesign skipped)"

echo "• built $APP"

if [[ "${1:-}" == "install" ]]; then
  DEST="$HOME/Library/Input Methods"
  mkdir -p "$DEST"
  rm -rf "$DEST/PaliIME.app"
  cp -R "$APP" "$DEST/"
  echo "• installed to $DEST/PaliIME.app"
  echo "  Enable it in System Settings → Keyboard → Input Sources (+), then pick 'Pali'."
fi
