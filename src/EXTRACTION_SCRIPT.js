// Consolidated extraction script to run in browser context
const EXTRACTION_SCRIPT = () => {
  // Helper: generate unique ID
  // function makeId() {
  //   if (typeof crypto !== "undefined" && crypto.randomUUID)
  //     return crypto.randomUUID();
  //   return `id_${Date.now().toString(36)}_${Math.random()
  //     .toString(36)
  //     .slice(2, 10)}`;
  // }
  // Helper: generate consistent ID based on channel properties
  function makeId(url, name) {
    // Use stable properties: name + URL (or just URL if available)
    const stableString = `${name || ""}|${url || ""}`.toLowerCase().trim();

    // Simple hash function (djb2) - produces consistent results
    let hash = 5381;
    for (let i = 0; i < stableString.length; i++) {
      hash = (hash << 5) + hash + stableString.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Return as hex string with prefix
    return `ch_${Math.abs(hash).toString(16)}`;
  }

  // Extract group name from URL or page context
  function extractGroupName(url) {
    // Try to get group from URL parameters
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    let groupId = params.get("id");

    if (groupId) {
      // Map common group IDs to readable names
      const groupMap = {
        algeria: "algeria",
        bahrain: "bahrain",
        egypt: "egypt",
        iraq: "iraq",
        jordan: "jordan",
        kuwait: "kuwait",
        lebanon: "lebanon",
        libya: "libya",
        mauritanie: "mauritania",
        morocco: "morocco",
        oman: "oman",
        palestine: "palestine",
        qatar: "qatar",
        saudi: "saudi arabia",
        sudan: "sudan",
        syria: "syria",
        tunisia: "tunisia",
        uae: "uae",
        yemen: "yemen",
        somalia_tv: "somalia",
        arabic: "arabic",
        almajdtv: "almajd",
        kids_tv: "kids",
        shahid_mbc: "mbc",
        rotana_group: "rotana",
        artonline: "art",
        sports_live_tv: "sports",
        youtube_live: "youtube",
        "roya-channels-live": "roya",
      };

      return groupMap[groupId] || groupId;
    }

    // Try to extract from page title or other elements
    const pageTitle = document.title;
    if (pageTitle.includes("Algeria")) return "algeria";
    if (pageTitle.includes("Bahrain")) return "bahrain";
    if (pageTitle.includes("Egypt")) return "egypt";
    if (pageTitle.includes("Iraq")) return "iraq";
    if (pageTitle.includes("Jordan")) return "jordan";
    if (pageTitle.includes("Kuwait")) return "kuwait";
    if (pageTitle.includes("Lebanon")) return "lebanon";
    if (pageTitle.includes("Libya")) return "libya";
    if (pageTitle.includes("Mauritanie")) return "mauritania";
    if (pageTitle.includes("Morocco")) return "morocco";
    if (pageTitle.includes("Oman")) return "oman";
    if (pageTitle.includes("Palestine")) return "palestine";
    if (pageTitle.includes("Qatar")) return "qatar";
    if (pageTitle.includes("Saudi")) return "saudi arabia";
    if (pageTitle.includes("Sudan")) return "sudan";
    if (pageTitle.includes("Syria")) return "syria";
    if (pageTitle.includes("Tunisia")) return "tunisia";
    if (pageTitle.includes("UAE")) return "uae";
    if (pageTitle.includes("Yemen")) return "yemen";
    // Roya
    if (pageTitle.includes("Roya")) return "roya";
    // رؤيا
    if (pageTitle.includes("رؤيا")) return "roya";

    return "unknown";
  }

  // Extractor 1: mobile-live-stream pages
  function extractMobileLiveStream() {
    const cards = document.querySelectorAll(".card-link");
    const groupName = extractGroupName(window.location.href);

    if (cards.length === 0) {
      // Alternative: look for channel links directly
      const channelLinks = document.querySelectorAll('a[href*="tv/"]');
      const channelItems = [];

      channelLinks.forEach((link) => {
        const img = link.querySelector("img");
        if (
          img &&
          img.src &&
          link.href &&
          !link.href.includes("mobile-live-stream")
        ) {
          channelItems.push({
            url: link.href,
            iconUrl: img.src,
            name: link.textContent.trim() || img.alt,
            id: makeId(link.href, link.textContent.trim() || img.alt),
            groupName: groupName,
            isFavorite: false,
            source: "mobile-live-stream-alt",
            extractedAt: new Date().toISOString(),
          });
        }
      });

      return channelItems;
    }

    return Array.from(cards)
      .map((c) => {
        const img = c.querySelector("img");
        const header = c.querySelector(".card-header");

        return {
          url: c.href || null,
          iconUrl: img ? img.src : null,
          name: header ? header.textContent.trim() : null,
          id: makeId(c.href, header ? header.textContent.trim() : null),
          groupName: groupName,
          isFavorite: false,
          source: "mobile-live-stream",
          extractedAt: new Date().toISOString(),
        };
      })
      .filter((item) => item.url && item.name);
  }

  // Extractor 2: roya-channels-live.php
  function extractRoyaChannels() {
    const cards = document.querySelectorAll(".channel");
    const groupName = "jordan"; // Roya channels are Jordanian

    if (cards.length === 0) return [];

    return Array.from(cards)
      .map((c) => {
        const anchor = c.querySelector("a");
        const img = c.querySelector("img");

        return {
          url: anchor ? anchor.href : null,
          iconUrl: img ? img.src : null,
          name: img ? img.alt.trim() : null,
          id: makeId(anchor ? anchor.href : null, img ? img.alt.trim() : null),
          groupName: groupName,
          isFavorite: false,
          source: "roya-channels",
          extractedAt: new Date().toISOString(),
        };
      })
      .filter((item) => item.url && item.name);
  }

  // Extractor 3: generic extractor for pages with #scrol container
  function extractScrolContainer(baseUrl = "https://www.elahmad.com") {
    const container = document.getElementById("scrol");
    if (!container) return [];

    const channels = [];
    let currentGroup = null;

    for (const child of container.children) {
      // Check for group header
      if (child.tagName === "H2" && child.classList.contains("countrytv")) {
        currentGroup = child.textContent.trim().toLowerCase();
      }
      // Check for channel div
      else if (child.tagName === "DIV" && child.children.length > 0) {
        const anchor = child.querySelector("a");
        if (!anchor) continue;

        // Extract URL
        let channelUrl = null;
        const onclick = anchor.getAttribute("onclick");

        if (onclick) {
          let match = onclick.match(/openCentered\(['"]([^'"]+)['"]/);
          if (!match) match = onclick.match(/iframe\(['"]([^'"]+)['"]/);
          if (match) channelUrl = match[1];
        }

        if (!channelUrl) {
          const href = anchor.getAttribute("href");
          if (href && href !== "javascript:void(0)") {
            // Handle special case for live-arabic-channels.php
            if (
              window.location.href.includes("live-arabic-channels.php") &&
              !isNaN(parseInt(href))
            ) {
              if (typeof surl !== "undefined" && surl[parseInt(href)]) {
                channelUrl = surl[parseInt(href)];
              }
            } else {
              channelUrl = href;
            }
          }
        }

        if (channelUrl) {
          // Normalize URL
          if (channelUrl.startsWith("/")) {
            channelUrl = baseUrl + channelUrl;
          } else if (!channelUrl.startsWith("http")) {
            channelUrl = baseUrl + "/" + channelUrl;
          }

          // Extract icon URL
          let iconUrl = null;
          const img = anchor.querySelector("img");
          if (img && img.src) {
            iconUrl = img.src.startsWith("http")
              ? img.src
              : baseUrl + (img.src.startsWith("/") ? img.src : "/" + img.src);
          }

          // Extract name
          let name = anchor.textContent.trim().replace(/\s+/g, " ");

          channels.push({
            name: name,
            url: channelUrl,
            iconUrl: iconUrl,
            groupName: currentGroup || "uncategorized",
            isFavorite: false,
            source: "scrol-container",
            extractedAt: new Date().toISOString(),
          });
        }
      }
    }

    // Remove duplicates by URL and add IDs
    const seen = new Set();
    return channels
      .filter((ch) => {
        if (seen.has(ch.url)) return false;
        seen.add(ch.url);
        return true;
      })
      .map((ch) => ({ ...ch, id: makeId(ch.url, ch.name) }));
  }

  // ----- PAGE TYPE DETECTION -----
  const url = window.location.href;
  let extractedData = [];

  try {
    if (url.includes("/mobile-live-stream/")) {
      console.log("Detected: mobile-live-stream page");
      extractedData = extractMobileLiveStream();
    } else if (url.includes("roya-channels-live.php")) {
      console.log("Detected: Roya channels page");
      extractedData = extractRoyaChannels();
    } else if (document.getElementById("scrol")) {
      console.log("Detected: page with #scrol container");
      extractedData = extractScrolContainer();
    } else {
      console.warn("No known extractor for this page");
      extractedData = [];
    }
  } catch (error) {
    console.error("Extraction error:", error);
    extractedData = [];
  }

  return {
    url: url,
    timestamp: new Date().toISOString(),
    totalChannels: extractedData.length,
    channels: extractedData,
  };
};

module.exports = EXTRACTION_SCRIPT;
