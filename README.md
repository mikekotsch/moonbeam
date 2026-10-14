# MoonBeam

Projects MoonBoard 2016 problems onto your wall with a beamer, controlled from your phone.

## Run it

1. Get the problem data (see below). It isn't included in this repo.
2. Install Node.js 18 or newer on the laptop that is connected to the beamer (https://nodejs.org).
3. In this folder, run: `node server.js`
4. On the laptop, open the **Beamer** address it prints (http://localhost:8080/beamer) on the beamer's screen,
   then click it or press **F** for fullscreen.
5. On your phone (same Wi-Fi), open the **Phone remote** address it prints, e.g. http://192.168.1.23:8080/.
   Add it to your home screen if you like.

No installs or internet needed after that. Everything stays on your home network.

## Calibrate once

1. On the phone, open **Beamer setup** → **Calibrate**. The beamer shows the full 11 × 18 hold grid.
2. Move the four yellow rings onto the centres of holds **A18, K18, A1 and K1**. Use the arrow pad on the phone
   (tap the middle for fine or coarse steps), or drag the rings with the laptop's mouse.
3. Switch to **All holds** to check that every ring sits on a hold, then back to **Problem**.

The four-corner mapping corrects for keystone and an angled beamer. The calibration is saved in `config.json`.
If you move the beamer, calibrate again.

## Colours

Green = start, blue = hands, red = finish, the same as the Moon app.

Column letters (A–K) appear along the top and row numbers (1–18) down both sides. The letters and numbers of the current problem's holds are lit brighter. Turn them on or off, and set their distance from the board, under Beamer setup → Look.

## Keyboard (on the laptop)

F fullscreen · C calibrate · A all holds · Esc back to the problem

## Get the problem data

The app reads `data/problems-2016.json`. The repo doesn't include it, because the problems are Moon Climbing's data.
To build it from the public MoonBoardRNN scrape of the 2016 set at 40° (30,642 problems, collected around 2020):

```
git clone --depth 1 https://github.com/jrchang612/MoonBoardRNN
python3 -I tools/convert_moonboardrnn.py MoonBoardRNN/raw_data/moonGen_scrape_2016_final
```

Problems set after the scrape are missing. Use the data for personal use only.
