/*
  One-time (re-runnable/idempotent) script: adds a "Blog" link into the
  header nav dropdown and the footer "Services" link list of every
  top-level page (homepage + all 13 city pages).

  Run with: node scripts/add-blog-nav-footer-links.js

  Line endings: files on disk are LF, but this normalizes CRLF->LF before
  matching and restores the file's original EOL style on write, so it
  won't silently no-op if a file's line endings ever drift to CRLF.
*/

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const FILES = [
  'index.html',
  'avon.html',
  'beech-grove.html',
  'brownsburg.html',
  'carmel.html',
  'fishers.html',
  'greenwood.html',
  'lawrence.html',
  'lebanon.html',
  'noblesville.html',
  'plainfield.html',
  'speedway.html',
  'westfield.html',
  'zionsville.html',
];

const NAV_FIND = '            <a href="#areas">Service Areas</a>\n            <a href="#quote">Get a Quote</a>';
const NAV_REPLACE = '            <a href="#areas">Service Areas</a>\n            <a href="/blog/">Blog</a>\n            <a href="#quote">Get a Quote</a>';

const FOOTER_FIND = '            <li><a href="#services">Commercial Power Washing</a></li>';
const FOOTER_REPLACE = '            <li><a href="#services">Commercial Power Washing</a></li>\n            <li><a href="/blog/">Blog</a></li>';

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

function processFile(filename) {
  const filePath = path.join(ROOT, filename);
  const raw = fs.readFileSync(filePath, 'utf8');
  const hadCRLF = raw.includes('\r\n');
  const normalized = raw.replace(/\r\n/g, '\n');

  const navCount = countOccurrences(normalized, NAV_FIND);
  const footerCount = countOccurrences(normalized, FOOTER_FIND);
  const alreadyHasBlogNav = normalized.includes('<a href="/blog/">Blog</a>');

  if (alreadyHasBlogNav) {
    console.log(`SKIP  ${filename}: Blog link already present`);
    return;
  }
  if (navCount !== 1) {
    throw new Error(`${filename}: expected exactly 1 nav match, found ${navCount}`);
  }
  if (footerCount !== 1) {
    throw new Error(`${filename}: expected exactly 1 footer match, found ${footerCount}`);
  }

  let updated = normalized.replace(NAV_FIND, NAV_REPLACE);
  updated = updated.replace(FOOTER_FIND, FOOTER_REPLACE);

  if (hadCRLF) updated = updated.replace(/\n/g, '\r\n');

  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`OK    ${filename}: nav + footer Blog link added`);
}

function main() {
  for (const filename of FILES) {
    processFile(filename);
  }
}

main();
