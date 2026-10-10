// Your local Firebase initialization (keep this for Firestore, Email/Password auth, etc.)
import { auth, db, signInWithEmailAndPassword, createUserWithEmailAndPassword, collection, addDoc, serverTimestamp } from './firebase.js';

// Web auth functions you still use (like onAuthStateChanged or signOut)
import { onAuthStateChanged, signOut, signInAnonymously, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// The native plugin for Google Sign-In
//import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
let currentDashakamData = null;
let currentShlokaIndex = 0;
let currentScript = "devanagari";
let currentMeaningLang = "english";
let currentMeaningView = "summary";

// Practice & Loop States
let playbackMode = "continuous";
let repeatTarget = 3;
let currentLoopCount = 0;
let isSeeking = false;
let isLooping = false;
let isDashakamLoading = false;
let shlokaPlayTimer = null;
let currentLoggedKey = null;
let autoScrollEnabled = localStorage.getItem("narayaneeyam_autoscroll") !== "false"; // Default to true

// DOM Elements
const audio = document.getElementById("audio-engine");
const playBtn = document.getElementById("play-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const prevDashakamBtn = document.getElementById("prev-dashakam");
const nextDashakamBtn = document.getElementById("next-dashakam");
const prev10DashakamBtn = document.getElementById("prev-10-dashakam");
const next10DashakamBtn = document.getElementById("next-10-dashakam");

const seekBar = document.getElementById("seek-bar");
const currentTimeEl = document.getElementById("current-time");
const durationTimeEl = document.getElementById("duration-time");
const loopCounterEl = document.getElementById("loop-counter");

const modeSelect = document.getElementById("mode-select");
const repeatCountSelect = document.getElementById("repeat-count-select");
const padaSelect = document.getElementById("pada-select");
const padaPickerGroup = document.getElementById("pada-picker-group");

const dashakamBadge = document.getElementById("dashakam-number");
const sanskritTitleEl = document.getElementById("sanskrit-title");
const englishTitleEl = document.getElementById("english-title");
const shlokaIndicator = document.getElementById("shloka-indicator");
const speedSelect = document.getElementById("speed-select");
const meaningSection = document.getElementById("meaning-section");
const meaningContent = document.getElementById("meaning-content");
const splitWordsContainer = document.getElementById("split-words-container");
const dashakamSelect = document.getElementById("dashakam-select");
const shlokaSelect = document.getElementById("shloka-select");

const padaRows = [
  document.getElementById("pada-0"),
  document.getElementById("pada-1"),
  document.getElementById("pada-2"),
  document.getElementById("pada-3"),
];


function startShlokaPlayTimer() {
  clearShlokaPlayTimer();
  if (!currentDashakamData || !currentDashakamData.shlokas) return;

  const dashakamNum = currentDashakamData.dashakam;
  const shlokaNum = currentShlokaIndex + 1;
  const shlokaKey = `d${dashakamNum}_s${shlokaNum}`;

  if (currentLoggedKey === shlokaKey) return; // Already logged this shloka session

  shlokaPlayTimer = setTimeout(() => {
    if (audio && !audio.paused) {
      logUsageToFirestore(dashakamNum, shlokaNum, "play");
      currentLoggedKey = shlokaKey;
      console.log(`[LOGGED] Shloka played for 10s: ${shlokaKey}`);
    }
  }, 10000); // 10,000 milliseconds = 10 seconds
}

function clearShlokaPlayTimer() {
  if (shlokaPlayTimer) {
    clearTimeout(shlokaPlayTimer);
    shlokaPlayTimer = null;
  }
}

function formatTime(sec) {
  if (isNaN(sec)) return "00:00";
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function trackVersePlay(dashakamNum, shlokaNum) {
  if (typeof gtag === 'function') {
    gtag('event', 'play_verse', {
      dashakam_number: dashakamNum,
      shloka_number: shlokaNum
    });
  }
}
function getOrCreateUserId() {
  // Check if user saved a custom profile/login name
  const savedProfile = localStorage.getItem("narayaneeyam_user_profile");
  if (savedProfile) {
    return savedProfile; // Returns their email/name (e.g., "user_john@gmail.com")
  }

  // Otherwise, default to an anonymous generated ID
  let anonId = localStorage.getItem("narayaneeyam_anon_id");
  if (!anonId) {
    anonId = "anon_" + Math.random().toString(36).substring(2, 10);
    localStorage.setItem("narayaneeyam_anon_id", anonId);
  }
  return anonId;
}
function updateProfileUI() {
  const userId = localStorage.getItem("narayaneeyam_user_profile");
  const clearBtn = document.getElementById("clear-history-btn");
  const isLoggedIn = userId && userId !== "Anonymous";

  if (clearBtn) {
    clearBtn.style.display = isLoggedIn ? "block" : "none";
  }
}

function setupProfileModal() {
  const modal = document.getElementById("login-modal");
  const openBtn = document.getElementById("profile-btn");
  const saveBtn = document.getElementById("save-profile-btn");
  const closeBtn = document.getElementById("close-profile-btn");
  const skipBtn = document.getElementById("skip-profile-btn");
  const clearBtn = document.getElementById("clear-history-btn");
  const googleBtn = document.getElementById("google-signin-btn");
  const input = document.getElementById("user-email-input");
  const passwordInput = document.getElementById("user-password-input");

  if (!modal) {
    console.warn("Login modal element not found in DOM!");
    return;
  }

  if (openBtn) {
    openBtn.onclick = () => {
      if (input) input.value = localStorage.getItem("narayaneeyam_user_profile") || "";
      if (passwordInput) passwordInput.value = "";
      modal.style.display = "flex";
    };
  }

  if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";

  if (skipBtn) {
    skipBtn.onclick = async () => {
      try {
        await signInAnonymously(auth);
        localStorage.setItem("narayaneeyam_skip_prompt", "true");
        modal.style.display = "none";
        updateProfileUI();
      } catch (err) {
        console.warn("[ANON_AUTH_ERROR]", err);
        localStorage.setItem("narayaneeyam_skip_prompt", "true");
        modal.style.display = "none";
      }
    };
  }

  if (googleBtn) {
    googleBtn.onclick = async () => {
      try {
        const isNative = window.Capacitor && window.Capacitor.isNativePlatform();

        let userEmail = "";

        if (isNative) {
          // --- NATIVE ANDROID APP (Capacitor Plugin) ---
          const authPlugin = window.Capacitor?.Plugins?.FirebaseAuthentication;
          if (!authPlugin) {
            throw new Error("FirebaseAuthentication plugin is not available on this platform.");
          }
          const result = await authPlugin.signInWithGoogle();
          userEmail = result.user?.email || "user@google.com";
        } else {
          // --- WEB / VERCEL DEPLOYMENT (Firebase Web SDK Popup) ---
          const provider = new GoogleAuthProvider();
          const result = await signInWithPopup(auth, provider);
          userEmail = result.user?.email || "user@google.com";
        }

        localStorage.setItem("narayaneeyam_user_profile", userEmail);
        modal.style.display = "none";
        updateProfileUI();
        alert("Successfully signed in with Google!");
      } catch (err) {
        console.error("[GOOGLE_AUTH_ERROR]", err);
        alert("Google sign-in failed: " + err.message);
      }
    };
  }

  if (saveBtn) {
    saveBtn.onclick = async () => {
      const val = input.value.trim();
      const pwd = passwordInput ? passwordInput.value.trim() : "";

      if (!val) {
        alert("Please enter a valid user ID.");
        return;
      }

      if (!pwd) {
        alert("Please enter a password to secure your profile.");
        return;
      }

      try {
        const userCredential = await signInWithEmailAndPassword(auth, val, pwd);
        localStorage.setItem("narayaneeyam_user_profile", userCredential.user.email);
        modal.style.display = "none";
        updateProfileUI();
        alert("Successfully logged in!");
      } catch (loginErr) {
        try {
          const newUserCredential = await createUserWithEmailAndPassword(auth, val, pwd);
          localStorage.setItem("narayaneeyam_user_profile", newUserCredential.user.email);
          modal.style.display = "none";
          updateProfileUI();
          alert("Account created and logged in successfully!");
        } catch (createErr) {
          alert("Authentication failed: " + createErr.message);
        }
      }
    };
  }

  if (clearBtn) {
    clearBtn.onclick = async () => {
      if (confirm("Are you sure you want to sign out and clear your local session?")) {
        try {
          await signOut(auth);
          localStorage.removeItem("narayaneeyam_user_profile");
          modal.style.display = "none";
          updateProfileUI();
          alert("Signed out successfully.");
        } catch (err) {
          alert("Sign out failed: " + err.message);
        }
      }
    };
  }
}
function checkInitialProfilePrompt() {
  try {
    const savedProfile = localStorage.getItem("narayaneeyam_user_profile");
    const skipPrompt = localStorage.getItem("narayaneeyam_skip_prompt");
    const modal = document.getElementById("login-modal");

    if (!modal) return;

    if (!savedProfile && skipPrompt !== "true") {
      modal.style.display = "flex";
    } else {
      modal.style.display = "none";
    }
  } catch (err) {
    console.warn("Storage access restricted or unavailable:", err);
  }
}
async function logUsageToFirestore(dashakamNum, shlokaNum, actionType) {
  if (!auth.currentUser) return;
  try {
    await addDoc(collection(db, "users", auth.currentUser.uid, "activity"), {
      dashakam: dashakamNum,
      shloka: shlokaNum,
      action: actionType,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.warn("[FIRESTORE_LOG_ERROR]", err);
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMahapraana(text, script = "devanagari") {
  if (!text) return "";
  const clean = String(text).normalize("NFC");
  const normScript = String(script).toLowerCase().trim();

  // 1. Devanagari (Includes conjuncts like भ्रे, ध्र, थ्य, etc.)
  if (normScript === "devanagari" || /[\u0900-\u097F]/.test(clean)) {
    const aspirates = "[खघछझठढथधफभ]";
    const re = new RegExp(`(${aspirates}(?:[\\u094D][\\u0904-\\u0939]|[\\u0901-\\u0903\\u093A-\\u094F\\u0962\\u0963\\u093C])*)`, "g");
    return clean.replace(re, '<span class="mahapraana">$1</span>');
  }

  // 2. Malayalam
  if (normScript === "malayalam" || /[\u0D00-\u0D7F]/.test(clean)) {
    const malPatterns = [
      "ര്‍ത്ഥ്യ", "ര്‍ത്ഥാ", "സ്വഛ", "ബ്ധെ", "സ്ഥി", "സ്ഫു", "ദ്ഘ", "ദ്ധ", "ണ്ഠ",
      "ഛാ", "ഛ്", "ഛ്ച", "ഛ്ത", "സ്ഥ", "സ്ഫ", "ദ്ഭ", "ർഭ", "ബ്ധ", "ർഥ", "ഗ്ധ", "ന്ധ", "ഷ്ഠ",
      "ഖ", "ഘ", "ഛ", "ഝ", "ഠ", "ഢ", "ഥ", "ധ", "ഫ", "ഭ"
    ].sort((a, b) => b.length - a.length);

    const re = new RegExp(`(${malPatterns.map(escapeRegExp).join("|")})([\\u0D01-\\u0D03\\u0D3E-\\u0D4F\\u0D57\\u0D62\\u0D63]*)`, "g");
    return clean.replace(re, '<span class="mahapraana">$1$2</span>');
  }

  // 3. Tamil
  if (normScript === "tamil" || /[\u0B80-\u0BFF]/.test(clean)) {
    const tamPatterns = [
      "க²","கா²","கி²","கீ²","கு²","கூ²","கெ²","கே²","கை²","கொ²","கோ²","கௌ²",
      "க⁴","கா⁴","கி⁴","கீ⁴","கு⁴","கூ⁴","கெ⁴","கே⁴","கை⁴","கொ⁴","கோ⁴","கௌ⁴",
      "ச²","சா²","சி²","சீ²","சு²","சூ²","செ²","சே²","சை²","சொ²","சோ²","சௌ²",
      "ஜ⁴","ஜா⁴","ஜி⁴","ஜீ⁴","ஜு⁴","ஜூ⁴","ஜெ⁴","ஜே⁴","ஜை⁴","ஜொ⁴","ஜோ⁴","ஜௌ⁴",
      "ட²","டா²","டி²","டீ²","டு²","டூ²","டெ²","டே²","டை²","டொ²","டோ²","டௌ²",
      "ட⁴","டா⁴","டி⁴","டீ⁴","டு⁴","டூ⁴","டெ⁴","டே⁴","டை⁴","டொ⁴","டோ⁴","டௌ⁴",
      "த²","தா²","தி²","தீ²","து²","தூ²","தெ²","தே²","தை²","தொ²","தோ²","தௌ²",
      "த⁴","தா⁴","தி⁴","தீ⁴","து⁴","தூ⁴","தெ⁴","தே⁴","தை⁴","தொ⁴","தோ⁴","தௌ⁴",
      "ப²","பா²","பி²","பீ²","பு²","பூ²","பெ²","பே²","பை²","பொ²","போ²","பௌ²",
      "ப⁴","பா⁴","பி⁴","பீ⁴","பு⁴","பூ⁴","பெ⁴","பே⁴","பை⁴","பொ⁴","போ⁴","பௌ⁴",
      "ஸ்த²","ஸ்தா²","ஸ்தി²","ஸ்தீ²","ஸ்து²","ஸ்தூ²","ஸ்தெ²","ஸ்தே²","ஸ்தை²","ஸ்தொ²","ஸ்தோ²","ஸ்தௌ²",
      "ஸ்ப²","ஸ்பா²","ஸ்பി²","ஸ்பீ²","ஸ்பு²","ஸ்பூ²","ஸ்பெ²","ஸ்பே²","ஸ்பை²","ஸ்பொ²","ஸ்போ²","ஸ்பௌ²",
      "த்ப²","த்பா²","த்பി²","த்பீ²","த்பு²","த்பூ²","த்பெ²","த்பே²","த்பை²","த்பொ²","த்போ²","த்பௌ²",
      "த்க²","த்கா²","த்கி²","த்கீ²","த்கு²","த்கூ²","த்கெ²","த்கே²","த்கை²","த்கொ²","த்கோ²","த்கௌ²",
      "த்த²","த்தா²","த்தி²","த்தீ²","த்து²","த்தூ²","த்தெ²","த்தே²","த்தை²","த்தொ²","த்தோ²","த்தௌ²",
      "ண்ட²","ண்டா²","ண்டி²","ண்டீ²","ண்டு²","ண்டூ²","ண்டெ²","ண்டே²","ண்டை²","ண்டொ²","ண்டோ²","ண்டௌ²",
      "சா²","ச்²","ஸ்வச²","ச்ச²","ச்த²","ச்தா²","ச்தി²","ச்தீ²","ச்து²","ச்தூ²","ச்தெ²","ச்தே²","ச்தை²","ச்தொ²","ச்தோ²","ச்தௌ²",
      "ர்ப²","ர்பா²","ர்பി²","ர்பீ²","ர்பு²","ர்பூ²","ர்பெ²","ர்பே²","ர்பை²","ர்பொ²","ர்போ²","ர்பௌ²",
      "ப்த²","ப்தா²","ப்தി²","ப்தீ²","ப்து²","ப்தூ²","ப்தெ²","ப்தே²","ப்தை²","ப்தொ²","ப்தோ²","ப்தௌ²",
      "ர்த²","ர்தா²","ர்தി²","ர்தீ²","ர்து²","ர்தூ²","ர்தெ²","ர்தே²","ர்தை²","ர்தொ²","ர்தோ²","ர்தௌ²",
      "க்த²","க்தா²","க்தி²","க்தீ²","க்து²","க்தூ²","க்தெ²","க்தே²","க்தை²","க்தொ²","க்தோ²","க்தௌ²",
      "ந்த²","ந்தா²","ந்தி²","ந்தீ²","ந்து²","ந்தூ²","ந்தெ²","ந்தே²","ந்தை²","ந்தொ²","ந்தோ²","ந்தௌ²",
      "ர்த்திய²","ர்த்தியா²","ர்த்தா²","ஷ்ட²"
    ].sort((a, b) => b.length - a.length);

    const re = new RegExp(tamPatterns.map(escapeRegExp).join("|"), "g");
    return clean.replace(re, (m) => `<span class="mahapraana">${m}</span>`);
  }

  // 4. IAST / Roman transliteration
  if (
    normScript === "iast" ||
    normScript === "english" ||
    normScript === "transliteration"
  ) {
    const engPatterns = [
      "cch", "chh", "jh",
      "kh", "gh",
      "ṭh", "ḍh",
      "th", "dh",
      "ph", "bh"
    ].sort((a, b) => b.length - a.length);

    const re = new RegExp(`(${engPatterns.map(escapeRegExp).join("|")})`, "gi");
    return clean.replace(re, '<span class="mahapraana">$1</span>');
  }

  return clean;
}

function renderShloka() {
  if (!currentDashakamData || !currentDashakamData.shlokas) return;
  const shloka = currentDashakamData.shlokas[currentShlokaIndex];
  if (!shloka) return;

  if (shlokaIndicator) {
    shlokaIndicator.textContent = `Shloka ${shloka.shloka}`;
  }

  if (shlokaSelect) {
    shlokaSelect.value = currentShlokaIndex;
  }

  const scriptLines =
    (shloka.scripts && (shloka.scripts[currentScript] || shloka.scripts["devanagari"])) || [];

  padaRows.forEach((row, i) => {
    if (!row) return;
    const rawLine = scriptLines[i] || "";
    try {
      row.innerHTML = highlightMahapraana(rawLine, currentScript);
    } catch (e) {
      row.textContent = rawLine;
    }
    row.classList.remove("active");
  });

  if (meaningSection) {
    if (currentScript === "tamil") {
      meaningSection.style.display = "none";
    } else {
      meaningSection.style.display = "block";

      if (currentMeaningView === "summary") {
        if (meaningContent) {
          meaningContent.style.display = "block";
          meaningContent.textContent =
            shloka.meanings &&
            (currentMeaningLang === "english"
              ? shloka.meanings.english
              : shloka.meanings.malayalam) || "";
        }
        if (splitWordsContainer) splitWordsContainer.style.display = "none";
      } else {
        if (meaningContent) meaningContent.style.display = "none";
        if (splitWordsContainer) {
          splitWordsContainer.style.display = "flex";
          const splitList =
            (shloka.splitMeanings && (shloka.splitMeanings[currentScript] || shloka.splitMeanings.devanagari)) || [];

          if (splitList.length > 0) {
            splitWordsContainer.innerHTML = splitList
              .map(
                (s) => `
              <div class="split-row">
                <span class="split-word">${s.word}</span>
                <span class="split-def">${s.meaning}</span>
              </div>`
              )
              .join("");
          } else {
            splitWordsContainer.innerHTML = `
              <div class="split-row">
                <span class="split-def">No split meanings available for this verse.</span>
              </div>`;
          }
        }
      }
    }
  }

  updateLoopDisplay();
}

function updateLoopDisplay() {
  if (!loopCounterEl) return;
  if (playbackMode === "continuous") {
    loopCounterEl.textContent = "Mode: Continuous";
  } else {
    const targetLabel = repeatTarget === Infinity ? "∞" : repeatTarget;
    loopCounterEl.textContent = `Repetition: ${currentLoopCount + 1} / ${targetLabel}`;
  }
}

function highlightActivePada(time) {
  if (!currentDashakamData || !currentDashakamData.shlokas) return;
  const shloka = currentDashakamData.shlokas[currentShlokaIndex];
  if (!shloka || !shloka.padas) return;

  let activeFound = -1;
  shloka.padas.forEach((p, idx) => {
    if (time >= p.start && time < p.end) {
      activeFound = idx;
    }
  });

  padaRows.forEach((row, idx) => {
    if (!row) return;
    const isActive = (idx === activeFound);
    const wasActive = row.classList.contains("active");
    
    row.classList.toggle("active", isActive);

    // Auto-scroll only if explicitly enabled by the user
    if (autoScrollEnabled && isActive && !wasActive) {
      row.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  });
}

let targetLockTime = null;


function changeDashakamBy(delta, targetShlokaIndex = 0) {

  if (isDashakamLoading) {

    return;
  }
  if (!currentDashakamData) {

    return;
  }
  
  const current = currentDashakamData.dashakam;
  const target = Math.min(Math.max(current + delta, 1), 100);


  if (target !== current) {
    if (audio) {

      audio.pause();
    }
    loadDashakam(target, targetShlokaIndex);
  } else {

  }
}

function setupEventListeners() {
  if (playBtn && audio) {
    playBtn.onclick = () => {
      if (audio.paused) {
        audio.play().catch((err) => console.warn("[UI_EVENT] play() rejected:", err));
      } else {
        audio.pause();
      }
    };
  }

  if (audio) {
    audio.addEventListener("play", () => {
      if (playBtn) playBtn.textContent = "⏸";
      startShlokaPlayTimer();
    });

    audio.addEventListener("pause", () => {
      if (playBtn) playBtn.textContent = "▶";
      clearShlokaPlayTimer();
    });

    audio.addEventListener("seeking", () => {
      clearShlokaPlayTimer();
    });

    audio.addEventListener("seeked", () => {
    });

    audio.addEventListener("loadedmetadata", () => {
      if (durationTimeEl) durationTimeEl.textContent = formatTime(audio.duration);
      if (seekBar) seekBar.max = Math.floor(audio.duration);
    });

    audio.addEventListener("canplaythrough", () => {
    });

    // --- Added: Full Track Completion ---
    audio.addEventListener("ended", () => {
      recordRecitationCompleted();
      if (currentDashakamData && currentDashakamData.dashakam < 100) {
        changeDashakamBy(1);
      }
    });

    audio.addEventListener("timeupdate", () => {
      const cur = audio.currentTime;
      const shloka = currentDashakamData && currentDashakamData.shlokas[currentShlokaIndex];
      
      if (!shloka) return;

      if (isSeeking) {
        if (targetLockTime === null || Math.abs(cur - targetLockTime) < 0.3) {
          isSeeking = false;
          targetLockTime = null;
        } else {
          return;
        }
      }

      if (seekBar) seekBar.value = Math.floor(cur);
      if (currentTimeEl) currentTimeEl.textContent = formatTime(cur);

      highlightActivePada(cur);

      if (playbackMode === "loop-shloka") {
        if (isLooping && cur < shloka.end - 0.5) {
          isLooping = false;
        }

        if (cur >= shloka.end && !isLooping) {
          isLooping = true;
          currentLoopCount++;
          if (currentLoopCount < repeatTarget) {
            isSeeking = true;
            targetLockTime = shloka.start; // <-- FIXED: Set targetLockTime
            audio.currentTime = shloka.start;
            audio.play().catch(() => {});
          } else {
            currentLoopCount = 0;
            isLooping = false;

            // --- Added: Loop Mode Chapter Completion ---
            if (currentDashakamData && currentDashakamData.shlokas && currentShlokaIndex === currentDashakamData.shlokas.length - 1) {
              recordRecitationCompleted();
            }

            jumpToShloka(currentShlokaIndex + 1);
          }
          updateLoopDisplay();
        }
      } else if (playbackMode === "loop-pada") {
        const selectedPadaIdx = parseInt(padaSelect ? padaSelect.value : 0, 10) || 0;
        const pada = shloka.padas && shloka.padas[selectedPadaIdx];

        if (!pada) return;

        if (isLooping && cur < pada.end - 0.5) {
          isLooping = false;
        }

        if (cur >= pada.end && !isLooping) {
          isLooping = true;
          currentLoopCount++;

          if (currentLoopCount < repeatTarget) {
            // Repeat the current pada with proper seek protection
            isSeeking = true;
            targetLockTime = pada.start; // <-- FIXED: Set targetLockTime so top guard waits for seek
            audio.currentTime = pada.start;
            audio.play().catch(() => {});
          } else {
            // Target reached! Reset count and advance to the next pada or shloka
            currentLoopCount = 0;
            isLooping = false;

            if (shloka.padas && selectedPadaIdx < shloka.padas.length - 1) {
              // Move to the next pada in the same shloka
              const nextPadaIdx = selectedPadaIdx + 1;
              if (padaSelect) padaSelect.value = nextPadaIdx;
              
              isSeeking = true;
              targetLockTime = shloka.padas[nextPadaIdx].start; // <-- FIXED: Set targetLockTime for next pada
              audio.currentTime = shloka.padas[nextPadaIdx].start;
              audio.play().catch(() => {});
            } else {
              // If it's the last pada of the shloka, move to the next shloka
              if (padaSelect) padaSelect.value = 0;
              jumpToShloka(currentShlokaIndex + 1);
            }
          }
          updateLoopDisplay();
        }
      } else {
        if (targetLockTime !== null) {
          if (cur >= targetLockTime - 0.5) {
            targetLockTime = null;
          } else {
            return;
          }
        }

        if (cur < shloka.start || cur >= shloka.end) {
          const foundIdx = currentDashakamData.shlokas.findIndex(
            (s) => cur >= s.start && cur < s.end
          );

          if (foundIdx !== -1 && foundIdx !== currentShlokaIndex) {
            currentShlokaIndex = foundIdx;
            renderShloka();
          }
        }
      }
    });
  }

  if (seekBar && audio) {
    seekBar.addEventListener("input", () => {
      isSeeking = true;
      if (currentTimeEl) currentTimeEl.textContent = formatTime(seekBar.value);
    });

    seekBar.addEventListener("change", () => {
      const targetTime = Number(seekBar.value);
      audio.currentTime = targetTime;
      isSeeking = false;
      targetLockTime = null;

      // Immediately find and switch to the correct shloka for this timestamp
      if (currentDashakamData && currentDashakamData.shlokas) {
        const foundIdx = currentDashakamData.shlokas.findIndex(
          (s) => targetTime >= s.start && targetTime < s.end
        );
        
        if (foundIdx !== -1) {
          currentLoopCount = 0;
          if (foundIdx !== currentShlokaIndex) {
            currentShlokaIndex = foundIdx;
            renderShloka();
          } else {
            highlightActivePada(targetTime);
          }
        }
      }
    });
  }

  if (prevBtn) {
    prevBtn.onclick = (e) => {
      e.preventDefault();
      jumpToShloka(currentShlokaIndex - 1);
    };
  }

  if (nextBtn) {
    nextBtn.onclick = (e) => {
      e.preventDefault();
      jumpToShloka(currentShlokaIndex + 1);
    };
  }

  if (prev10DashakamBtn) prev10DashakamBtn.onclick = (e) => { e.preventDefault(); console.log(`[UI_EVENT] -10 Dashakam clicked`); changeDashakamBy(-10); };
  if (prevDashakamBtn)   prevDashakamBtn.onclick   = (e) => { e.preventDefault(); console.log(`[UI_EVENT] -1 Dashakam clicked`); changeDashakamBy(-1); };
  if (nextDashakamBtn)   nextDashakamBtn.onclick   = (e) => { e.preventDefault(); console.log(`[UI_EVENT] +1 Dashakam clicked`); changeDashakamBy(1); };
  if (next10DashakamBtn) next10DashakamBtn.onclick = (e) => { e.preventDefault(); console.log(`[UI_EVENT] +10 Dashakam clicked`); changeDashakamBy(10); };
  
  padaRows.forEach((row, idx) => {
    if (!row) return;
    row.onclick = () => {
      if (!currentDashakamData || !currentDashakamData.shlokas) return;
      const shloka = currentDashakamData.shlokas[currentShlokaIndex];
      if (!shloka || !shloka.padas || !shloka.padas[idx]) return;

      const targetStart = shloka.padas[idx].start;

      if (typeof targetStart === "number" && audio) {
        isSeeking = true;
        audio.currentTime = targetStart;
        setTimeout(() => { isSeeking = false; }, 400);

        if (audio.paused) {
          audio.play().catch(() => {});
        }
      }

      if (playbackMode === "loop-pada") {
        if (padaSelect) padaSelect.value = idx;
        currentLoopCount = 0;
        updateLoopDisplay();
      }

      padaRows.forEach((r, i) => {
        if (r) r.classList.toggle("active", i === idx);
      });
    };
  });

  if (speedSelect && audio) {
    speedSelect.addEventListener("change", (e) => {
      audio.playbackRate = parseFloat(e.target.value);
    });
  }

  const scriptSelector = document.getElementById("script-selector");
  if (scriptSelector) {
    scriptSelector.onclick = (e) => {
      const scriptBtn = e.target.closest("[data-script]");
      if (!scriptBtn) return;

      document.querySelectorAll(".segment").forEach((btn) => btn.classList.remove("active"));
      scriptBtn.classList.add("active");
      currentScript = scriptBtn.dataset.script;

      if (currentScript === "malayalam") {
        currentMeaningLang = "malayalam";
      } else {
        currentMeaningLang = "english";
      }

      if (currentMeaningView === "summary") {
        document.querySelectorAll(".meaning-tab").forEach((tab) => {
          if (tab.dataset.view === "summary") {
            tab.classList.toggle("active", tab.dataset.lang === currentMeaningLang);
          } else {
            tab.classList.remove("active");
          }
        });
      }

      renderShloka();
    };
  }

  document.querySelectorAll(".meaning-tab").forEach((tab) => {
    tab.onclick = (e) => {
      document.querySelectorAll(".meaning-tab").forEach((t) => t.classList.remove("active"));
      e.target.classList.add("active");

      currentMeaningView = e.target.dataset.view;
      if (e.target.dataset.lang) {
        currentMeaningLang = e.target.dataset.lang;
      }
      renderShloka();
    };
  });

  if (modeSelect) {
    modeSelect.addEventListener("change", (e) => {
      playbackMode = e.target.value;
      currentLoopCount = 0;
      if (padaPickerGroup) {
        padaPickerGroup.style.display = playbackMode === "loop-pada" ? "flex" : "none";
      }

      const shloka = currentDashakamData && currentDashakamData.shlokas[currentShlokaIndex];
      if (shloka && audio) {
        if (playbackMode === "loop-shloka") {
          audio.currentTime = shloka.start;
        } else if (playbackMode === "loop-pada" && shloka.padas) {
          const pIdx = parseInt(padaSelect ? padaSelect.value : 0, 10) || 0;
          if (shloka.padas[pIdx]) {
            audio.currentTime = shloka.padas[pIdx].start;
          }
        }
      }
      updateLoopDisplay();
    });
  }

  if (padaSelect) {
    padaSelect.addEventListener("change", (e) => {
      const pIdx = parseInt(e.target.value, 10) || 0;
      const shloka = currentDashakamData && currentDashakamData.shlokas[currentShlokaIndex];
      if (shloka && shloka.padas && shloka.padas[pIdx] && audio) {
        audio.currentTime = shloka.padas[pIdx].start;
      }
      currentLoopCount = 0;
      updateLoopDisplay();
    });
  }

  if (repeatCountSelect) {
    repeatCountSelect.addEventListener("change", (e) => {
      repeatTarget = e.target.value === "Infinity" ? Infinity : parseInt(e.target.value, 10);
      currentLoopCount = 0;
      updateLoopDisplay();
    });
  }

  const aboutBtn = document.getElementById("about-btn");
  const aboutModal = document.getElementById("about-modal");
  const closeAboutBtn = document.getElementById("close-about-btn");

  if (aboutBtn && aboutModal && closeAboutBtn) {
    aboutBtn.onclick = () => { aboutModal.style.display = "flex"; };
    closeAboutBtn.onclick = () => { aboutModal.style.display = "none"; };
    aboutModal.onclick = (e) => {
      if (e.target === aboutModal) { aboutModal.style.display = "none"; }
    };
  }

  const exitBtn = document.getElementById("exit-btn");
  if (exitBtn) {
    exitBtn.onclick = (e) => {
      e.preventDefault();
      closeApp();
    };
  }

  const fullscreenBtn = document.getElementById("fullscreen-btn");
  if (fullscreenBtn) {
    fullscreenBtn.onclick = (e) => {
      e.stopPropagation();
      document.body.classList.toggle("fullscreen-verse-mode");
      const isFull = document.body.classList.contains("fullscreen-verse-mode");
      fullscreenBtn.textContent = isFull ? "Exit Fullscreen" : "[ ]";
      if (!isFull) {
        document.body.classList.remove("show-exit-controls");
      }
    };
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest(".modal-overlay")) return;

    if (!document.body.classList.contains("fullscreen-verse-mode")) return;
    const fullscreenBtn = document.getElementById("fullscreen-btn");
    
    if (e.target === fullscreenBtn || (fullscreenBtn && fullscreenBtn.contains(e.target))) {
      document.body.classList.remove("fullscreen-verse-mode", "show-exit-controls");
      if (fullscreenBtn) fullscreenBtn.textContent = "[ ]";
      return;
    }

    document.body.classList.toggle("show-exit-controls");
  });
}

function setupDashakamPicker(dashakamList) {
  const modal = document.getElementById("dashakam-modal");
  const openBtn = document.getElementById("open-dashakam-picker");
  const closeBtn = document.getElementById("close-dashakam-modal");
  const backBtn = document.getElementById("modal-back-btn");
  const modalTitle = document.getElementById("modal-title-text");
  const labelEl = document.getElementById("current-dashakam-label");
  const rangeBoxesView = document.getElementById("range-boxes-view");
  const dashakamsListView = document.getElementById("dashakams-list-view");

  if (!modal || !openBtn) return;

  function showRangesView() {
    if (backBtn) backBtn.style.display = "none";
    if (modalTitle) modalTitle.textContent = "Select Range";
    rangeBoxesView.style.display = "grid";
    dashakamsListView.style.display = "none";
  }

  function showDashakamsView(rangeIdx) {
    const start = rangeIdx * 10 + 1;
    const end = (rangeIdx + 1) * 10;

    if (backBtn) backBtn.style.display = "inline-flex";
    if (modalTitle) modalTitle.textContent = `Dashakams ${start}–${end}`;
    rangeBoxesView.style.display = "none";
    dashakamsListView.style.display = "flex";

    const items = dashakamList.filter(d => d.number >= start && d.number <= end);
    dashakamsListView.innerHTML = items.map(d => `
      <button class="dashakam-row-btn" data-number="${d.number}" style="
        background: var(--control-pill-bg);
        border: 1px solid var(--card-border);
        color: var(--text-main);
        padding: 12px;
        border-radius: 10px;
        text-align: left;
        cursor: pointer;
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        transition: background 0.15s ease;
      ">
        <strong style="color: var(--primary-accent); min-width: 36px;">D${d.number}</strong>
        <span style="flex: 1; font-size: 0.8rem; opacity: 0.9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${d.english}</span>
      </button>
    `).join("");

    dashakamsListView.querySelectorAll(".dashakam-row-btn").forEach(btn => {
      btn.onclick = () => {
        const num = parseInt(btn.dataset.number, 10);
        loadDashakam(num);
        modal.style.display = "none";
      };
    });
  }

  // Render the 10 Range Boxes (1-10, 11-20, etc.)
  rangeBoxesView.innerHTML = "";
  for (let i = 0; i < 10; i++) {
    const start = i * 10 + 1;
    const end = (i + 1) * 10;
    const box = document.createElement("button");
    box.className = "range-box-btn";
    box.innerHTML = `<span style="font-size: 0.9rem; font-weight: 700; color: var(--primary-accent);">Dashakams</span><span style="font-size: 1.1rem; font-weight: 800; margin-top: 2px;">${start}–${end}</span>`;
    box.style.cssText = `
      background: var(--control-pill-bg);
      border: 1px solid var(--card-border);
      color: var(--text-main);
      padding: 18px 12px;
      border-radius: 12px;
      text-align: center;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 2px;
      transition: transform 0.1s ease, background 0.15s ease;
    `;
    box.onclick = () => showDashakamsView(i);
    rangeBoxesView.appendChild(box);
  }

  openBtn.onclick = () => {
    modal.style.display = "flex";
    // Always start by showing the range boxes view when opened
    showRangesView();
  };

  if (backBtn) backBtn.onclick = showRangesView;
  if (closeBtn) closeBtn.onclick = () => modal.style.display = "none";
  modal.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

  window.updateDashakamLabel = function(num, englishTitle) {
    if (labelEl) {
      labelEl.textContent = `D${num}: ${englishTitle || ''}`;
    }
  };
}

function setupAutoHide() {
  let hideTimer = null;
  const hideDelay = 3000;

  function showControls() {
    document.body.classList.remove("hide-player");
    if (hideTimer) clearTimeout(hideTimer);

    if (audio && !audio.paused) {
      hideTimer = setTimeout(() => {
        const controller = document.querySelector(".floating-controller");
        const popoverOpen = document.getElementById("font-settings-popover")?.classList.contains("show");
        const modalOpen = document.getElementById("about-modal")?.style.display === "flex";

        if (popoverOpen || modalOpen) return;

        if (controller && !controller.matches(":hover")) {
          document.body.classList.add("hide-player");
        }
      }, hideDelay);
    }
  }

  window.addEventListener("mousemove", showControls);
  window.addEventListener("touchstart", showControls);

  if (audio) {
    audio.addEventListener("pause", () => {
      document.body.classList.remove("hide-player");
      if (hideTimer) clearTimeout(hideTimer);
    });
    audio.addEventListener("play", showControls);
  }
}

async function init() {
  try {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen) {
      window.Capacitor.Plugins.SplashScreen.hide();
    }
  } catch (e) {}

  registerServiceWorker();

  // Track App Sessions for In-App Review
  try {
    const currentSessions = parseInt(localStorage.getItem("nr_app_sessions") || "0", 10);
    localStorage.setItem("nr_app_sessions", (currentSessions + 1).toString());
  } catch (e) {
    console.warn("Session tracking error:", e);
  }

  initTheme();
  initTypography();
  setupProfileModal();
  
  let authInitialized = false;

  onAuthStateChanged(auth, (user) => {
    const modal = document.getElementById("login-modal");
    
    if (user) {
      localStorage.setItem("narayaneeyam_user_profile", user.email);
      if (modal) modal.style.display = "none";
    } else {
      if (!authInitialized) {
        checkInitialProfilePrompt();
      }
    }
    
    authInitialized = true;
    updateProfileUI();
  });

  try {
    const indexRes = await fetch("./data/dashakams_index.json");
    if (!indexRes.ok) {
      throw new Error(`Failed to load dashakams_index.json (Status: ${indexRes.status})`);
    }
    
    const dashakamList = await indexRes.json();

    // Initialize the new single-click modal grid picker
    setupDashakamPicker(dashakamList);

    if (shlokaSelect) {
      shlokaSelect.addEventListener("change", (e) => {
        const targetIdx = parseInt(e.target.value, 10);
        jumpToShloka(targetIdx);
      });
    }

    setupEventListeners();
    setupAutoHide();

    const saved = localStorage.getItem("narayaneeyam_progress");
    let restored = false;
    if (saved) {
      try {
        const p = JSON.parse(saved);
        await loadDashakam(p.dashakam, p.shlokaIndex);
        
        if (p.playbackMode) {
          playbackMode = p.playbackMode;
          if (modeSelect) modeSelect.value = playbackMode;
        }
        if (p.repeatTarget) {
          repeatTarget = p.repeatTarget;
          if (repeatCountSelect) repeatCountSelect.value = repeatTarget;
        }
        restored = true;
      } catch (e) {
        console.warn("[PROGRESS_RESTORE_ERROR]", e);
      }
    }

    if (!restored) {
      await loadDashakam(1, 0);
    }

    setupTuner();
    setupKeyboardShortcuts();
  } catch (err) {
    console.error("[INIT_FATAL_ERROR] App failed to initialize:", err);
    alert("Initialization Error: " + err.message);
  }
}
async function loadDashakam(number, targetShlokaIndex = 0) {
  if (isDashakamLoading) {
    return;
  }
  isDashakamLoading = true;

  // --- Sync Range Selector with Current Dashakam ---
  const targetRangeIdx = Math.floor((number - 1) / 10);
  const rangeSelect = document.getElementById("range-select");
  if (rangeSelect) {
    rangeSelect.value = targetRangeIdx;
    if (typeof window.updateDashakamDropdown === "function") {
      window.updateDashakamDropdown(targetRangeIdx, number);
    }
  }

  // 1. Initialize audio source synchronously to preserve iOS gesture token
  if (audio) {
    audio.pause();
    if (playBtn) playBtn.textContent = "▶";
    isSeeking = true;
    const audioPadded = String(number).padStart(3, "0");
    audio.src = `https://raw.githubusercontent.com/nivinaveen108/narayaneeyam/main/audio/Narayaneeyam_D${audioPadded}.mp3`;

    if (speedSelect) {
      audio.playbackRate = parseFloat(speedSelect.value);
    }
  }

  try {
    const padded = String(number).padStart(2, "0");
    // const jsonUrl = `./data/dashakam_${padded}.json`;
    const jsonUrl = `https://raw.githubusercontent.com/nivinaveen108/narayaneeyam-reciter/refs/heads/main/data/dashakam_${padded}.json`;

    const res = await fetch(jsonUrl);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    currentDashakamData = await res.json();

    if (typeof window.updateDashakamLabel === "function") {
      window.updateDashakamLabel(number, currentDashakamData.titleEnglish || currentDashakamData.english);
    }
    if (dashakamSelect) dashakamSelect.value = number;
    if (dashakamBadge) dashakamBadge.textContent = number;
    if (sanskritTitleEl) sanskritTitleEl.textContent = currentDashakamData.titleSanskrit || "";
    if (englishTitleEl) englishTitleEl.textContent = currentDashakamData.titleEnglish || "";

    if (shlokaSelect && currentDashakamData.shlokas) {
      shlokaSelect.innerHTML = currentDashakamData.shlokas
        .map((s, idx) => `<option value="${idx}">Shloka ${s.shloka}</option>`)
        .join("");
    }

    currentShlokaIndex = Math.min(targetShlokaIndex, currentDashakamData.shlokas.length - 1);
    currentLoopCount = 0;
    renderShloka();
    
    trackVersePlay(number, currentShlokaIndex + 1);
    logUsageToFirestore(number, currentShlokaIndex + 1, "play");
    
    const targetShloka = currentDashakamData.shlokas[currentShlokaIndex];

    // 2. Handle seek binding without re-assigning audio.src
    if (audio && targetShloka) {
      targetLockTime = targetShloka.start;
      
      let loadedFlag = false;
      const onReady = () => {
        if (loadedFlag) return;
        loadedFlag = true;
        audio.currentTime = targetShloka.start;
        audio.removeEventListener("canplaythrough", onReady);
        isSeeking = false;
        targetLockTime = null;
        isDashakamLoading = false;
      };

      if (audio.readyState >= 3) {
        onReady();
      } else {
        audio.addEventListener("canplaythrough", onReady);
        setTimeout(() => {
          if (!loadedFlag) onReady();
        }, 2000);
      }
    } else {
      isSeeking = false;
      isDashakamLoading = false;
    }

    preloadNextDashakam(number);
  } catch (err) {
    isDashakamLoading = false;
    isSeeking = false;
    console.error("[LOAD_ERROR] Failed to load Dashakam:", number, err);
    alert("Error loading Dashakam " + number + ": " + err.message);
  }
}
function jumpToShloka(index) {

currentLoggedKey = null;
clearShlokaPlayTimer();

  if (!currentDashakamData || !currentDashakamData.shlokas) {

    return;
  }

  if (index < 0) {

    if (currentDashakamData.dashakam > 1) changeDashakamBy(-1);
    return;
  }
  if (index >= currentDashakamData.shlokas.length) {

    if (currentDashakamData.dashakam < 100) changeDashakamBy(1);
    return;
  }

  currentShlokaIndex = index;
  currentLoopCount = 0;

  const targetShloka = currentDashakamData.shlokas[index];
  if (!targetShloka) {

    return;
  }



  if (shlokaSelect) shlokaSelect.value = currentShlokaIndex;
  renderShloka();

  if (audio) {
    isSeeking = true;
    targetLockTime = targetShloka.start;

    const performSeekAndPlay = () => {

      audio.currentTime = targetShloka.start;
      
      if (audio.paused) {

        audio.play().catch((err) => console.warn("[AUDIO_DEBUG] play() rejected:", err));
      } else {

      }

      setTimeout(() => {
        isSeeking = false;
        targetLockTime = null;

      }, 400);
    };


    if (audio.readyState >= 1) {
      performSeekAndPlay();
    } else {

      audio.addEventListener("loadedmetadata", performSeekAndPlay, { once: true });
    }
  }
}

function initTheme() {
  const toggleBtn = document.getElementById("theme-toggle");
  const themeIcon = document.getElementById("theme-icon");
  const themeText = document.getElementById("theme-text");

  if (!toggleBtn) return;

  const savedTheme = localStorage.getItem("reciter-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialTheme = savedTheme || (prefersDark ? "dark" : "light");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("reciter-theme", theme);

    if (themeIcon) themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
    if (themeText) themeText.textContent = theme === "dark" ? "Light" : "Dark";
  }

  applyTheme(initialTheme);

  toggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });
}

function initTypography() {
  const popoverBtn = document.getElementById("font-settings-btn");
  const popover = document.getElementById("font-settings-popover");
  const incBtn = document.getElementById("font-inc-btn");
  const decBtn = document.getElementById("font-dec-btn");
  const sizeLabel = document.getElementById("font-size-label");
  const fontChips = document.querySelectorAll(".font-chip");
  const autoScrollToggle = document.getElementById("autoscroll-toggle");

  if (!popoverBtn || !popover) return;

  const togglePopover = (e) => {
    e.stopPropagation();
    e.preventDefault();
    popover.classList.toggle("show");
  };

  popoverBtn.addEventListener("click", togglePopover);
  popoverBtn.addEventListener("touchstart", togglePopover, { passive: false });

  popover.addEventListener("click", (e) => e.stopPropagation());
  popover.addEventListener("touchstart", (e) => e.stopPropagation());

  const closePopover = (e) => {
    if (!popover.contains(e.target) && !popoverBtn.contains(e.target)) {
      popover.classList.remove("show");
    }
  };

  document.addEventListener("click", closePopover);
  document.addEventListener("touchstart", closePopover);

  let currentScale = parseFloat(localStorage.getItem("reciter-font-scale")) || 1.0;

  function updateFontSize(scale) {
    currentScale = Math.min(Math.max(scale, 0.8), 1.6);
    const baseSize = 1.35;
    document.documentElement.style.setProperty(
      "--verse-font-size",
      `${(baseSize * currentScale).toFixed(2)}rem`
    );
    if (sizeLabel) sizeLabel.textContent = `${Math.round(currentScale * 100)}%`;
    localStorage.setItem("reciter-font-scale", currentScale);
  }

  if (incBtn) incBtn.addEventListener("click", () => updateFontSize(currentScale + 0.1));
  if (decBtn) decBtn.addEventListener("click", () => updateFontSize(currentScale - 0.1));
  updateFontSize(currentScale);

  const savedFont = localStorage.getItem("reciter-font-family") || "sans";

  function setFontFamily(font) {
    document.body.classList.remove("font-sans", "font-serif", "font-scripture");
    document.body.classList.add(`font-${font}`);

    fontChips.forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.font === font);
    });

    localStorage.setItem("reciter-font-family", font);
  }

  fontChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      setFontFamily(chip.dataset.font);
      popover.classList.remove("show");
    });
  });

  setFontFamily(savedFont);

  // --- Auto-Scroll Toggle Setup ---
  autoScrollEnabled = localStorage.getItem("narayaneeyam_autoscroll") !== "false";
  
  if (autoScrollToggle) {
    autoScrollToggle.checked = autoScrollEnabled;
    autoScrollToggle.addEventListener("change", (e) => {
      autoScrollEnabled = e.target.checked;
      localStorage.setItem("narayaneeyam_autoscroll", autoScrollEnabled);
    });
  }
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js")
        .then((reg) => {
          reg.update();

          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                  window.location.reload();
                }
              };
            }
          };
        })
        .catch((err) => console.warn("Service Worker failed:", err));

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }
}

