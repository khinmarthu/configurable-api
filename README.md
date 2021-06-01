# configurable-api

Write the config to call the api via component or javascript function.

The whole idea started back in early 2019, I wanted to have API calls and handle API responses in the config with less maintaining the code. So, I had come up with the idea to make it into component and javascript function.

## Demo

coming soon ...

## How to use

Run the command below in your project:

- `npm install configurable-api`

You can now import `configurable-api` as a normal package installed from npm like so:

```
import ConfigurableApi from 'configurable-api'

const YourComponent = (props) => {
    return (
        <ConfigurableApi {...props}/>
    );
}

...
...

<YourComponent
    checkSessionUrl="https://xxx.com/xxx"
    sessionId={"2333fsj23253k409fskjfs230"}
    messageNotFound={"Products not found"}
    errorUrl="http://err.com/xx"
    getProfileUrl="https://api.com/getprofile
    helpers={{ getCustomMode: (val) => { return `${val}_1` } }}
    api={{
        checkLogin: { // I gave checkLogin as object key, you can give any name
            url: '{checkSessionUrl}', // {checkSessionUrl} will replace with "https://xxx.com/xxx"
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            request: {
                sessionId: '{sessionId}', // {sessionId} will replace with "2333fsj23253k409fskjfs230"
            },
            condition: { // In condition, you can handle the api response
                200: { // automatically bind with http status
                    continue: true // if https status is 200, it will continue to call next API which is getProfile
                },
                404: {
                    // {messageNotFound} will replace with "Products not found".
                    // You can use "whenMessage" prop to handle where to show the message
                    message: '{messageNotFound}'
                },
                400: {
                    // qs is query string, if your page url is https://yy.com?mode=245, {qs.mode} will replace with 245
                    redirect: '{errorUrl}/xx?error={qs.mode}'
                },
                default: { // if http status is not within 200, 404 and 400, it will fall back to default
                    redirect: '{errorUrl}/defaultErrorPage' // {errorUrl} will replace with "http://err.com/xx"
                }
            }
        },
        getProfile: {
            beforeFetch: `{ // You can manipulate the data before calling the api.
                // you can run helper func within beforeFetch, url, headers, request, redirect and message, just make sure to wrap with template string ``
                newMode: getCustomMode('{qs.mode}_{api.checkLogin.code}'),
            }`,
            // {api.checkLogin.token} is the api response from checkLogin api
            url: '{getProfileUrl}/{api.checkLogin.token}.{beforeFetch.newMode}.json',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            condition: { // In condition, you can handle the api response
                key: {api.getProfile.code},
                // '20022' is from {api.getProfile.code} because of key: {api.getProfile.code} in above.
                '20022': {
                    continue: true // You can use "whenSuccess" to handle the api response
                },
                '30231': {
                    redirect: '{errorUrl}?errorCode={api.getProfile.code}'
                },
                default: { // if api.getProfile.code is not within 20022 and 30231, it will fall back to default
                    redirect: '{errorUrl}defaultErrorPage'
                }
            }
        }
    }}
/>

```

## Available props

```
className?: string

api: {
    url: string,
    method: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE'
    headers?: object,
    request?: object,
    condition: {
        key?: string,
        [key: number]: {
            continue?: boolean | redirect?: string | message?: string
        },
        [key: string]: {
            continue?: boolean | redirect?: string | message?: string
        },
        default: {
            continue?: boolean | redirect?: string | message?: string
        },
    },
    beforeFetch?: object, // manipulate your desired data before fetch
    shouldHideError?: boolean, // if this is true, will ignore condition (default: false)
    shouldContinueNextApiOnError?: boolean, // if this is true, will continue next when there is error (default: false)
}

whenSuccess?: (apiResponse: object, props: ConfigurableApiProps) => ReactElement|void

whenLoading?: (props: ConfigurableApiProps) => ReactElement

whenMessage?: (message: string, props: ConfigurableApiProps) => ReactElement|void

whenRedirect?: (redirect: string, props: ConfigurableApiProps) => void

dataToMap?: object

helpers?: object

errorMessage?: string
```
