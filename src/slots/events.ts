import { IDeployedFile, IExtensionApi, IMod } from "vortex-api/lib/types/api";
import { util, selectors, fs, actions, log } from "vortex-api";
import { GAME_ID, ModList, MOD_FILE_EXT } from "..";
import { NativeSlotReader } from "./pakReader";
import { QuickSlotReader } from "./bmsReader";
import { ModBlueprints, AircraftSlot } from "./types";
import path = require("path");
import nfs = require('fs');

type SlotList = {[key: string]: IMod[]};

export function checkForConflicts(api: IExtensionApi, files: IDeployedFile[], conflictAction?: (slots: SlotList) => any) {
    log('debug', 'checking for PW skin conflicts');
    var mods = util.getSafe<ModList>(api.getState().persistent, ['mods', GAME_ID], {});
    var deployedMods = [...new Set(files.map(f => mods[f.source]))];
    var skinMods = Object.values(deployedMods)
        .filter(m => util.getSafe(m.attributes, ['skinSlots'], undefined));
    // var slotRoots = groupBy(skinMods, (mod) => util.getSafe(mod.attributes, ['skinSlots'], ''));
    var slotRoots = buildConflictList(skinMods, 'skinSlots');
    if (Object.keys(slotRoots).some(rk => slotRoots[rk].length > 1)) {
        var conflicts = removeNonConflicts(slotRoots);
        if (conflictAction) {
            conflictAction(conflicts);
        } else {
            api.sendNotification({
                'type': 'warning',
                title: 'Potential skin slot conflict!',
                message: 'It looks like more than one mod is changing the same skin slot.',
                actions: [
                    {
                        title: 'See More',
                        action: (dismiss) => {
                            api.showDialog('error', 'Potential skin slot conflict!', {
                                text: "It looks like more than one of the mods that was just deployed are modifying the same skin slot! This can lead to unexpected results and is probably not what you're looking for. The mods and slots in question are shown below.\n\nIf the mod came with multiple options for skin slots, you can try reinstalling and installing only some of the mod files.",
                                options: {
                                    wrap: false
                                },
                                message: renderConflictList(conflicts)
                            }, [
                                {label: 'Continue', action: () => dismiss()}
                            ]);
                        }
                    }
                ]
            });
        }
    }
    var dtMods = Object.values(deployedMods)
        .filter(m => util.getSafe(m.attributes, ['datatables'], undefined));
    var tables = buildConflictList(dtMods, 'datatables');
    if (Object.keys(tables).some(tk => tables[tk].length > 1)) {
        var conflictTables = removeNonConflicts(tables);
        api.sendNotification({
            'type': 'warning',
            title: 'Potential data table mod conflict!',
            message: "It looks like more than one mod is changing the game's data tables.",
            actions: [
                {
                    title: 'See More',
                    action: (dismiss) => {
                        api.showDialog('error', 'Potential blueprint mod conflict!', {
                            text: "It looks like more than one of the mods that was just deployed are modifying the same data table! These mods can't be loaded together as they will overwrite each other, leading to unexpected results. The mods in question and what blueprint they modify are shown below.\n\nYou should either use a merged mod or disable all but one of the conflicting mods before you launch the game.",
                            options: {
                                wrap: false
                            },
                            message: renderConflictList(conflictTables, 'Table')
                        }, [
                            {label: 'Continue', action: () => dismiss()}
                        ]);
                    }
                }
            ]
        });
    }
}

function renderConflictList(conflicts: SlotList, prefix: string = 'Slot'): string {
    return Object.keys(conflicts)
        .map(ck => {
            return `${prefix} ${ck.replace('|', '/')}: ${conflicts[ck].map(m => util.getSafe(m.attributes, ['modName'], m.id)).join(', ')}`
        })
        .join('\n');
}

function buildConflictList(mods: IMod[], attributeName: string): SlotList {
    var slots: {[key: string]: IMod[]} = {};
    var allSlots = mods
        // .filter(m => m.type !== 'sicario-merge') //theoretically not needed since updateSlots ignores these anyway
        .reduce(function (slots, mod) {
            var skins = util.getSafe<string[]>(mod.attributes, [attributeName], []);
            if (skins) {
                skins.forEach(sk => {
                    // If the key doesn't exist yet, create it
                    if (!slots.hasOwnProperty(sk)) {
                        slots[sk] = [];
                    }
                    slots[sk].push(mod);
                });
            }
            // Return the object to the next item in the loop
            return slots;
        }, slots);
    return allSlots;
    // return removeNonConflicts(allSlots);
}

function removeNonConflicts(slots: SlotList) {
    for (var slot in slots) {
        if (slots[slot].length < 2) {
            delete slots[slot];
        }
    }
    return slots;
}

export function refreshSkins (api: IExtensionApi, instanceIds: string[], clobber: boolean = true) {
    const state = api.store.getState();
    const gameId = selectors.activeGameId(state);
    var mods = instanceIds.map(i => {
        return util.getSafe<IMod>(state.persistent.mods, [gameId, i], undefined);
    })
    .filter(m => m);
    updateSlots(api, mods, clobber)
  };

export async function updateSlots(api: IExtensionApi, mods: IMod[], replace: boolean = true) {
    // log('debug', 'updating skin slots for mods', {mods: mods.length, replace});
    var reader = new NativeSlotReader(api, (m, d) => log('debug', m, d), MOD_FILE_EXT);
    //var bmsReader = new QuickSlotReader(api, (m, d) => log('debug', m, d), MOD_FILE_EXT);
    var installedMods = mods
        .filter(m => m !== undefined && m !== null && m)
        .filter(m => m.state == 'installed')
        .filter(m => m.type !== 'sicario-merge') //ignore merged files
        .filter(m => m.installationPath);
    for (const mod of installedMods) {
        var existingSkins = util.getSafe(mod.attributes, ['skinSlots'], undefined);
        if (existingSkins !== undefined && !replace) {
            continue;
        }
        const stagingPath: string = selectors.installPathForGame(api.getState(), GAME_ID);
        var modPath = path.join(stagingPath, mod.installationPath);
        var files = (await nfs.promises.readdir(modPath, {withFileTypes: true}))
            .filter(de => de.isFile() && path.extname(de.name).toLowerCase() == MOD_FILE_EXT)
            .map(den => path.join(modPath, den.name));
        if (files) {
            var skins: AircraftSlot[] = [];
            var tables: string[] = [];
            for (const file of files) {
                var result = await reader.getModified(file);
                skins.push(...result.skinSlots)
                var modTables = result.blueprints
                    .filter(fii => !!fii);
                tables.push(...modTables);
            }
            var results = skins;
            var slots = results.filter(fii => !!fii)
                .flatMap(i => i)
                .map(i => `${i.aircraft}|${i.slot}`);
            if (slots) {
                api.store.dispatch(actions.setModAttribute(GAME_ID, mod.id, 'skinSlots', slots));
            } else if (!slots && replace) {
                // this is actually not an ideal scenario since a failed detection would completely erase a potentially valid one
                // but given there's currently no way to reverse an incorrect detection, we basically need this.
                // in future, we might want to show a dialog before doing this
                api.store.dispatch(actions.setModAttribute(GAME_ID, mod.id, 'skinSlots', []));
            }
            if (tables) {
                api.store.dispatch(actions.setModAttribute(GAME_ID, mod.id, 'datatables', tables));
            } else if (!tables && replace) {
                api.store.dispatch(actions.setModAttribute(GAME_ID, mod.id, 'datatables', []));
            }
        }
    }
}