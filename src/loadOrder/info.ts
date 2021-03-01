import path from "path";
import { fs, util } from "vortex-api";
import { ILoadOrderEntry, ILoadOrderGameInfo, IValidationResult, LoadOrder } from "vortex-api/lib/extensions/file_based_loadorder/types/types";
import { IDeploymentManifest, IExtensionApi } from "vortex-api/lib/types/api";
import { getGamePath, getDiscoveryPath, getModName } from "vortex-ext-common";
import { GAME_ID } from "..";
import * as nfs from 'fs';
import { IGameModTable } from "vortex-ext-common/events/types";

export function getLoadOrderHandler(api: IExtensionApi): ILoadOrderGameInfo {
    return {
        toggleableEntries: false,
        gameId: GAME_ID,
        serializeLoadOrder: (loadOrder) => serializeLoadOrderToFile(api, loadOrder) as any,
        deserializeLoadOrder: () => deserializeLoadOrderFromFile(api),
        validate: (prev, current) => validateLoadOrder(api, prev, current)
    }
}

async function validateLoadOrder(api: IExtensionApi, previous: LoadOrder, current: LoadOrder): Promise<IValidationResult> {
    return undefined;
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
    if (nfs.existsSync(srcFile)) {
        var fileContent: string = await fs.readFileAsync(srcFile, {encoding: 'utf8'});
        return JSON.parse(fileContent) as LoadOrder;
    } else {
        //debugger;
        var mods = util.getSafe<IGameModTable>(state.persistent, ['mods', GAME_ID], {});
        var enabled: IDeploymentManifest = await util.getManifest(api, undefined, GAME_ID);
        var sourceMods = [...new Set(enabled.files.map(df => df.source))].map(name => mods[name]);
        return sourceMods.map((sm): ILoadOrderEntry => {
            var name = getModName(sm);
            return {
                enabled: true,
                id: sm.id,
                modId: sm.id,
                name
            }
        })
    }
}