import prisma from "./lib/prisma";

async function main() {
  try {
    const highlights = await prisma.landingHighlight.findMany();
    console.log("highlights: OK", highlights.length);
  } catch (e: any) {
    console.error("highlights FAILED:", e.message);
  }

  try {
    const testimonials = await prisma.landingTestimonial.findMany();
    console.log("testimonials: OK", testimonials.length);
  } catch (e: any) {
    console.error("testimonials FAILED:", e.message);
  }

  try {
    const faqs = await prisma.landingFaq.findMany();
    console.log("faqs: OK", faqs.length);
  } catch (e: any) {
    console.error("faqs FAILED:", e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
