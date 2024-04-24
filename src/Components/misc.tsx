import {is_lookup_key, LookupKey, PATHS, Serializable} from "../constants";

export type ObjectReferenceProps =
    { id: string } |
    { id: number } |
    { url: string }

export function id_from_ref_props<T extends number | string>(props: ObjectReferenceProps | string | number): T {
    if (props === undefined) throw new Error(`Cannot get id from undefined`)
    if (typeof props === 'number')
        return props as T
    if (typeof props === 'object') {
        if ('id' in props) {
            return props.id as T
        } else if ('id' in props) {
            return props.id as T
        }
    }
    const url = typeof props === 'string' ? props : props?.url
    try {
        const id = url.split('/').filter(x => x).pop()
        if (id !== undefined) return id as T
    } catch (error) {
        console.error(`Could not parse id from url`, {props, url, error})
        throw new Error(`Could not parse id from url.`)
    }
    console.error(`Could not parse id from props`, props)
    throw new Error(`Could not parse id from props ${props}`)
}

/**
 * If `url` looks like a valid url for a resource, return the lookup key and id.
 * @param url
 */
export function get_url_components(url: string):
    {lookup_key: LookupKey,
        resource_id: string}|undefined {
    url = url.toLowerCase()
    const parts = url.split(/[/|?]/).filter(x => x)
    if (parts.length === 4) {
        const lookup_key = Object.keys(PATHS)
            .find(k => PATHS[k as keyof typeof PATHS] === `/${parts[2]}`)
        if (lookup_key === undefined) return undefined

        if (!is_lookup_key(lookup_key)) {
            console.warn(`${lookup_key} is a PATHS key but not an LOOKUP_KEY`, url)
            return undefined
        }

        const resource_id = parts[3]
        return {lookup_key: lookup_key as LookupKey, resource_id: resource_id}
    }
    return undefined
}

export function deep_copy<T extends Serializable>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
}
