(function () {
  const DEFAULT_CONFIG = {
    apiUrl: "",
    siteId: "portfolio",
    mountSelector: "[data-visitor-widget]",
    storageKey: "ff_visitor_id"
  };

  let activeMount = null;
  let latestData = null;

  window.FFVisitorWidget = {
    init(userConfig) {
      const config = { ...DEFAULT_CONFIG, ...(userConfig || {}) };
      const mount = document.querySelector(config.mountSelector);

      if (!mount || !config.apiUrl) {
        return;
      }

      activeMount = mount;
      mount.classList.add("ff-visitor-widget");
      mount.innerHTML = `
        <span class="ff-visitor-widget__trend" aria-label="Week-over-week new unique visitors"></span>
        <span class="ff-visitor-widget__count">${isPortuguese() ? "Carregando visitas..." : "Loading visits..."}</span>
        <span class="ff-visitor-widget__countries" aria-label="Top visitor countries"></span>
      `;

      const visitorId = getOrCreateVisitorId(config.storageKey);

      fetch(`${config.apiUrl.replace(/\/$/, "")}/track`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          siteId: config.siteId,
          visitorId,
          path: window.location.pathname
        })
      })
        .then((response) => response.json())
        .then((data) => renderWidget(mount, data))
        .catch(() => renderWidget(mount, null));
    },

    refreshLanguage() {
      if (activeMount) renderWidget(activeMount, latestData);
    }
  };

  function getOrCreateVisitorId(storageKey) {
    try {
      const existingId = window.localStorage.getItem(storageKey);

      if (existingId) {
        return existingId;
      }

      const newId = createVisitorId();
      window.localStorage.setItem(storageKey, newId);
      return newId;
    } catch {
      return createVisitorId();
    }
  }

  function createVisitorId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    const randomValues = new Uint8Array(16);

    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(randomValues);
      return Array.from(randomValues, (value) => value.toString(16).padStart(2, "0")).join("");
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function renderWidget(mount, data) {
    latestData = data;
    const countElement = mount.querySelector(".ff-visitor-widget__count");
    const trendElement = mount.querySelector(".ff-visitor-widget__trend");
    const countriesElement = mount.querySelector(".ff-visitor-widget__countries");

    if (!data?.ok) {
      renderTrend(trendElement, null);
      countElement.textContent = isPortuguese() ? "Visitas indisponíveis" : "Visits unavailable";
      countriesElement.textContent = "";
      return;
    }

    renderTrend(trendElement, data.wow);
    countElement.textContent = `${formatCount(data.uniqueVisits)} ${isPortuguese() ? "Visitantes únicos" : "unique visitors"}`;
    countriesElement.innerHTML = data.countries
      .map((country) => {
        const flagUrl = countryCodeToFlagUrl(country.country);
        const label = countryCodeToName(country.country);
        return `
          <span class="ff-visitor-widget__country" title="${label}: ${country.visits}">
            ${flagUrl ? `<img src="${flagUrl}" alt="" aria-hidden="true">` : ""}
            <span>${formatCount(country.visits)}</span>
          </span>
        `;
      })
      .join("");
  }

  function renderTrend(element, wow) {
    if (!element) return;

    const change = Math.max(0, Number(wow?.change || 0));
    const trend = change > 0 ? "up" : "flat";
    const label = isPortuguese()
      ? "Novos visitantes únicos desde o último domingo"
      : "New unique visitors since last Sunday";

    element.className = `ff-visitor-widget__trend ff-visitor-widget__trend--${trend}`;
    element.title = label;
    element.innerHTML = trend === "flat"
      ? "<span>-</span>"
      : `
        <span class="ff-visitor-widget__trend-icon" aria-hidden="true"></span>
        <span>+${change}</span>
      `;
  }

  function countryCodeToFlagUrl(countryCode) {
    if (!/^[A-Z]{2}$/.test(countryCode) || countryCode === "XX") {
      return "";
    }

    return `https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`;
  }

  function countryCodeToName(countryCode) {
    const names = {
      BR: "Brazil",
      CA: "Canada",
      US: "United States"
    };

    return names[countryCode] || countryCode || "Unknown";
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("en-US").format(Number(value || 0));
  }

  function formatCount(value) {
    const number = Number(value || 0);
    return number < 100 ? String(number).padStart(2, "0") : formatNumber(number);
  }

  function isPortuguese() {
    return document.documentElement.lang?.toLowerCase().startsWith("pt");
  }
})();
