# OdooMM Android preview

[Download the experimental Android APK](https://github.com/tubeyasa-rgb/odoomm/raw/refs/heads/main/downloads/OdooMM-debug.apk)

This is a debug-signed initial mobile adaptation of the supplied Odoo browser extension.
Android build and five browser integration tests passed. It has not been tested on a physical Android device or live Odoo server. Most interface text is English. Chrome browser automation is unsupported. Keep the app foreground during operations.

The APK checksum is in `downloads/SHA256SUMS`.

## Mobile 0.2.0 (extension v3.13)

Updated sessions/AI actions (check/replay/undo), session export/import, database overview, touch search, smart people/company matching, dummy people/products, and saved-server login for POS/customizations. Previous phone layout and backup-file selection fixes are retained. Android build, 41 core tests and 8 browser tests passed.

Chrome page recording and Google Drive OAuth/scheduled backups remain unavailable on Android. Import browser sessions or use manual export/import. Passwords are kept in memory until the app closes. Physical-device and live-server testing is still required.