async function closeApp() {
  // 1. Save progress first
  saveProgress();

  // 2. Exit the app using Capacitor native API
  try {
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      await window.Capacitor.Plugins.App.exitApp();
    } else {
      window.close();
    }
  } catch (err) {

  }
}

async function preloadNextDashakam(currentNumber) {
  const nextNum = currentNumber + 1;
  if (nextNum > 100) return;

  const padded = String(nextNum).padStart(2, "0");
  const jsonUrl = `./data/dashakam_${padded}.json`;
  const audioPadded = String(nextNum).padStart(3, "0");
  //const audioUrl = `https://filedn.com/l9IDdY852i6RpBJQvovl9tY/narayaneeyam-audio/Narayaneeyam_D${audioPadded}.mp3`;
  const audioUrl = `https://raw.githubusercontent.com/nivinaveen108/narayaneeyam/main/audio/Narayaneeyam_D${audioPadded}.mp3`;
  
  try {
    await fetch(jsonUrl).catch(() => {});
  } catch (e) {}
}

let isTuneMode = false;
let recordedMarkers = [];
let localAdjustments = {};

function setupTuner() {
  const tunerBar = document.getElementById("tuner-bar");
  const markBtn = document.getElementById("mark-pada-btn");
  const resetBtn = document.getElementById("reset-tune-btn");
  const exportBtn = document.getElementById("export-adjustments-btn");

  if (!tunerBar) return;

  window.toggleTuneMode = function () {
    isTuneMode = !isTuneMode;
    tunerBar.style.display = isTuneMode ? "flex" : "none";
    recordedMarkers = [];
    updateTunerUI();
  };

  if (markBtn) markBtn.addEventListener("click", markPadaBoundary);
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      recordedMarkers = [];
      updateTunerUI();
    });
  }
  if (exportBtn) exportBtn.addEventListener("click", exportAdjustments);
}

