import { secureFetch } from './security.js';
import { initCsrf } from './security.js';

// main.js
const v = Date.now(); // dev cache-bust

document.addEventListener("DOMContentLoaded", () => {
  const pageLinks = document.querySelectorAll(".nav-bar a[data-page]");
  const helpVideoLinks = document.querySelectorAll(".nav-bar a[data-help-video]");

  function closeHelpVideo() {
    const overlay = document.getElementById("helpVideoOverlay");
    if (!overlay) return;

    const video = overlay.querySelector("video");
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }

    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("help-video-open");

    if (document.fullscreenElement === overlay) {
      const exitFullscreen = document.exitFullscreen?.();
      if (exitFullscreen && typeof exitFullscreen.catch === "function") {
        exitFullscreen.catch(() => {});
      }
    }
  }

  function ensureHelpVideoOverlay() {
    let overlay = document.getElementById("helpVideoOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "helpVideoOverlay";
    overlay.className = "help-video-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <button type="button" class="help-video-close" aria-label="Close tutorial video">Close</button>
      <video controls playsinline></video>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector(".help-video-close")?.addEventListener("click", closeHelpVideo);
    document.addEventListener("fullscreenchange", () => {
      if (overlay.classList.contains("open") && !document.fullscreenElement) {
        closeHelpVideo();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("open")) {
        closeHelpVideo();
      }
    });

    return overlay;
  }

  function openHelpVideo(src) {
    const overlay = ensureHelpVideoOverlay();
    const video = overlay.querySelector("video");
    if (!video) return;

    video.src = src;
    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("help-video-open");

    const fullscreen = overlay.requestFullscreen?.();
    if (fullscreen && typeof fullscreen.catch === "function") {
      fullscreen.catch(() => {});
    }

    const playback = video.play?.();
    if (playback && typeof playback.catch === "function") {
      playback.catch(() => {});
    }
  }

  async function loadPage(page) {
    const content = document.getElementById("content");
    content.classList.remove("loaded"); // fade out old content

    try {
      // cache-bust page HTML too
      const response = await secureFetch(`pages/${page}.php?v=${v}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Failed to load ${page}.php`);

      const html = await response.text();
      content.innerHTML = html;

      // Run page-specific JS
      if (page === "student") {
        const { initStudentPage } = await import(new URL(`./student.js?v=${v}`, import.meta.url));
        initStudentPage?.();

      } else if (page === "student-master") {
        const { initStudentMasterPage } = await import(new URL(`./student-master.js?v=${v}`, import.meta.url));
        initStudentMasterPage?.();

      } else if (page === "chart-behavior") {
        const { initChartByBehaviorPage } = await import(new URL(`./chart-behavior.js?v=${v}`, import.meta.url));
        initChartByBehaviorPage?.();

      } else if (page === "enrolled-dropped") {
        const { initEnrolledDroppedPage } = await import(new URL(`./enrolled-dropped.js?v=${v}`, import.meta.url));
        initEnrolledDroppedPage?.();

      } else if (page === "users") {
        const { initUsersPage } = await import(new URL(`./users.js?v=${v}`, import.meta.url));
        initUsersPage?.();

      } else if (page === "behavior") {
        const { initBehaviorPage } = await import(new URL(`./behavior.js?v=${v}`, import.meta.url));
        initBehaviorPage?.();

      } else if (page === "custom-behavior") {
        const { initCustomizeBehaviorsPage } = await import(new URL(`./custom-behavior.js?v=${v}`, import.meta.url));
        initCustomizeBehaviorsPage?.();
      } else if (page === "point-sheet-averages") {
  const { initPointSheetAveragesPage } = await import(new URL(`./point-sheet-averages.js?v=${v}`, import.meta.url));
  initPointSheetAveragesPage?.();
} else if (page === "point-sheet-averages-summary") {
  const { initPointSheetAveragesSummaryPage } = await import(
    new URL(`./point-sheet-averages-summary.js?v=${v}`, import.meta.url)
  );
  initPointSheetAveragesSummaryPage?.();
} else if (page === "mass-comment") {
  const { initMassCommentPage } = await import(new URL(`./mass-comment.js?v=${v}`, import.meta.url));
  initMassCommentPage?.();
} else if (page === "report-point-sheets") {
  const { initReportPointSheetsPage } = await import(
    new URL(`./report-point-sheets.js?v=${v}`, import.meta.url)
  );
  initReportPointSheetsPage?.();
} else if (page === "calendar") {
  const { initCalendarPage } = await import(new URL(`./calendar.js?v=${v}`, import.meta.url));
  initCalendarPage?.(); }



      // Fade-in
      requestAnimationFrame(() => content.classList.add("loaded"));

      // Update active nav
      document.querySelectorAll(".nav-bar a").forEach(l => l.classList.remove("active"));
      document.querySelector(`[data-page="${page}"]`)?.classList.add("active");

    } catch (err) {
      console.error(err);
      content.innerHTML = `<p style="color:red;">Error loading page: ${page}.php</p>`;
      content.classList.add("loaded");
    }
  }

  pageLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const page = link.getAttribute("data-page");
      loadPage(page);
    });
  });

  helpVideoLinks.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      openHelpVideo(link.getAttribute("data-help-video") || link.href);
    });
  });

  // Initialize CSRF token for API calls
  initCsrf();

  // Load default page
  loadPage("student");
});
