import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const ollamaBaseUrl = process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434";
const ollamaModel = process.env.OLLAMA_MODEL ?? "llama3.2";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");

app.use(express.json({ limit: "1mb" }));

const hasAny = (text, keywords) => keywords.some((keyword) => text.includes(keyword));

const fallbackSuggestion = (issue) => {
  const text = issue.toLowerCase();

  if (hasAny(text, ["lag", "lags", "slow", "freeze", "freezing", "hang", "hanging", "performance"])) {
    return [
      "Try these steps for a slow or lagging computer:",
      "1. Restart the computer and close unused browser tabs or heavy apps.",
      "2. Open Task Manager and check CPU, memory, disk, and startup apps for anything using high resources.",
      "3. Confirm at least 15% free disk space, then clear temporary files and downloads if storage is low.",
      "4. Install pending OS, driver, and security updates, then restart again.",
      "5. Run a malware or endpoint security scan and check whether the issue started after a recent update or new software.",
      "If the lag continues, create a ticket with screenshots, device name, recent changes, and Task Manager usage details.",
    ].join("\n");
  }

  if (hasAny(text, ["internet", "network", "wi-fi", "wifi", "vpn", "connection", "disconnect"])) {
    return [
      "Try these network troubleshooting steps:",
      "1. Confirm other websites or apps are affected, then restart Wi-Fi or reconnect the VPN.",
      "2. Turn airplane mode off, forget and reconnect to the network, or try a different network if available.",
      "3. Restart the router or VPN client and check whether MFA or saved credentials are blocking access.",
      "4. Run a speed test and capture any timeout, DNS, or authentication error message.",
      "If it still fails, create a ticket with network name, location, error code, and affected apps.",
    ].join("\n");
  }

  if (hasAny(text, ["email", "outlook", "mail", "inbox", "send", "receive", "blocked"])) {
    return [
      "Try these email troubleshooting steps:",
      "1. Check webmail to confirm whether the issue is Outlook-only or account-wide.",
      "2. Review junk, quarantine, mailbox storage, and any rules that may move or block messages.",
      "3. Restart Outlook, update it, and re-add the account if sync is stuck.",
      "4. Capture sender, recipient, timestamp, bounce message, or blocked warning.",
      "If mail still does not work, create a ticket with the affected mailbox and error details.",
    ].join("\n");
  }

  return [
    "Try these general troubleshooting steps:",
    "1. Restart the affected device or application and confirm whether the issue happens again.",
    "2. Check whether the problem affects only you or multiple users.",
    "3. Note recent changes such as updates, password changes, new software, network changes, or access requests.",
    "4. Capture screenshots, exact error messages, time of issue, and business impact.",
    "If the issue continues, create a ticket with the collected details.",
  ].join("\n");
};

app.post("/api/troubleshoot", async (req, res) => {
  const issue = String(req.body?.issue ?? "").trim();
  if (!issue) {
    res.status(400).json({ error: "Issue description is required." });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        stream: false,
        prompt: [
          "You are an IT help desk triage assistant.",
          "Give concise troubleshooting steps and say what details a support engineer should collect.",
          `User issue: ${issue}`,
        ].join("\n"),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = await response.json();
    res.json({
      suggestion:
        data.response?.trim() ||
        fallbackSuggestion(issue),
      model: ollamaModel,
    });
  } catch {
    res.status(503).json({
      error: "AI model is unavailable.",
      suggestion: fallbackSuggestion(issue),
    });
  } finally {
    clearTimeout(timeout);
  }
});

app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`AI Ticket API running on http://127.0.0.1:${port}`);
});
