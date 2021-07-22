import { IExtensionApi, IInstruction, IProfile } from "vortex-api/lib/types/api";
import {fs, util} from "vortex-api";
import { GAME_ID, MOD_FILE_EXT } from ".";

import path = require('path');
import { remote } from 'electron';

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

export function isPakMod(installInstructions: IInstruction[]): boolean {
	return installInstructions.map(i => i.source).some(f => path.extname(f) == MOD_FILE_EXT)
}

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

export const isToolMod = async (instructions: IInstruction[]): Promise<boolean> => {
	let exeSources = instructions.filter(f => f.type == "copy" && path.extname(f.source).toLowerCase() == '.exe');
	let pakSources = instructions.filter(f => f.type == "copy" && path.extname(f.source).toLowerCase() == '.pak');
	return exeSources.length > 0 && pakSources.length == 0;
}

export interface IIntegrationProps {
	gameMode: string;
	enabled: boolean;
}

export function toEventPromise<ResT>(func: (cb) => void): Promise<ResT> {
	return new Promise((resolve, reject) => {
		const cb = (out: ResT) => {
			if ((out !== null) && (out !== undefined)) {
				return resolve(out);
			} else {
				return reject(out);
			}
		};
		func(cb);
	})
}

export function dirAvailable(path: string): boolean {
	try {
		const pathStat = fs.statSync(path);
		return pathStat !== undefined && pathStat.isDirectory();
	} catch {
		return false;
	}
}