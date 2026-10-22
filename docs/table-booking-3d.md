# River Life: interactive vessel / table selection

## Scope and boundaries — 20 October 2026

Replaces the raster-backed table-selection viewport on `/table-preview` (and the existing `/checkout` alias) with an editable Three.js WebGL model. This is a photo-informed architectural cutaway, **not an exact reconstruction, measured deck plan, approved concert installation or safety/capacity assessment**. Supplied photos establish the upper central long-table arrangement and lower central buffet, but do not establish stage orientation. The proposed bow stage remains explicitly labelled as a proposal.

The shared demo catalogue still contains the same 18 upper / 12 lower fixtures and IDs. Four-person capacities, tariffs, holds and server-side checks are unchanged. No production sales, actual payments or operator capacity changes are enabled by this UI revision.

## Design direction

Built-in Image Gen produced full desktop and mobile/lower-deck concepts before implementation:

- Desktop: `C:/Users/friend/.codex/generated_images/01a07bca-0428-7462-9ebf-ae4fc6110be3/exec-f760015c-5ce7-484b-9126-d9d565715d6e.png`
- Mobile/lower: `C:/Users/friend/.codex/generated_images/01a07bca-0428-7462-9ebf-ae4fc6110be3/exec-ee1ddb9a-9374-4e6d-84bd-75e384a036f4.png`

Brief: a complete Thai River Life table-selection screen; dark navy, slate, teal and warm gold; clear large upper/lower selectors; white two-level river cruiser cutaway with a proposed bow stage; native selectable table labels; an explicit guest/table/payment summary; real-photo references; mobile and keyboard alternatives. Concepts are design references, not flattened production UI or new vessel evidence.

Tokens: background `#09131d`, canvas/surface `#0c1924`, text `#f1f1eb`, muted `#adbdc9`, borders `#293b49`, selection `#dcbb78`, available teal. Native controls use deliberate sizes and scoped typography. Headings, deck selection, model, then summary form the task hierarchy.

Intentional departures from the concept:

- A procedural, schematic 3D model replaces the concept's photoreal boat/water/skyline. No unconfirmed landmark or actual sightline is implied. The model can genuinely rotate and reveal a different floor; it is not a generated screenshot.
- The existing River Life application header and authenticated/test-checkout flow are retained. No invented date, production price or real reservation is seeded by the concept.
- Selectors sit immediately above the model rather than sharing the page-heading row, keeping Thai/English labels readable at intermediate widths.
- Start with an empty selection. The concept's selected U04/L03 illustrates a state, not a default booking.
- Mobile starts with an upright top view, enlarged 44×44 table buttons and normal page scrolling. The 3D orbit view remains available; desktop top view is horizontal.
- Native side-profile diagrams and supplied photographs explain the levels instead of invented photoreal deck thumbnails.
- The buffet's overlay label appears only in top view; the orbit view already identifies it in the toolbar, avoiding a label across the lower table IDs.

## Architecture and controls

- `VesselWorkspace.tsx`: deck selectors, camera/view controls, model loading/error boundary, list fallback.
- `VesselScene.tsx`: orthographic camera, OrbitControls, real mesh picking, projected native HTML labels, animated floor reveal and selection materials. Labels move with their physical table positions; the bow label follows the bow as the camera rotates.
- `vesselModel.ts`: editable hull, floor plates, window band/pillars, rails, stage, stairs, service counter, buffet, table meshes and instanced chairs. Table positions derive from shared fixtures rather than separate hardcoded IDs.
- `TablePreview.tsx`: preserves catalogue polling, price/availability checks, same-deck/capacity validation, idempotency, authentication and the existing payment handoff.
- `VesselBooking.css`: scoped layout/typography; does not restyle other routes.

Use 3D / Top view / List; drag the model to orbit; use +/- to zoom and reset/fit to recover the complete hull. Page wheel and vertical touch scrolling are not captured for zoom. Table buttons, list controls and summary work with keyboard focus. If WebGL initialization or context fails, a usable native table list replaces the scene. The model chunk is lazy-loaded, pixels are capped, chairs are instanced, rendering is on demand/offscreen-aware, and GPU resources are disposed when leaving the scene. Reduced motion removes automated floor/camera interpolation.

## Verification procedure

`npm run typecheck` / `npm run build` and:

```powershell
$env:TEST_BASE_URL='http://localhost:3000'
npx playwright test tests/table-preview.spec.ts tests/vessel-3d.spec.ts tests/navigation.spec.ts --workers=1
```

Coverage includes selecting/removing/resetting tables, capacity and same-deck validation, disabled fixtures, actual orbit image change, upper/lower scene separation, top view, no overlapping mobile label rectangles, page overflow checks at 320/390/768/1536px, English copy, WebGL fallback, and route regression. The payment-handoff test intercepts API writes: it checks table IDs/whole-table quote/guest count, then reloads the payment page. It does **not** submit a real payment or claim new live-payment verification.

IAB was used first for visible deck switching, L03 selection, the displayed lower-deck test quote and console checks. Its exposed API did not provide viewport resizing, so existing Playwright Chromium was used for repeatable responsive/screenshots and regression tests. Physical iOS/Safari, low-end hardware performance and operator approval remain outside this verification.

Visual comparison checkpoints: hierarchy and deck selection, navy/slate/gold/teal palette, native label contrast/placement, clear upper banquet versus lower buffet structure, selection/payment summary, mobile overflow and touch sizes. The above-the-fold copy changes are intentional: explicit 3D/top/list controls and cutaway instructions; all demo/payment caveats remain. Screenshots and temporary QA output are kept outside the source tree.

The production browser initially reused an old cached app entry while a fresh Chromium context received the new model. Reloading verified the current UI. `nginx.conf` now revalidates `/index.html` without changing the caching of media/hashed assets or removing the existing security headers. A previously cached page may still need one explicit refresh.

The combined table/model/navigation suite passed 26 tests against the Docker-served port 3000. Build/type checks and scoped formatting checks passed. IAB reported no relevant console errors in normal rendering. Reference comparisons used `view_image` for both desktop/mobile concepts and actual renderings; checked native desktop 1536×1024 plus final 1536×1152 evidence and the responsive sizes above. Materials, native UI, selected/disabled contrast, deck identity and transaction state were checked separately. The intentionally schematic asset treatment is not claimed to match the concept's photorealism.

Remaining engineering note: npm audit also reports an existing `source-map-js` advisory (GHSA-68fv-2mgg-jv7q). The 3D dependency changes do not modify that package; no broad dependency upgrade was included in this UI task.
