# EAC Log Viewer SMP Panel

**Version:** 1.1.0  
**Author/Attribution:** audio-file.org & ChatGPT  
**License:** MIT

## Description
A Spider Monkey Panel (SMP) for Foobar2000 that displays Exact Audio Copy (EAC) log files in a DUI-themed panel.

- Monospace font preserves EAC log column alignment  
- Color-coded conclusion lines (green = success, red = errors)  
- Summary line prepended to log so it scrolls  
- Scrollable log  
- Three-name log detection: `%album%.log`, `%artist% - %album%.log`, `EAC.log`

## Installation
1. Copy `eac_log_viewer_panel.js` to your Foobar2000 `Panels` folder.  
2. Add a new Spider Monkey Panel in your DUI layout.  
3. Copy and replace the entire script in the Edit Panel Script... pane.
4. Adjust panel size and font scaling if needed.  

## Usage
- The panel updates automatically when the currently playing track changes or when focus changes.  
- Scroll through log using the mouse wheel.  
- Summary line shows pass/fail and scrolls with the log text.  

## License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.