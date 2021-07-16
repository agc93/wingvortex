import {ITestResult} from "vortex-api/lib/types/ITestResult";
import {IExtensionApi} from "vortex-api/lib/types/api";
import {Features} from "../settings";
import {selectors, fs} from "vortex-api";
import {GAME_ID} from "../index";
import {getSicarioTool, toolExists} from "./util";


export const sicarioIntegrationTest = (api: IExtensionApi): () => Promise<ITestResult> => {
    const t = api.translate;
    const state = api.getState();
    return async () => {
        if (!Features.isSicarioEnabled(state)) {
            // not enabled;
            return undefined;
        }
        const gameMode = selectors.activeGameId(state);
        if (gameMode !== GAME_ID) {
            // game not supported
            return Promise.resolve(undefined);
        }
        let tool = getSicarioTool(state, gameMode);

        if (tool !== undefined) {
            return (await toolExists(tool)) ? undefined : toolMissing;
        }
        return undefined;
    }
}



const toolMissing: ITestResult = {
    description: {
        short: 'Project Sicario Merger not installed',
        long: `You have configured Vortex to run PSM automatically but it\'s not installed (or deployed). \n\n\nFor the automation to work, PSM needs to be installed and configured. You can download it from [url]https://www.nexusmods.com/projectwingman/mods/270[/url]. If you have PSM installed with Vortex, make sure it's enabled and you have deployed your mods, then Check Again.`,
    },
    severity: "warning"
}