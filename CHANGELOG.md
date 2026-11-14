# Changelog

## 1.0.1

### Fixed
- Curly quotes, dashes and accents showed up as `â€œ`. Text is now read correctly.
- Some files that store text unencoded damaged those characters beyond repair. Fixed.
- Images embedded with the old `cid:` link style appeared broken. They show now.
- The last part of a file was lost when the closing marker was missing. It is now read in full.
- Style sheets with accents displayed badly. Fixed.
- Large pages opened slowly. They now load faster.

### Security
- A saved page can no longer run programs inside the viewer. It is shown in a locked box.
- A saved page no longer connects to the internet. Only what is stored inside the file is shown.
- The extension asks for one permission less (`activeTab`).

### Things you may notice
- Pages that needed their own JavaScript (menus, tabs) look simpler.
- Anything not stored inside the file is left empty instead of being downloaded.
