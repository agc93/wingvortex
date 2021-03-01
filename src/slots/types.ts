

export type ModBlueprints = {includesDatatable: boolean, tableNames?: string[]}

export type AircraftSlot = {aircraft: string, slot: string};

export type ModRecords = {
    skinSlots: AircraftSlot[];
    blueprints: string[];
}