(() => {
  "use strict";

  const toast = document.getElementById("toast");
  let toastTimer;

  function showToast(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1600);
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } finally {
      area.remove();
    }
    return copied;
  }

  document.querySelectorAll(".copy-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const name = button.dataset.script;
      if (!name) return;

      try {
        const copied = await copyText(name);
        showToast(copied ? `"${name}" copied!` : `Script: ${name}`);
      } catch {
        showToast(`Script: ${name}`);
      }
    });
  });

  // Scroll reveal
  const revealItems = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("visible"));
  }

  // Decorative particles. Keep them lightweight and disable them for reduced motion.
  const particleLayer = document.querySelector(".particles");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (particleLayer && !reducedMotion) {
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 18; i += 1) {
      const dot = document.createElement("span");
      dot.className = "particle";
      dot.style.left = `${Math.random() * 100}vw`;
      dot.style.top = `${Math.random() * 100}vh`;
      dot.style.width = `${3 + Math.random() * 5}px`;
      dot.style.height = dot.style.width;
      dot.style.animationDelay = `${Math.random() * 3}s`;
      dot.style.animationDuration = `${4 + Math.random() * 5}s`;
      fragment.appendChild(dot);
    }

    particleLayer.appendChild(fragment);
  }
})();
