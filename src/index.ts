import {fs, log, selectors, util} from "vortex-api";
import {
    IDiscoveryResult,
    IExtensionContext,
    IGameStoreEntry,
    IMod,
    IState,
} from 'vortex-api/lib/types/api';

import {dirAvailable, IIntegrationProps, isGameManaged, isToolMod, UserPaths} from "./util";
import { Features, GeneralSettings, settingsReducer } from "./settings";
import { getInstaller } from "./install";
import { installedFilesRenderer, skinsAttribute } from "./attributes";
import { checkForConflicts, refreshSkins, updateSlots } from "./slots";
import { update010, migrate010, update020, getUpdateInfo, notesMigration } from "./migrations";
import {getMergePath, isSicarioMerge, SicarioSettings, toggleIntegration, sicarioIntegrationTest, PSMTool, runSicarioMerge} from "./sicario";

import {getGamePath, isActiveGame} from "vortex-ext-common";
import { EventHandler } from "vortex-ext-common/events";
import { migrationHandler } from "vortex-ext-common/migrations";
import { LoadOrderHelper } from "vortex-ext-common/ueLoadOrder";
import * as path from 'path';
import {remote} from "electron";


export const GAME_ID = 'projectwingman'
export const I18N_NAMESPACE = 'wingvortex';
export const STEAMAPP_ID = 895870;
export const GOGAPP_ID = 1609812781;
export const MSAPP_ID = "HumbleBundle.ProjectWingman" //this is a complete fucking guess
export const MOD_FILE_EXT = ".pak";
// export const unreal: UnrealGameHelper = new UnrealGameHelper(GAME_ID);

export type ModList = { [modId: string]: IMod; };

export const getModPath = (gamePath: string): string => {
    if (!dirAvailable(gamePath) || gamePath.includes("WindowsApps" + path.sep)) {
        return path.join(remote.app.getPath('home'), 'AppData', 'Local', 'ProjectWingman', 'Saved', 'Paks');
    }
    return path.join('ProjectWingman', 'Content', 'Paks', '~mods');
}

export type RunningTools = {[key: string]: {exePath: string, started: any, pid: number, exclusive: boolean}};


export function findGame() {
    return util.GameStoreHelper.findByAppId([STEAMAPP_ID.toString(), GOGAPP_ID.toString(), MSAPP_ID])
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
        (props: IIntegrationProps) => isWingmanManaged() && props.gameMode == GAME_ID,
        (t, props: IIntegrationProps) => (props.enabled ? t('Yes') : t('No')),
        undefined);
    context.registerReducer(['settings', 'wingvortex'], settingsReducer);
    const evt = new EventHandler(context.api, GAME_ID);
    const installer = getInstaller();
    const lo = new LoadOrderHelper(context.api, GAME_ID);
    lo.withFilter((val, mod) => {
        return mod ? mod.type == '' : false; //only include default mod types
    });
    context.once(() => {
        log('debug', 'initialising your new extension!');
        try {
            let langContent = fs.readFileSync(path.join(__dirname, 'language.json'), {encoding: 'utf-8'});
            context.api.getI18n().addResources('en', I18N_NAMESPACE, JSON.parse(langContent));
            // using require here instead of `fs` means that webpack will bundle the language file for us
            // unfortunately this doesn't seem to actually work for some reason.
            // context.api.getI18n().addResources('en', I18N_NAMESPACE, require('./language.json'));
        } catch { }
        util.installIconSet('wingvortex', path.join(__dirname, 'icons.svg'));
        
        evt.didDeploy(async (_, deployment) => checkForConflicts(context.api, Object.values(deployment).flat()), {name: 'Skin slot detection'});
        evt.didDeploy(async (profileId, deployment, setTitle) => runSicarioMerge(context.api, profileId, deployment, setTitle), {name: 'Project Sicario Integration'});
        context.api.onStateChange(
            ['persistent', 'mods', GAME_ID],
            evt.onGameModsChanged(async (current, changes) => {
                log('debug', 'invoking evt handler');
                // debugger;
                await updateSlots(context.api, changes.addedMods, false);
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
        queryModPath: getModPath,
        setup: async (discovery: IDiscoveryResult): Promise<void> => {
            log('debug', 'running wingvortex setup');
            try {
                await fs.ensureDirWritableAsync(path.join(discovery.path, path.join('ProjectWingman', 'Content', 'Paks', '~mods')));
            } catch (err) {
                log('error', `Error while setting up PW`, {err})
                context.api.sendNotification({
                    type: 'warning',
                    title: 'Game directory not writeable',
                    message: 'The game directory appears to be read-only. Not all features will be available.',
                    actions: [
                        {title: 'More',
                            action: dismiss => {
                                context.api.showDialog('error', 'Read-only game directory!', {
                                    text: getRODialogText()
                                }, [
                                    {label: "Close", action: () => dismiss()}
                                ]);
                            }}
                    ]
                });
            }
        },
        requiresLauncher: getLauncher,
        environment: {
            SteamAPPId: STEAMAPP_ID.toString()
        },
        details: {
            steamAppId: STEAMAPP_ID,
            settingsPath: () => UserPaths.userConfigPath(),
            appDataPath: () => UserPaths.userDataPath()
        },
        compatible: {
            deployToGameDirectory: false
        },
        onStart: 'hide'
    });
    //special mod type for Sicario merged patches, mostly so that the path can be tweaked and it won't show in the LO
    context.registerModType(
        'sicario-merge',
        10,
        gameId => gameId === GAME_ID,
        (game) => getMergePath(game, context.api.getState()),
        isSicarioMerge,
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
            mergeMods: true,
            //this actually should be deployment essential, for everything except XGP
            //if we made it essential, XGP would completely fail
            //this way Steam/GOG *should* still work but XGP will be a non-fatal warning
            deploymentEssential: false
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
        toggleableEntries: false,
        usageInstructions: "Drag and drop your mods around to change the order in which the game loads your mods. Note that, in general, lowest mod 'wins' file conflicts."
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

function getRODialogText(): string {
    return "Your Project Wingman game directory appears to be read-only. Most likely this means you have installed the game from the Microsoft Store.\n\n" +
        "Note that WingVortex will still try its best to manage mods using your user directory, but this is largely unsupported.\n\n" +
        "You should also be aware that some mods and most tools won't work with the Game Pass/Microsoft Store version of the game at all."
}

module.exports = {
    default: main,
};