(() => {
  "use strict";

  // Local presentation improvements only: no network requests, storage, analytics,
  // provider/model changes, or chat/routing behavior.
  const one = (selector, root = document) => root.querySelector(selector);

  function enhancePreview() {
    const sheet = one("#preview");
    const card = sheet && one(".card", sheet);
    const header = card && one(".hd", card);
    if (!card || !header || one(".kc-preview-tools", card)) return;

    const toolbar = document.createElement("div");
    toolbar.className = "kc-preview-tools";
    toolbar.innerHTML = `
      <button type="button" class="on" data-kc-action="refresh">Preview</button>
      <button type="button" data-kc-action="refresh" aria-label="Refresh preview">Refresh</button>
      <label class="viewport">
        <span class="hidden">Preview size</span>
        <select aria-label="Preview size">
          <option value="phone">Phone</option>
          <option value="tablet">Tablet</option>
          <option value="desktop">Desktop</option>
        </select>
      </label>`;
    header.insertAdjacentElement("afterend", toolbar);

    toolbar.addEventListener("click", (event) => {
      if (!event.target.closest('[data-kc-action="refresh"]')) return;
      const frame = one("#previewFrame", card);
      if (frame) frame.src = frame.src;
    });

    const select = one("select", toolbar);
    select.addEventListener("change", () => {
      const frame = one("#previewFrame", card);
      if (!frame) return;
      const width = { phone: "390px", tablet: "768px", desktop: "100%" }[select.value];
      frame.style.width = width;
      frame.style.maxWidth = "100%";
      frame.style.marginInline = "auto";
    });
  }

  function enhanceModelLibrary() {
    const library = one("#routing .routeLibrary");
    const heading = library && one(".routeTitleRow", library);
    if (!heading || one(".kc-add-model", library)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "kc-add-model";
    button.textContent = "+ Add model";
    heading.insertAdjacentElement("afterend", button);

    const note = document.createElement("p");
    note.className = "kc-local-note";
    note.textContent = "Add a model ID to a connected provider below. Configure or connect providers in Settings. These controls use the existing local model setup.";
    button.insertAdjacentElement("afterend", note);

    button.addEventListener("click", () => {
      const input = one("#addModel", library);
      if (!input) return;
      input.focus();
      input.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  function run() {
    enhancePreview();
    enhanceModelLibrary();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
})();
