# designbyashish.com — homepage build

## Images the homepage needs (put them in /media)
| File | What it is |
|---|---|
| media/home/hero-1.jpg | Left image under your name (the Military HUD character) |
| media/home/hero-2.jpg | Right image under your name (the truck) |
| media/home/footer.jpg | The "ASHISH" artwork above Let's get in touch (wide, about 1600x529) |
| media/mahindra/cover.jpg | Card image for Mahindra (16:9 works best) |
| media/hud/cover.jpg | Card image for Military HUD |
| media/honda/cover.jpg | Card image for Honda |
| media/nio/cover.jpg | Card image for Nio |
| media/steam/cover.jpg | Card image for Steam |
| media/instrument/cover.jpg | Card image for Clusters |

Missing images show a quiet grey box with the file name, so you can see what is still needed.

## Text you can edit
Everything written on the homepage lives in `content/site.json`
(name, email, intro text, experiences, social links).
The works list lives in `content/projects.json` (title, year, cover image).

## Preview on your computer
A browser cannot load the content files by double-clicking index.html. Run a tiny local server in this folder:
`python3 -m http.server 8000` then open http://localhost:8000
(Or just deploy to Netlify and preview there.)

## Behaviour
- Smooth scrolling (Lenis) is on.
- Selected text turns blue (#1522FF), like the old site. All text is selectable and copyable.
- Entrance animations: letters/words rise out of masks, images wipe up with a soft zoom. They switch off automatically for visitors who set "reduce motion" in their system.

## Not done yet (on purpose)
- Floating tags in the hero (code is kept, switched off).
- Project pages are drafts and not part of this round.
