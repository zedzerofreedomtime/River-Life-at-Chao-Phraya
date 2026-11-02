# Dining gallery image derivatives

## Current gallery: real buffet photographs (26 October 2026)

Active assets: `buffet-01-v2.webp` through `buffet-10-v2.webp` (about 2.6 MB total). WebP conversions preserve the real food, quantities, lighting and arrangement. No AI-generated food or retouching is used in this set. Previous assets below are preserved but inactive.

The user authorised photography from Unicorn Cruise. Supplied reference images are included directly. All ten images focus on buffet trays and platters.

| Image | Source | Subject |
| --- | --- | --- |
| 01 | https://www.facebook.com/photo.php?fbid=122305564322062245 | Prawns and mussels on ice |
| 02 | User attachment `codex-clipboard-440f60a0-f058-4eaf-93dc-01f276610cfd.png` | Mussel and prawn trays |
| 03 | User attachment `codex-clipboard-92e57b1b-30e7-4636-b9e9-dc4ed20da3c5.png` | Prawn buffet close-up |
| 04 | https://www.facebook.com/photo.php?fbid=122304985448062245 | Salmon platter |
| 05 | https://www.facebook.com/photo.php?fbid=122304985424062245 | Sushi platters |
| 06 | User attachment `codex-clipboard-6404333a-2ef9-4123-8183-3c1abb210d33.png` | Crab sticks and salad |
| 07 | https://www.facebook.com/photo.php?fbid=122304985436062245 | Prawn pad Thai |
| 08 | https://www.facebook.com/photo.php?fbid=122305462124062245 | Mussels with vegetables |
| 09 | https://www.facebook.com/photo.php?fbid=122305462106062245 | Mixed vegetables |
| 10 | https://www.facebook.com/photo.php?fbid=122304985442062245 | Hot buffet selection |

## Previous gallery (inactive)

Final assets: `apps/web/public/images/food-gallery/food-01-retouched.webp` through `food-10-retouched.webp`.

Ten images totaling approximately 2.2 MB. Built-in image_gen was used for AI-assisted exposure and colour retouching. The derivatives are not unaltered documentary originals; source files are preserved. No dining-room-only or promotional-menu images are included.

| Image | Source | Subject |
| --- | --- | --- |
| 01 | `public/images/experiences/buffet.jpg` | Buffet line |
| 02 | `public/images/editorial/food-spread-original.jpg` | Assorted dishes |
| 03 | `public/images/editorial/seafood-original.jpg` | Seafood |
| 04 | `public/images/editorial/salmon-original.jpg` | Salmon |
| 05 | `public/images/editorial/thai-curry-original.jpg` | Thai curry |
| 06 | `public/videos/unicorn-dinner-film-web.mp4`, 42.5 seconds | Starters |
| 07 | Same film, 47.5 seconds | Salad |
| 08 | Same film, 52.5 seconds | Fries |
| 09 | Same film, 71 seconds | Desserts |
| 10 | Same film, 77.5 seconds | Fruit |

## Prompt set

Common prompt for 02–10:

> Use case: lighting-weather. Edit this EXACT cruise food photo for a website gallery. ONLY exposure, white balance, gentle highlight recovery and shadow lift. STRICTLY preserve original food types, quantities, arrangement, plates, perspective and background. No new ingredients, dishes, props or people, no reconstructed or redesigned food, no added text. Restrained natural photographic color correction; no stylization or dramatic relighting. Output a single faithful edited photograph.

Individual instructions:

- 01: Correct exposure and white balance only: recover overly bright whites, gently lift deep shadows, remove harsh green/yellow color casts, retain natural appetizing food colors. Preserve the dishes, quantities, ingredients, arrangement, background, people and existing logo. No new food or objects, no changes to layout, no beautification that invents details, no added text. Faithful restrained photographic retouch.
- 02: Lift dark food shadows, correct warm yellow cast, soft natural exposure.
- 03: Balance bright shrimp highlights and dark mussel details; natural light.
- 04: Lift underexposed background dishes and salmon shadows naturally.
- 05: Correct underexposure and yellow green cast; natural creamy whites.
- 06: Recover overexposed highlights and oversaturated yellows and greens.
- 07: Recover washed out whites and excessive yellow/green color cast.
- 08: Recover bright yellow highlights, neutral warm whites and natural potato color.
- 09: Neutral cream and yellow highlights, natural cake colors without oversaturation.
- 10: Neutral white plates, natural fruit colors, reduce excessive green cast.

For 06–10: Crop out only the outer blue/white video frame, leave the logo intact.

Generated PNG originals remain in the local Codex generated_images directory. The web uses compressed WebP copies; the generation-path manifest is `output/food-gallery-retouch-v1.json`.
