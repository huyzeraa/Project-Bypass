// ==UserScript==
// @name         TaiFilePro Bypass
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Bypass TaiFilePro
// @author       Zeraa
// @match        *://link*.taifilepro.com/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-end
// ==/UserScript==
eval(fetch('https://raw.githubusercontent.com/huyzeraa/Project-Bypass/refs/heads/main/TaiFileProBeta.js'))
