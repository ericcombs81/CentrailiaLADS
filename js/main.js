// main.js
const v = Date.now(); // dev cache-bust

document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll(".nav-bar a");

  async function loadPage(page) {
    const content = document.getElementById("content");
    content.classList.remove("loaded"); // fade out old content

    try {
      // cache-bust page HTML too
      const response = await fetch(`pages/${page}.php?v=${v}`, { cache: "no-store" });
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
    new URL("./point-sheet-averages-summary.js?v=${v}", import.meta.url)
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
}



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

  links.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const page = link.getAttribute("data-page");
      loadPage(page);
    });
  });

  // Load default page
  loadPage("student");
});

