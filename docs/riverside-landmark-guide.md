# Riverside landmark guide

## Scope and navigation

The supplied VIVA Alangka poster names 11 places. It is a reference list, not
evidence of the chartered Unicorn Cruise's route, turning point, boarding pier,
photo stops or guaranteed visibility. `riverLandmarks.ts` preserves poster order,
not a chronological itinerary. Home links its existing three-scene animation to
the complete scene, with `#river-landmark-guide` retained as an anchor alias.
All eleven places now appear INSIDE the original full-screen `#river-journey`
scene, with visible history, era, viewing caveat, history source and bank label.
There is no separate card grid on the homepage. Native scrolling advances the
scenes without wheel interception or body-scroll locks. The scroll span is 65svh
per place plus the stage height; direct place selection, arrows and a skip control
remain available. A progress boat and crossfade/zoom connect the scenes.

Short landscape viewports (height <=650px) and reduced-motion/off preferences
use a natural-height, unpinned manual scene so the content and controls cannot be
trapped below a fixed viewport. Direction controls are independent of place
selection. Side guidance never claims to know the vessel's live heading.

### Homepage simplification

The organizer requested removal of the direction controls and the prominent
route-explanation block. The scene now shows a fixed, explicit "when heading
upstream" qualifier on left/right labels. Route provenance remains in the
collapsed photo credits rather than the main scene. All eleven places and their
histories remain in the fullscreen scene. The separate card guide is not mounted.
The homepage marquee, original-menu promo/caption, four booking instructions,
closing slogan and group-booking promotion are no longer mounted. Original media
and the detailed menu on the sailing-detail page are retained.

Left/right means facing the bow. When travelling upstream toward Rama VIII,
the west/Thonburi bank is generally port and the east/Bangkok bank starboard;
these reverse downstream toward Rama 3. This is a bank-based viewing guide, not
GPS/live navigation. Manoeuvring and river bends affect sightlines. Cross-river
bridges are labelled crossing/ahead/overhead conditionally, not assigned a bank.

## Evidence and content

Each of the 11 entries has Thai/English history, a photo, a viewing caveat and a
linked history source: royal palace, Wat Pho, TAT, Thailand Tourism Directory,
Office of the Royal Development Projects Board, King Prajadhipok Museum,
Hilton, River City, AWC, and Terminal 21. Modern commercial destinations have
background context; no invented ancient history or uncertain opening dates.

Wat Pho's reclining Buddha cannot be viewed from the boat. The Grand Palace's
full courts are not guaranteed visible from the river. Temple and shopping-centre
photos may show land-side/interior views: this is explicit in the cards. Terminal
21's source is Rama 3, not Asok or Pattaya. This is not a promise of shore visits.

Photo licenses, source URLs and authors are in `riverLandmarkCredits.ts`, rendered
in the page, and `public/images/landmarks/guide/CREDITS.md`. New photos are real
Commons photographs, not AI enhancements. Original pixels are unretouched;
downloaded Commons thumbnails and CSS crops are documented. Some sources are
older and daytime rather than campaign-grade night imagery. Stronger approved
cruise photos may replace them later without changing factual identity.

## QA

Browser plugin not available; use existing Playwright. Target flow: homepage ->
complete 11-place guide -> reverse direction -> open history -> source/credits.
`tests/river-landmarks.spec.ts` covers 11 unique bilingual entries, crossing-bank
logic, all eleven scenes under native scrolling, image decoding, readable history
and control bounds, side reversal, credits, English, keyboard navigation, skip,
landscape fallback, page errors and overflow at 320/390/768/1440px. Do not treat passing UI tests as operator
confirmation of the actual sailing itinerary.
