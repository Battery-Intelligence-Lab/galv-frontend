import Tooltip from "@mui/material/Tooltip";
import React, {
    useEffect,
    useState
} from "react";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ToggleButton from "@mui/material/ToggleButton";
import AbcIcon from "@mui/icons-material/Abc";
import NumbersIcon from "@mui/icons-material/Numbers";
import DataObjectIcon from "@mui/icons-material/DataObject";
import DataArrayIcon from "@mui/icons-material/DataArray";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import IconButton from "@mui/material/IconButton";
import Popover, {PopoverProps} from "@mui/material/Popover";
import {SvgIconTypeMap} from "@mui/material/SvgIcon";
import clsx from "clsx";
import useStyles from "../styles/UseStyles";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {build_placeholder_url, get_url_components} from "./misc";
import {
    API_HANDLERS,
    AutocompleteKey,
    DISPLAY_NAMES,
    ICONS,
    is_autocomplete_key,
    is_lookup_key,
    LookupKey
} from "../constants";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {OverridableComponent} from "@mui/material/OverridableComponent";

const str = (v: any) => {
    try {return JSON.stringify(v)} catch(e) {
        console.warn(`Could not stringify value: ${v}`, e)
        return ""
    }
}
const num = (v: any) => {
    const n = Number(v)
    if (isNaN(n)) {
        console.warn(`Could not numberify value: ${v}`)
        return 0
    }
    return n
}
const obj = (v: any) => {
    try {
        if (v instanceof Array) {
            const o: {[key: number]: any} = {}
            v.forEach((vv, i) => o[i] = vv)
            return o
        }
        if (v instanceof Object) return v
        if (typeof v === 'string' && (v.startsWith('{') && v.endsWith('}')))
            return JSON.parse(v)
    } catch (e) {
        console.warn(`Could not objectify value: ${v}`, e)
    }
    return {0: v}
}
const arr = (v: any) => {
    try {
        if (v instanceof Array) return v
        if (typeof v === 'object') return Object.values(v)
        if (typeof v === 'string' && (v.startsWith('[') && v.endsWith(']')))
            return JSON.parse(v)
    } catch (e) {
        console.warn(`Could not arrayify value: ${v}`, e)
    }
    return [v]
}

const type_map = {
    string: {
        icon: AbcIcon,
        tooltip: "String"
    },
    number: {
        icon: NumbersIcon,
        tooltip: "Number"
    },
    boolean: {
        icon: PowerSettingsNewIcon,
        tooltip: "Boolean"
    },
    object: {
        icon: DataObjectIcon,
        tooltip: "Object (JSON strings will be parsed)"
    },
    array: {
        icon: DataArrayIcon,
        tooltip: "Array (JSON strings will be parsed)"
    }
} as const

export type Serializable =
    string |
    number |
    boolean |
    SerializableObject |
    Serializable[] |
    undefined |
    null

export type SerializableObject = {[key: string]: Serializable}

export type TypeChangerDetectableTypeName = (keyof typeof type_map & string) | LookupKey
export type TypeChangerSupportedTypeName = TypeChangerDetectableTypeName | AutocompleteKey

export type TypeChangerProps = {
    currentValue?: Serializable
    onTypeChange: (newValue: Serializable) => void
    // If true, the type changer will be disabled
    // If a TypeChangerSupportedTypeName, the type changer will be locked to that type
    // rather than detecting the type from currentValue
    lock_type: boolean|TypeChangerSupportedTypeName
}

export type TypeChangerPopoverProps = {
    value?: TypeChangerSupportedTypeName
    onTypeChange: (newValue: TypeChangerDetectableTypeName) => void
} & PopoverProps

