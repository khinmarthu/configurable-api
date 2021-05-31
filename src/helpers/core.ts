import  { ReactElement } from 'react';
import omit from 'lodash/omit';
import querystring from 'querystring';
import get from 'lodash/get';

type argCallApiType = {
    apiConfig: apiConfigType,
    apiKey: string,
    allInput: object,
    allResults: apiResponseType,
    helpers: object,
};

type conditionKeysType = actionsType & {
    continue?: boolean,
}

type conditionType = {
    key?: string,
    [key: number]: conditionKeysType,
    [key: string]: conditionKeysType|string|undefined,
    default: conditionKeysType,
};

type apiConfigType = {
    url: string,
    method: METHODS_TYPE,
    headers?: object,
    request?: object,
    condition: conditionType,
    beforeFetch?: object,
    shouldHideError?: boolean,
    shouldContinueNextApiOnError?: boolean,
};

type beforeFetchOutputType = {
    [key: string]: any,
    beforeFetch?: object,
};

type executedValuesType = {
    headers: string,
    request: object,
    url: string
}

type fetchInfoOutputType = {
    url: string,
    options: object
};

type handleResponseType = argCallApiType & {
    response: responseType
}

type responseType = {
    ok: boolean,
    status: number,
    [key: string]: any,
}

type actionKeyType = string|undefined;

type isErrorType = {
    condition: conditionType,
    actionKey: actionKeyType,
    actionVal: string,
    status: number
}

type handleConditionType = handleResponseType & {
    actionVal?: string,
    status: number,
}

type handleActionType = handleConditionType & {
    currentAction: conditionKeysType
};

type ConfigurableApiProps = {
    className?: string,
    api: apiConfigType,
    whenSuccess?: (apiResponse: object, props: ConfigurableApiProps) => ReactElement|void,
    whenLoading?: (props: ConfigurableApiProps) => ReactElement,
    whenMessage?: (message: string, props: ConfigurableApiProps) => ReactElement|void,
    whenRedirect?: (redirect: string, props: ConfigurableApiProps) => void,
    dataToMap?: object,
    helpers?: object,
    errorMessage?: string,
};

const CUSTOM_CONFIG_KEYS = [
    'beforeFetch',
    'request',
    'shouldHideError',
    'shouldContinueNextApiOnError',
    'condition'
] as const;

const METHODS = ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'] as const;

type METHODS_TYPE = typeof METHODS[number];

const [POST, GET, PUT, PATCH, DELETE] = METHODS;

const HIDE_ERROR = false;
const CONTINUE_NEXT_API_ON_ERROR = false;

type actionsType = {
    redirect?: string,
    message?: string,
}


type apiResponseType = {
    api: object,
    actions: Array<actionsType>,
    continueNextApi: boolean,
};

const initial = {
    api: {},
    actions: [],
    continueNextApi: true
};

type argApiResponseType = {
    api?: object,
    all?: object,
    helpers?: object,
};

/**
 * serialize get request object
 * @param {object} obj
 * @return {string}
 */
const serializeObject = (obj: object): string => (isObject(obj) && Object.keys(obj)
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    .join('&')) || '';

/**
 * when it is not object
 * @param {*} value
 * @return {boolean}
 */
const isNotObject = (value: any): boolean => isObject(value) === false;

/**
 * when it is object
 * @param {*} value
 * @return {boolean}
 */
const isObject = (value: any): boolean => value && value.constructor.name === 'Object';

/**
 * convert to string
 * @param {*} value
 * @return {string}
 */
const convertToString = (value: any): string => {
    return typeof value !== 'string' ? JSON.stringify(value) : value;
};

/**
 * parse query string
 * @return {object}
 */
const parseQueryString = (): object => {
    const urlQueryString = window.location.search.substring(1);
    return querystring.parse(urlQueryString) || {};
};

/**
 * get api response
 * @param {{ api: object, all: object, helpers: object }} param
 * @return {{ api: object, actions: [{redirect: string}, {message: string}] }}
 */
const initConfigurableApi = async ({
    api = {},
    all = {},
    helpers = {}
}: argApiResponseType): Promise<apiResponseType> => {
    if (!api) return initial;
    const allInput = combineQueryStringInValue(all);
    const result = await Object.keys(api).reduce(
        async (accumulateAllResults: object, apiKey: string) => {
          const allResults = await accumulateAllResults as apiResponseType;
          const { api: apiResult, continueNextApi } = allResults;
          if (continueNextApi) {
            // to use api value in next api call
            const mergeAllWithApi = {
              ...allInput,
              api: {
                ...api,
                ...apiResult
              }
            };
    
            const apiConfig = api[apiKey];
            const response = await fetchApi({
              apiConfig,
              apiKey,
              allInput: mergeAllWithApi,
              allResults,
              helpers
            });
    
            return response;
          }
          return allResults;
        },
        initial
      );
    return omit(result, 'continueNextApi') as apiResponseType;
};

const combineQueryStringInValue = (value: object): object => {
    return {
        qs: parseQueryString(),
        ...value
    };
};

/**
 *
 * @param {argCallApiType} data
 * @return {apiResponseType| apiConfigType}
 */
