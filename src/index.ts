import { fs, log, util } from "vortex-api";
import { IDiscoveryResult, IExtensionApi, IExtensionContext, IGameStoreEntry, IInstallResult, IMod, ProgressDelegate } from 'vortex-api/lib/types/api';
import { isGameManaged } from "./util";
import { Features, GeneralSettings, settingsReducer } from "./settings";
import { advancedInstall } from "./install";
import { installedFilesRenderer } from "./attributes";
import { isActiveGame, UnrealGameHelper } from "vortex-ext-common";
import * as path from 'path';

export const GAME_ID = 'projectwingman'
export const I18N_NAMESPACE = 'wingvortex';
export const STEAMAPP_ID = 895870;
export const MOD_FILE_EXT = ".pak";
export const unreal: UnrealGameHelper = new UnrealGameHelper(GAME_ID);

export type ModList = { [modId: string]: IMod; };

const relModPath = path.join('Game', 'Content', 'Paks', '<#>');

export type RunningTools = {[key: string]: {exePath: string, started: any, pid: number, exclusive: boolean}};


export function findGame() {
    return util.GameStoreHelper.findByAppId(STEAMAPP_ID.toString())
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
    });
    context.registerGame({
        name: "Project Wingman",
        mergeMods: true,
        logo: 'gameart.png',
        supportedTools: [],
        executable: () => '<#>.exe',
        requiredFiles: [
            '<#>.exe'
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
            steamAppId: STEAMAPP_ID
        }
    });
    context.registerInstaller(
        'pw-pakmods',
        25,
        unreal.testSupportedContent,
        (files, destination, gameId, progress) => installContent(context.api, files, destination, gameId, progress)
    );
    context.registerTableAttribute('mods', {
        id: 'acev-paks',
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

module.exports = {
    default: main,
};