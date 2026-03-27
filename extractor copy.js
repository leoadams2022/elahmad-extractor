// elahmad-extractor.js (Fixed with proper waiting)
const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");

// All target URLs
const TARGET_URLS = [
  // Country-specific mobile streams
  "https://www.elahmad.com/tv/mobile-live-stream/?id=algeria",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=bahrain",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=egypt",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=iraq",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=jordan",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=kuwait",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=lebanon",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=libya",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=mauritanie",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=morocco",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=oman",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=palestine",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=qatar",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=saudi",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=sudan",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=syria",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=tunisia",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=uae",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=yemen",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=somalia_tv",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=arabic",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=almajdtv",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=kids_tv",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=shahid_mbc",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=rotana_group",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=artonline",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=sports_live_tv",
  "https://www.elahmad.com/tv/mobile-live-stream/?id=youtube_live",

  // Special pages
  "https://www.elahmad.com/tv/roya-channels-live.php",
  "https://www.elahmad.com/tv/rotana-live.php",
  "https://www.elahmad.com/tv/mbc-stream.php",
  // "https://www.elahmad.com/tv-arab-online",
];

// Consolidated extraction script to run in browser context
// Updated extraction script with groupName and isFavorite
const EXTRACTION_SCRIPT = () => {
  // Helper: generate unique ID
  function makeId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID)
      return crypto.randomUUID();
    return `id_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
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
            id: makeId(),
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
          id: makeId(),
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
          id: makeId(),
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
      .map((ch) => ({ ...ch, id: makeId() }));
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

// Helper function to wait
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Main automation function
async function extractAllChannels() {
  console.log("🚀 Starting extraction from elahmad.com...");
  console.log(`📋 Total URLs to process: ${TARGET_URLS.length}\n`);

  const browser = await puppeteer.launch({
    headless: false, // Set to false temporarily to see what's happening
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results = {
    extractedAt: new Date().toISOString(),
    totalUrls: TARGET_URLS.length,
    successfulExtractions: 0,
    failedExtractions: 0,
    data: {},
  };

  for (let i = 0; i < TARGET_URLS.length; i++) {
    const url = TARGET_URLS[i];
    const page = await browser.newPage();

    console.log(`[${i + 1}/${TARGET_URLS.length}] Processing: ${url}`);

    try {
      // Navigate to page
      await page.goto(url, {
        waitUntil: "networkidle0", // Changed to networkidle0 for more complete loading
        timeout: 30000,
      });

      // Wait for content to load - multiple strategies
      console.log(`  ⏳ Waiting for content to load...`);

      // Strategy 1: Wait for specific element with longer timeout
      try {
        await page.waitForSelector(".card-link", { timeout: 10000 });
        console.log(`  ✅ Found .card-link elements`);
      } catch (e) {
        console.log(
          `  ⚠️ No .card-link found, trying alternative selectors...`,
        );

        // Strategy 2: Wait for any images that might indicate channel content
        try {
          await page.waitForSelector('img[src*="tv"]', { timeout: 5000 });
          console.log(`  ✅ Found TV-related images`);
        } catch (e2) {
          console.log(`  ⚠️ Still no content, waiting additional time...`);
          await wait(5000); // Extra wait time
        }
      }

      // Scroll to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await wait(2000);

      // Scroll back up
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await wait(1000);

      // Take screenshot for debugging (optional)
      // await page.screenshot({ path: `debug-${i}.png` });

      // Execute extraction script
      const pageData = await page.evaluate(EXTRACTION_SCRIPT);

      results.data[url] = pageData;
      results.successfulExtractions++;

      console.log(`  ✅ Extracted ${pageData.totalChannels} channels`);

      // Log first few channel names for verification
      if (pageData.channels && pageData.channels.length > 0) {
        const sampleNames = pageData.channels
          .slice(0, 3)
          .map((c) => c.name)
          .join(", ");
        console.log(`  📺 Sample: ${sampleNames}`);
      } else {
        // Debug: log page structure when no channels found
        const bodyText = await page.evaluate(() =>
          document.body.innerText.substring(0, 500),
        );
        console.log(
          `  🔍 Page content preview: ${bodyText.substring(0, 100)}...`,
        );
      }
    } catch (error) {
      console.error(`  ❌ Failed to extract from ${url}:`, error.message);
      results.data[url] = {
        url: url,
        error: error.message,
        timestamp: new Date().toISOString(),
        channels: [],
      };
      results.failedExtractions++;
    } finally {
      await page.close();
    }

    // Add a small delay between requests to be respectful
    await wait(2000);
  }

  await browser.close();

  // Generate statistics
  const totalChannels = Object.values(results.data)
    .filter((item) => item.channels)
    .reduce((sum, item) => sum + (item.channels?.length || 0), 0);

  results.totalChannelsExtracted = totalChannels;

  console.log("\n📊 Extraction Complete!");
  console.log(`  ✅ Successful: ${results.successfulExtractions}`);
  console.log(`  ❌ Failed: ${results.failedExtractions}`);
  console.log(`  📺 Total Channels: ${totalChannels}`);

  return results;
}

// Save results to files
async function saveResults(results) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.join(__dirname, "output");

  // Create output directory if it doesn't exist
  await fs.mkdir(outputDir, { recursive: true });

  // Save full results as JSON
  const fullResultsPath = path.join(
    outputDir,
    `elahmad-channels-${timestamp}.json`,
  );
  await fs.writeFile(fullResultsPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Full results saved to: ${fullResultsPath}`);

  // Save channels as a flat array for easier processing
  const allChannels = [];
  for (const [url, data] of Object.entries(results.data)) {
    if (data.channels && Array.isArray(data.channels)) {
      allChannels.push(
        ...data.channels.map((ch) => ({
          ...ch,
          sourceUrl: url,
        })),
      );
    }
  }

  const channelsPath = path.join(outputDir, `all-channels-${timestamp}.json`);
  await fs.writeFile(channelsPath, JSON.stringify(allChannels, null, 2));
  console.log(`💾 All channels saved to: ${channelsPath}`);

  // Save as CSV for spreadsheet use
  if (allChannels.length > 0) {
    const csvHeaders = [
      "id",
      "name",
      "url",
      "iconUrl",
      "source",
      "sourceUrl",
      "groupName",
      "extractedAt",
    ];
    const csvRows = allChannels.map((ch) =>
      csvHeaders
        .map((header) => {
          let value = ch[header] || "";
          // Escape quotes and wrap in quotes if contains comma or quotes
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(","),
    );

    const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
    const csvPath = path.join(outputDir, `all-channels-${timestamp}.csv`);
    await fs.writeFile(csvPath, csvContent);
    console.log(`💾 CSV version saved to: ${csvPath}`);
  }

  // Generate summary report
  const summary = {
    extractionTime: results.extractedAt,
    totalUrlsProcessed: results.totalUrls,
    successfulExtractions: results.successfulExtractions,
    failedExtractions: results.failedExtractions,
    totalChannels: results.totalChannelsExtracted,
    channelsBySource: {},
  };

  // Group by source
  allChannels.forEach((ch) => {
    const source = ch.source || "unknown";
    if (!summary.channelsBySource[source]) {
      summary.channelsBySource[source] = 0;
    }
    summary.channelsBySource[source]++;
  });

  const summaryPath = path.join(outputDir, `summary-${timestamp}.json`);
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`💾 Summary saved to: ${summaryPath}`);

  return { fullResultsPath, channelsPath, summaryPath };
}

// Main execution
(async () => {
  try {
    const results = await extractAllChannels();
    await saveResults(results);
    console.log("\n✨ Extraction and saving completed successfully!");

    // Exit with success code
    process.exit(0);
  } catch (error) {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  }
})();
