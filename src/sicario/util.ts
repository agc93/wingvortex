import {fs, log, selectors} from 'vortex-api';
import {getGamePath} from "vortex-ext-common";
import * as path from "path";
import * as nfs from "fs";
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
    // also might want to tweak this to account for the report?
    return pakSources.length > 0 && pakSources.every(p => path.basename(p.source, path.extname(p.source)) == MergedFileName);
}

export const toggleIntegration = (api: IExtensionApi) => {
    const state = api.getState();
    api.store.dispatch(enableSicarioIntegration(!Features.isSicarioEnabled(state)));
}

export function getSicarioToolByPath(state: IState, gameId: string, tryRefresh?: boolean): IDiscoveredTool {
    const tools = state.settings.gameMode.discovered[gameId]?.tools || {};
    return Object.keys(tools).map(id => tools[id])
        .filter(iter => (iter !== undefined) && (iter.path !== undefined))
        .find(iter => path.basename(iter.path).toLowerCase() === 'projectsicario.exe');
}

export function getSicarioTool(state: IState, gameId: string): IDiscoveredTool|undefined {
    const tools = state.settings.gameMode.discovered[gameId]?.tools || {};
    return tools["PSM"];
}

export async function toolExists(tool: IDiscoveredTool): Promise<boolean> {
    try {
        var f = await fs.statAsync(tool.path);
        return f !== undefined;
    } catch {
        return false;
    }
}

export async function getMergerPath(state: IState, gameId: string): Promise<string|undefined> {
    var tool = getSicarioTool(state, gameId);
    const gamePath = getGamePath(selectors.gameById(state, gameId), state, true);
    if (tool === undefined || !(await toolExists(tool))) {
        log('info', 'PSM not available as tool', {tool});
        var candidatePath = path.join(gamePath, 'ProjectSicario.exe');
        if (nfs.existsSync(candidatePath)) {
            log('warn', 'PSM not configured as tool, but falling back to local executable in game folder!');
            return candidatePath;
        } else {
            return undefined;
        }
    } else {
        return tool.path;
        // toolExePath = tool.path;
    }
}

export const PSMTool: ITool = {
    id: 'PSM',
    name: 'Project Sicario Merger',
    shortName: 'PSM',
    logo: 'psm.png',
    shell: true,
    executable: () => 'ProjectSicario.exe',
    requiredFiles: [
        'ProjectSicario.exe',
    ],
    relative: true
}