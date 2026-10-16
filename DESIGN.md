# After You

User-authorized build: a playable 3D Electron macOS adaptation of the game designed in this conversation.

Success: a packaged, locally signed Mac app opens to a beautifully lit physical table; two people can select two shared pucks, draw opposite equal-strength impulses, hand the choice to their opponent, resolve deterministic collisions and scoring, finish a match, and immediately rematch. Real native-window pointer interaction and captured pixels verify completion.

Scope: offline local two-player play, complete rules, a learn-by-playing example, a free orbit camera with an overhead aiming preset, sound and mute, rematch. No accounts, networking, online service, AI opponent, or purchased assets.

Rules: 100x60 surface, radius-1 pucks, radius-3 corner pockets. Amber owns NW and SE, Blue NE and SW. Nine neutral pucks at (20,15),(47,10),(78,14),(32,27),(56,31),(82,34),(17,45),(43,49),(70,47). One offer chooses two pucks and a shared impulse with opposite directions, free-run distance 10..90. Opponent selects one to fire. All other pucks remain ordinary collidable bodies. Score pockets for their owner. Evaluate after rest: at least four points ends the match, higher score wins, equal draws. Otherwise end after twelve offers each. Rematches alternate starter. Tutorial example uses the five-puck position from the design and a 2-2 score.

Architecture: sandboxed Electron shell, random loopback server, local Three.js renderer, pure JavaScript deterministic 2D physics under the 3D surface. Main thread authors scene/UI; independent physics worker owns engine and tests; shell worker owns secure launch, dependencies, and packaging. No pre-existing project edits.

Visual thesis: a purpose-built tabletop instrument. Sculpted dark walnut housing, textured deep teal surface with restrained engraving, polished nickel pucks, orange-gold and glacial-blue pocket wells; directional sunlight and believable contact shadows. Ivory application chrome, large physical scene, compact typographic scores, contextual guidance at the bottom. Two equal-opposite arrows are the signature visual. The first native-window check prompted the darker surface to improve puck and arrow contrast.

Verification: engine tests including both legal example branches, turn/scoring/end invariants, collision and frame-rate independence; syntax checks; actual mouse offer and choice in native app; overhead/orbit/mute/rules/rematch; completed match; packaged launch and codesign verification.

Risk: normal local reversible creation. Stop only for a name collision with an existing installed app or a requirement to overwrite unrelated work.
