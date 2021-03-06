import { createAction } from 'redux-act';
import { util } from "vortex-api";
import { IReducerSpec, IState } from 'vortex-api/lib/types/api';

/*
 * enable the more advanced installer
 */
export const enableAdvancedInstaller =
    createAction('PW_ENABLE_INSTALLER', (enable: boolean) => enable);

export const enableInstallReadmes =
    createAction('PW_INSTALL_READMES', (enable: boolean) => enable);

export const enableSicarioIntegration =
    createAction('PW_ENABLE_SICARIO', (enable: boolean) => enable);


/**
 * reducer for extension settings
 */
export const settingsReducer: IReducerSpec = {
    reducers: {
        [enableAdvancedInstaller as any]: (state, payload: boolean) => {
            return util.setSafe(state, ['installer'], payload);
        },
        [enableInstallReadmes as any]: (state, payload: boolean) => {
            return util.setSafe(state, ['installReadme'], payload);
        },
        [enableSicarioIntegration as any]: (state, payload: boolean) => {
            return util.setSafe(state, ['sicarioIntegration'], payload);
        }
    },
    defaults: {
        installer: true,
        installReadme: true,
        sicarioIntegration: false
    }
};

export const Features = {
    isInstallerEnabled: (state: IState): boolean => {
        return util.getSafe(state.settings, ['wingvortex', 'installer'], true);
    },
    readmesEnabled: (state: IState): boolean => {
        return util.getSafe(state.settings, ['wingvortex', 'installReadme'], true);
    },
    isSicarioEnabled: (state: IState): boolean => {
        return util.getSafe(state.settings, ['wingvortex', 'sicarioIntegration'], true);
    }
}