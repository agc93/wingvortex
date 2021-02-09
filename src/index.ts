import { fs, log, util } from "vortex-api";
import { IDeployedFile, IDiscoveryResult, IExtensionApi, IExtensionContext, IGameStoreEntry, IInstallResult, IMod, IModTable, ISupportedResult, ProgressDelegate } from 'vortex-api/lib/types/api';
import { isGameManaged, UserPaths } from "./util";
import { Features, GeneralSettings, settingsReducer } from "./settings";
import { advancedInstall, unsupportedInstall } from "./install";
import { installedFilesRenderer, skinsAttribute } from "./attributes";
import { checkForConflicts, refreshSkins, updateSlots } from "./slots";

import { isActiveGame, UnrealGameHelper } from "vortex-ext-common";
import * as path from 'path';

export const GAME_ID = 'projectwingman'
export const I18N_NAMESPACE = 'wingvortex';
export const STEAMAPP_ID = 895870;
export const GOGAPP_ID = 1430183808;
export const MOD_FILE_EXT = ".pak";
export const unreal: UnrealGameHelper = new UnrealGameHelper(GAME_ID);

export type ModList = { [modId: string]: IMod; };

const relModPath = path.join('ProjectWingman', 'Content', 'Paks', '~mods');

export type RunningTools = {[key: string]: {exePath: string, started: any, pid: number, exclusive: boolean}};


export function findGame() {
    return util.GameStoreHelper.findByAppId([STEAMAPP_ID.toString(), GOGAPP_ID.toString()])
        .then((game: IGameStoreEntry) => game.gamePath);
}

//This is the main function Vortex will run when detecting the game extension. 
function main(context: IExtensionContext) {
    const isWingmanManaged = (): boolean => {
        return isGameManaged(context.api);
    }
    
    context.registerSettings('Interface', GeneralSettings, undefined, isWingmanManaged, 101);
    context.registerReducer(['settings', 'wingvortex'], settingsReducer);
    context.once(() => {
        log('debug', 'initialising your new extension!');
        try {
            var langContent = fs.readFileSync(path.join(__dirname, 'language.json'), {encoding: 'utf-8'});
            context.api.getI18n().addResources('en', I18N_NAMESPACE, JSON.parse(langContent));
            // using require here instead of `fs` means that webpack will bundle the language file for us
            // unfortunately this doesn't seem to actually work for some reason.
            // context.api.getI18n().addResources('en', I18N_NAMESPACE, require('./language.json'));
        } catch { }
        util.installIconSet('wingvortex', path.join(__dirname, 'icons.svg'));
        context.api.onAsync('did-deploy', (profileId: string, deployment: { [typeId: string]: IDeployedFile[] }) => {
            if (isActiveGame(context.api, GAME_ID)) {
                log('debug', 'running PW skin slot event handler');
                checkForConflicts(context.api, Object.values(deployment).flat());
            }
            return Promise.resolve();
        });
        context.api.onStateChange(
            ['persistent', 'mods'],
            onModsChanged(context.api));
    });
    context.registerGame({
        name: "Project Wingman",
        mergeMods: true,
        logo: 'gameart.png',
        supportedTools: [],
        executable: () => 'ProjectWingman.exe',
        requiredFiles: [
            'ProjectWingman.exe'
        ],
        id: GAME_ID,
        queryPath: findGame,
        queryModPath: () => relModPath,
        setup: (discovery: IDiscoveryResult) => {
            log('debug', 'running wingvortex setup')
            unreal.prepareforModding(discovery, relModPath)
        },
        requiresLauncher: getLauncher,
        environment: {
            SteamAPPId: STEAMAPP_ID.toString()
        },
        details: {
            steamAppId: STEAMAPP_ID,
            settingsPath: () => UserPaths.userConfigPath(),
            appDataPath: () => UserPaths.userDataPath()
        }
    });
    context.registerInstaller(
        'pw-pakx',
        1,
        async (files, gameId): Promise<ISupportedResult> => {
            if (gameId === GAME_ID && files.some(f => path.extname(f) == '.pakx')) {
                return {
                    supported: true,
                    requiredFiles: []
                }
            }
            return {
                supported: false,
                requiredFiles: []
            }
        },
        (files, destination, game, progress) => unsupportedInstall(context.api, files, destination, game, progress)
    )
    context.registerInstaller(
        'pw-pakmods',
        25,
        unreal.testSupportedContent,
        (files, destination, gameId, progress) => installContent(context.api, files, destination, gameId, progress)
    );
    context.registerTableAttribute('mods', {
        id: 'pw-paks',
        placement: 'detail',
        name: 'Installed files',
        help: 'Which specific files from the mod were installed',
        edit: {},
        isToggleable: true,
        isSortable: false,
        calc: (mod: IMod) => util.getSafe(mod.attributes, ['installedPaks'], []),
        condition: () => isActiveGame(context.api, GAME_ID),
        customRenderer: (mod: IMod) => installedFilesRenderer(context.api, mod)
    });
    context.registerTableAttribute('mods', skinsAttribute(context.api));
    context.registerAction('mods-action-icons', 201, 'aircraft', {},
                         'Refresh Skins', (ids) => refreshSkins(context.api, ids), () => isActiveGame(context.api, GAME_ID));
    context.registerAction('mods-multirow-actions', 201, 'aircraft', {},
                         'Refresh Skins', (ids) => refreshSkins(context.api, ids), () => isActiveGame(context.api, GAME_ID));
    return true;
}

