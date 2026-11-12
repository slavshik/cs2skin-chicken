/** DI identifiers of the game (dp-instant keeps its own in `TypesCore` / `Types2D`). */
export const TypesApp = {
    sound: 'app.sound',
    /** Parsed spritesheets by atlas name, for raw textures (frame animations). */
    atlases: 'app.atlases',
    /** The `GameModel`: wallet and round state. */
    model: 'app.model',
    /** The `GameServer` (contract/ServerApi.ts); bound by main.ts, today to the mock server. */
    server: 'app.server',
    /** The game stage view (the board). */
    gameScreen: 'app.gameScreen',
};
