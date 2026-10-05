import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { strictRateLimit } from "../../middleware/rate-limit";
import { asyncHandler } from "../../utils/async-handler";
import { validate } from "../../utils/validate";

const contactRouter = Router();

const contactBody = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(100),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(3000),
});

// 5 messages / hour / IP
const contactLimit = strictRateLimit({
  scope: "contact",
  windowMs: 60 * 60 * 1000,
  max: 5,
  methods: ["POST"],
});

contactRouter.post(
  "/",
  contactLimit,
  validate({ body: contactBody }),
  asyncHandler(async (req, res) => {
    const contactMessage = await prisma.contactMessage.create({
      data: req.body,
    });
    return res.status(201).json({
      success: true,
      message: "Message sent successfully!",
      data: contactMessage,
    });
  }),
);

export default contactRouter;
