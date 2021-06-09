import { IExtensionApi } from "vortex-api/lib/types/api";
import * as nfs from "fs";
import path from "path";
import { AircraftSlot, ModBlueprints, ModRecords } from "./types";


type ListOperationResult = {
    filePath: string;
    size: number;
    offset: string;
}

export class QuickSlotReader {
    private _logFn: (msg: string, obj?: any) => void;
    private _modFileExt: string;
    private _api: IExtensionApi;
    private _blueprintsPath: string = 'Content/ProjectWingman/Blueprints/';
    private _assetsPath: string = 'Assets/Objects/Aircraft/'
    private _overrides: ((match: AircraftSlot) => boolean)[]
    /**
     *
     */
    constructor(api: IExtensionApi, logFn?: (msg: string, obj?: any) => void, modFileExt = ".pak") {
        this._logFn = logFn ?? ((m, obj) => {});
        this._modFileExt = modFileExt;
        this._api = api;
        this._overrides = [
            (name) => {
                if (name.aircraft.includes('_')) {
                    var lastPart = name.aircraft.split('_').slice(-1)[0];
                    return !(hasLowerCase(lastPart) && hasUpperCase(lastPart));
                } else {
                    return true;
                }
            },
            (name) => {
                return !(name.aircraft == 'F18E' && name.slot == 'V2')
            }
        ];
    }

    private listOperation = async (filePath: string): Promise<ListOperationResult[]> => {
        var result = await new Promise<ListOperationResult[]>((resolve, reject) => {
            this._api.ext.qbmsList({
                bmsScriptPath: path.join(__dirname, 'pw-unpack.bms'),
                archivePath: filePath,
                operationPath: path.join(__dirname, 'opPath'),
                quiet: true,
                qbmsOptions: {wildCards: ['{}']},
                callback: (err: any, data: any) => {
                  if (err !== undefined) {
                    // Something went wrong.
                  }
                  resolve(data);
                  // Operation successful, do something with the data.
                }
              });
        });
        this._logFn('completed list operation', {result, time: Date.now});
        return result;
    }

    getModified = async (filePath: string): Promise<ModRecords> => {
        console.time('getModified:qbms');
        var skins: {aircraft: string, slot: string, skinType?: string}[] = [];
        var record: ModRecords = {blueprints: [], skinSlots: []};
        var tables: string[] = [];
        if (nfs.existsSync(filePath) && path.extname(filePath).toLowerCase() == this._modFileExt) {
            var result = await this.listOperation(filePath);
            if (result && result.filter) {
                result = result.filter(f => !!f && f?.filePath);
                var assets = result.filter(f => !!f?.filePath).filter(f => f.filePath.indexOf(this._assetsPath) !== -1);
                for (const file of assets) {
                    var match = this.parseMatchString(file.filePath);
                    if (match !== undefined && match.length > 0) {
                        skins.push(...match);
                    }
                }
                var looseFiles = result.filter(f => path.dirname(f.filePath) === '.');
                for (const looseFile of looseFiles) {
                    var match = this.parseMatchString(looseFile.filePath, false);
                    if (match !== undefined && match.length > 0) {
                        skins.push(...match);
                    } else if (path.basename(looseFile.filePath, path.extname(looseFile.filePath)).indexOf("DB") !== -1) {
                        var tableName = path.basename(looseFile.filePath, path.extname(looseFile.filePath));
                        tables.push(tableName);
                    }
                }
                var blueprints = result
                    .filter(f => !!f?.filePath)
                    .filter(f => (f.filePath.indexOf(this._blueprintsPath) !== -1) && (path.extname(f.filePath) == ".uexp" || path.extname(f.filePath) == ".uasset"));
                for (const file of blueprints) {
                    var tableName = path.basename(file.filePath, path.extname(file.filePath));
                    tables.push(tableName);
                }
            } else {
                this._api.sendNotification({
                    type: 'warning',
                    title: 'Failed to read mod contents',
                    message: "WingVortex failed to detect the contents of files in this mod. Included skins might not be shown.",
                    displayMS: 5000
                });
            }
        }
        if (skins.length == 0) {
            this._logFn('failed to find skin key in mod file');
        }
        function onlyUnique(value: {aircraft: string, slot: string, skinType?: string}, index: number, self: {aircraft: string, slot: string, skinType?: string}[]) {
            return self.findIndex(v => v.aircraft == value.aircraft && v.slot == value.slot) === index;
        }
        record.skinSlots = skins.length > 0 ? skins.filter(onlyUnique) : [];
        record.blueprints = [...new Set(tables)];
        console.timeEnd('getModified:qbms');
        return record;
    }

    private parseMatchString(rawString: string, forcePathName = true): {aircraft: string, slot: string}[] {
        const specialCaseNames = {
            "AV_Federation": {aircraft: "AV8", slot: "Federation"},
            "AV8_Monarch": {aircraft: "AV8", slot: "Monarch"}
        };
        var results = [];
        var pattern = new RegExp(/(?:T_)?([a-zA-Z0-9_]+)_([a-zA-Z0-9]*\d+)(?:[^\w\d]){1}(?=u[^e])/g);
        var matches: RegExpExecArray | [any, any, any];
        var fileName = path.basename(rawString, path.extname(rawString));
        if (specialCaseNames[fileName] !== undefined) {
            return [specialCaseNames[fileName]];
        }
        while ( (matches = pattern.exec(rawString)) !== null && (forcePathName ? rawString.includes('Aircraft') : true)) {
            this._logFn('identified aircraft skin', {matches});
            var [, aircraft, slot] = matches;
            if (slot && this._overrides.map(o => o({aircraft, slot})).every(o => o)) {
                results.push({aircraft, slot});
            }
        }
        return results;
    }
}

function hasLowerCase(str: string) {
    return str.toUpperCase() != str;
}

function hasUpperCase(str: string) {
    return str.toLowerCase() != str;
}
