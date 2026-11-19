(() => {
  "use strict";

  // Key Chat Studio presentation-only enhancements.
  // No fetch, storage, provider, model, or telemetry behavior is added here.

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function enhancePreview() {
    const preview = $("#preview");
    if (!preview || $(".kc-preview-tools", preview)) return;

    const card = $(".card", preview);
    const header = $(".hd", card || preview);
    if (!card || !header) return;

    const bar = document.createElement("div");
    bar.className = "kc-preview-tools";
    bar.innerHTML = `
      <button class="kc-preview-tab on" type="button" data-kc-preview="preview">Preview</button>
      <button class="kc-preview-tab" type="button" data-kc-preview="code">Code</button>
      <button class="kc-preview-tab" type="button" data-kc-preview="refresh" aria-label="Refresh preview">Refresh</button>
      <label class="kc-preview-viewport">
        <span class="hidden">Preview width</span>
        <select class="field" aria-label="Preview width">
          <option value="phone">Phone</option>
          <option value="tablet">Tablet</option>
          <option value="desktop">Desktop</option>
        </select>
      </label>`;

    header.insertAdjacentElement("afterend", bar);

    bar.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-kc-preview]");
      if (!tab) return;

      $$(".kc-preview-tab", bar).forEach((item) => item.classList.toggle("on", item === tab));

      if (tab.dataset.kcPreview === "refresh") {
        const frame = $("#previewFrame");
        if (frame) frame.src = frame.src;
      }
    });

    const select = $("select", bar);
    select.addEventListener("change", () => {
      const frame = $("#previewFrame");
      if (!frame) return;
      const widths = { phone: "390px", tablet: "768px", desktop: "100%" };
      frame.style.width = widths[select.value] || "100%";
      frame.style.maxWidth = "100%";
      frame.style.marginInline = "auto";
    });
  }

  function enhanceModelLibrary() {
    const routing = $("#routing");
    if (!routing) return;

    const library = $(".routeLibrary", routing);
    if (!library || $(".kc-add-model", library)) return;

    const heading = $(".routeTitleRow", library);
    if (!heading) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "kc-add-model";
    button.textContent = "+ Add model";
    heading.insertAdjacentElement("afterend", button);

    const note = document.createElement("div");
    note.className = "kc-local-note";
    note.textContent = "Existing providers and custom/local model setup stay in your local app settings. This presentation control does not change routing or save credentials.";
    button.insertAdjacentElement("afterend", note);

    button.addEventListener("click", () => {
      const modelInput = $("#addModel");
      if (modelInput) {
        modelInput.focus();
        modelInput.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    });
  }

  function enhanceStudioProgress() {
    const usage = $("#aUsage");
    const tasks = $("#aTasks");
    if (!usage || !tasks || $(".kc-task-progress", tasks.parentElement)) return;

    const progress = document.createElement("div");
    progress.className = "kc-task-progress";
    progress.innerHTML = '<span>Studio task · on this device</span><i aria-label="Task progress"></i>';
    progress.style.setProperty("--kc-progress", "50%");
    tasks.insertAdjacentElement("afterend", progress);
  }

  function run() {
    enhancePreview();
    enhanceModelLibrary();
    enhanceStudioProgress();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
