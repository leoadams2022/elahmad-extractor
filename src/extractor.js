// elahmad-extractor.js (Fixed with proper waiting)
const puppeteer = require("puppeteer");
const fs = require("fs").promises;
const path = require("path");

const TARGET_URLS = require("./TARGET_URLS");

const EXTRACTION_SCRIPT = require("./EXTRACTION_SCRIPT");

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

  // const outputDir = path.join(__dirname, "output");
  // // Create output directory if it doesn't exist
  // await fs.mkdir(outputDir, { recursive: true });

  // dist directory path (sibling to src)
  const distPath = path.join(__dirname, "..", "dist");

  // output directory path (sibling to src)
  const outputPath = path.join(__dirname, "..", "output");

  // Ensure directories exist
  async function ensureDirectories() {
    try {
      await fs.mkdir(distPath, { recursive: true });
      await fs.mkdir(outputPath, { recursive: true });
    } catch (error) {
      console.error("Error creating directories:", error);
    }
  }
  await ensureDirectories();

  // Save full results as JSON
  const fullResultsPath = path.join(
    outputPath,
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

  const channelsPath = path.join(outputPath, `all-channels-${timestamp}.json`);
  const channelsDistPath = path.join(distPath, `all-channels.json`);
  await fs.writeFile(channelsPath, JSON.stringify(allChannels, null, 2));
  await fs.writeFile(channelsDistPath, JSON.stringify(allChannels, null, 2));
  console.log(
    `💾 All channels saved to: ${channelsPath} AND ${channelsDistPath}`,
  );

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
    const csvPath = path.join(outputPath, `all-channels-${timestamp}.csv`);
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

  const summaryPath = path.join(outputPath, `summary-${timestamp}.json`);
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
