import {fs} from 'vortex-api';
import {getGamePath} from "vortex-ext-common";
import * as path from "path";
import {IDiscoveredTool, IExtensionApi, IGame, IInstruction, IState} from "vortex-api/lib/types/api";
import {enableSicarioIntegration, Features} from "../settings";
import {ITool} from "vortex-api/lib/types/ITool";

const MergedFileName = "SicarioMerge_P";

export const SicarioRelPath = path.join("ProjectWingman", "Content", "Paks", "~sicario");

export const getMergePath = (game: IGame, state: IState): string => {
    return path.join(getGamePath(game, state), SicarioRelPath);
}

export const isSicarioMerge = async (instructions: IInstruction[]): Promise<boolean> => {
    let pakSources = instructions.filter(f => f.type == "copy" && path.extname(f.source) == '.pak');
    //this should also check that the destination is ~sicario, but that's for later
    return pakSources.length > 0 && pakSources.every(p => path.basename(p.source, path.extname(p.source)) == MergedFileName);
}

export const toggleIntegration = (api: IExtensionApi) => {
    const state = api.getState();
    api.store.dispatch(enableSicarioIntegration(!Features.isSicarioEnabled(state)));
}

export function getSicarioTool(state: IState, gameId: string): IDiscoveredTool {
    const tools = state.settings.gameMode.discovered[gameId]?.tools || {};
    return Object.keys(tools).map(id => tools[id])
        .filter(iter => (iter !== undefined) && (iter.path !== undefined))
        .find(iter => path.basename(iter.path).toLowerCase() === 'projectsicario.exe');
}

export async function toolExists(tool: IDiscoveredTool): Promise<boolean> {
    try {
        var f = await fs.statAsync(tool.path);
        return f !== undefined;
    } catch {
        return false;
    }
}

export const PSMTool: ITool = {
    id: 'PSM',
    name: 'Project Sicario Merger',
    shortName: 'PSM',
    logo: 'psm.png',
    executable: () => 'ProjectSicario.exe',
    requiredFiles: [
        'ProjectSicario.exe',
    ],
    relative: true
}