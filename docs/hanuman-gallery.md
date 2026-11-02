# Hanuman and Thai performance photo gallery

26 October 2026: The Hanuman experience card opens a five-image gallery instead of the performance video. The original video remains on disk. The opening hero is unchanged. Opening either gallery pauses the experience slideshow and opening film; closing restores the prior slide.

Images are genuine Unicorn Cruise performances, without AI reconstruction, cropping or exposure edits. WebP copies are resized to a maximum 1600-pixel edge. The set includes four photographs and one still already used by this project, rather than presenting similar frames as five separate photo shoots. Thai dance accompanies Hanuman in the gallery and is labelled accordingly.

| Image | Source | Content |
| --- | --- | --- |
| 01 | https://www.facebook.com/photo/?fbid=802645451869676&set=pcb.802657151868506 | Hanuman and dancer on the Unicorn stage |
| 02 | https://image.kkday.com/v2/image/get/s1.kkday.com/product_153797/20231011064836_Tu9og/jpg | Hanuman and dancer on the open deck; Unicorn listing https://travel.hotaigo.com.tw/product/PGyUx |
| 03 | Existing `public/images/experiences/hanuman-hq.webp` | Guest interaction; still from the supplied cruise film |
| 04 | https://www.facebook.com/photo/?fbid=802645541869667&set=pcb.802657151868506 | Performers interacting with guests |
| 05 | https://www.facebook.com/photo/?fbid=802645485203006&set=pcb.802657151868506 | Thai solo dance |

Facebook originals are from Eat and Travel - memories, shared by the Unicorn Cruise page and located through its own search results. Preserve source watermarks. User authorisation covered imagery on the operator page; this provenance does not assert ownership of third-party photography.

QA: Browser plugin not available; use the existing Playwright Chromium runner. Test `/` -> Hanuman -> gallery -> all five loaded images -> keyboard/wrap navigation -> close/reopen, at mobile and desktop widths. Recheck the food gallery because the viewer is shared.
