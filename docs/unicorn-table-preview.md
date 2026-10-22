# Unicorn Cruise table selection prototype

## Demo checkout connection, 2026-10-19 — current

`GET /tables` supplies server-derived test prices and held/sold/blocked availability. `POST /table-bookings` requires an authenticated account, idempotency key, access token, table IDs, guest count and the displayed expected total. The server canonicalizes IDs, rejects duplicates, blocked fixtures and mixed-deck orders, computes four paid seats per whole table, checks the displayed quote and serializes against inventory under the existing zone lock. No browser-provided price or capacity is trusted.

Mapping is explicitly temporary: upper-deck fixtures use the existing A test tariff; lower fixtures use C. One order uses one deck. This catalogue is enabled only with `DEMO_MODE=true`; it is not an operator-approved live inventory or a multi-sailing model. Guest count is separate from purchased seats; e.g. three guests at one table reserve/pay four test seats. The UI states whole-table pricing before creation and still requires separate payment terms acceptance.

Bookings persist `table_ids` and `guest_count`. Tickets persist their `table_id` so random ticket ordering cannot change their table assignment. The existing payment page, account orders, success view and ticket wallet display table metadata. Stripe receives a whole-table line item, and both checkout and delayed payment confirmation recheck table overlap. Reloading the payment page restores the stored order/access token and fetches server data. Merely opening the review dialog does not create an order.

Verified with real PostgreSQL integration tests (isolated QA database/schemas): concurrent same-table reservations, duplicate IDs, cross-deck rejection, price tampering, idempotent retry, expired hold reclamation, late paid session conflict, three-table orders and persisted ticket table assignment. Actual public-browser test also created a reservation, reloaded payment, accepted terms, opened Stripe Sandbox and paid using Stripe's public test card; the public return confirmed four tickets with the selected table. Production keys/payment mode were not enabled.

The configured `WEB_ORIGIN` must match the shared site URL for Stripe return links. The local environment currently uses the known Cloudflare tunnel; update it when the tunnel changes. Historical sections below that say payment is disconnected describe an earlier prototype, not this revision.

## Current visual/interaction revision, 2026-10-19

The current map uses the clean transparent `unicorn-open-deck-v4.png` at its native 1:2 aspect ratio, in a single 600×1240 coordinate system shared by image, furniture and service labels. Design reference is the user's original premium table-selection concept; v4 is an illustrative open-deck interpretation, not a measured or photoreal reconstruction of Unicorn. The current wood finish intentionally follows the concept rather than claiming the real vessel uses that material.

Upper tables have six rows at y=31/39/47/55/63/71%, three modules per row at x=26/50/74%. The centre modules sit on the long-table run, not on a roof. Lower tables use the same rows with side modules and a central buffet. All fixtures are ahead of the decorative aft stairs. Two aisles separate the side tables from the central service/banquet run; the proposed bow-stage label sits on empty deck. Counts/capacities remain demo fixtures.

Overview starts with the full hull. Focus mode uses real scroll position, never a negative translation or a cropped canvas. Native overflow supports mouse wheel, touch and keyboard; map resizing and zoom retain full content dimensions. Under reduced motion only the water playback control is hidden; the overview/focus control remains usable.

Design comparison points: clean silver hull and warm edge lighting; continuous exposed floor; aligned teal/gold tabletop controls and four chair marks; symmetric side rows plus centre run; distinct bow stage and unobstructed aft stairs; navy water and existing two-column summary layout. Intentional deviations from the original concept: preserve the actual supplied-photo-inspired central banquet/buffet pattern, existing bilingual copy/header and eighteen upper demo IDs rather than inventing a different capacity. Previously dated entries below describe the development history, not the current rendering.

Research checked 2026-10-19. Route: `/table-preview`. The customer entry flow is now table-only: the sailing CTA opens this prototype and the old `/checkout` route redirects here. The old zone-selection UI is no longer rendered in customer checkout. Backend legacy quota, tickets, payment and historic orders remain unchanged; this is NOT a completed backend table-inventory migration. No selected table ID is sent to any booking endpoint. No prices or certified capacity are inferred.

## Evidence and uncertainty

