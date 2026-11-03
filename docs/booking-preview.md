# Booking flow preview

Open `/booking-preview`, or click the demo table-selection button on `/concert`.

The existing homepage remains the entry page. The preview currently uses Unicorn Cruise only,
date and guest selection, multiple tables across upper and lower decks, optional
dining extras, quantities, special requests, itemised review and edit/back/skip.

All tables, availability, prices and add-on menus on this route are examples. They
are independent of published sailings and the reservation API. Final save writes
only `riverlife.booking-preview.v1` in tab-scoped sessionStorage. It never sends a
booking, reservation or payment request. Reload starts a fresh selection; the saved
sample is retained only for inspection in the same tab, not automatically restored.

The plan includes a stage, numbered chairs, stairs, entrance, walkways and deck-specific
railings/windows or buffet counters. It supports scroll/drag, zoom, fit-to-view and an
accessible table list. Selecting a table opens a dialog before adding/removing it;
chair numbers explain capacity, not individual-seat sales. The plan is schematic,
not a measured or approved Unicorn plan. Coordinates and illustrative inventory live
in `apps/web/src/data/bookingPreviewPlan.ts` for later replacement with approved data.

The extra-category grid contains food, wine, cake/dessert, celebrations, decorations
and special requests. Only sample food/wine products have prices. The other categories
can be added as enquiries, explicitly pending availability and pricing. They appear
separately in review and are not counted as free products or included in the total.
Skipping extras removes both priced extras and unpriced enquiries.

Prices are illustrative THB values: upper table 4,800; lower table 4,000; prawn
plate 1,200; seafood platter 1,600; red/white wine 1,400 per bottle. Each sample table
has four seats. All must be replaced with confirmed per-vessel menus and inventory
before integrating real reservations or payments. Buffet is included in table price;
the optional extras are charged separately in the sample calculation.

## Media

- Boat imagery: existing authorised four-vessel image.
- Food imagery: existing authorised buffet images, used as clearly labelled visual examples.
- Wine: `apps/web/public/images/booking/wine-preview.png`, generated with built-in
  Image Gen, generic and unbranded; not a photograph of an actual product for sale.

Wine generation prompt:

> Photorealistic editorial still life for a Thai premium dinner cruise add-on menu
> preview. Landscape 3:2 image, evening on a boat beside Bangkok Chao Phraya river,
> very soft warm city bokeh far behind. A single elegant clear stemmed glass of red
> wine and one elegant stemmed glass of pale white wine on a dark wood dinner table,
> unbranded dark bottle with no label or text, linen napkin. Natural refined lighting,
> crisp glasses and reflections, restrained photography, no people, logos, writing
> or elaborate props. Generic illustrative preview photograph, no real product brand.

Design reference: built-in Image Gen created a three-state navy/champagne concept
for vessel/table selection, optional food/wine cards and an itemised review. Existing
River Life navigation, real boat imagery and Thai semibold typography were retained.
Mobile stacks the summary below the selection, without fixed bottom controls.

## Plan stability on Windows

The scrollable plan reserves a stable scrollbar gutter. Previously, classic scrollbars
alternately reduced/restored the observed viewport width, which resized the SVG canvas
and toggled both scrollbars again. Normal Playwright hides scrollbars and did not expose
this loop. `tests/deck-plan-stability.spec.ts` enables classic scrollbar layout and checks
stable dimensions over successive animation frames, including zoom, resize and dragging.

## Verification

`npm run build`

`TEST_BASE_URL=http://localhost:3000 npx playwright test tests/booking-preview.spec.ts --workers=1`

Tests exercise mobile/desktop totals, seat validation, upper/lower selection,
add/remove/filter extras, requests, edit, skip, tab-local save and no booking/payment
POST. An English case verifies Unicorn-only content and table selection across decks.
