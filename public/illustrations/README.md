# Common Neighbour website images

Optimised copies of the three approved scenes in `assets/neighbour-scenarios/`.
Original PNGs are unchanged. No exploratory blip-tests or human-tests are used.

Each scene has 640px and 1280px WebP variants, preserving the full composition.
Encoded with cwebp, quality 85, method 6; no cropping or colour edits.
The source manifest records original checksums. To reproduce a variant:

```sh
cwebp -q 85 -m 6 -resize 640 0 assets/neighbour-scenarios/01-community-garden.png -o public/illustrations/01-community-garden-640.webp
```
