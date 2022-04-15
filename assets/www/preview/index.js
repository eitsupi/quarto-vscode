const vscode = acquireVsCodeApi();

function getSettings() {
  const element = document.getElementById("simple-browser-settings");
  if (element) {
    const data = element.getAttribute("data-settings");
    if (data) {
      return JSON.parse(data);
    }
  }

  throw new Error(`Could not load settings`);
}

const settings = getSettings();

const iframe = document.querySelector("iframe");
const header = document.querySelector(".header");
const input = header.querySelector(".url-input");
const forwardButton = header.querySelector(".forward-button");
const backButton = header.querySelector(".back-button");
const reloadButton = header.querySelector(".reload-button");
const openExternalButton = header.querySelector(".open-external-button");
const kQuartoPreviewReqId = "quartoPreviewReqId";
const kQuartoPreviewThemeCategory = "quartoPreviewThemeCategory";
let slideIndex = 0;

const updateAddressBar = (href) => {
  const url = new URL(href);
  url.searchParams.delete(kQuartoPreviewReqId);
  url.searchParams.delete(kQuartoPreviewThemeCategory);
  input.value = url.toString();
  vscode.setState({ url: url.toString() });
};

window.addEventListener("message", (e) => {
  switch (e.data.type || e.data.message) {
    case "navigate": {
      updateAddressBar(e.data.href);
      break;
    }
    case "focus": {
      iframe.focus();
      break;
    }
    case "setSlideIndex": {
      slideIndex = e.data.index || 0;
      break;
    }
    case "reveal-init": {
      // set the slide index
      const slides = e.data.data.slides;
      const slide = slides[slideIndex];
      if (slide) {
        e.source.postMessage(
          { message: "reveal-slide", data: slide },
          e.origin
        );
      }

      // let reveal know we are ready for additional messages
      e.source.postMessage({ message: "reveal-ready" }, e.origin);
      break;
    }
    case "reveal-hashchange": {
      updateAddressBar(e.data.data.href);
      break;
    }
    case "didChangeFocusLockIndicatorEnabled": {
      toggleFocusLockIndicatorEnabled(e.data.enabled);
      break;
    }

    case "didChangeActiveColorTheme": {
      navigateTo(input.value, e.data.theme);
      break;
    }
  }
});

function onceDocumentLoaded(f) {
  if (
    document.readyState === "loading" ||
    document.readyState === "uninitialized"
  ) {
    document.addEventListener("DOMContentLoaded", f);
  } else {
    f();
  }
}

onceDocumentLoaded(() => {
  setInterval(() => {
    const iframeFocused = document.activeElement.tagName === "IFRAME";
    document.body.classList.toggle("iframe-focused", iframeFocused);
  }, 50);

  iframe.addEventListener("load", () => {
    // Noop
  });

  input.addEventListener("change", (e) => {
    const url = e.target.value;
    navigateTo(url);
  });

  forwardButton.addEventListener("click", () => {
    history.forward();
  });

  backButton.addEventListener("click", () => {
    history.back();
  });

  openExternalButton.addEventListener("click", () => {
    vscode.postMessage({
      type: "openExternal",
      url: input.value,
    });
  });

  reloadButton.addEventListener("click", () => {
    // This does not seem to trigger what we want
    // history.go(0);

    // This incorrectly adds entries to the history but does reload
    // It also always incorrectly always loads the value in the input bar,
    // which may not match the current page if the user has navigated
    navigateTo(input.value);
  });

  navigateTo(settings.url);
  input.value = settings.url;

  toggleFocusLockIndicatorEnabled(settings.focusLockIndicatorEnabled);
});

function navigateTo(rawUrl, theme) {
  try {
    const url = new URL(rawUrl);

    // Try to bust the cache for the iframe
    // There does not appear to be any way to reliably do this except modifying the url
    url.searchParams.append(kQuartoPreviewReqId, Date.now().toString());

    // detect theme category
    theme =
      theme ||
      (document.body.classList.contains("vscode-light") ? "light" : "dark");
    url.searchParams.append(kQuartoPreviewThemeCategory, theme);

    iframe.src = url.toString();
  } catch {
    iframe.src = rawUrl;
  }

  vscode.setState({ url: rawUrl });
}

function toggleFocusLockIndicatorEnabled(enabled) {
  document.body.classList.toggle("enable-focus-lock-indicator", enabled);
}
