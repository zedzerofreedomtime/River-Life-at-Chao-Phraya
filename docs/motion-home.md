# Motion Journey integration

The customer homepage now uses the accepted standalone Motion Journey V03 design from `D:/code/River-Life-Motion-Mockup`. The standalone mockup remains unchanged. This is a React implementation, not an iframe or copied static screenshot.

## Design inventory and intentional adaptations

- Near-black `#070d12`, warm white `#f4efe6`, muted gold `#c9ad7c`; large left-aligned two-line English hero and bilingual body copy.
- Full-screen opening, outlined MUI actions, boat loading curtain, masked title entrance, experience card carousel, moving typography, sticky crossfading river scene.
- Actual navigation, login, Thai/English, staff menus and booking callbacks remain in the application header. The prototype header and mock booking dialog are intentionally not imported.
- Hero uses the **30-second** `/videos/riverlife-cinematic-hq.mp4`, directly derived from the supplied 1920x1080/60fps master, not the mockup's three-second clip or an upscale of the previous 1440x720 export. The source's baked promotional frame is cropped to native **1632x832**, encoded at 30fps H.264 CRF19 with an 8Mbps cap and fast-start. Playback is muted and repeats the whole long montage. These are real supplied cruise shots, not generated docking footage.
- `/images/boat/riverlife-cinematic-hq-poster.webp` is extracted directly with FFmpeg from frame zero of that exact exported video, native 1632x832, WebP quality96. Regenerate it if the source changes. Poster remains over the video until a presented frame is available.
- Real supplied photographs intentionally replace the concept's generated buffet, performer and boat images. No invented claims about stops, prices or artists. River photo license links are preserved.
- Existing food menu, deck information, sailing calendar, booking steps and group contact remain below the new storytelling surface. Dates and prices remain API-driven; preview warnings are unchanged.
- Motion preferences apply only to this homepage. Native browser scrolling is retained; no global scroll hijacker, new animation dependency or pointer tracking is added to staff/checkout pages.

## Lifecycle and accessibility

The boat curtain replays on each homepage mount. It waits for media/image readiness with a 1.8-second minimum on the first entry, a shorter 0.5-second minimum on repeat entries, and a 4.5-second timeout. It can be skipped or dismissed with Escape. Reduced motion/data saver bypass it. The curtain does not wait for the full video download. Source failure leaves the matching poster, title and actions usable.

The native dialog backdrop is transparent: the opaque dialog itself forms the upward-retracting curtain. An opaque backdrop would keep the hero black during the clip-path animation and make the reveal appear to be missing until the dialog closes.

Full, Soft and Off are persisted. OS reduced motion overrides Full/Soft. Off disables autoplay and decorative animation but permits deliberate manual film playback. Media pauses offscreen, when the tab is hidden, or while a dialog is open. Dialog close unmounts the performance video. All listeners and observers are cleaned up when leaving Home.

`useHomeMotion` owns reveals for the entire homepage, including dining, decks, the calendar, booking steps and the closing section. It observes after the async homepage has mounted, resets reveals on viewport exit and replays them on re-entry. Focused content stays visible, and Off/OS reduced motion keeps all content visible. The old global one-shot reveal component excludes this homepage to avoid conflicting observers. The hero entrance also resets outside the viewport and replays when revisited.

The lower-page layout uses a 1360px content cap, consistent responsive gutters, 4/2/1 booking-step columns and dedicated 52px/42px numeral columns. Numeral circles and oversized inherited typography were removed to prevent collisions. Section spacing and closing headline size are reduced; the experience gallery now occupies one card instead of multiple offset rows.

The four dining photos use 4/2/1 columns instead of a three-column grid with an orphan final image. Thai booking headings keep the phrase “ใน 4 ขั้นตอน” together. Replay, return navigation, reduced motion and numeral/text geometry are covered by the homepage regression tests; the layout pass includes 1920, 1536, 1280, 768, 390 and 320px widths without touching booking or staff business logic.

## Verification

### Media quality repair

`scripts/build_cruise_media.py` regenerates the hero, performance film and five gallery images directly from the supplied master. Originals and previous exports remain intact. Photo timestamps: buffet36s, seafood49s, dining106.2s, Hanuman112.3s, music/bridge100.5s. All five are 1632x832 WebP quality94 with no upscale, sharpening or AI detail. The 19-second performance film preserves source audio. Photo and video quality are still bounded by baked source blur, transition effects, compression and camera motion; these exports are not 4K.

Wat Arun uses the original 2337x1558 Commons photo, ICONSIAM the original 2560x1920 photo, rather than their old 960px thumbnails. The bridge scene now uses the supplied film frame (the previous Commons original itself is only1004px wide). Updated native WebP variants preserve source links/licenses in the credits. Hanuman framing is less aggressive (1.12 desktop /1.2 mobile instead of .86 /1.05), and river enlargement is reduced from1.08 to1.04. Large hero rendering on a high-DPR/4K display can still exceed native source detail. An original sharper camera master is necessary to remove that limit.

### Fidelity review

Compared the accepted `01-arrival.png`, `04-gallery-v03.png`, and `03-river.png` in the standalone mockup's `concepts/` directory with Chromium captures at the native 1536 x 1024 concept size and mobile sizes. Evidence images are outside the repository in the Codex visualizations folder.

| Comparison | Result / intentional adaptation |
| --- | --- |
| Palette | Near-black canvas, warm-white content, muted-gold accents retained. |
| Typography | Two-line large DM Sans hero retained; old global mobile heading overrides corrected locally. Thai uses the existing Thai-capable fallback. |
| Gallery layout | Updated to four experience cards: 3-second autoplay, category selection, previous/next and pause/play. Desktop image/caption split; stacked mobile card. Hover, focus, offscreen, background tabs and film dialogs suspend autoplay; reduced motion disables it. |
| Media | Actual supplied photographs and long film replace generated concept imagery. Matched poster/video crop on both mobile and desktop. |
| Spacing and hierarchy | Full-viewport opening, generous gallery gutters, sticky river scene and large closing title retained. Functional calendar/menu sections intentionally remain. |
| Copy and controls | English hero title/tagline unchanged. Thai/English captions, real booking CTA and account tools intentionally replace prototype-only copy. No MOCKUP label or simulated booking dialog. |

IAB confirmed the real homepage identity and rendered content. Playwright provides reproducible viewport sizes, media assertions and fault injection (the dedicated Browser plugin/skill is not available in this session). These checks do not certify public production readiness or payment processing.

`npm run build` checks TypeScript and the production bundle. `tests/motion-home.spec.ts` covers actual sailing/login navigation and reduced-motion river controls without creating bookings or sending email. A focused browser QA also checks 1536x1024, 768x844, 390x844 and 320x844, real video duration/playback, performance dialog playback/close, bilingual content, motion persistence and horizontal overflow. Physical-device/Safari and real payments are outside this UI integration check.