function updateTunerUI() {
  const tunerStatus = document.getElementById("tuner-status");
  if (!tunerStatus) return;

  const count = recordedMarkers.length;
  if (count === 0) {
    tunerStatus.textContent = "Click 'Mark' or hit Space at Pada 1 start";
  } else if (count < 4) {
    tunerStatus.textContent = `Captured Line ${count} (${recordedMarkers[count - 1]}s). Next: Line ${count + 1}`;
  } else {
    tunerStatus.textContent = "All 4 lines captured! Ready to Save/Export.";
  }
}

function markPadaBoundary() {
  if (!isTuneMode || !currentDashakamData || !audio) return;
  const cur = parseFloat(audio.currentTime.toFixed(2));
  recordedMarkers.push(cur);

  if (recordedMarkers.length >= 4) {
    const shloka = currentDashakamData.shlokas[currentShlokaIndex];
    const boundaries = [...recordedMarkers];
    if (boundaries.length === 4) boundaries.push(shloka.end);

    const tuned = [];
    for (let i = 0; i < 4; i++) {
      tuned.push({
        padaIndex: i + 1,
        start: boundaries[i],
        end: boundaries[i + 1],
      });
    }

    shloka.padas = tuned;
    const key = `d${currentDashakamData.dashakam}_s${shloka.shloka}`;
    localAdjustments[key] = tuned;

    const tunerStatus = document.getElementById("tuner-status");
    if (tunerStatus) tunerStatus.textContent = `Recorded ${key}!`;
    renderShloka();
    return;
  }

  updateTunerUI();
}

