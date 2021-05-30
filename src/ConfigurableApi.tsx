import { isValidElement, FC, ReactElement } from 'react';
import { useRender } from './helpers/hooks';
import { ConfigurableApiProps } from './helpers/types';

const shouldRender = (element: ReactElement): boolean => {
    return (
        isValidElement(element) ||
        Array.isArray(element) ||
        typeof element !== 'object'
    );
};

const ConfigurableApi: FC<ConfigurableApiProps> = (props): ReactElement | null => {
    const { whenLoading } = props;
    const [render] = useRender(props);

    if (render) {
        return shouldRender(render) ? render : null;
    }

    const loading = (whenLoading && whenLoading(props)) as ReactElement;
    return shouldRender(loading) ? loading : null;
};

export default ConfigurableApi;
