import { IExtensionApi, IInstruction } from "vortex-api/lib/types/api";
import path = require("path");
import { log, util } from "vortex-api";
import { GAME_ID, MOD_FILE_EXT, unreal } from ".";
import { AdvancedInstaller, AdvancedInstallerBuilder, CompatibilityResult, CompatibilityTest, addInstalledPaksAttribute } from "vortex-ext-common/install/advanced";
import { Features } from "./settings";

var messages = [
    'This mod has been packed incorrectly and cannot be reliably installed. Alternate files should be a separate download or use an installer or you may find unexpected results.',
    'Please contact the mod authors if you would like this to be compatible.',
    'If you proceed with the install, you may get unexpected results and installing like this is not recommended.'
];

export function getInstaller(): AdvancedInstaller {
    var builder = new AdvancedInstallerBuilder(GAME_ID);
    var installer = builder
        .addExtender(addInstalledPaksAttribute(MOD_FILE_EXT))
        .addExtender(getReadmeInstructions, Features.readmesEnabled)
        .addCompatibilityTest(unsupportedFileTest)
        .addSupportedCheck(async (files, gameId, state)=> {return {supported: Features.isInstallerEnabled(state), requiredFiles: []}})
        .build();
    return installer;
}

const unsupportedFileTest: CompatibilityTest = {
    message: messages.join('\n\n'),
    shortMessage: 'You have installed a malformed mod. You might see unexpected results.',
    test: (files) => files.some(f => path.extname(f) == '.pakx') ? CompatibilityResult.RequiresConfirmation : CompatibilityResult.None
};


function getPaks(instructions: IInstruction[]): IInstruction[] {
    var paks = instructions
        .filter(i => path.extname(i.source).toLowerCase() == MOD_FILE_EXT)
        .map(pf => pf.source);
    if (paks) {
        return [
            {
                type: 'attribute',
                key: 'installedPaks',
                value: paks as any
            }
        ]
    };
}

function getReadmeInstructions(instructions: IInstruction[], files: string[], modName: string): IInstruction[] {
    try {
        if (files.filter(f => path.extname(f) == '.txt').length == 1) {
            //we've got just one txt file, assume it's a README
            var textFile = files.find(f => path.extname(f) == '.txt');
            log('debug', 'found txt file in archive, installing as README', {filePath: textFile});
            return [
                {
                    type: 'copy',
                    source: textFile,
                    destination: path.join('README', util.deriveInstallName(modName, {}) + '.txt')
                }
            ]
        }
    } catch {
        //ignored
        return [];
    }
}

const largeModWarningText: string = "The mod you're trying to install includes a large number of available files and no installer files!\n\nVortex will prompt you for which files you want to install but be aware that this mod archive might contain a lot of files and folders to choose from. You may want to check the mod's description in case there are any special installation instructions you should know about.\n\nThere's unfortunately nothing Vortex can do about this as this can only be resolved by the mod author.";