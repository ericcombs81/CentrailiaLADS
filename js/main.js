const v = Date.now(); // dev only

document.addEventListener("DOMContentLoaded", () => {
  const content = document.getElementById("content");
  const links = document.querySelectorAll(".nav-bar a");

  async function loadPage(page) {
  const content = document.getElementById("content");
  content.classList.remove("loaded"); // fade out old content

  try {
    const response = await fetch(`pages/${page}.php`);
    if (!response.ok) throw new Error(`Failed to load ${page}.php`);
    const html = await response.text();

    content.innerHTML = html;

    // Run page-specific JS
    // Run page-specific JS
if (page === "student") {
  const { initStudentPage } = await import(new URL("./student.js?v=${v}", import.meta.url));
  initStudentPage();
} else if (page === "student-master") {
  const { initStudentMasterPage } = await import(
    new URL("./student-master.js?v=${v}", import.meta.url)
  );
  initStudentMasterPage?.();
} else if (page === "chart-behavior") {
  const { initChartByBehaviorPage } = await import(new URL("./chart-behavior.js?v=${v}", import.meta.url));
  initChartByBehaviorPage?.();
} else if (page === "enrolled-dropped") {
  const { initEnrolledDroppedPage } = await import(new URL("./enrolled-dropped.js?v=${v}", import.meta.url));
  initEnrolledDroppedPage?.();
} else if (page === "users") {
  const v = Date.now();
  const { initUsersPage } = await import(new URL(`./users.js?v=${v}`, import.meta.url));
  initUsersPage?.();
} else if (page === "behavior") {
  const v = Date.now();
  const { initBehaviorPage } = await import(new URL(`./behavior.js?v=${v}`, import.meta.url));
  initBehaviorPage?.();
}



    // Slight delay ensures layout and CSS are ready before fade-in
    requestAnimationFrame(() => content.classList.add("loaded"));

    // Update active nav
    document.querySelectorAll(".nav-bar a").forEach(l => l.classList.remove("active"));
    document.querySelector(`[data-page="${page}"]`).classList.add("active");
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
