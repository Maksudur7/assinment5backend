"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../../lib/prisma"));
const router = (0, express_1.Router)();
router.post("/", async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }
        const contactMessage = await prisma_1.default.contactMessage.create({
            data: {
                name,
                email,
                subject,
                message,
            },
        });
        res.status(201).json({ success: true, message: "Message sent successfully!", data: contactMessage });
    }
    catch (error) {
        console.error("Error saving contact message:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.default = router;
