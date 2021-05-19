import * as React from 'react';

export type ConfigurableApiProps = {
    className?: string
};

const ConfigurableApi: React.FC<ConfigurableApiProps> = ({ className }) => <div className={className}>Init Configurable Api</div>;

export default ConfigurableApi;