function saveProgress() {
  try {
    const progressData = {
      dashakam: currentDashakamData ? currentDashakamData.dashakam : 1,
      shlokaIndex: currentShlokaIndex,
      playbackMode: playbackMode,
      repeatTarget: repeatTarget
    };
    localStorage.setItem("narayaneeyam_progress", JSON.stringify(progressData));
  } catch (e) {
    console.warn("LocalStorage write failed:", e);
  }
}
function exportAdjustments() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localAdjustments, null, 2));
  const dlAnchor = document.createElement("a");
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", "adjustments.json");
  dlAnchor.click();
}
// Rate App Logic via Capacitor Plugin
async function triggerInAppReview() {
  try {
    // Access Capacitor's global plugin registry
    const InAppReview = window.Capacitor?.Plugins?.InAppReview;
    if (InAppReview) {
      await InAppReview.requestReview();
    }
  } catch (err) {
    console.warn('In-app review request bypassed:', err);
  }
}

function checkAndPromptReview() {
  const DAYS_COOLDOWN = 30; // Minimum 30 days between prompt attempts
  const RECITATIONS_THRESHOLD = 8; // Prompt every 8 completed recitations/chapters

  const now = Date.now();
  const lastPromptTime = parseInt(localStorage.getItem('nr_last_rating_prompt') || '0', 10);
  const recitationsDone = parseInt(localStorage.getItem('nr_recitations_completed') || '0', 10);
  const sessionsCount = parseInt(localStorage.getItem('nr_app_sessions') || '0', 10);

  // Require at least 3 app opens first
  if (sessionsCount < 3) return;

  // Check 30-day cooldown
  const daysSincePrompt = (now - lastPromptTime) / (1000 * 60 * 60 * 24);
  if (lastPromptTime > 0 && daysSincePrompt < DAYS_COOLDOWN) return;

  // Check engagement threshold
  if (recitationsDone >= RECITATIONS_THRESHOLD) {
    triggerInAppReview();
    localStorage.setItem('nr_last_rating_prompt', now.toString());
    localStorage.setItem('nr_recitations_completed', '0');
  }
}

