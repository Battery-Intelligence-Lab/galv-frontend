import {createContext, PropsWithChildren, useContext} from "react";
import {BaseResource} from "./ResourceCard";
import {
    API_HANDLERS,
    API_SLUGS,
    DISPLAY_NAMES,
    FAMILY_LOOKUP_KEYS,
    FIELDS,
    get_has_family,
    LookupKey
} from "../constants";
import {AxiosError, AxiosResponse} from "axios";
import {useQuery, UseQueryResult} from "@tanstack/react-query";
import {id_from_ref_props} from "./misc";
import {useSnackbarMessenger} from "./SnackbarMessengerContext";

export interface IApiResourceContext<T extends BaseResource = BaseResource> {
    apiResource?: T
    apiQuery?: UseQueryResult<AxiosResponse<T>, AxiosError>
    family?: BaseResource
    familyQuery?: UseQueryResult<AxiosResponse<BaseResource>, AxiosError>
}

const ApiResourceContext = createContext({} as IApiResourceContext)

export const useApiResource = <T extends BaseResource = BaseResource>() => {
    const context = useContext(ApiResourceContext) as IApiResourceContext<T>
    if (context === undefined) {
        throw new Error('useApiResource must be used within an ApiResourceContextProvider')
    }
    return context
}

type ApiResourceContextProviderProps = {
    lookup_key: LookupKey
    resource_id: string|number
}

export const get_select_function = (lookup_key: LookupKey) =>
    <T extends BaseResource>(data: AxiosResponse<T>) => {
        Object.entries(FIELDS[lookup_key]).forEach(([k, v]) => {
            if (v.transformation !== undefined)
                data.data[k] = v.transformation(data.data[k])
        })
        return data
    }

function ApiResourceContextStandaloneProvider<T extends BaseResource>(
    {lookup_key, resource_id, children}: PropsWithChildren<ApiResourceContextProviderProps>
) {
    const {postSnackbarMessage} = useSnackbarMessenger()
    const api_handler = new API_HANDLERS[lookup_key]()
    const get = api_handler[
        `${API_SLUGS[lookup_key]}Retrieve` as keyof typeof api_handler
        ] as (uuid: string) => Promise<AxiosResponse<T>>
    const query = useQuery<AxiosResponse<T>, AxiosError>({
        queryKey: [lookup_key, resource_id],
        queryFn: () => get.bind(api_handler)(String(resource_id)).catch(e => {
            postSnackbarMessage({
                message: `Error retrieving ${DISPLAY_NAMES[lookup_key]}/${resource_id}  
                (HTTP ${e.response?.status} - ${e.response?.statusText}): ${e.response?.data?.detail}`,
                severity: 'error'
            })
            throw e
        }),
        select: get_select_function(lookup_key),
    })

    return <ApiResourceContext.Provider value={{apiResource: query.data?.data, apiQuery: query}}>
        {children}
    </ApiResourceContext.Provider>
}

function ApiResourceContextWithFamilyProvider<T extends BaseResource>(
    {lookup_key, resource_id, children}: PropsWithChildren<ApiResourceContextProviderProps>
) {
    if (!get_has_family(lookup_key))
        throw new Error(`Cannot use ApiResourceContextWithFamilyProvider for ${lookup_key} because it does not have a family.`)

    const {postSnackbarMessage} = useSnackbarMessenger()
    const api_handler = new API_HANDLERS[lookup_key]()
    const get = api_handler[
        `${API_SLUGS[lookup_key]}Retrieve` as keyof typeof api_handler
        ] as (uuid: string) => Promise<AxiosResponse<T>>
    const query = useQuery<AxiosResponse<T>, AxiosError>({
        queryKey: [lookup_key, resource_id],
        queryFn: () => get.bind(api_handler)(String(resource_id)).catch(e => {
            postSnackbarMessage({
                message: `Error retrieving ${DISPLAY_NAMES[lookup_key]}/${resource_id}  
                (HTTP ${e.response?.status} - ${e.response?.statusText}): ${e.response?.data?.detail}`,
                severity: 'error'
            })
            throw e
        }),
        select: get_select_function(lookup_key),
    })

    const family_lookup_key = FAMILY_LOOKUP_KEYS[lookup_key]
    const family_api_handler = new API_HANDLERS[family_lookup_key]()
    const family_get = family_api_handler[
        `${API_SLUGS[family_lookup_key]}Retrieve` as keyof typeof family_api_handler
        ] as (uuid: string) => Promise<AxiosResponse<BaseResource>>
    const family_query = useQuery<AxiosResponse<BaseResource>, AxiosError>({
        queryKey: [
            family_lookup_key,
            query.data?.data.family? id_from_ref_props(query.data?.data?.family) : "never"
        ],
        queryFn: () => family_get.bind(family_api_handler)(id_from_ref_props<string>(query.data?.data?.family!))
            .catch(e => {
                postSnackbarMessage({
                    message: `Error retrieving ${DISPLAY_NAMES[lookup_key]}/${resource_id}  
                (HTTP ${e.response?.status} - ${e.response?.statusText}): ${e.response?.data?.detail}`,
                    severity: 'error'
                })
                throw e
            }),
        enabled: !!query.data?.data?.family,
        select: get_select_function(family_lookup_key),
    })

    return <ApiResourceContext.Provider value={{
        apiResource: query.data?.data,
        apiQuery: query,
        family: family_query.data?.data,
        familyQuery: family_query
    }}>
        {children}
    </ApiResourceContext.Provider>
}

/**
 * Expose a context with the resource and its family (if it has one).
 * This allows us to query the family while honoring the rule that we can't
 * call hooks conditionally.
 *
 * Family will be undefined if the resource does not have a family, or if the
 * family query has not yet resolved.
 */
export default function ApiResourceContextProvider(props: PropsWithChildren<ApiResourceContextProviderProps>) {
    return get_has_family(props.lookup_key)?
        <ApiResourceContextWithFamilyProvider {...props}/> :
        <ApiResourceContextStandaloneProvider {...props}/>
}