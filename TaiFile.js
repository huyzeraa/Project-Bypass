// ==UserScript==
// @name         TaiFilePro Auto-Bypass Agent
// @namespace    http://tampermonkey.net/
// @version      3.7
// @description  Bypass TaiFilePro
// @author       Zeraa
// @match        *://link*.taifilepro.com/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      *
// @run-at       document-end
// ==/UserScript==
eval(fetch('https://raw.githubusercontent.com/huyzeraa/Project-Bypass/refs/heads/main/TaiFileProBeta.js'))