async function getLauncher(gamePath: string): Promise<{ launcher: string, addInfo?: any }> {
    return gamePath.includes('steamapps') ? {launcher: 'steam'} : undefined;
}

/**
 * The main extension installer implementation.
 * @remarks
 * The main logic for this was mostly borrowed from agc93/beatvortex and Nexus-Mods/vortex-games so thanks respective authors
 *
 * @param api - The extension API.
 * @param files - The list of mod files for installation
 * @param gameId - The game ID for installation (should only ever be GAME_ID)
 * @param progressDelegate - Delegate for reporting progress (not currently used)
 *
 * @returns Install instructions for mapping mod files to output location.
 */
async function installContent(api: IExtensionApi, files: string[], destinationPath: string, gameId: string, progress: ProgressDelegate): Promise<IInstallResult> {
    log('debug', `running wingvortex installer. [${gameId}]`, { files, destinationPath });
    var enableAdvanced = Features.isInstallerEnabled(api.getState());
    if (!enableAdvanced) {
        return unreal.installContent(files, destinationPath, gameId, progress);
    } else {
        return advancedInstall(api, files, destinationPath, gameId, progress);
    }
}

function onModsChanged(api: IExtensionApi): (oldValue: IModTable, newValue: IModTable) => void {
    if (!isActiveGame(api, GAME_ID)) {
        return () => {};
    }
    let lastModTable = api.store.getState().persistent.mods;
    log('debug', 'scheduling PW skin update on mods changed')

    const updateDebouncer: util.Debouncer = new util.Debouncer(
        (newModTable: IModTable) => {
            if ((lastModTable === undefined) || (newModTable === undefined)) {
                return;
            }
            const state = api.store.getState();
            // ensure anything changed for the actiave game
            if ((lastModTable[GAME_ID] !== newModTable[GAME_ID])
                && (lastModTable[GAME_ID] !== undefined)
                && (newModTable[GAME_ID] !== undefined)) {
                var newIds = Object.keys(newModTable[GAME_ID]).filter(x => !Object.keys(lastModTable[GAME_ID]).includes(x));
                if (!newIds || newIds.length == 0) {
                    return Promise.resolve();
                }
                log('debug', 'invoking PW slot updates', { newIds })
                return updateSlots(api, newIds.map(i => newModTable[GAME_ID][i]), false);
            }
        }, 4000);

    // we can't pass oldValue to the debouncer because that would only include the state
    // for the last time the debouncer is triggered, missing all other updates
    return (oldValue: IModTable, newValue: IModTable) =>
        updateDebouncer.schedule((err: Error) => log('debug', 'Updated skin slots for PW mods', { err }), newValue);
}

module.exports = {
    default: main,
};