import path from "path";
import { fs, util } from "vortex-api";
import { ILoadOrderGameInfo, LoadOrder } from "vortex-api/lib/extensions/file_based_loadorder/types/types";
import { IExtensionApi } from "vortex-api/lib/types/api";
import { getGamePath, getDiscoveryPath } from "vortex-ext-common";
import { GAME_ID } from "..";

export function getLoadOrderHandler(api: IExtensionApi): ILoadOrderGameInfo {
    return {
        toggleableEntries: false,
        gameId: GAME_ID,
        serializeLoadOrder: (loadOrder) => serializeLoadOrderToFile(api, loadOrder) as any,
        deserializeLoadOrder: () => deserializeLoadOrderFromFile(api)
    }
}

function serializeLoadOrderToFile(api: IExtensionApi, loadOrder: LoadOrder): Promise<void> {
    var state = api.getState();
    var gamePath = getDiscoveryPath(GAME_ID, state);
    if (gamePath === undefined) {
        return Promise.reject(new util.NotFound('Game not found'));
    }

    const modListPath = path.join(gamePath, '__loadOrder.json');
    return fs.writeFileAsync(modListPath, JSON.stringify(loadOrder
        .filter(mod => mod.enabled) // Make sure we only write the enabled mods.;
    ));
}

async function deserializeLoadOrderFromFile(api: IExtensionApi): Promise<LoadOrder> {
    var state = api.getState();
    var gamePath = getDiscoveryPath(GAME_ID, state);
    if (gamePath === undefined) {
        return Promise.reject(new util.NotFound('Game not found'));
    }
    var srcFile = path.join(gamePath, '__loadOrder.json');
    var fileContent: string = await fs.readFileAsync(srcFile, {encoding: 'utf8'});
    return JSON.parse(fileContent) as LoadOrder;
}