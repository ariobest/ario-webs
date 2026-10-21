(() => {
  "use strict";

  const toast = document.getElementById("toast");
  let toastTimer = null;

  const showToast = (message) => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 1600);
  };

  const fallbackCopy = (text) => {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-9999px";
    area.style.top = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    } finally {
      area.remove();
    }
    return copied;
  };

  const copyText = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fall through to the compatibility method.
      }
    }
    return fallbackCopy(text);
  };

  document.querySelectorAll(".copy-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const name = button.dataset.script?.trim();
      if (!name) return;

      const copied = await copyText(name);
      showToast(copied ? `"${name}" copied!` : `Script: ${name}`);
    });
  });

  const revealItems = document.querySelectorAll(".reveal");
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("visible"));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    revealItems.forEach((item) => observer.observe(item));
  }

  const particleLayer = document.querySelector(".particles");

  if (particleLayer && !reduceMotion) {
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
