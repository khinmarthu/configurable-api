import  { ReactElement } from 'react';

export type ConfigurableApiProps = {
    className?: string,
    api: object,
    whenSuccess?: (apiResponse: object, props: ConfigurableApiProps) => ReactElement|void,
    whenLoading?: (props: ConfigurableApiProps) => ReactElement,
    whenMessage?: (message: string, props: ConfigurableApiProps) => ReactElement|void,
    whenRedirect?: (redirect: string, props: ConfigurableApiProps) => void,
    dataToMap: object,
    helpers?: object,
    errorMessage?: string,
};