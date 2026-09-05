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

function formatTime(sec) {
  if (isNaN(sec)) return "00:00";
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMahapraana(text, script = "devanagari") {
  if (!text) return "";
  const clean = String(text).normalize("NFC");
  const normScript = String(script).toLowerCase().trim();

  // 1. Devanagari
  if (normScript === "devanagari" || /[\u0900-\u097F]/.test(clean)) {
    const aspirates = "[खघछझठढथधफभ]";
    const re = new RegExp(`(${aspirates}[\\u0901-\\u0903\\u093A-\\u094F\\u0962\\u0963]*)`, "g");
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
      "ஸ்த²","ஸ்தா²","ஸ்தி²","ஸ்தீ²","ஸ்து²","ஸ்தூ²","ஸ்தெ²","ஸ்தே²","ஸ்தை²","ஸ்தொ²","ஸ்தோ²","ஸ்தௌ²",
      "ஸ்ப²","ஸ்பா²","ஸ்பி²","ஸ்பீ²","ஸ்பு²","ஸ்பூ²","ஸ்பெ²","ஸ்பே²","ஸ்பை²","ஸ்பொ²","ஸ்போ²","ஸ்பௌ²",
      "த்ப²","த்பா²","த்பி²","த்பீ²","த்பு²","த்பூ²","த்பெ²","த்பே²","த்பை²","த்பொ²","த்போ²","த்பௌ²",
      "த்க²","த்கா²","த்கி²","த்கீ²","த்கு²","த்கூ²","த்கெ²","த்கே²","த்கை²","த்கொ²","த்கோ²","த்கௌ²",
      "த்த²","த்தா²","த்தி²","த்தீ²","த்து²","த்தூ²","த்தெ²","த்தே²","த்தை²","த்தொ²","த்தோ²","த்தௌ²",
      "ண்ட²","ண்டா²","ண்டி²","ண்டீ²","ண்டு²","ண்டூ²","ண்டெ²","ண்டே²","ண்டை²","ண்டொ²","ண்டோ²","ண்டௌ²",
      "சா²","ச்²","ஸ்வச²","ச்ச²","ச்த²","ச்தா²","ச்தி²","ச்தீ²","ச்து²","ச்தூ²","ச்தெ²","ச்தே²","ச்தை²","ச்தொ²","ச்தோ²","ச்தௌ²",
      "ர்ப²","ர்பா²","ர்பி²","ர்பீ²","ர்பு²","ர்பூ²","ர்பெ²","ர்பே²","ர்பை²","ர்பொ²","ர்போ²","ர்பௌ²",
      "ப்த²","ப்தா²","ப்தி²","ப்தீ²","ப்து²","ப்தூ²","ப்தெ²","ப்தே²","ப்தை²","ப்தொ²","ப்தோ²","ப்தௌ²",
      "ர்த²","ர்தா²","ர்தி²","ர்தீ²","ர்து²","ர்தூ²","ர்தெ²","ர்தே²","ர்தை²","ர்தொ²","ர்தோ²","ர்தௌ²",
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

    // Auto-scroll mobile view to center the newly active line
    if (isActive && !wasActive) {
      row.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  });
}

let targetLockTime = null;

function jumpToShloka(index) {
  if (!currentDashakamData || !currentDashakamData.shlokas) return;

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
  if (!targetShloka) return;

  if (shlokaSelect) shlokaSelect.value = currentShlokaIndex;
  renderShloka();

  if (audio) {
    isSeeking = true;
    targetLockTime = targetShloka.start;
    audio.currentTime = targetShloka.start;

    setTimeout(() => {
      isSeeking = false;
    }, 400);

    if (audio.paused) {
      audio.play().catch(() => {});
    }
  }
}

function changeDashakamBy(delta) {
  if (!currentDashakamData) return;
  const current = currentDashakamData.dashakam;
  const target = Math.min(Math.max(current + delta, 1), 100);
  if (target !== current) {
    if (audio) audio.pause();
    loadDashakam(target);
  }
}

function setupEventListeners() {
  if (playBtn && audio) {
    playBtn.onclick = () => {
      if (audio.paused) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    };
  }

  if (audio) {
    audio.addEventListener("play", () => {
      if (playBtn) playBtn.textContent = "⏸";
    });

    audio.addEventListener("pause", () => {
      if (playBtn) playBtn.textContent = "▶";
    });

    audio.addEventListener("loadedmetadata", () => {
      if (durationTimeEl) durationTimeEl.textContent = formatTime(audio.duration);
      if (seekBar) seekBar.max = Math.floor(audio.duration);
    });

    audio.addEventListener("timeupdate", () => {
      const cur = audio.currentTime;
      const shloka = currentDashakamData && currentDashakamData.shlokas[currentShlokaIndex];
      
      if (!shloka) return;

      if (isSeeking) return;

      if (seekBar) seekBar.value = Math.floor(cur);
      if (currentTimeEl) currentTimeEl.textContent = formatTime(cur);

      highlightActivePada(cur);

      if (playbackMode === "loop-shloka") {
        if (cur >= shloka.end) {
          currentLoopCount++;
          if (currentLoopCount < repeatTarget) {
            audio.currentTime = shloka.start;
            audio.play().catch(() => {});
          } else {
            currentLoopCount = 0;
            jumpToShloka(currentShlokaIndex + 1);
          }
          updateLoopDisplay();
        }
      } else if (playbackMode === "loop-pada") {
        const selectedPadaIdx = parseInt(padaSelect ? padaSelect.value : 0, 10) || 0;
        const pada = shloka.padas && shloka.padas[selectedPadaIdx];

        if (pada && (cur >= pada.end || cur < pada.start)) {
          currentLoopCount++;
          if (currentLoopCount < repeatTarget) {
            audio.currentTime = pada.start;
            audio.play().catch(() => {});
          } else {
            audio.pause();
            currentLoopCount = 0;
          }
          updateLoopDisplay();
        }
      } else {
        if (isSeeking) return;

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
      audio.currentTime = Number(seekBar.value);
      isSeeking = false;
      targetLockTime = null;
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

  if (prev10DashakamBtn) prev10DashakamBtn.onclick = (e) => { e.preventDefault(); changeDashakamBy(-10); };
  if (prevDashakamBtn)   prevDashakamBtn.onclick   = (e) => { e.preventDefault(); changeDashakamBy(-1); };
  if (nextDashakamBtn)   nextDashakamBtn.onclick   = (e) => { e.preventDefault(); changeDashakamBy(1); };
  if (next10DashakamBtn) next10DashakamBtn.onclick = (e) => { e.preventDefault(); changeDashakamBy(10); };

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
    aboutBtn.onclick = () => {
      aboutModal.style.display = "flex";
    };

    closeAboutBtn.onclick = () => {
      aboutModal.style.display = "none";
    };

    aboutModal.onclick = (e) => {
      if (e.target === aboutModal) {
        aboutModal.style.display = "none";
      }
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
  registerServiceWorker();
  initTheme();
  initTypography();

  try {
    const indexRes = await fetch("data/dashakams_index.json");
    if (indexRes.ok) {
      const dashakamList = await indexRes.json();

      if (dashakamSelect) {
        dashakamSelect.innerHTML = dashakamList
          .map(
            (d) => `<option value="${d.number}">Dashakam ${d.number} - ${d.english}</option>`
          )
          .join("");

        dashakamSelect.addEventListener("change", (e) => {
          loadDashakam(parseInt(e.target.value, 10));
        });
      }
    }

    if (shlokaSelect) {
      shlokaSelect.addEventListener("change", (e) => {
        const targetIdx = parseInt(e.target.value, 10);
        jumpToShloka(targetIdx);
      });
    }

    setupEventListeners();
    setupAutoHide();
    await loadDashakam(1);
    setupTuner();
    setupKeyboardShortcuts();
  } catch (err) {
    console.error("Failed to initialize Dashakams:", err);
  }
}

async function loadDashakam(number) {
  const padded = String(number).padStart(2, "0");
  const res = await fetch(`data/dashakam_${padded}.json`);
  currentDashakamData = await res.json();

  if (dashakamSelect) dashakamSelect.value = number;
  if (dashakamBadge) dashakamBadge.textContent = number;
  if (sanskritTitleEl) sanskritTitleEl.textContent = currentDashakamData.titleSanskrit || "";
  if (englishTitleEl) englishTitleEl.textContent = currentDashakamData.titleEnglish || "";

  if (shlokaSelect && currentDashakamData.shlokas) {
    shlokaSelect.innerHTML = currentDashakamData.shlokas
      .map((s, idx) => `<option value="${idx}">Shloka ${s.shloka}</option>`)
      .join("");
  }

  if (audio) {
    audio.src = currentDashakamData.audioPath;
    if (speedSelect) {
      audio.playbackRate = parseFloat(speedSelect.value);
    }
  }

  currentShlokaIndex = 0;
  currentLoopCount = 0;

  renderShloka();
  preloadNextDashakam(number);
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

  if (!popoverBtn || !popover) return;

  popoverBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    popover.classList.toggle("show");
  });

  popover.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.addEventListener("click", () => {
    popover.classList.remove("show");
  });

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
    });
  });

  setFontFamily(savedFont);
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

async function preloadNextDashakam(currentNumber) {
  const nextNum = currentNumber + 1;
  if (nextNum > 100) return;

  const padded = String(nextNum).padStart(2, "0");
  const jsonUrl = `data/dashakam_${padded}.json`;
  const audioPadded = String(nextNum).padStart(3, "0");
  const audioUrl = `audio/Narayaneeyam_D${audioPadded}.mp3`;

  try {
    fetch(jsonUrl);
    if ("caches" in window) {
      const audioCache = await caches.open("narayaneeyam-audio-v1");
      const matched = await audioCache.match(audioUrl);
      if (!matched) {
        fetch(audioUrl).then((res) => {
          if (res.status === 200) audioCache.put(audioUrl, res);
        }).catch(() => {});
      }
    }
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

function exportAdjustments() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localAdjustments, null, 2));
  const dlAnchor = document.createElement("a");
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", "adjustments.json");
  dlAnchor.click();
}

function setupKeyboardShortcuts() {
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("fullscreen-verse-mode")) {
      document.body.classList.remove("fullscreen-verse-mode", "show-exit-controls");
      const fullscreenBtn = document.getElementById("fullscreen-btn");
      if (fullscreenBtn) fullscreenBtn.textContent = "[ ]";
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;

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