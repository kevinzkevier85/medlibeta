#!/usr/bin/env node
// List every file in a shared Google Drive folder (recursively) with its file ID.
// Usage: node tools/drive-list.cjs <folder link or folder id> [--json]
// Reads drive_api_key from config.json itself and NEVER prints it.
// The key is restricted to websites, so requests send the local site as Referer.
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const REFERER = "http://localhost:8765/";

function loadKey() {
  // No config.json (cloud session): the network proxy adds the key to www.googleapis.com itself.
  if (!fs.existsSync(path.join(ROOT, "config.json"))) return "";
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config.json"), "utf8")); }
  catch (e) { fail("อ่าน config.json ไม่ได้ (ไม่มีไฟล์ หรือรูปแบบ JSON ผิด)"); }
  if (!cfg.drive_api_key) fail("ยังไม่ได้ใส่ drive_api_key ใน config.json");
  return cfg.drive_api_key;
}

function fail(msg) { console.error("ERROR: " + msg); process.exit(1); }

function folderIdFrom(arg) {
  if (!arg) fail("ต้องใส่ลิงก์โฟลเดอร์หรือรหัสโฟลเดอร์");
  const m = arg.match(/folders\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : arg.trim();
}

async function listChildren(key, folderId) {
  const out = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime)",
      pageSize: "1000",
      orderBy: "name",
    });
    if (key) params.set("key", key);
    if (pageToken) params.set("pageToken", pageToken);
    const r = await fetch("https://www.googleapis.com/drive/v3/files?" + params, { headers: { Referer: REFERER } });
    if (!r.ok) {
      let reason = "";
      try { const j = await r.json(); reason = (j.error && (j.error.message || j.error.status)) || ""; } catch {}
      fail(`Google ตอบกลับ ${r.status}: ${(key ? reason.replace(key, "<key>") : reason)}`);
    }
    const j = await r.json();
    out.push(...j.files);
    pageToken = j.nextPageToken || "";
  } while (pageToken);
  return out;
}

async function walk(key, folderId, prefix, acc) {
  for (const f of await listChildren(key, folderId)) {
    const p = prefix ? prefix + "/" + f.name : f.name;
    if (f.mimeType === "application/vnd.google-apps.folder") await walk(key, f.id, p, acc);
    else acc.push({ path: p, id: f.id, mimeType: f.mimeType, size: f.size ? Number(f.size) : null, modified: f.modifiedTime });
  }
  return acc;
}

(async () => {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const folderId = folderIdFrom(args.find(a => !a.startsWith("--")));
  const files = await walk(loadKey(), folderId, "", []);
  if (asJson) return console.log(JSON.stringify({ folder_id: folderId, files }, null, 2));
  console.log(`โฟลเดอร์ ${folderId}: ${files.length} ไฟล์`);
  for (const f of files) {
    const mb = f.size != null ? (f.size / 1048576).toFixed(1) + " MB" : "-";
    console.log(`${f.path}\t${f.id}\t${mb}\t${f.mimeType}`);
  }
})().catch(e => fail(String(e && e.message || e)));
