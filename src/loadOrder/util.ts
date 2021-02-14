// import { ILoadOrderGameInfo } from "vortex-api/lib/types/api";
import { actions, selectors, util } from "vortex-api";
import { ILoadOrder, UpdateType } from "vortex-api/lib/extensions/mod_load_order/types/types";
import { IExtensionApi, ILoadOrderDisplayItem, IMod, SortType } from "vortex-api/lib/types/api";
import { getModName } from "vortex-ext-common";
import { GAME_ID } from "..";

let previousLO: ILoadOrder;

export function loadOrderPrefix(api: IExtensionApi, mod) {
    const state = api.store.getState();
    const profile = selectors.activeProfile(state);
    const loadOrder = util.getSafe(state, ['persistent', 'loadOrder', profile.id], {});
    const loKeys = Object.keys(loadOrder);
    const pos = loKeys.indexOf(mod.id);
    if (pos === -1) {
        return 'ZZZZ-';
    }

    return makePrefix(pos) + '-';
}

function makePrefix(input: number) {
    let res = '';
    let rest = input;
    while (rest > 0) {
        res = String.fromCharCode(65 + (rest % 25)) + res;
        rest = Math.floor(rest / 25);
    }
    return util.pad(res as any, 'A', 3);
}

export async function preSort(api: IExtensionApi, items: ILoadOrderDisplayItem[], direction: SortType) {
    const mods = util.getSafe<{[key: string]: IMod}>(api.store.getState(), ['persistent', 'mods', GAME_ID], {});

    const loadOrder = items.map(mod => {
        const modInfo = mods[mod.id];
        let name = modInfo ? getModName(modInfo, mod.name) : mod.name;
        const paks = util.getSafe<string[]>(modInfo.attributes, ['installedPaks'], []);
        if (paks.length > 1) name = name + ` (${paks.length} PAK files)`;

        return {
            id: mod.id,
            name,
            imgUrl: modInfo ? modInfo.attributes.pictureUrl : undefined
        }
    });

    return (direction === 'descending') ? Promise.resolve(loadOrder.reverse()) : Promise.resolve(loadOrder);

}

export function loadOrderChanged(api: IExtensionApi, loadOrder: ILoadOrder, updateType: UpdateType): void {
    if (previousLO === undefined) previousLO = loadOrder;
    if (loadOrder === previousLO) return;
    api.store.dispatch(actions.setDeploymentNecessary(GAME_ID, true));
    previousLO = loadOrder;
}

export function isLoadOrderEnabled(mod: IMod): boolean {
    return util.getSafe<string[]>(mod.attributes, ['installedPaks'], []).length > 0;
}

export function filterLoadOrderEnabled(mods: IMod[]): IMod[] {
    return mods.filter(m => isLoadOrderEnabled(m));
}