const fetchApi = async (data: argCallApiType): Promise<apiResponseType|apiConfigType> => {
    const { apiConfig, allInput, helpers } = data;
    const { method, request, headers, url: configUrl, beforeFetch } = apiConfig as apiConfigType;
    const newAllInput = beforeFetchIntoAllInput(allInput, beforeFetch);

    try {
        if (isNotSupportedMethod(method)) return apiConfig as apiConfigType;

        const newValues = executeValues(
            { headers, request, url: configUrl },
            newAllInput,
            helpers
        ) as executedValuesType;
        const { url, options } = fetchInfo(newValues, apiConfig);

        const response = await fetch(encodeURI(url), options);
        return handleResponse({
            ...data,
            response,
            allInput: newAllInput
        });
    } catch (errorResponse) {
        return handleResponse({
            ...data,
            response: errorResponse,
            allInput: newAllInput
        });
    }
};

const isNotSupportedMethod = (method: METHODS_TYPE): boolean => METHODS.includes(method) === false;

/**
 * @param {object} beforeFetch
 * @param {object} allInput - data to replace
 * @return {object}
 */
const beforeFetchIntoAllInput = (allInput: object, beforeFetch?: object): beforeFetchOutputType => {
    const value = executeValue(beforeFetch, allInput);
    if (isNotObject(value)) return allInput;
    return {
        ...allInput,
        beforeFetch: value
    };
};

/**
 * replace value with data (allInput) and execute value with helpers
 * @param {*} value - value to be replaced
 * @param {object} allInput - data to replace
 * @param {object} helpers - helper func to execute
 * @return {any}
 */
const executeValue = (value: any, allInput: object, helpers?: object): any => {
    if (!value) return value;
    const newValue = mapValueWithAllInput(value, allInput);
    return runCode(newValue, helpers);
};

/**
 * replace value with data (allInput)
 * @param {*} value
 * @param {object} allInput - data to replace the placeholder
 * @return {string}
 */
