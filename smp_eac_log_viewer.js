// ==================================================
// EAC + DR Log Viewer - DUI Theme
// Version: 1.2.4
// Author: tom2tec (using ChatGPT)
// Copyright: © 2026 audio-file.org
// License: MIT
// Platform: Windows only
// ==================================================
// MIT License
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
// ==================================================

"use strict";

let g_lines = [];
let g_lineColors = [];
let g_scroll = 0;
let g_margin = 10;
let g_metadb = null;

// DUI theme colors
const DUI_BG        = 0xFF202020;
const DUI_TEXT      = 0xFFFFFFFF;
const DUI_SUCCESS   = 0xFF00FF00;
const DUI_ERROR     = 0xFFFF0000;
const DUI_HIGHLIGHT = 0xFF00BFFF;

// Monospace font
let baseFontSize = window.GetFontDUI(0).Size;
let g_font = gdi.Font("Consolas", baseFontSize, 0);
let g_lineHeight = Math.round(g_font.Size * 1.3);

// ------------------------------
// Utilities
// ------------------------------
function sanitize(name) {
    return name.replace(/[<>:"\/\\|?*]/g, "_");
}

// ------------------------------
// Robust log file resolution (EAC + DR + artist/album variations)
// ------------------------------
function getLogFiles(metadb) {
    if (!metadb) return [];

    const fso = new ActiveXObject("Scripting.FileSystemObject");

    // Get folder and normalize UNC/NAS paths
    let tf = fb.TitleFormat("%path%");
    let full = tf.EvalWithMetadb(metadb).replace(/^"|"$/g, ""); // strip quotes
    let lastSep = full.lastIndexOf("\\");
    if (lastSep < 0) return [];
    let folder = full.substring(0, lastSep);
    if (folder.endsWith("\\")) folder = folder.slice(0, -1);

    if (!fso.FolderExists(folder)) return [];

    // Candidate logs in priority order
    let candidates = [];

    // Album-specific
    let tfAlbum = fb.TitleFormat("$if2(%album%,Unknown Album)");
    let album = sanitize(tfAlbum.EvalWithMetadb(metadb));
    candidates.push(album + ".log");

    // Artist - Album
    let tfArtistAlbum = fb.TitleFormat("$if2(%artist%,Unknown Artist) - $if2(%album%,Unknown Album)");
    let artistAlbum = sanitize(tfArtistAlbum.EvalWithMetadb(metadb));
    candidates.push(artistAlbum + ".log");

    // Generic logs
    candidates.push("EAC.log", "eac.log", "DR.log", "dr.log", "Album_DR.txt", "foo_dr.txt", "album_dr.txt");

    let found = [];

    for (let i = 0; i < candidates.length; i++) {
        let filePath = folder + "\\" + candidates[i];
        if (fso.FileExists(filePath)) {
            found.push(filePath);
        } else {
            // fallback for NAS quirks
            try { utils.ReadTextFile(filePath); found.push(filePath); } catch (e) {}
        }
    }

    return found;
}

// ------------------------------
// Load and format log
// ------------------------------
function loadLog(metadb) {
    g_scroll = 0;
    g_lines = [];
    g_lineColors = [];

    if (!metadb) {
        g_lines = ["No track selected."];
        g_lineColors = [DUI_TEXT];
        return;
    }

    let logPaths = getLogFiles(metadb);

    if (logPaths.length === 0) {
        g_lines = [
            "EAC/DR log not found.",
            "",
            "Tried:",
            "%album%.log",
            "%artist% - %album%.log",
            "EAC.log",
            "DR.log",
            "Album_DR.txt",
            "foo_dr.txt"
        ];
        g_lineColors = Array(g_lines.length).fill(DUI_TEXT);
        return;
    }

    g_lines = [];
    g_lineColors = [];

    for (let j = 0; j < logPaths.length; j++) {
        let logPath = logPaths[j];
        try {
            let raw = utils.ReadTextFile(logPath).replace(/\r/g, "");
            let lines = raw.split("\n");
            let colors = Array(lines.length).fill(DUI_TEXT);

            // Highlight summary/relevant lines
            for (let i = 0; i < lines.length; i++) {
                let line = lines[i];
                if (line.includes("No errors occurred") || line.includes("Copy OK") || line.match(/Official DR/i)) {
                    colors[i] = DUI_SUCCESS; // green
                } else if (line.includes("There were errors")) {
                    colors[i] = DUI_ERROR;   // red
                }
            }

            // Determine summary for header
            let summaryLine = "";
            let summaryColor = DUI_HIGHLIGHT; // default
            for (let i = lines.length - 1; i >= 0; i--) {
                let line = lines[i];
                if (line.includes("No errors occurred") || line.includes("Copy OK")) {
                    summaryLine = "✔ No errors occurred";
                    summaryColor = DUI_SUCCESS;
                    break;
                } else if (line.includes("There were errors")) {
                    summaryLine = "✖ There were errors";
                    summaryColor = DUI_ERROR;
                    break;
                }
            }

            // Add header for each log
            g_lines.push("==== " + logPath.split("\\").pop() + " ====");
            g_lineColors.push(summaryColor);

            // Add summary line immediately after header
            if (summaryLine) {
                g_lines.push(summaryLine);
                g_lineColors.push(summaryColor);
            }

            g_lines = g_lines.concat(lines);
            g_lineColors = g_lineColors.concat(colors);

            // spacing between logs
            g_lines.push("");
            g_lineColors.push(DUI_TEXT);

        } catch (e) {
            g_lines.push("Error reading log: " + logPath);
            g_lines.push(e.toString());
            g_lineColors.push(DUI_ERROR);
            g_lineColors.push(DUI_ERROR);
        }
    }
}

// ------------------------------
// Drawing
// ------------------------------
function on_paint(gr) {
    gr.FillSolidRect(0, 0, window.Width, window.Height, DUI_BG);

    let y = g_margin;

    for (let i = 0; i < g_lines.length; i++) {
        let line = g_lines[i];
        let color = g_lineColors[i];

        if (line.includes("No errors occurred") || line.includes("Copy OK") || line.match(/Official DR/i)) {
            color = DUI_SUCCESS;
        } else if (line.includes("There were errors")) {
            color = DUI_ERROR;
        }

        if (y - g_scroll > -g_lineHeight && y - g_scroll < window.Height) {
            gr.DrawString(line, g_font, color, g_margin, y - g_scroll, window.Width - g_margin * 2, g_lineHeight, 0);
        }

        y += g_lineHeight;
        if (y - g_scroll > window.Height) break;
    }
}

function on_mouse_wheel(step) {
    g_scroll -= step * g_lineHeight * 3;
    let maxScroll = Math.max(0, g_lines.length * g_lineHeight - window.Height + g_margin);
    if (g_scroll < 0) g_scroll = 0;
    if (g_scroll > maxScroll) g_scroll = maxScroll;
    window.Repaint();
}

// ------------------------------
// Refresh logic
// ------------------------------
function refresh() {
    let metadb = fb.IsPlaying ? fb.GetNowPlaying() : fb.GetFocusItem();
    if (!metadb) return;
    if (g_metadb && g_metadb.Path === metadb.Path) return;

    g_metadb = metadb;
    loadLog(metadb);
    window.Repaint();
}

function on_playback_new_track() { refresh(); }
function on_item_focus_change() { refresh(); }
function on_metadb_changed() { refresh(); }

refresh();