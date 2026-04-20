import { useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

type AnimationFactory = (
  ctx: gsap.Context
) => gsap.core.Timeline | void;

export function useSlideAnimation(
  containerRef: React.RefObject<HTMLElement | null>,
  isActive: boolean,
  buildAnimation: AnimationFactory
) {
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      const ctx = gsap.context(() => {
        if (isActive) {
          const tl = buildAnimation(gsap.context(() => {}));
          if (tl) tlRef.current = tl;
        } else {
          // Reset to initial state when slide becomes inactive
          if (tlRef.current) {
            tlRef.current.revert();
            tlRef.current = null;
          }
        }
      }, containerRef);

      return () => ctx.revert();
    },
    { scope: containerRef, dependencies: [isActive] }
  );
}
