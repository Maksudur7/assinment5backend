"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.post("/", async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }
        const contactMessage = await prisma.contactMessage.create({
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
