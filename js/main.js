document.addEventListener("DOMContentLoaded", () => {
  const content = document.getElementById("content");
  const links = document.querySelectorAll(".nav-bar a");

  async function loadPage(page) {
  const content = document.getElementById("content");
  content.classList.remove("loaded"); // fade out old content

  try {
    const response = await fetch(`pages/${page}.html`);
    if (!response.ok) throw new Error(`Failed to load ${page}.html`);
    const html = await response.text();

    content.innerHTML = html;

    // Run page-specific JS
    if (page === "student") {
      const module = await import(`../js/student.js`);
      module.initStudentPage();
    } 
    else if (page === "student-master") {
      const module = await import(`../js/student-master.js`);
      if (module.initStudentMasterPage) module.initStudentMasterPage();
    }

    // Slight delay ensures layout and CSS are ready before fade-in
    requestAnimationFrame(() => content.classList.add("loaded"));

    // Update active nav
    document.querySelectorAll(".nav-bar a").forEach(l => l.classList.remove("active"));
    document.querySelector(`[data-page="${page}"]`).classList.add("active");
  } catch (err) {
    console.error(err);
    content.innerHTML = `<p style="color:red;">Error loading page: ${page}.html</p>`;
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
