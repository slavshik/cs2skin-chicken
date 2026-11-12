import { Action } from '@dp-instant/core/Action.ts';
import { di } from '@dp-instant/core/di.ts';
import { injectable } from '@dp-instant/core/injectable.ts';
import type { GameServer } from '../../contract/ServerApi.ts';
import type { GameModel } from '../../game/GameModel.ts';
import { TypesApp } from '../types.ts';

/** Loads the player's session (the wallet) from the server before the game starts. */
@injectable()
export class SessionAction extends Action {
    async execute(): Promise<void> {
        const server = di.get<GameServer>(TypesApp.server);
        di.get<GameModel>(TypesApp.model).balance = (await server.session()).balance;
    }
}