const mapValueWithAllInput = (value: any, allInput: object): string => {
    if (!value) return '';
    const text = convertToString(value);
    const splitValues = text.split('{');

    let result = '';

    splitValues.forEach((val, index) => {
        const replacedValue = replaceValueWithAllInput(val, index, allInput);
        result = `${result}${replacedValue}`;
    });

    return result.replace(RegExpToRemoveQuotes, bracket => {
        return bracket.replace(/[\\"|\\']/, '');
    });
};

/**
 *
 * @param {string} value
 * @param {number} index
 * @param {object} allInput
 * @return {string}
 */
const replaceValueWithAllInput = (value: string, index: number, allInput: object): string => {
    const firstOccurrence = value.indexOf('}');
    const placeHolderKey = value.substring(0, firstOccurrence);
    const extraValue = value.substring(firstOccurrence + 1);
    const placeHolderValue = get(allInput, placeHolderKey);

    if (placeHolderValue !== undefined) {
        const inputValue = convertToString(placeHolderValue);
        return extraValue ? `${inputValue}${extraValue}` : inputValue;
    }

    let orignalValue = value;
    if (index >= 1) {
        orignalValue = '{' + value;
    }
    return orignalValue;
};

const RegExpToRemoveQuotes = /[\\"|\\'](\[)|(\])[\\"|\\']|[\\"|\\']({)|(})[\\"|\\']/g;

/**
 * run code
 * @param {*} value
 * @param {object} helpers
 * @return {*}
 */
const runCode = (value: any, helpers: object = {}): any => {
    try {
        const code = convertToString(value);
        const fn = new Function(...Object.keys(helpers), 'return ' + code);
        const result = fn(...Object.values(helpers));
        return result;
    } catch (err) {
        return value;
    }
};

/**
 * execute values
 * @param {object} values
 * @param {object} allInput
 * @param {object} helpers
 * @return {object}
 */
const executeValues = (values: object, allInput: object, helpers: object): object => {
    const newAllInput = combineQueryStringInValue(allInput);
    return Object.keys(values).reduce(
        (acc, cur) => ({
            ...acc,
            [cur]: executeValue(values[cur], newAllInput, helpers)
        }),
        {}
    );
};

/**
 * fetch info to use in fetch()
 * @param {executedValuesType} executedValues
 * @param {apiConfigType} apiConfig
 * @return {fetchInfoOutputType}
 */
const fetchInfo = (executedValues: executedValuesType, apiConfig: apiConfigType): fetchInfoOutputType => {
    const { request, url, headers: newHeaders = null } = executedValues;
    const headers = JSON.parse(convertToString(newHeaders)) || {};
    const { method } = apiConfig;
    const options = {
        ...omit(apiConfig, CUSTOM_CONFIG_KEYS, 'url'),
        headers
    };
    const defaultFetchInfo = { url, options };
    if (!request) return defaultFetchInfo;

    switch (method) {
        case POST:
        case PUT:
        case PATCH: {
            return {
                url,
                options: {
                    ...options,
                    body: typeof request === 'string' ? request : JSON.stringify(request)
                }
            };
        }

        case DELETE:
        case GET: {
            const newRequest =
                typeof request === 'string' ? request : serializeObject(request);
            return { options, url: `${url}?${newRequest}` };
        }
        default: {
            return defaultFetchInfo;
        }
    }
};

/**
 * 
shouldHideError is true: not show error
shouldHideError is false: show error

shouldContinueNextApiOnError is true: continue next api
shouldContinueNextApiOnError is false: not continue next api
 *
 * @param {{response: object, apiKey: string, apiConfig: object, allInput: object, allResults: apiResponseType}} data 
 * @return {{ api: object, actions: [{redirect: string}, {message: string}], continueNextApi: boolean  }}
 */
const handleResponse = async (data: handleResponseType):Promise<apiResponseType> => {
    const { response, apiConfig, allInput, apiKey, allResults } = data;
    const { api } = allResults;
    const { ok, status } = response;
    const { condition } = apiConfig;
    try {
        if (typeof ok === 'boolean' && status) {
            const jsonResponse = await response.json();
            const newAllInput = {
                ...allInput,
                api: {
                    ...api,
                    [apiKey]: {
                        ...jsonResponse
                    }
                },
                ...jsonResponse
            };

            // actions
            const actionKey = getActionKey(condition);
            const actionVal = mapValueWithAllInput(actionKey, newAllInput);
            if (isError({ condition, actionKey, actionVal, status })) {
                const conditionReturn = handleCondition({
                    ...data,
                    actionVal,
                    status,
                    allInput: newAllInput
                });
                return conditionReturn;
            }

            // continue
            return {
                ...allResults,
                continueNextApi: true, // always true for continue condition
                api: {
                    ...api,
                    [apiKey]: {
                        ...jsonResponse
                    }
                }
            };
        }
        return handleCondition({ ...data, status });
    } catch (err) {
        return handleCondition({ ...data, status });
    }
};

/**
 * get key from config condition
 * @param {object} condition
 * @return {actionKeyType}
 */
const getActionKey = (condition: conditionType): actionKeyType => {
    const { key } = condition;
    return key;
};

/**
 * check got error
 * @param {object} condition - condition from config
 * @param {actionKeyType} actionKey
 * @param {string} actionVal
 * @param {number} status
 * @return {boolean}
 */
const isError = ({ condition, actionKey, actionVal, status }: isErrorType): boolean =>
    (whenKeyIsInCondition(actionKey) &&
        whenContinueIsNotTrueInVal(condition, actionVal)) ||
    (whenKeyIsNotInCondition(actionKey) &&
        whenContinueIsNotTrueInVal(condition, status));

/**
 * When key is in condition
 * @param {actionKeyType} actionKey
 * @return {boolean}
 */
const whenKeyIsInCondition = (actionKey: actionKeyType): boolean => {
    return actionKey !== undefined;
};

/**
 * When key is not in condition
 * @param {actionKeyType} actionKey
 * @return {boolean}
 */
const whenKeyIsNotInCondition = (actionKey: actionKeyType): boolean => {
    return actionKey === undefined;
};

/**
 * When key is not in condition
 * @param {conditionType} condition
 * @param {string|number} val
 * @return {boolean}
 */
const whenContinueIsNotTrueInVal = (condition: conditionType, val: string|number): boolean => {
    return (
        (condition && val && get(condition, `${val}.continue`) !== true) || false
    );
};

/**
 * handle condition
 * @param {handleConditionType} data
 * @return {{ api: object, actions: [{redirect: string}, {message: string}], continueNextApi: boolean}}
 */
const handleCondition = (data: handleConditionType) => {
    const { status, allResults, apiConfig, actionVal = '' } = data;
    const { actions: actionsResult } = allResults;
    const { shouldHideError, shouldContinueNextApiOnError, condition } = apiConfig;
    let hideError = shouldHideError || HIDE_ERROR;
    let continueNextApi =
        shouldContinueNextApiOnError || CONTINUE_NEXT_API_ON_ERROR;
    if (hideError)
        return {
            ...allResults,
            continueNextApi
        };

    const { [actionVal]: aVal, [status]: sVal, ['default']:dVal } = condition;
    const currentAction = (aVal || sVal || dVal) as conditionKeysType;
    const actions = handleAction({ ...data, currentAction });
    return {
        ...allResults,
        actions: [...actionsResult, ...actions],
        continueNextApi
    };
};

/**
 *
 * @param {handleActionType}
 *  currentAction - current action from condition in config, has message and redirect
 *  allInput - to use for mapping render actions
 * @return {[actionsType]>}
 */
const handleAction = (data: handleActionType): Array<actionsType> => {
    const { currentAction = {}, allInput } = data;
    let actionResponse = [] as Array<actionsType>;
    if (currentAction) {
        const { redirect, message } = currentAction;
        if (redirect || message) {
            const key = redirect ? 'redirect' : 'message';
            const newValue = executeValue(currentAction[key], allInput);
            actionResponse = [{ [key]: newValue }];
        }
    }
    return actionResponse;
};

export default initConfigurableApi;
export { executeValues, apiConfigType, ConfigurableApiProps };