function recordRecitationCompleted() {
  const count = parseInt(localStorage.getItem('nr_recitations_completed') || '0', 10);
  localStorage.setItem('nr_recitations_completed', (count + 1).toString());
  checkAndPromptReview();
}

function setupKeyboardShortcuts() {
  window.addEventListener("keydown", (e) => {
    // 1. Handle Escape key for Fullscreen Mode first
    if (e.key === "Escape" && document.body.classList.contains("fullscreen-verse-mode")) {
      document.body.classList.remove("fullscreen-verse-mode", "show-exit-controls");
      const fullscreenBtn = document.getElementById("fullscreen-btn");
      if (fullscreenBtn) fullscreenBtn.textContent = "[ ]";
      return; // Exit early so it doesn't trigger other shortcuts
    }

    // 2. Ignore shortcuts if the user is typing in an input or select field
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;

    // 3. Handle Play/Pause, Tuning, and Verse Navigation shortcuts
    if (e.code === "Space") {
      e.preventDefault();
      if (isTuneMode) {
        markPadaBoundary();
      } else if (audio) {
        if (audio.paused) audio.play().catch(() => {});
        else audio.pause();
      }
    } else if (e.key.toLowerCase() === "t") {
      e.preventDefault();
      if (window.toggleTuneMode) window.toggleTuneMode();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      jumpToShloka(currentShlokaIndex + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      jumpToShloka(currentShlokaIndex - 1);
    }
  });
}

window.addEventListener("DOMContentLoaded", init);
