import { IExtensionApi } from "vortex-api/lib/types/api";
import * as nfs from "fs";
import path from "path";
import { AircraftSlot, ModBlueprints, ModRecords } from "./types";
import { IIndexRecord, PakFileReader } from "@agc93/pak-reader";

export class NativeSlotReader {
    private _logFn: (msg: string, obj?: any) => void;
    private _modFileExt: string;
    private _api: IExtensionApi;
    private _blueprintsPath: string = 'Content/ProjectWingman/Blueprints/';
    private _assetsPath: string = 'Assets/Objects/Aircraft/'
    private _sicarioPath: string = 'sicario/'
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

    private listOperation = async (filePath: string): Promise<IIndexRecord[]> => {
        var reader = new PakFileReader(filePath, {safeMode: true});
        var result = await reader.parse();
        this._logFn('completed list operation', {hash: result.indexHash});
        if (result && result.archiveVersion === 3 && (result.index?.recordCount ??0) > 0) {
            var mountSegs = result.index.mountPoint.split(/[/\\]/).filter(s => /[a-z0-9]+/i.test(s));
            return mountSegs.length > 0
                ? result.index.records.map(r => {
                    r.fileName = `${mountSegs.join('/')}/${r}`;
                    return r;
                })
                : result.index.records;
            // return result.index.records;
        } else {
            return null;
        }
        
    }

    getAllFiles = async (filePath: string): Promise<string[]> => {
        if (nfs.existsSync(filePath) && path.extname(filePath).toLowerCase() == this._modFileExt) {
            var result = await this.listOperation(filePath);
            return result.map(r => r.fileName);
        }
        return undefined;
    }

    getModified = async (filePath: string): Promise<ModRecords> => {
        console.time('getModified:node');
        var skins: {aircraft: string, slot: string, skinType?: string}[] = [];
        var record: ModRecords = {blueprints: [], skinSlots: []};
        var tables: string[] = [];
        if (nfs.existsSync(filePath) && path.extname(filePath).toLowerCase() == this._modFileExt) {
            var result = await this.listOperation(filePath);
            if (result && result.filter) {
                result = result.filter(f => !!f && f?.fileName);
                var assets = result.filter(f => !!f?.fileName).filter(f => f.fileName.indexOf(this._assetsPath) !== -1);
                for (const file of assets) {
                    var match = this.parseMatchString(file.fileName);
                    if (match !== undefined && match.length > 0) {
                        skins.push(...match);
                    }
                }
                var looseFiles = result.filter(f => path.dirname(f.fileName) === '.');
                //none of this should be here with this implementation since
                // we could just append a non-standard mount point to the records and be done with it.
                for (const looseFile of looseFiles) { 
                    var match = this.parseMatchString(looseFile.fileName, false);
                    if (match !== undefined && match.length > 0) {
                        skins.push(...match);
                    } else if (path.basename(looseFile.fileName, path.extname(looseFile.fileName)).indexOf("DB") !== -1) {
                        var tableName = path.basename(looseFile.fileName, path.extname(looseFile.fileName));
                        tables.push(tableName);
                    }
                }
                var blueprints = result
                    .filter(f => !!f?.fileName)
                    .filter(f => (f.fileName.indexOf(this._blueprintsPath) !== -1) && (path.extname(f.fileName) == ".uexp" || path.extname(f.fileName) == ".uasset"));
                for (const file of blueprints) {
                    var tableName = path.basename(file.fileName, path.extname(file.fileName));
                    tables.push(tableName);
                }
                var sicarioFiles = result.filter(f => !!f && f?.fileName).filter(f => f.fileName.indexOf(this._sicarioPath) !== -1);
                if (sicarioFiles && sicarioFiles.length > 0) {
                    record.sicario = {};
                }
                for (const sicarioFile of sicarioFiles) {
                    if (path.extname(sicarioFile.fileName) === ".dtp" && !record.sicario.presetFile) {
                        record.sicario.presetFile = sicarioFile.fileName;
                    } else if (path.extname(sicarioFile.fileName) === '.json' && !record.sicario.requestFile) {
                        record.sicario.requestFile = sicarioFile.fileName;
                    }
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
        console.timeEnd('getModified:node');
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
