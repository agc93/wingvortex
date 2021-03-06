import * as nfs from "fs";
import * as path from "path";

export class SlotReader {
    private _logFn: (msg: string, obj?: any) => void;
    private _modFileExt: string;
    /**
     *
     */
    constructor(logFn?: (msg: string, obj?: any) => void, modFileExt = ".pak") {
        this._logFn = logFn ?? ((m, obj) => {});
        this._modFileExt = modFileExt;
    }

    private getFileOffset = (fileLength: number) => {
        var windowLength =  Math.max(Math.ceil(fileLength * 0.025), 8192);
        var startPoint = fileLength - windowLength;
        return Math.max(startPoint, 0);
    }

    private getEndOffset = (offset: number, fileLength: number) => {
        return Math.min(fileLength, offset + 4096);
    }

    getModifiedDataTable = (filePath: string): {includesDatatable: boolean, tableName?: string} | undefined => {
        if (nfs.existsSync(filePath) && path.extname(filePath).toLowerCase() == this._modFileExt) {
            const fileBuffer = nfs.readFileSync(filePath);
            var searchKey = 'ProjectWingman/Content/ProjectWingman/Blueprints/Data'
            var getAllIndexes = (arr: Buffer) => {
                var indexes = [], i = this.getFileOffset(fileBuffer.length);
                while ((i = arr.indexOf(Buffer.from(searchKey), i+1)) != -1){
                    indexes.push(i);
                }
                return indexes;
            }
            var indexes = getAllIndexes(fileBuffer);
            this._logFn(`identified ${indexes.length} blueprint paths`);
            for (const key of indexes) {
                var rawString = fileBuffer.toString('utf8', key + searchKey.length, key + searchKey.length + 72);
                var match = rawString.replace(/[^\w\d\/\.]/g, '');
                var tableName = path.basename(match, path.extname(match));
                return {includesDatatable: tableName && true, tableName: tableName};
            }
            return {includesDatatable: false}
        }
    }

    getSkinIdentifier = (filePath: string): {aircraft: string, slot: string}[] | undefined => {
        var skins: {aircraft: string, slot: string}[] = [];
        if (nfs.existsSync(filePath) && path.extname(filePath).toLowerCase() == this._modFileExt) {
            const fileBuffer = nfs.readFileSync(filePath);
            var searchKey = 'ProjectWingman/Content/Assets'
            var getAllIndexes = (arr: Buffer) => {
                var indexes = [], i = this.getFileOffset(fileBuffer.length);
                while ((i = arr.indexOf(Buffer.from(searchKey), i+1)) != -1){
                    indexes.push(i);
                }
                return indexes;
            }
            var indexes = getAllIndexes(fileBuffer);
            this._logFn(`identified ${indexes.length} object paths`);
            for (const key of indexes) {
                var rawString = fileBuffer.toString('utf8', key + searchKey.length, key + searchKey.length + 72);
                var match = this.parseMatchString(rawString);
                if (match !== undefined && match.length > 0) {
                    skins.push(...match);
                }
            }
            if (skins.length == 0 && indexes.length == 1) {
                //we couldn't find anything. Maybe a weird relative-only packing?
                var key = indexes[0];
                var startPt = key + searchKey.length;
                var rawString = fileBuffer.toString('utf8', startPt, this.getEndOffset(startPt, fileBuffer.length));
                this._logFn(`falling back to relative packing detection at ${startPt}`, {length: rawString.length, file: fileBuffer.length});
                var matches = this.parseMatchString(rawString);
                if (matches !== undefined && matches.length > 0) {
                    skins.push(...matches);
                }
            }
            if (skins.length == 0) {
                //we couldn't find anything. Maybe an old file?
                for (const key of indexes) {
                    var rawString = fileBuffer.toString('utf8', key + searchKey.length, key + searchKey.length + 72);
                    var match = this.parseMatchString(rawString, true);
                    if (match !== undefined && match.length > 0) {
                        skins.push(...match);
                    }
                }
            }
        }
        if (skins.length == 0) {
            this._logFn('failed to find skin key in mod file');
            return []
        }
        function onlyUnique(value: {aircraft: string, slot: string, skinType: string}, index: number, self: {aircraft: string, slot: string, skinType: string}[]) {
            return self.findIndex(v => v.aircraft == value.aircraft && v.slot == value.slot) === index;
        }
        return skins.filter(onlyUnique);
    }

    private parseMatchString(rawString: string, useUbulk = false): {aircraft: string, slot: string}[] {
        var results = [];
        var pattern = new RegExp(/([a-zA-Z0-9]+)_(\d*\w*)(?:[^\w])(?=u[^e])/g);
        var matches;
        while ( (matches = pattern.exec(rawString)) !== null && rawString.includes('Aircraft')){
            this._logFn('identified aircraft skin', {matches});
            var [, aircraft, slot] = matches;
            if (slot) {
                // results.push({aircraft, slot, skinType: skinType.charAt(0).toUpperCase() + skinType.substr(1)});
                results.push({aircraft, slot});
            }
        }
        /* if (results.filter(r => r.skinType == "D").length > 0) {
            return results.filter(r => r.skinType == "D").map(r => ({aircraft: r.aircraft, slot: r.slot}));
        } else {
            return results.filter(r => r.skinType == "Inst").map(r => ({aircraft: r.aircraft, slot: r.slot}));
        } */
        return results;
    }
}