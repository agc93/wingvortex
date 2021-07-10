import { IExtensionApi, IDialogResult, IProfile, IMod } from "vortex-api/lib/types/api";
import { util, log, selectors } from "vortex-api";
import * as semver from "semver";
import { GAME_ID, I18N_NAMESPACE } from ".";
import { app, remote } from 'electron';
import { IGameModTable } from "vortex-ext-common/events/types";
import { ExtensionUpdateInfo, requireVortexVersionNotification, showUpgradeNotification } from "vortex-ext-common/migrations";
import { updateSlots } from "./slots";

/**
 * Gets the currently running Vortex version.
 * 
 * @param defaultValue The default Vortex version to use if detection fails.
 */
function getVortexVersion(defaultValue?: string): string {
    var vortexVersion = app?.getVersion() ?? remote?.app?.getVersion() ?? defaultValue;
    return vortexVersion;
}

/**
 * Determines whether the current Vortex version meets the specified minimum version.
 * 
 * @param version The minimum version required.
 */
function meetsMinimum(version: string): boolean {
    return semver.gte(getVortexVersion(), version);
}

export const update010: ExtensionUpdateInfo = {
    name: 'WingVortex',
    newVersion: '0.1.0',
    releaseNotes: 'https://wingman.vortex.support/updates/v0.1.0',
    requiredVortexVersion: '1.4.2'
};

export const update020: ExtensionUpdateInfo = {
    name: 'WingVortex',
    newVersion: '0.2.0',
    releaseNotes: 'https://wingman.vortex.support/updates/v0.2.0',
    requiredVortexVersion: '1.4.2'
};

export async function migrate010(api: IExtensionApi, extInfo: ExtensionUpdateInfo): Promise<void> {
    
    const state = api.store.getState();
    const mods = util.getSafe<IGameModTable>(state, ['persistent', 'mods', GAME_ID], {});
    

    if (!meetsMinimum(extInfo.requiredVortexVersion)) {
        requireVortexVersionNotification(api, extInfo, 
            `A number of the extra features added in v${extInfo.newVersion} of the WingVortex extension require a newer Vortex version!\n\nWe *strongly* recommend either upgrading Vortex to the latest version, or disabling WingVortex until you upgrade. If you continue, we won't be able to help you, and can't guarantee that things won't break!`);
    }

    var existingSlots: IMod[] = [];

    for (const modId of Object.keys(mods)) {
        var mod = mods[modId];
        var skins = util.getSafe(mod.attributes, ['skinSlots'], []);
        if (skins && skins.length > 0) {
            existingSlots.push(mod);
        }
    }

    await updateSlots(api, existingSlots, true);

    return showUpgradeNotification(api, extInfo, releaseNotes['0.1.0']);

}

export async function migrate020(api: IExtensionApi, extInfo: ExtensionUpdateInfo): Promise<void> {
    
    const state = api.store.getState();
    const mods = util.getSafe<IGameModTable>(state, ['persistent', 'mods', GAME_ID], {});
    

    if (!meetsMinimum(extInfo.requiredVortexVersion)) {
        requireVortexVersionNotification(api, extInfo, 
            `A number of the extra features added in v${extInfo.newVersion} of the WingVortex extension require a newer Vortex version!\n\nWe *strongly* recommend either upgrading Vortex to the latest version, or disabling WingVortex until you upgrade. If you continue, we won't be able to help you, and can't guarantee that things won't break!`);
    }

    return showUpgradeNotification(api, extInfo, releaseNotes['0.2.0']);

}

const releaseNotes = {
    '0.1.0': "WingVortex 0.1.x includes a few new features you might want to know about:\n\n" +
    "- Dramatically improved skin slot detection\n" + 
    "- Improved blueprint mod detection and conflict warnings\n" +
    "- New upgraded installer that should be more stable\n\n" + 
    "You shouldn't see any big changes with this version, but you may want to check your mods list to confirm that you skins have been detected correctly.",
    '0.2.0': "WingVortex 0.2.x includes a few new features you might want to know about:\n\n" +
    "- Load order support! You can now adjust your load order directly from Vortex.\n" +
    "- Dramatically faster and more reliable skin slot detection (again)\n" + 
    "- Improved blueprint mod detection and conflict warnings\n" +
    "- A few other niggling bugs have been fixed\n\n" + 
    "The upgrade should be relatively seamless, but you may want to check your mods list to confirm that you skins have been detected correctly."
}
