import { IDeployedFile, IDiscoveryResult, IExtensionApi, IMod, IProfile, IState } from "vortex-api/lib/types/api";
import { Features } from "../settings";
import { GAME_ID } from "../index";
import { actions, fs, log, selectors, util } from "vortex-api";
import { getSicarioTool, toolExists } from "./util";
import * as path from "path";
import { NativeSlotReader } from "../slots/pakReader";
import { getGamePath } from "vortex-ext-common";

export const sicarioPreDeploymentHandler = (api: IExtensionApi): (profileId: string, deployment: { [modType: string]: IDeployedFile[] }) => Promise<void> => {
    const state = api.getState();
    const { store } = api;
    return async (profileId, oldDeployment) => {

    }
}

export const runSicarioMerge = async (api: IExtensionApi, profileId: string, oldDeployment: { [modType: string]: IDeployedFile[] }, setTitle?: (title: string) => void): Promise<void> => {
    var state = api.getState();
    const {store} = api;
    if (Features.isSicarioEnabled(state)) {
        setTitle?.("Updating PSM mod state");
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
        // const allMods = state.persistent.mods[profile.gameId] || {};
        // TODO: this is a hack. We don't want the PSM Data mod being enabled to trigger a new
        //   deployment, but this is probably true for everything that runs as a post-deploy
        //   callback but _not_ for everything else that is triggered separately
        //const didNeedDeployment = state.persistent.deployment.needToDeploy[profile.gameId];
        try {
            setTitle?.("Building PSM merged mod");
            await runMerger(api, profile);
            setTitle?.("Updating merged mod state");
            await updateMergedAttribute(api, profile, modId);
            store.dispatch(actions.setModEnabled(profile.id, modId, true));
            api.events.emit('mod-content-changed', profile.gameId, modId);
            return api.emitAndAwait('deploy-single-mod', profile.gameId, modId);
        } catch (err) {
            if (err instanceof util.UserCanceled) {
                //ignored
            }
            else if (err instanceof util.SetupError) {
                api.showErrorNotification('Failed to find PSM', 'Please install PSM and add it as a tool in Vortex', {allowReport: false});
            } else {
                api.showErrorNotification('Failed to run PSM', 'There was an unknown error running PSM to merge your mods!', {allowReport: false});
            }
        }
    } else {
        return Promise.resolve(null);
    }
}


export const sicarioDeploymentHandler = (api: IExtensionApi): (profileId: string, deployment: { [modType: string]: IDeployedFile[] }, setTitle?: (title: string) => void) => Promise<void> => {
    return async (profile, deployment) => await runSicarioMerge(api, profile, deployment);
}

const updateMergedAttribute = async (api: IExtensionApi, profile: IProfile, modId: string): Promise<void> => {
    try {
        var reader = new NativeSlotReader(api, (msg, obj) => log('debug', msg, obj));
        const installPath = selectors.installPathForGame(api.getState(), profile.gameId);
        var mergedModPath = path.join(installPath, dataModName(profile.name));
        var mergedModFile = fs.readdirSync(mergedModPath, {withFileTypes: true}).filter(de => de.isFile() && path.extname(de.name) == ".pak");
        if (mergedModFile.length == 0) return;
        var result = await reader.getAllFiles(path.join(mergedModPath, mergedModFile[0].name));
        if (result !== undefined && result.length > 0) {
            //TODO: this should be moved into an action
            result = [...new Set(result.map(r => r.replace(path.extname(r), '')))]
            api.store.dispatch(actions.setModAttribute(profile.gameId, modId, 'mergedFiles', result));
        }
    }
    catch {
        log('warn', "Error encountered while updating merged mod attributes!");
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
    const gamePath = getGamePath(selectors.gameById(state, profile.gameId), state, true);
    const installPath = selectors.installPathForGame(state, profile.gameId);
    const modId = await ensureMergeDataMod(api, profile);
    const modPath = path.join(installPath, modId)
    const args = ['build', `--installPath="${gamePath}"`, `--outputPath="${modPath}"`];
    await api.runExecutable(tool.path, args, { suggestDeploy: false });
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
        type: 'sicario-merge',
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