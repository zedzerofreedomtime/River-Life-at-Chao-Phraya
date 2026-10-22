import { useEffect, type RefObject } from "react";

/** One replayable reveal owner for the whole homepage, including async content. */
export default function useHomeMotion(root: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const scope = root.current;
    if (!scope) return;
    const selectors = [
      "[data-mj-reveal]",
      ".culture-facts .culture-container>div",
      ".cinema-dining-intro",
      ".cruise-photo-grid figure",
      ".culture-section-heading",
      ".onboard-experience-card",
      ".culture-calendar-layout",
    ];
    const elements = [
      ...scope.querySelectorAll<HTMLElement>(selectors.join(",")),
    ];
    elements.forEach((element) => {
      element.dataset.homeReveal = "";
      element.classList.remove("scroll-reveal", "is-revealed");
    });
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let mode = "";
    let observer: IntersectionObserver | undefined;
    let exitObserver: IntersectionObserver | undefined;
    const sync = () => {
      const next = preference.matches
        ? "off"
        : (scope.querySelector<HTMLElement>(".motion-journey")?.dataset
            .motion ?? "off");
      if (mode === next) return;
      mode = next;
      scope.dataset.homeMotion = next;
      observer?.disconnect();
      exitObserver?.disconnect();
      if (next === "off") {
        elements.forEach((element) => element.classList.add("mj-visible"));
        return;
      }
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const element = entry.target as HTMLElement;
            if (entry.isIntersecting) element.classList.add("mj-visible");
          }
        },
        { threshold: 0.06, rootMargin: "0px 0px -24px 0px" },
      );
      // Reset only well outside the viewport. The reveal's own translation
      // must not repeatedly cross the same entrance/exit boundary.
      exitObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const element = entry.target as HTMLElement;
            if (
              !entry.isIntersecting &&
              !element.contains(document.activeElement)
            )
              element.classList.remove("mj-visible");
          }
        },
        { rootMargin: "100px", threshold: 0 },
      );
      elements.forEach((element) => {
        observer?.observe(element);
        exitObserver?.observe(element);
      });
    };
    const revealFocus = (event: FocusEvent) => {
      (event.target as Element)
        ?.closest<HTMLElement>("[data-home-reveal]")
        ?.classList.add("mj-visible");
    };
    const modeObserver = new MutationObserver(sync);
    modeObserver.observe(scope, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-motion"],
    });
    preference.addEventListener("change", sync);
    scope.addEventListener("focusin", revealFocus);
    sync();
    return () => {
      observer?.disconnect();
      exitObserver?.disconnect();
      modeObserver.disconnect();
      preference.removeEventListener("change", sync);
      scope.removeEventListener("focusin", revealFocus);
      elements.forEach((element) => {
        delete element.dataset.homeReveal;
        element.classList.remove("mj-visible");
      });
      delete scope.dataset.homeMotion;
    };
  }, [root]);
}
