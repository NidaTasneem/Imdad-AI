const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const outputDir = path.join(root, "docs", "report_assets", "screenshots");
fs.mkdirSync(outputDir, { recursive: true });

const baseUrl = "http://127.0.0.1:5173";
const sessionKey = "ai-ticket-desk-session";
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const sessions = {
  user: {
    userId: "11111111-1111-4111-8111-111111111111",
    name: "Aarav Mehta",
    email: "aarav.mehta@acme.local",
    role: "User",
    department: "Information Technology",
    startedAt: new Date().toISOString(),
  },
  engineer: {
    userId: "33333333-3333-4333-8333-333333333333",
    name: "Priya Nair",
    email: "priya.nair@support.local",
    role: "Support Engineer",
    department: "IT Support Team",
    startedAt: new Date().toISOString(),
  },
  admin: {
    userId: "44444444-4444-4444-8444-444444444444",
    name: "Maya Rao",
    email: "maya.rao@admin.local",
    role: "Admin",
    department: "IT Operations",
    startedAt: new Date().toISOString(),
  },
};

const shots = [
  ["user", "/ai-help", "user-ai-help.png"],
  ["user", "/raise-ticket", "user-raise-ticket.png"],
  ["user", "/my-tickets", "user-my-tickets.png"],
  ["engineer", "/engineer", "engineer-dashboard.png"],
  ["engineer", "/engineer/tickets", "engineer-tickets.png"],
  ["engineer", "/tickets/TKT-0001", "engineer-ticket-details.png"],
  ["admin", "/admin", "admin-dashboard.png"],
  ["admin", "/admin/kb", "admin-kb-management.png"],
  ["admin", "/admin/tickets", "admin-tickets.png"],
];

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: edgePath });
  for (const [role, route, fileName] of shots) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    await context.addInitScript(
      ([key, value]) => {
        window.localStorage.setItem(key, JSON.stringify(value));
      },
      [sessionKey, sessions[role]],
    );
    const page = await context.newPage();
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outputDir, fileName), fullPage: false });
    await context.close();
  }
  await browser.close();
  console.log(outputDir);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
