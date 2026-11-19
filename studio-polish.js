(() => {
  "use strict";
  // Presentation/accessibility enhancements only. No network calls, storage,
  // telemetry, provider/model configuration, or data synchronization.
  const one = (selector, root = document) => root.querySelector(selector);

  function addLocalPrivacyIndicator() {
    const header = one(".main > header");
    if (!header || one(".kc-local-badge", header)) return;
    const badge = document.createElement("span");
    badge.className = "kc-local-badge";
    badge.setAttribute("role", "status");
    badge.setAttribute("aria-label", "Chats and memory are stored locally on this device");
    badge.title = "Chats and memory stay in this browser on this device. A cloud model provider receives a prompt only when you send it.";
    badge.innerHTML = '<i aria-hidden="true"></i><span>On this device</span>';
    const tabs = one(".seg2", header);
    if (tabs) tabs.insertAdjacentElement("afterend", badge);
    else header.appendChild(badge);
  }

  function enhancePreview() {
    const sheet = one("#preview");
    const card = sheet && one(".card", sheet);
    const header = card && one(".hd", card);
    if (!card || !header || one(".kc-preview-tools", card)) return;
    const toolbar = document.createElement("div");
    toolbar.className = "kc-preview-tools";
    toolbar.innerHTML = '<button type="button" class="on" aria-pressed="true">Preview</button><button type="button" data-kc-refresh aria-label="Refresh preview">Refresh</button><label class="viewport"><span class="hidden">Preview size</span><select aria-label="Preview size"><option value="phone">Phone</option><option value="tablet">Tablet</option><option value="desktop">Desktop</option></select></label>';
    header.insertAdjacentElement("afterend", toolbar);
    one("[data-kc-refresh]", toolbar).addEventListener("click", () => {
      const frame = one("#previewFrame", card);
      if (frame) frame.src = frame.src;
    });
    one("select", toolbar).addEventListener("change", event => {
      const frame = one("#previewFrame", card);
      if (!frame) return;
      frame.style.width = { phone: "390px", tablet: "768px", desktop: "100%" }[event.target.value];
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
    note.textContent = "Add a model ID to a connected provider below. Provider setup and credentials remain in this device’s existing Settings.";
    button.insertAdjacentElement("afterend", note);
    button.addEventListener("click", () => {
      const input = one("#addModel", library);
      if (input) { input.focus(); input.scrollIntoView({ block: "center", behavior: "smooth" }); }
    });
  }

  function run() {
    addLocalPrivacyIndicator();
    enhancePreview();
    enhanceModelLibrary();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
})();
