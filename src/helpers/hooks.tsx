import React, { useEffect, useRef, useState, ReactElement } from 'react';
import initConfigurableApi, { ConfigurableApiProps } from './core';

const useIsMounted = () => {
    let isMounted = useRef(false);
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);
    return isMounted;
};

const useRender = (initProps: ConfigurableApiProps) => {
    const [props] = useState<ConfigurableApiProps>(initProps);
    const [render, setRender] = useState<ReactElement | null>(null);
    const isMounted = useIsMounted();
    const {
        api,
        whenSuccess,
        whenMessage,
        whenRedirect,
        dataToMap,
        helpers,
        errorMessage,
    } = props;

    useEffect(
        () => {
            (async () => {
                setRender(null);
                try {
                    const handleRedirect = (redirect: string, allProps: ConfigurableApiProps) => {
                        (whenRedirect && whenRedirect(redirect, allProps)) || window.location.assign(redirect);
                    }

                    const handleMessage = (message: string, allProps: ConfigurableApiProps) => {
                        const customRender = whenMessage && whenMessage(message, allProps);
                        customRender && isMounted.current && setRender(<>{customRender}</>);
                    }

                    const handleSuccess = (apiResponse: object, allProps: ConfigurableApiProps) => {
                        const customRender = whenSuccess && whenSuccess(apiResponse, allProps);
                        customRender && isMounted.current && setRender(<>{customRender}</>);
                    }

                    const responses = await initConfigurableApi({
                        api,
                        all: dataToMap,
                        helpers
                    });
                    const { api: apiResponse, actions } = responses;

                    if (actions.length > 0) {
                        // actions
                        const { redirect, message } = actions[0];
                        if (redirect) handleRedirect(redirect, props);
                        else if (message) handleMessage(message, props);
                    } else {
                        handleSuccess(apiResponse, props);
                    }
                } catch {
                    isMounted.current && setRender(<>{errorMessage || 'Error !'}</>);
                }
            })();
        },
        [props]
    );
    return [render];
};

export { useIsMounted, useRender };
