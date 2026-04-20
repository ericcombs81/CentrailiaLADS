(() => {
  const form = document.getElementById("cpForm");
  const errBox = document.getElementById("cpError");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    errBox.style.display = "none";
    errBox.textContent = "";

    const fd = new FormData(form);
    const csrf = form.querySelector('input[name="csrf_token"]')?.value || "";

    let res;
    try {
      res = await fetch("api/users/change_password.php?v=" + Date.now(), {
        method: "POST",
        body: fd,
        credentials: "include",
        headers: csrf ? { "X-CSRF-Token": csrf } : {}
      });
    } catch (err) {
      errBox.style.display = "block";
      errBox.textContent = "Network error. Please try again.";
      return;
    }

    const json = await res.json().catch(() => null);
    if (!json) {
      errBox.style.display = "block";
      errBox.textContent = "Server error. Please contact an administrator.";
      return;
    }

    if (!json.ok) {
      errBox.style.display = "block";
      errBox.textContent = json.error || "Unable to change password.";
      return;
    }

    window.location.href = "index.php";
  });
})();