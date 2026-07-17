"use client";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

const carouselItems = [
  {
    image: "/images/dash.webp",
    title: "Run every branch from one control center",
    subtitle: "POS, stock, cash, and close evidence stay connected as the day moves.",
    badge: "Operations",
  },
  {
    image: "/images/diverse-food-spread.png",
    title: "Know what is moving before it becomes a gap",
    subtitle: "Track inventory, purchasing, transfers, and exceptions with source context.",
    badge: "Inventory",
  },
  {
    image: "/images/assorted-beverages.png",
    title: "Keep sales and cash evidence close",
    subtitle: "Give retail teams a clear path from checkout to review-ready records.",
    badge: "POS",
  },
  {
    image: "/images/slide-4.avif",
    title: "Invite teams into controlled workflows",
    subtitle: "Tenant scope, roles, approvals, and evidence make growth safer.",
    badge: "Controls",
  },
];

export default function CustomCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + carouselItems.length) % carouselItems.length
    );
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
    }, 6500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#07110f]">
      <div className="absolute inset-0">
        {carouselItems.map((item, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
              index === currentSlide ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={item.image}
              alt={item.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#07110f] via-[#07110f]/60 to-[#07110f]/20" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,17,15,0.88),rgba(7,17,15,0.24)_48%,rgba(7,17,15,0.70))]" />
          </div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col justify-end p-8 text-white lg:p-12">
        <div className="max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-white/[0.15] bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-normal text-white/80 backdrop-blur">
            <ShieldCheck className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            {carouselItems[currentSlide].badge}
          </div>
          <h2 className="max-w-lg text-3xl font-semibold leading-tight lg:text-5xl">
            {carouselItems[currentSlide].title}
          </h2>
          <p className="mt-4 max-w-md text-base leading-7 text-white/80 lg:text-lg">
            {carouselItems[currentSlide].subtitle}
          </p>
        </div>
        <div className="mt-8 flex items-center gap-2">
          {carouselItems.map((item, index) => (
            <button
              key={item.title}
              type="button"
              className={`h-2.5 rounded-full transition-all ${
                index === currentSlide ? "w-9 bg-white" : "w-2.5 bg-white/40 hover:bg-white/70"
              }`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Show slide ${index + 1}: ${item.title}`}
              aria-pressed={index === currentSlide}
            />
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={prevSlide}
        className="absolute left-5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg border border-white/[0.15] bg-black/20 text-white/80 backdrop-blur transition hover:bg-white/10 hover:text-white"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        type="button"
        onClick={nextSlide}
        className="absolute right-5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg border border-white/[0.15] bg-black/20 text-white/80 backdrop-blur transition hover:bg-white/10 hover:text-white"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}
