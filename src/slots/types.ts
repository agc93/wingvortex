

export type ModBlueprints = {includesDatatable: boolean, tableNames?: string[]}

export type AircraftSlot = {aircraft: string, slot: string};

export type ModRecords = {
    skinSlots: AircraftSlot[];
    blueprints: string[];
    sicario?: SicarioRecords;
}

export type SicarioRecords = {
    presetFile?: string;
    requestFile?: string;
}