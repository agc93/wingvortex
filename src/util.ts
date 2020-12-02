import { IExtensionApi, IProfile } from "vortex-api/lib/types/api";
import { util } from "vortex-api";
import { GAME_ID } from ".";

import path = require('path');
import { remote } from 'electron';
import * as nfs from 'fs';

export const groupBy = function<T> (arr: T[], criteria: string|((obj:T) => string)): {[key: string]: T[]} {
	return arr.reduce(function (obj, item) {

		// Check if the criteria is a function to run on the item or a property of it
		var key = typeof criteria === 'function' ? criteria(item) : item[criteria];

		// If the key doesn't exist yet, create it
		if (!obj.hasOwnProperty(key)) {
			obj[key] = [];
		}

		// Push the value to the object
		obj[key].push(item);

		// Return the object to the next item in the loop
		return obj;

	}, {});
};

export function isGameManaged(api: IExtensionApi): boolean {
    var profiles: {[profileId: string]: IProfile} = {};
    profiles = util.getSafe(api.getState().persistent, ['profiles'], {});
    const gameProfiles: string[] = Object.keys(profiles)
      .filter((id: string) => profiles[id].gameId === GAME_ID);
    return gameProfiles && gameProfiles.length > 0;
}

// the below is completely untested and may not even be relevant
// do not use until more testing is completed.

export const UserPaths = {
	userDataPath: (): string => path.join(remote.app.getPath('home'), 'AppData', 'Local', 'ProjectWingman', 'Saved'),
	userConfigPath: (configName?: string): string => getUserConfigPath(configName),
	saveGamesPath: (saveId?: string): string => getSaveGamePath(saveId),
}

function getUserConfigPath(configName?: string) {
    return path.join(UserPaths.userDataPath(), 'Config', 'WindowsNoEditor', configName ?? '');
}

function getSaveGamePath(saveGameFile?: string) {
	var saveGameDir = path.join(UserPaths.userDataPath(), 'SaveGames');
	if (saveGameFile) {
		return path.join(saveGameDir, saveGameFile);
	} else {
		/* var contents = nfs.readdirSync(saveGameDir, {withFileTypes: true}).filter(de => de.isDirectory);
		if (contents && contents.length > 0) {
			return path.join(saveGameDir, contents[0].name);
		} else {
			return null;
		} */
        return saveGameDir
	}
}