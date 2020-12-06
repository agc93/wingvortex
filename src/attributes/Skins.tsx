import React from "react";
import { Icon, selectors, util, tooltip } from "vortex-api";
import { IExtensionApi, IMod, IProfileMod, ITableAttribute, TFunction } from "vortex-api/lib/types/api";
import { getAircraftName, getSlotName } from ".";
import { GAME_ID } from "..";
import {DetailOverlay} from "vortex-ext-common/components";

// import DetailOverlay from "./DetailsOverlay";

type IModWithState = IMod & IProfileMod;

function getSkins(mod: IMod): string[] {
    return util.getSafe<string[]>(mod.attributes, ['skinSlots'], [])
        .map(sl => sl.split('|'))
        .map(segs => `${getAircraftName(segs[0])} (${getSlotName(segs[1])})`);
}

export function getSkinName (mod: IMod) {
    return getSkins(mod)
        .join(', ');
}

export const skinsAttribute = (api: IExtensionApi): ITableAttribute<IModWithState> => {
    return {
        id: 'pw-skin',
        placement: 'both',
        name: 'Skin(s)',
        help: 'The skins included in this mod (if any).',
        edit: {},
        isToggleable: true,
        isSortable: false,
        calc: (mod: IMod) => getSkinName(mod),
        condition: () => selectors.activeGameId(api.getState()) === GAME_ID,
        customRenderer: renderSkinsAttribute
    }
}

export function renderSkinsAttribute(mod: IModWithState, detail: boolean, t: TFunction): JSX.Element {
    var skins = getSkins(mod);
    if (detail) {
        return (
            <div>
                {skins.join(', ')}
            </div>
          );
    } else {
        return (
            <DetailOverlay items={skins} title="Skins included" t={t} center>
                <tooltip.IconButton 
                    icon='aircraft' 
                    tooltip="Installed Skins" 
                    className='btn-embed' 
                    style={{textAlign: "center"}}
                    stroke/>
            </DetailOverlay>
        )
    }
}