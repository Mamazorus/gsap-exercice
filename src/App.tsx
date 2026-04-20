import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Mousewheel } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/scrollbar";
import "swiper/css/effect-fade";
import "swiper/css/effect-cube";
import "swiper/css/effect-flip";
import "swiper/css/effect-coverflow";
import "swiper/css/thumbs";
import "swiper/css/free-mode";
import "swiper/css/grid";
import "swiper/css/zoom";
import "swiper/css/autoplay";
import "swiper/css/keyboard";
import "swiper/css/mousewheel";
import "swiper/css/a11y";
import "swiper/css/history";
import "swiper/css/hash-navigation";
import "swiper/css/manipulation";
import "swiper/css/virtual";

import SlideIgnition from "./components/SlideIgnition";
import SlideAlignment from "./components/SlideAlignment";
import SlideVoyager from "./components/SlideVoyager";

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <Swiper
      direction="vertical"
      slidesPerView={1}
      speed={1000}
      mousewheel={{ forceToAxis: true, sensitivity: 1, thresholdDelta: 50 }}
      modules={[Mousewheel]}
      onSlideChange={(s) => setActiveIndex(s.activeIndex)}
      style={{ width: "100vw", height: "100vh" }}
    >
      <SwiperSlide>
        <SlideIgnition isActive={activeIndex === 0} />
      </SwiperSlide>
      <SwiperSlide>
        <SlideAlignment isActive={activeIndex === 1} />
      </SwiperSlide>
      <SwiperSlide>
        <SlideVoyager isActive={activeIndex === 2} />
      </SwiperSlide>
    </Swiper>
  );
}
