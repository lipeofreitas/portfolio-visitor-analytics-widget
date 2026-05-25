(function () {
  const DEFAULT_CONFIG = {
    apiUrl: "",
    siteId: "portfolio",
    mountSelector: "[data-visitor-widget]",
    storageKey: "ff_visitor_id"
  };

  window.FFVisitorWidget = {
    init(userConfig) {
      const config = { ...DEFAULT_CONFIG, ...(userConfig || {}) };
      const mount = document.querySelector(config.mountSelector);

      if (!mount || !config.apiUrl) {
        return;
      }

      mount.classList.add("ff-visitor-widget");
      mount.innerHTML = `
        <span class="ff-visitor-widget__count">Loading visits...</span>
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
    const countElement = mount.querySelector(".ff-visitor-widget__count");
    const countriesElement = mount.querySelector(".ff-visitor-widget__countries");

    if (!data?.ok) {
      countElement.textContent = "Visits unavailable";
      countriesElement.textContent = "";
      return;
    }

    countElement.textContent = `${formatCount(data.uniqueVisits)} unique visitors`;
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
})();
