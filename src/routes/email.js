import express from "express";
import {
  sendLeadNotification,
  sendQuoteRequest,
  sendReportToUser,
} from "../services/email.js";

const router = express.Router();

// ── POST /api/email/lead ──
router.post("/lead", async (req, res) => {
  try {
    const { name, email, query } = req.body;
    if (!name || !email || !query) {
      return res.status(400).json({ error: "name, email, and query are required" });
    }

    await sendLeadNotification({ name, email, query });
    console.log(`✅ Lead email sent for: ${name} <${email}>`);
    res.json({ success: true, message: "Lead captured successfully" });
  } catch (err) {
    console.error("❌ Lead email error:", err.message);
    res.status(500).json({ error: "Failed to send lead notification", details: err.message });
  }
});

// ── POST /api/email/quote ──
router.post("/quote", async (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.email) {
      return res.status(400).json({ error: "name and email are required" });
    }

    await sendQuoteRequest(data);
    console.log(`✅ Quote request sent for: ${data.name}`);
    res.json({ success: true, message: "Quote request submitted successfully" });
  } catch (err) {
    console.error("❌ Quote email error:", err.message);
    res.status(500).json({ error: "Failed to send quote request", details: err.message });
  }
});

// ── POST /api/email/report ──
// Frontend sends: { recipientEmail, recipientName, pdfBase64, supplierName, totalCost }
router.post("/report", async (req, res) => {
  try {
    const { recipientEmail, recipientName, pdfBase64, supplierName, totalCost } = req.body;
    if (!recipientEmail) {
      return res.status(400).json({ error: "recipientEmail is required" });
    }

    await sendReportToUser({
      recipientEmail,
      recipientName,
      pdfBuffer: pdfBase64,
      supplierName,
      totalCost,
    });
    console.log(`✅ Report email sent to: ${recipientEmail}`);
    res.json({ success: true, message: "Report sent to your email" });
  } catch (err) {
    console.error("❌ Report email error:", err.message);
    res.status(500).json({ error: "Failed to send report", details: err.message });
  }
});

export default router;