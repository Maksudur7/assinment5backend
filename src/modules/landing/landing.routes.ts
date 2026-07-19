import { Router } from "express";
import prisma from "../../lib/prisma";
import { AppError } from "../../utils/errors";

const router = Router();

// Public: Get all landing content
router.get("/", async (req, res, next) => {
  try {
    const [highlights, testimonials, faqs] = await Promise.all([
      prisma.landingHighlight.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.landingTestimonial.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.landingFaq.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    res.json({
      success: true,
      data: {
        highlights,
        testimonials,
        faqs,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Admin: Create Highlight
router.post("/highlights", async (req, res, next) => {
  try {
    const { title, text } = req.body;
    if (!title || !text) throw new AppError("Missing fields", 400);
    const highlight = await prisma.landingHighlight.create({ data: { title, text } });
    res.status(201).json({ success: true, data: highlight });
  } catch (error) {
    next(error);
  }
});

// Admin: Delete Highlight
router.delete("/highlights/:id", async (req, res, next) => {
  try {
    await prisma.landingHighlight.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Admin: Create Testimonial
router.post("/testimonials", async (req, res, next) => {
  try {
    const { name, quote } = req.body;
    if (!name || !quote) throw new AppError("Missing fields", 400);
    const testimonial = await prisma.landingTestimonial.create({ data: { name, quote } });
    res.status(201).json({ success: true, data: testimonial });
  } catch (error) {
    next(error);
  }
});

// Admin: Delete Testimonial
router.delete("/testimonials/:id", async (req, res, next) => {
  try {
    await prisma.landingTestimonial.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Admin: Create FAQ
router.post("/faqs", async (req, res, next) => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) throw new AppError("Missing fields", 400);
    const faq = await prisma.landingFaq.create({ data: { question, answer } });
    res.status(201).json({ success: true, data: faq });
  } catch (error) {
    next(error);
  }
});

// Admin: Delete FAQ
router.delete("/faqs/:id", async (req, res, next) => {
  try {
    await prisma.landingFaq.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