- [All About Journey brochure, pp. 1–2](https://www.allabout-journey.com/wp-content/uploads/2023/09/Unicorn-Cruise.pdf): two decks, lower air-conditioned room, upper open-air deck and front deck. Mentions 380 passengers. Published document, not an operator-approved seating plan.
- [All About Journey sales page](https://www.allabout-journey.com/tours/unicorn-cruise/): same broad two-deck description but 400 passengers. This discrepancy is unresolved; neither number is used as sale inventory.
- [The iCity availability categories](https://en.theicity.com/bookingCheck-en.jsp?productId=873714): markets upper covered/uncovered, front deck and lower air-conditioned categories, including edge/middle positions. This is reseller categorisation, not confirmed table coordinates, capacity or stage sightlines.
- [Unicorn Cruise Facebook](https://www.facebook.com/cruiseunicorn/): browser review on 2026-10-19 verified exterior photography, pilothouse, covered aft structure, and cultural-performance photos. No operator-approved drawing was obtained.
- Supplied AI poster is a visual idea only: its 278/250/230 figures conflict. Bow, stage, stairs, buffet, accessibility and emergency locations must not be traced as operational facts. Upper head/outdoor/indoor totals may overlap; do not add them together.

## Demo decisions

Map/list switching, upper/lower deck switching, zoom, disabled sold/held/blocked examples, multiple table selection, guest count, seat-capacity validation, removal/clear and a review dialog are implemented. Upper deck: eighteen 4-person tables behind a **proposed bow stage**. No bow dining tables remain. Lower deck: twelve 4-person UI fixtures, not an estimate. IDs U/L, coordinates and statuses are all made up. Selection across decks is allowed for demonstration, not a seating promise. Reloading/leaving the page resets local state. The route is noindex/nofollow.

## Upper-deck arithmetic scenario, not a vessel-capacity estimate

No verified clear upper-deck dimensions were found. Exact dimensions 53.6m/9.9m on the supplied AI poster were not corroborated and are not used. One charter listing search result describes 172ft length but its detail page could not be fetched; overall hull length would not establish usable upper-deck area anyway.

For UI discussion only, assume a **7.8m clear width**: 3 table/chair modules × 2.0m + 1.2m aisle + 0.6m total side allowance = 7.8m. Assume 2.4m row pitch: 4–6 rows × 3 tables = 12–18 tables, at 4 guests each = 48–72 illustrative seats. Selected scenario: 6 rows, 18 tables / 72 seats. Six rows need 14.4m seating length; adding assumed 3m stage depth, 2m stage-front clearance and 4m service allowance gives **23.4m minimum clear length in this geometric scenario**. All module/aisle/clearance figures are arbitrary planning inputs, not measured dimensions, legal requirements or safety advice. The screen is not to scale and does not account for obstructions or certified occupancy, load/stability or evacuation limits.

The bow-stage placement is the user's desired event configuration, not a verified location of Unicorn Cruise's normal stage. [SiriTha](https://siritha-cruise.com/cruise/unicorn) gives generic bow-seat guidance saying that bow seats do not see the central stage; this reinforces the need to ask the operator whether a bow-stage event can actually be arranged. No structural, emergency or accessibility changes are approved by this prototype.

The application uses a decorative AI cutaway inspired by real vessel photos. It is not a verified reconstruction or a scaled plan. Native table buttons and labels remain editable. River Life navigation and bilingual copy are retained. No table is preselected without user action.

## Photo-based update, 2026-10-19

The organiser confirmed River Life charters Unicorn Cruise and that the sales representative authorised use of additional official-page photographs. Customer-facing event contacts belong to River Life; no new boat-operator telephone or LINE link is added. Event pricing is announced by River Life.

Two exterior photos from the official Facebook viewer are now served locally as WebP with source links and permission provenance in `apps/web/public/images/boat/CREDITS.md`. They join the supplied upper/lower-deck photos in the shared gallery on the homepage, concert details and table preview. Full-image viewing preserves the whole photograph rather than the thumbnail crop.

The new `unicorn-inspired-deck-v2.webp` replaces the wooden-yacht decoration with a white/silver, cyan-lit, pale-floor interpretation including a forward pilothouse and aft canopy. Lower-deck room rendering remains schematic. Cabin/stage/table positions are not approved. Eighteen 4-person upper-deck fixtures remain only to test the workflow; no research-based capacity is implied. The long arbitrary 7.8m/23.4m arithmetic above is kept in this internal document, removed from customer UI. Map water still pauses manually, offscreen, in hidden tabs and with reduced-motion preferences.

The table preview now links directly to River Life contact details and offers real vessel photos below the workspace. Real charter capacity and reseller price numbers are not presented as event inventory or ticket prices.

## Visual alignment update, 2026-10-19

Replaced the over-tapered image with `unicorn-balanced-deck-v3.webp` and rendered it at its native 2:3 aspect ratio (800×1200 inside a 520×1240 coordinate canvas), identically on both deck views. The scene no longer stretches the boat when changing deck. The map shows the full vessel vertically at default zoom; enlarged maps can pan horizontally. Water fills the map viewport and uses subdued continuous wake lines.

Upper deck fixtures are now nine symmetric pairs, lower deck six symmetric pairs, with a clear centre aisle. Coordinates and counts remain illustrative. Each clickable table includes a compact tabletop and four chair marks within its hit area, keeping adjacent chair rows apart. Default map scale is 0.70–0.76; minimum interactive table area is 53.2×44.8 CSS pixels before user zoom-out. Font sizes compensate for scene scale. Bow-stage label sits on the front open area rather than between the cabin and tables. This is visual planning, not a confirmed sightline or stage-installation decision.

## Supplied photograph correction, 2026-10-19

The user supplied and identified two 1706×960 photographs: lower-deck dining with a long central buffet island and side tables; upper-deck dining with a central long-table run plus separate side tables. These supersede the previous assumption of a clear single central aisle. The revised schematic has two aisles per deck, a decorative non-selectable lower buffet, and six illustrative central long-table modules plus twelve separate upper tables (eighteen existing fixtures total). The twelve lower fixtures remain. Table counts and four-guest capacities are not inferred from the photos. The UI explicitly identifies long-table divisions as demo modules pending River Life's arrangement, including in the selected-table panel and review dialog.

The far-end stage visible in the upper photograph does not establish bow/stern orientation. Existing bow-stage placement remains the earlier user-requested proposal, not a claim that it matches the photo. The two supplied reference photographs are now local gallery assets with provenance in the boat credits file.

## Required before real table booking

Default view now focuses the dining area (native y-offset 400 upper / 430 lower) rather than showing the unchanged bow/cabin first. A whole-vessel toggle preserves the overview without stretching the art or table coordinates. A supplied-photo thumbnail switches with the active deck in the compact introduction. This addresses the user screenshot where the latest table layout was loaded but its distinguishing content sat below the first viewport.

1. Operator-approved plan per deck and event configuration: dimensions, exact table/seat IDs, capacities, table sharing/exclusive purchase, minimum party sizes.
2. Certified occupancy by deck, lifeboat/safety limits, accessible routes and emergency exits approved by the operator; no inference from promotional art.
3. Real concert stage configuration and verified sightlines; do not promise bow/stage views.
4. Price per person/table, children policy, grouping, relocating tables, weather-related reassignment, cancellation and refund rules.
5. Backend inventory per sailing/table/seat, atomic reservation/TTL holds, idempotent payment/webhook confirmation, releases and audited staff reassignment. Frontend disabling alone cannot prevent double-booking.
6. Carry assigned IDs through order, payment, ticket, operator manifest and check-in; mobile, concurrency and failure/retry E2E tests.

Concept file: `C:/Users/friend/.codex/generated_images/01a07bca-0428-7462-9ebf-ae4fc6110be3/exec-a383a481-bfff-40fe-b260-af972fcdb83c.png` (preview only, not consumed by the webpage).

## Design comparison and verification

Compared concept and rendered screen with view_image at 1536×1024: navy/slate/gold palette, two-column workspace, deck/map/list/zoom toolbar, teal/gold/disabled table state hierarchy, right-side guest/selection/review hierarchy and persistent prototype warning are retained. Intentional differences: schematic hull instead of photoreal generated vessel, existing River Life header, bilingual text, native numeric guest input rather than a +/- stepper, and empty initial selection. These keep the prototype honest and align with the existing application. Mobile stacks the summary below the plan and offers a non-panning list alternative.

Built-in browser verified a U04 selection; Playwright captured desktop/mobile and exercised 320/390/768/1536px widths, capacity validation, disabled states, cross-deck selection, remove/reset, review, English copy, navigation and no API writes. Updated table-only flow plus route regression suite: 22 passed, including checkout alias redirect, 18 upper-deck tables and bow-stage label. No physical-device or operator plan approval is implied.

Final combined run after table-only entry/copy updates: 34 passed (table preview, navigation and motion homepage regressions). Existing payment/backend zone schemas are intentionally not rewritten using these unapproved UI fixtures.
