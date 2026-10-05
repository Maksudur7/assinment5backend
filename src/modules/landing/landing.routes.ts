import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { authenticate, requireAdmin } from "../../middleware/auth";
import { asyncHandler } from "../../utils/async-handler";
import { AppError } from "../../utils/errors";
import { idParam, validate } from "../../utils/validate";

const landingRouter = Router();

const highlightBody = z.object({
  title: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(1000),
});

const testimonialBody = z.object({
  name: z.string().trim().min(1).max(100),
  quote: z.string().trim().min(1).max(1000),
});

const faqBody = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(2000),
});

// Public: Get all landing content
landingRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [highlights, testimonials, faqs] = await Promise.all([
      prisma.landingHighlight.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.landingTestimonial.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.landingFaq.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    return res.status(200).json({
      success: true,
      data: { highlights, testimonials, faqs },
    });
  }),
);

// Admin only routes
landingRouter.post(
  "/highlights",
  authenticate,
  requireAdmin,
  validate({ body: highlightBody }),
  asyncHandler(async (req, res) => {
    const highlight = await prisma.landingHighlight.create({ data: req.body });
    return res.status(201).json({ success: true, data: highlight });
  }),
);

landingRouter.delete(
  "/highlights/:id",
  authenticate,
  requireAdmin,
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await prisma.landingHighlight.delete({ where: { id: req.validatedParams!.id } });
    return res.status(200).json({ success: true });
  }),
);

landingRouter.post(
  "/testimonials",
  authenticate,
  requireAdmin,
  validate({ body: testimonialBody }),
  asyncHandler(async (req, res) => {
    const testimonial = await prisma.landingTestimonial.create({ data: req.body });
    return res.status(201).json({ success: true, data: testimonial });
  }),
);

landingRouter.delete(
  "/testimonials/:id",
  authenticate,
  requireAdmin,
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await prisma.landingTestimonial.delete({ where: { id: req.validatedParams!.id } });
    return res.status(200).json({ success: true });
  }),
);

landingRouter.post(
  "/faqs",
  authenticate,
  requireAdmin,
  validate({ body: faqBody }),
  asyncHandler(async (req, res) => {
    const faq = await prisma.landingFaq.create({ data: req.body });
    return res.status(201).json({ success: true, data: faq });
  }),
);

landingRouter.delete(
  "/faqs/:id",
  authenticate,
  requireAdmin,
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    await prisma.landingFaq.delete({ where: { id: req.validatedParams!.id } });
    return res.status(200).json({ success: true });
  }),
);

export default landingRouter;