function TypeChangeResourcePopover({onTypeChange, ...props}: TypeChangerPopoverProps) {
    const {classes} = useStyles()
    return <Popover
        className={clsx(classes.typeChangerPopover, classes.typeChangerResourcePopover)}
        anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
        }}
        transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
        }}
        {...props}
    >
        <ToggleButtonGroup
            size="small"
            exclusive
            value={props.value}
            onChange={(_, v: TypeChangerDetectableTypeName) => onTypeChange(v)}
        >
            {Object.keys(API_HANDLERS).map((lookup_key) => {
                const ICON = ICONS[lookup_key as keyof typeof ICONS]
                const display = DISPLAY_NAMES[lookup_key as keyof typeof DISPLAY_NAMES]
                return <ToggleButton
                    value={lookup_key}
                    key={lookup_key}
                    selected={props.value === lookup_key}
                    disabled={props.value === lookup_key}
                >
                    <Tooltip title={display} arrow placement="bottom" describeChild={true}>
                        <ICON />
                    </Tooltip>
                </ToggleButton>
            })}
        </ToggleButtonGroup>
    </Popover>
}
function TypeChangePopover({value, onTypeChange, ...props}: TypeChangerPopoverProps) {
    const {classes} = useStyles()
    const [resourcePopoverOpen, setResourcePopoverOpen] = useState(false)
    // useState + useCallback to avoid child popover rendering with a null anchorEl
    const [resourcePopoverAnchorEl, setResourcePopoverAnchorEl] = useState<HTMLElement|null>(null)
    const resourcePopoverAnchorRef = React.useCallback(
        (node: HTMLElement|null) => setResourcePopoverAnchorEl(node),
        []
    )
    // Reopen child popover if value is a resource type
    useEffect(() => {
        if (props.open && value && Object.keys(API_HANDLERS).includes(value)) {
            setResourcePopoverOpen(true)
        }
    }, [props.open, value]);

    const get_icon = ({icon}: {icon: OverridableComponent<SvgIconTypeMap> & {muiName: string}}) => {
        const ICON = icon
        return <ICON />
    }

    return <Popover className={clsx(classes.typeChangerPopover)} {...props}>
        <Stack direction="row" alignItems="center" spacing={1} ref={resourcePopoverAnchorRef}>
            <ToggleButtonGroup
                size="small"
                exclusive
                value={value}
                onChange={(_, v: TypeChangerDetectableTypeName) => onTypeChange(v)}
            >
                {Object.entries(type_map).map(([type, ICON]) =>
                    <ToggleButton value={type} key={type} selected={value === type} disabled={value === type}>
                        <Tooltip title={ICON.tooltip} arrow placement="bottom" describeChild={true}>
                            {get_icon(ICON)}
                        </Tooltip>
                    </ToggleButton>)}
            </ToggleButtonGroup>
            <TypeChangeResourcePopover
                {...props}
                value={value}
                onTypeChange={onTypeChange}
                anchorEl={resourcePopoverAnchorEl}
                open={resourcePopoverOpen && !!resourcePopoverAnchorEl}
                onClose={() => setResourcePopoverOpen(false)}
            />
            <IconButton onClick={() => setResourcePopoverOpen(!resourcePopoverOpen)}>
                <Tooltip title="Resource types" arrow placement="bottom" describeChild={true}>
                    <MoreVertIcon />
                </Tooltip>
            </IconButton>
        </Stack>
    </Popover>
}

export const detect_type = (v: Serializable): TypeChangerDetectableTypeName => {
    if (v instanceof Array) return 'array'
    if (typeof v === 'string')
        return get_url_components(v)?.lookup_key ?? 'string'
    if (Object.keys(type_map).includes(typeof v))
        return typeof v as keyof typeof type_map
    console.error(`Could not detect type`, v)
    throw new Error(`Could not detect type for ${v}`)
}

export const get_conversion_fun = (type: string) => {
    switch (type) {
        case 'string': return str
        case 'number': return num
        case 'boolean': return (v: any) => !!v
        case 'object': return obj
        case 'array': return arr
    }
    if (is_lookup_key(type))
        return (v: any) => {
            const clean = (s: string): string => s.replace(/[^a-zA-Z0-9-_]/g, '')
            const page = type
            const entry = clean(v) || 'new'
            return build_placeholder_url(page, entry)
        }
    console.error(`Could not get conversion function for ${type}`, type)
    throw new Error(`Could not get conversion function for ${type}`)
}

export default function TypeChanger(
    {currentValue, onTypeChange, lock_type, ...props}: TypeChangerProps & Partial<TypeChangerPopoverProps>
) {
    const {classes} = useStyles()

    const [value, _setValue] =
        useState<TypeChangerSupportedTypeName>(typeof lock_type === 'string'? lock_type : detect_type(currentValue))
    const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement|null>(null)

    useEffect(
        () => _setValue(typeof lock_type === 'string'? lock_type : detect_type(currentValue)),
        [currentValue, lock_type]
    )

    return <Tooltip
        key="string"
        title={lock_type? value : <Stack justifyItems="center" alignContent="center">
            <Typography textAlign="center" variant="caption">{value}</Typography>
            <Typography textAlign="center" variant="caption">click to change type</Typography>
        </Stack>}
        arrow
        describeChild
        placement="top"
    >
    <span>
            <TypeChangePopover
                {...props}
                onTypeChange={(t) => {
                    setPopoverAnchor(null)
                    return onTypeChange(get_conversion_fun(t)(currentValue))
                }}
                value={value as TypeChangerSupportedTypeName}
                open={!!popoverAnchor}
                anchorEl={popoverAnchor}
                onClose={() => setPopoverAnchor(null)}
            />
            <IconButton
                onClick={(e) => setPopoverAnchor(e.currentTarget || null)}
                disabled={lock_type !== false}
                className={clsx(classes.typeChangerButton)}
            >
                {
                    is_lookup_key(value)?
                        React.createElement(ICONS[value]) :
                        is_autocomplete_key(value)?
                            React.createElement(type_map.string.icon) :
                            React.createElement(type_map[value as keyof typeof type_map].icon)
                }
            </IconButton>
        </span>
    </Tooltip>
}
