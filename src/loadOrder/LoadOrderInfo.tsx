import React from "react";
import { ComponentEx, FlexLayout } from "vortex-api";
import { IInfoPanelProps } from "vortex-api/lib/extensions/mod_load_order/types/types";
import { IExtensionApi, TFunction } from "vortex-api/lib/types/api";
import { I18N_NAMESPACE } from "..";

interface ILoadOrderInfoProps {
    t: TFunction;
    ns?: string;
}

interface IComponentState {}

class LoadOrderInfo extends ComponentEx<ILoadOrderInfoProps, IComponentState> {
    private mRef: Element;
    public render() {
        const { t, ns } = this.props as ILoadOrderInfoProps;
        var content: JSX.Element | JSX.Element[];
        return (
            <FlexLayout.Flex>
                <div style={{padding: 'var(--half-gutter, 15px)'}}>
                    <h2>
                        {t('Changing your load order', {ns})}
                    </h2>
                    <p>
                    {t('Drag and drop the mods on the left to reorder them. Project Wingman loads mods in alphanumeric order so Vortex prefixes '
                        + 'the folder names with "AAA, AAB, AAC, ..." to ensure they load in the order you set here. '
                        + 'The number in the left column represents the overwrite order. The changes from mods with higher numbers will take priority over other mods which make similar edits.', { ns })}
                    </p>
                    <p>
                        {t('Note: You can only manage mods installed with Vortex. Installing other mods manually may cause unexpected errors.', {ns})}
                    </p>
                </div>
            </FlexLayout.Flex>
        )
        // return content;
    }
}

export default LoadOrderInfo

export function loadOrderInfoRenderer(api: IExtensionApi, props: IInfoPanelProps): LoadOrderInfo {
    return <LoadOrderInfo t={api.translate} ns={I18N_NAMESPACE} /> as any;
}