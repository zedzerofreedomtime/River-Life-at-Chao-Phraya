import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    // If user prefers reduced motion, skip scroll reveal
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const selectors = [
      ".culture-section-heading",
      ".culture-story",
      ".culture-sight-card",
      ".culture-space-gallery",
      ".dining-gallery",
      ".culture-booking ol li",
      ".onboard-experience-card",
      ".culture-route-layout",
      ".culture-calendar",
      ".culture-facts .culture-container > div"
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -60px 0px",
        threshold: 0.08,
      }
    );

    const elements = document.querySelectorAll(selectors.join(", "));
    elements.forEach((el) => {
      if (!el.classList.contains("scroll-reveal")) {
        el.classList.add("scroll-reveal");
      }
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
