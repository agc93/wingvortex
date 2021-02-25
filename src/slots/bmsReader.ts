import { IExtensionApi } from "vortex-api/lib/types/api";
import * as nfs from "fs";
import path from "path";
import { ModBlueprints, ModRecords } from "./types";

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
    /**
     *
     */
    constructor(api: IExtensionApi, logFn?: (msg: string, obj?: any) => void, modFileExt = ".pak") {
        this._logFn = logFn ?? ((m, obj) => {});
        this._modFileExt = modFileExt;
        this._api = api;
    }

    private listOperation = async (filePath: string): Promise<ListOperationResult[]> => {
        var result = await new Promise<ListOperationResult[]>((resolve, reject) => {
            this._api.ext.qbmsList({
                bmsScriptPath: path.join(__dirname, 'pw-unpack.bms'),
                archivePath: filePath,
                operationPath: path.join(__dirname, 'opPath'),
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
        debugger;
        this._logFn('completed list operation', {result, time: Date.now});
        return result;
    }

    getModified = async (filePath: string): Promise<ModRecords> => {
        var skins: {aircraft: string, slot: string, skinType?: string}[] = [];
        var record: ModRecords = {blueprints: [], skinSlots: []};
        var tables: string[] = [];
        if (nfs.existsSync(filePath) && path.extname(filePath).toLowerCase() == this._modFileExt) {
            var result = await this.listOperation(filePath);
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
        }
        if (skins.length == 0) {
            this._logFn('failed to find skin key in mod file');
        }
        function onlyUnique(value: {aircraft: string, slot: string, skinType?: string}, index: number, self: {aircraft: string, slot: string, skinType?: string}[]) {
            return self.findIndex(v => v.aircraft == value.aircraft && v.slot == value.slot) === index;
        }
        record.skinSlots = skins.length > 0 ? skins.filter(onlyUnique) : [];
        record.blueprints = [...new Set(tables)];
        // record.blueprints = tables;
        return record;
    }

    private parseMatchString(rawString: string, forcePathName = true): {aircraft: string, slot: string}[] {
        const specialCaseNames = {
            "AV_Federation": {aircraft: "AV8", slot: "Federation"},
            "AV8_Monarch": {aircraft: "AV8", slot: "Monarch"}
        };
        var results = [];
        var pattern = new RegExp(/(?:T_)?([a-zA-Z0-9_]+)_([a-zA-Z0-9]*\d+)(?:[^\w\d]){1}(?=u[^e])/g);
        var matches;
        var fileName = path.basename(rawString, path.extname(rawString));
        if (specialCaseNames[fileName] !== undefined) {
            return [specialCaseNames[fileName]];
        }
        while ( (matches = pattern.exec(rawString)) !== null && (forcePathName ? rawString.includes('Aircraft') : true)) {
            this._logFn('identified aircraft skin', {matches});
            var [, aircraft, slot] = matches;
            if (slot) {
                // results.push({aircraft, slot, skinType: skinType.charAt(0).toUpperCase() + skinType.substr(1)});
                results.push({aircraft, slot});
            }
        }
        return results;
    }
}
