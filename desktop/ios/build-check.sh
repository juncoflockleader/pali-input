#!/usr/bin/env bash
# build-check.sh — type-check the iOS keyboard sources against the iOS SDK.
# This verifies the engine + data + UIKit controller compile for iOS; building
# the actual installable .appex needs an Xcode project (see README.md).

set -euo pipefail
cd "$(dirname "$0")"

SDK=$(xcrun --sdk iphonesimulator --show-sdk-path)
swiftc -sdk "$SDK" -target arm64-apple-ios15.0-simulator -parse-as-library -typecheck \
  ../macos/Sources/PaliEngine.swift \
  ../macos/Sources/PaliData.swift \
  PaliKeyboard/KeyboardViewController.swift

echo "iOS sources type-check ✓"
