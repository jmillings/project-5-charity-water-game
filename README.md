# Clean Stream (charity: water mini-game)

A responsive HTML5 canvas game where you steer a boat to clean a polluted river, learn clean water facts, and are encouraged to donate to charity: water.

## Features
- Splash screen with Play, Difficulty, Tutorial, Mobile Instructions, About, Donate
- Keyboard (arrow keys + space) and mobile controls (virtual joystick + Clean button)
- Pollutants: plastic bottles, oil slicks, trash
- Collectible water droplets for bonus points
- Toxic barrel obstacles that subtract score
- Cleanliness meter with milestone facts at 25%, 50%, 75%
- Difficulty levels: Easy / Medium / Hard
- Scoring: pollutant +10, droplet +5, milestone +50, level finish +100, obstacle collision -10
- Time limit per level based on difficulty
- 3 levels; victory screen with confetti
- Persistent high score & milestone badges (localStorage)
- Reset / Play Again / Next Level flows
- Donate buttons linking to charity: water

## How to Play (Desktop)
1. Press Play.
2. Use Arrow Keys to move the boat.
3. Press Space near pollutants or droplets to clean/collect.
4. Reach milestones for extra points and water facts.
5. Clean all pollutants before time runs out.

## How to Play (Mobile)
1. Press Play.
2. Drag the joystick to move.
3. Tap the Clean button near pollutants/droplets.
4. Collect droplets for extra points.

## Running Locally
Simply open `index.html` in a modern browser (Chrome, Firefox, Edge, Safari). No build step required.

On a local server (optional):
```bash
python3 -m http.server 8000
```
Then visit http://localhost:8000

## Folder Structure
```
index.html   # Game HTML structure & UI overlays
style.css    # Responsive styles, sprites, animations
game.js      # Core game logic (state, rendering, input, scoring)
README.md    # This documentation
```

## Future Enhancements
- Sound effects (splashes, chimes)
- Share to social media integration
- More levels & river environments
- Accessibility improvements (focus states, ARIA labels)

## License
Educational project; feel free to modify. Not an official charity: water product.