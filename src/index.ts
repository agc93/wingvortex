import {fs, log, selectors, util} from "vortex-api";
import {
    IDiscoveryResult,
    IExtensionApi,
    IExtensionContext,
    IGameStoreEntry,
    IMod,
    IState,
} from 'vortex-api/lib/types/api';

import {IIntegrationProps, isGameManaged, isToolMod, UserPaths} from "./util";
import { Features, GeneralSettings, settingsReducer } from "./settings";
import { getInstaller } from "./install";
import { installedFilesRenderer, skinsAttribute } from "./attributes";
import { checkForConflicts, refreshSkins, updateSlots } from "./slots";
import { update010, migrate010, update020, getUpdateInfo, notesMigration } from "./migrations";
import {getMergePath, isSicarioMod, sicarioDeploymentHandler, SicarioSettings, toggleIntegration, sicarioIntegrationTest, PSMTool} from "./sicario";

import {getGamePath, isActiveGame, UnrealGameHelper} from "vortex-ext-common";
import { EventHandler } from "vortex-ext-common/events";
import { migrationHandler } from "vortex-ext-common/migrations";
import { LoadOrderHelper } from "vortex-ext-common/ueLoadOrder";
import * as path from 'path';


export const GAME_ID = 'projectwingman'
export const I18N_NAMESPACE = 'wingvortex';
export const STEAMAPP_ID = 895870;
export const GOGAPP_ID = 1430183808;
export const MOD_FILE_EXT = ".pak";
export const unreal: UnrealGameHelper = new UnrealGameHelper(GAME_ID);

export type ModList = { [modId: string]: IMod; };

export const relModPath = path.join('ProjectWingman', 'Content', 'Paks', '~mods');

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

    const getIntegrationProps = (state: IState): IIntegrationProps => {
        const gameMode = selectors.activeGameId(state);
        return {
            gameMode,
            enabled: Features.isSicarioEnabled(state)
        };
    }
    
    context.registerSettings('Interface', GeneralSettings, undefined, isWingmanManaged, 101);
    context.registerSettings('Interface', SicarioSettings, undefined, isWingmanManaged, 102);
    context.registerToDo(
        'sicario-integration',
        'settings',
        getIntegrationProps,
        'sicario-alt',
        'Project Sicario Integration',
        (props: IIntegrationProps) => toggleIntegration(context.api),
        (props: IIntegrationProps) => isWingmanManaged(),
        (t, props: IIntegrationProps) => (props.enabled ? t('Yes') : t('No')),
        undefined);
    context.registerReducer(['settings', 'wingvortex'], settingsReducer);
    var evt = new EventHandler(context.api, GAME_ID);
    var installer = getInstaller();
    var lo = new LoadOrderHelper(context.api, GAME_ID);
    lo.withFilter((val, mod) => {
        return mod ? mod.type == '' : false; //only include default mod types
    });
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
        
        evt.didDeploy(async (_, deployment) => checkForConflicts(context.api, Object.values(deployment).flat()), {name: 'Skin slot detection'});
        evt.didDeploy(sicarioDeploymentHandler(context.api), {name: 'Project Sicario Integration'});
        context.api.onStateChange(
            ['persistent', 'mods', GAME_ID],
            evt.onGameModsChanged(async (current, changes) => {
                log('debug', 'invoking evt handler');
                // debugger;
                updateSlots(context.api, changes.addedMods, false);
            }));
        installer.configure(context.api);
    });
    context.registerGame({
        name: "Project Wingman",
        mergeMods: lo.createPrefix,
        logo: 'gameart.png',
        supportedTools: [PSMTool],
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
    //special mod type for Sicario merged patches, mostly so that the path can be tweaked and it won't show in the LO
    context.registerModType(
        'sicario-merge',
        10,
        gameId => gameId === GAME_ID,
        (game) => getMergePath(game, context.api.getState()),
        (inst) => isSicarioMod(inst),
        {
            name: "PSM Merge Data",
            mergeMods: true,
            deploymentEssential: false
        });
    //this adds a new mod type just so that tools (like Sicario) go into the root directory instead
    context.registerModType(
        'sicario-tools',
        10,
        gameId => gameId === GAME_ID,
        (game) => getGamePath(game, context.api.getState(), true),
        (inst) => isToolMod(inst),
        {
            name: "PW Modding Tool",
            mergeMods: true
        }
    );
    context.registerTest('sicario-integration', 'gamemode-activated', () => sicarioIntegrationTest(context.api)());
    context.registerInstaller(
        'pw-pakmods-advanced',
        25,
        installer.testSupported,
        installer.advancedInstall
    );
    context.registerLoadOrder({
        deserializeLoadOrder: lo.deserialize,
        serializeLoadOrder: lo.serialize,
        gameId: GAME_ID,
        validate: lo.validate,
        toggleableEntries: false
    });
    /* context.registerInstaller(
        'pw-pakmods',
        25,
        unreal.testSupportedContent,
        (files, destination, gameId, progress) => installContent(context.api, files, destination, gameId, progress)
    ); */
    /* context.registerModType('pw-pak-mod', 25, gameId => gameId === GAME_ID, (game) => path.join(getGamePath(game, context.api.getState()), relModPath), 
    isPakMod, { mergeMods: mod => loadOrderPrefix(context.api, mod) + mod.id , name: 'Project Wingman Mod'}); */
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
    context.registerMigration(migrationHandler(context.api, GAME_ID, update010, migrate010));
    context.registerMigration(migrationHandler(context.api, GAME_ID, update020, notesMigration));
    context.registerMigration(migrationHandler(context.api, GAME_ID, getUpdateInfo('0.2.1'), notesMigration));
    return true;
}

async function getLauncher(gamePath: string): Promise<{ launcher: string, addInfo?: any }> {
    return gamePath.includes('steamapps') ? {launcher: 'steam'} : undefined;
}

module.exports = {
    default: main,
};