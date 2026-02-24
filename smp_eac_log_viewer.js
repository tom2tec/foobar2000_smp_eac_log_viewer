// ==================================================
// EAC Log Viewer - DUI Theme
// Version: 1.1.0
// Author/Attribution: audio-file.org & ChatGPT
// License: MIT
// ==================================================
// MIT License
//
// Copyright (c) 2026 audio-file.org & ChatGPT
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

function getFolder(metadb) {
    let tf = fb.TitleFormat("%path%");
    let full = tf.EvalWithMetadb(metadb);
    return full.replace(/[^\\]+$/, "");
}

// ------------------------------
// Log resolution
// ------------------------------
function resolveLogPath(metadb) {
    if (!metadb) return null;

    let folder = getFolder(metadb);

    let tfAlbum = fb.TitleFormat("$if2(%album%,Unknown Album)");
    let album = sanitize(tfAlbum.EvalWithMetadb(metadb));
    let albumLog = folder + album + ".log";
    if (utils.FileTest(albumLog, "e")) return albumLog;

    let tfFallback = fb.TitleFormat("$if2(%artist%,Unknown Artist) - $if2(%album%,Unknown Album)");
    let fallback = sanitize(tfFallback.EvalWithMetadb(metadb));
    let fallbackLog = folder + fallback + ".log";
    if (utils.FileTest(fallbackLog, "e")) return fallbackLog;

    let eacLog = folder + "EAC.log";
    if (utils.FileTest(eacLog, "e")) return eacLog;

    return null;
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

    let logPath = resolveLogPath(metadb);

    if (!logPath) {
        g_lines = [
            "EAC log not found.",
            "",
            "Tried:",
            "%album%.log",
            "%artist% - %album%.log",
            "EAC.log"
        ];
        g_lineColors = Array(g_lines.length).fill(DUI_TEXT);
        return;
    }

    try {
        let raw = utils.ReadTextFile(logPath).replace(/\r/g, "");
        g_lines = raw.split("\n");
        g_lineColors = Array(g_lines.length).fill(DUI_TEXT);

        // extract summary line
        let summaryLine = "";
        let summaryColor = DUI_TEXT;
        for (let i = g_lines.length - 1; i >= 0; i--) {
            let line = g_lines[i];
            if (line.includes("No errors occurred") || line.includes("Copy OK")) {
                summaryLine = "✔ SUCCESS: " + line;
                summaryColor = DUI_SUCCESS;
                break;
            } else if (line.includes("There were errors")) {
                summaryLine = "✖ ERROR: " + line;
                summaryColor = DUI_ERROR;
                break;
            }
        }

        // prepend summary line so it scrolls
        if (summaryLine) {
            g_lines.unshift(summaryLine);
            g_lineColors.unshift(summaryColor);
        }

    } catch (e) {
        g_lines = ["Error reading log:", "", e.toString()];
        g_lineColors = [DUI_ERROR, DUI_TEXT, DUI_ERROR];
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

        if (line.startsWith("Exact Audio Copy") || line.startsWith("Track")) color = DUI_HIGHLIGHT;

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