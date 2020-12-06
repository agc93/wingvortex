const slotNames = {
};

/**
 * For anyone who comes looking, this is *deliberately* covering as **few** cases as possible.
 * Given we are not validating this in the base game, we only want to cover objectively confusing cases here.
 */
const specialAircraftNames = {
    "AV": "Accipiter"
}

export function getSlotName(slotIdent: string) {
    var knownName = slotNames[slotIdent];
    if (knownName) {
        return knownName;
    } else {
        return /[a-z]/.test(slotIdent)
            ? slotIdent
            : ` Slot ${Number.parseInt(slotIdent, 10)}`;
    }
}
export function getAircraftName(aircraftIdent: string): string {
    var knownName = specialAircraftNames[aircraftIdent];
    if (knownName) {
        return knownName;
    } else {
        var basicName = aircraftIdent.toUpperCase();
        var firstNum = basicName.replace(/(\d+)/g, '-$&');
        return firstNum;
    }
    
}