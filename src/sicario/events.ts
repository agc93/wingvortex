import {IDeployedFile, IDiscoveryResult, IExtensionApi, IMod, IProfile, IState} from "vortex-api/lib/types/api";
import {Features} from "../settings";
import {GAME_ID} from "../index";
import {actions, log, selectors, util} from "vortex-api";
import {getSicarioTool, toolExists} from "./util";
import * as path from "path";

export const sicarioPreDeploymentHandler = (api: IExtensionApi): (profileId: string, deployment: { [modType: string]: IDeployedFile[] }) => Promise<void> => {
    const state = api.getState();
    const {store} = api;
    return async (profileId, oldDeployment) => {

    }
}


export const sicarioDeploymentHandler = (api: IExtensionApi): (profileId: string, deployment: { [modType: string]: IDeployedFile[] }, setTitle?: (title: string) => void)=>  Promise<void> => {
    const state = api.getState();
    const { store } = api;
    return async (profileId, oldDeployment, setTitle) => {
        if (Features.isSicarioEnabled(state)) {
            let profile = state.persistent.profiles[profileId];
            if (profile === undefined || profile.gameId !== GAME_ID) {
                return;
            }
            const modId = dataModName(profile.name);
            if ((util.getSafe(state, ['mods', modId], undefined) !== undefined)
                && !util.getSafe(profile, ['modState', modId, 'enabled'], true)) {
                // if the data mod is known but disabled, don't update it and most importantly:
                //  don't activate it after deployment, that's probably not what the user wants
                return;
            }
            api.store.dispatch(actions.setModEnabled(profile.id, modId, false));
            const discovery: IDiscoveryResult =
                state.settings.gameMode.discovered[profile.gameId];
            if ((discovery === undefined) || (discovery.path === undefined)) {
                return Promise.resolve();
            }
            const allMods = state.persistent.mods[profile.gameId] || {};
            // TODO: this is a hack. We don't want the PSM Data mod being enabled to trigger a new
            //   deployment, but this is probably true for everything that runs as a post-deploy
            //   callback but _not_ for everything else that is triggered separately
            //const didNeedDeployment = state.persistent.deployment.needToDeploy[profile.gameId];
            await runMerger(api, profile)
            store.dispatch(actions.setModEnabled(profile.id, modId, true));
            return api.emitAndAwait('deploy-single-mod', profile.gameId, modId);
        } else {
            return Promise.resolve(null);
        }
    }
}

function dataModName(profileName: string): string {
    return `PSM Merge Data (${profileName.replace(/[:/\\*?"<>|]/g, '_')})`;
}

export const runMerger = async (api: IExtensionApi, profile: IProfile): Promise<void> => {
    const state = api.getState();
    const tool = getSicarioTool(state, profile.gameId);
    if (tool === undefined || !(await toolExists(tool))) {
        log('info', 'PSM not configured');
        return Promise.reject(new util.SetupError('PSM not installed or configured!'));
    }
    const installPath = selectors.installPathForGame(state, profile.gameId);
    const modId = await ensureMergeDataMod(api, profile);
    const modPath = path.join(installPath, modId)
    const args = ['build', `--installPath='${installPath}`, `--outputPath=${modPath}`];
    await api.runExecutable(tool.path, args, {suggestDeploy: false});
}

async function ensureMergeDataMod(api: IExtensionApi, profile: IProfile): Promise<string> {
    const state: IState = api.store.getState();
    const modName = dataModName(profile.name);
    const mod = state.persistent.mods[profile.gameId]?.[modName];
    if (mod === undefined) {
        await createMergeDataMod(api, modName, profile);
    } else {
        // give the user an indication when this was last updated
        api.store.dispatch(actions.setModAttribute(profile.gameId, modName, 'installTime', new Date()));
        // the rest here is only required to update mods from previous vortex versions
        if (mod.installationPath === undefined) {
            api.store.dispatch(actions.setModInstallationPath(profile.gameId, modName, modName));
        }
    }
    return modName;
}

async function createMergeDataMod(api: IExtensionApi, modName: string,
                             profile: IProfile): Promise<void> {
    const mod: IMod = {
        id: modName,
        state: 'installed',
        attributes: {
            name: 'PSM Merge Data',
            logicalFileName: 'PSM Merge Data',
            // concrete id doesn't really matter but needs to be set to for grouping
            modId: 72,
            version: '1.0.0',
            variant: profile.name.replace(/[:/\\*?"<>|]/g, '_'),
            installTime: new Date(),
        },
        installationPath: modName,
        type: '',
    };

    await new Promise<void>((resolve, reject) => {
        api.events.emit('create-mod', profile.gameId, mod, async (error) => {
            if (error !== null) {
                return reject(error);
            }
            resolve();
        });
    });
}